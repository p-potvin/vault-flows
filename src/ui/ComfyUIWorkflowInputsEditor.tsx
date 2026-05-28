import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, Loader2, ImagePlus } from 'lucide-react'

import { useFlowStore } from '@/store/flowStore'
import {
  getPipelinesWorkflow,
  uploadImage,
  uploadPreviewUrl,
  type PipelinesWorkflow,
} from '@/api/client'
import type { FlowNode } from '@/nodes/types'
import { Field, TextInput, TextArea } from './components/Field'
import { Button } from './components/Button'

interface Props {
  node: FlowNode
}

/**
 * Structured editor for `comfyui_workflow` nodes — renders one labeled field
 * per declared `input_paths` key, picking a control type by name pattern.
 */
export function ComfyUIWorkflowInputsEditor({ node }: Props) {
  const { t } = useTranslation()
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)
  const cached = useFlowStore((s) => s.workflowsById)

  const workflowId = String(node.params.workflow_id ?? '')
  const [resolved, setResolved] = useState<PipelinesWorkflow | null>(
    workflowId ? cached[workflowId] ?? null : null,
  )
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!workflowId) return
    if (cached[workflowId]) {
      setResolved(cached[workflowId])
      return
    }
    let cancelled = false
    setLoading(true)
    getPipelinesWorkflow(workflowId)
      .then((wf) => {
        if (!cancelled) setResolved(wf)
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [workflowId, cached])

  const step = (resolved?.steps ?? []).find((s) => s?.kind === 'comfyui_graph')
  const inputPaths: Record<string, string> =
    (step?.input_paths as Record<string, string>) ??
    (node.params._input_paths as Record<string, string> | undefined) ??
    {}
  const imageInputs: string[] =
    (step?.image_inputs as string[]) ??
    (node.params._image_inputs as string[] | undefined) ??
    []
  const inputs = (node.params.inputs as Record<string, unknown>) ?? {}

  function setInput(key: string, value: unknown) {
    updateNodeParam(node.id, 'inputs', { ...inputs, [key]: value })
  }

  if (!workflowId) {
    return (
      <p className="font-sans text-xs text-white/45">
        {t('workflow.no_id', { defaultValue: 'No workflow_id set on this node.' })}
      </p>
    )
  }
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/45">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="font-mono text-[10px] uppercase tracking-wider">
          {t('workflow.loading_schema', { defaultValue: 'Loading workflow…' })}
        </span>
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="rounded-lg border border-vw-signal-alert/30 bg-vw-signal-alert/10 px-3 py-2 font-sans text-xs text-vw-signal-alert">
        {loadError}
      </div>
    )
  }

  const inputKeys = Object.keys(inputPaths)
  if (inputKeys.length === 0) {
    return (
      <p className="font-sans text-xs text-white/45">
        {t('workflow.no_inputs', { defaultValue: 'This workflow declares no editable inputs.' })}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-vw-console-gold/80">
        {t('workflow.inputs_header', { defaultValue: 'Workflow Inputs' })}
      </span>

      <div className="flex flex-col gap-3">
        {inputKeys.map((key) => {
          const value = inputs[key]
          const isImage = imageInputs.includes(key)
          return (
            <InputField
              key={key}
              inputKey={key}
              value={value}
              isImage={isImage}
              onChange={(v) => setInput(key, v)}
            />
          )
        })}
      </div>

      <hr className="border-vw-console-border" />

      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/45">
        {t('workflow.settings_header', { defaultValue: 'Settings' })}
      </span>

      <Field label="workflow_id">
        <TextInput value={workflowId} disabled className="opacity-60" />
      </Field>
      <Field label="mode">
        <select
          value={String(node.params.mode ?? 'local')}
          onChange={(e) => updateNodeParam(node.id, 'mode', e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-vw-console-bg px-3 py-2 text-sm text-white outline-none transition-colors focus:border-vw-console-violet/50 focus:ring-2 focus:ring-vw-console-violet/20"
        >
          <option value="local">local</option>
          <option value="nim">nim</option>
        </select>
      </Field>
    </div>
  )
}

const NUMBER_KEYS = /^(seed|steps|width|height|batch_size|cfg|denoise|strength|guidance|frames|fps|sampler_steps|max_tokens)$/i
const TEXTAREA_KEYS = /^(positive_prompt|negative_prompt|prompt|system|template|text|caption|description)$/i

function InputField({
  inputKey,
  value,
  isImage,
  onChange,
}: {
  inputKey: string
  value: unknown
  isImage: boolean
  onChange: (value: unknown) => void
}) {
  if (isImage) return <ImageInputField inputKey={inputKey} value={value} onChange={onChange} />
  if (NUMBER_KEYS.test(inputKey)) {
    return (
      <Field label={inputKey}>
        <TextInput
          type="number"
          value={typeof value === 'number' || typeof value === 'string' ? String(value ?? '') : ''}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') onChange('')
            else {
              const n = Number(v)
              onChange(Number.isFinite(n) ? n : v)
            }
          }}
        />
      </Field>
    )
  }
  if (TEXTAREA_KEYS.test(inputKey)) {
    return (
      <Field label={inputKey}>
        <TextArea
          value={String(value ?? '')}
          rows={4}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    )
  }
  return (
    <Field label={inputKey}>
      <TextInput
        type="text"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

function ImageInputField({
  inputKey,
  value,
  onChange,
}: {
  inputKey: string
  value: unknown
  onChange: (value: unknown) => void
}) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const token = typeof value === 'string' && value.split('.').length === 3 ? value : ''
  const previewUrl = token ? uploadPreviewUrl(token) : ''

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const res = await uploadImage(file)
      onChange(res.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Field label={inputKey} error={error ?? undefined}>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        onChange={(e) => void handlePick(e)}
        className="hidden"
      />
      {token ? (
        <div className="flex flex-col gap-2">
          <img
            src={previewUrl}
            alt={inputKey}
            className="max-h-32 w-full rounded-lg border border-vw-console-border object-contain"
          />
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ImagePlus className="h-3 w-3" />}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading…' : 'Change image'}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-vw-console-bg/40 px-3 py-6 text-white/55 transition-colors hover:border-vw-console-violet/40 hover:text-white"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Upload className="h-5 w-5" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {uploading ? 'Uploading…' : 'Click to upload'}
          </span>
        </button>
      )}
    </Field>
  )
}
