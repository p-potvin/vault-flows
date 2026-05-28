import { useEffect, useRef, useState } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Workflow, Upload, Loader2, ImagePlus, AlertCircle } from 'lucide-react'

import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useFlowStore } from '@/store/flowStore'
import {
  getPipelinesWorkflow,
  uploadImage,
  uploadPreviewUrl,
  type PipelinesWorkflow,
} from '@/api/client'
import {
  InlineField,
  InlineTextArea,
  InlineTextInput,
  InlineNumberInput,
  InlineSelect,
  InlineSeedInput,
  InlineAdvanced,
  SIZE_PRESETS,
} from './inline'

type ComfyUIWorkflowNodeData = FlowNode & { [key: string]: unknown }

const NUMBER_KEYS = /^(seed|steps|width|height|batch_size|cfg|denoise|strength|guidance|frames|fps|sampler_steps|max_tokens)$/i
const TEXTAREA_KEYS = /^(positive_prompt|negative_prompt|prompt|system|template|text|caption|description)$/i
const PRIMARY_KEYS = /^(positive_prompt|negative_prompt|prompt|source_image|target_image|reference_image|extra_image|seed)$/i

const LAST_INPUTS_KEY_PREFIX = 'vw:lastInputs:'

/**
 * ComfyUI sub-flow node. Treats the underlying graph as opaque — the user
 * only edits the exposed `input_paths` contract.
 */
export function ComfyUIWorkflowNode({ data }: NodeProps<Node<ComfyUIWorkflowNodeData>>) {
  const meta = NODE_REGISTRY['comfyui_workflow']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)
  const cached = useFlowStore((s) => s.workflowsById)
  const executionStatus = useFlowStore((s) => s.executionStatus)
  const executionResults = useFlowStore((s) => s.executionResults)

  const workflowId = String(data.params?.workflow_id ?? '')
  const inputs = (data.params?.inputs as Record<string, unknown>) ?? {}

  const [resolved, setResolved] = useState<PipelinesWorkflow | null>(
    workflowId ? cached[workflowId] ?? null : null,
  )
  const [loading, setLoading] = useState(false)

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
      .catch(() => {
        /* schema unavailable — fall back to params hints */
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
    (data.params?._input_paths as Record<string, string> | undefined) ??
    {}
  const imageInputs: string[] =
    (step?.image_inputs as string[]) ??
    (data.params?._image_inputs as string[] | undefined) ??
    []

  const allKeys = Object.keys(inputPaths)
  const hasWidthHeight = allKeys.includes('width') && allKeys.includes('height')

  // Keys we route through specialized controls (so they don't show up twice)
  const consumedKeys = new Set<string>()
  if (hasWidthHeight) {
    consumedKeys.add('width')
    consumedKeys.add('height')
  }

  const primaryKeys = allKeys.filter(
    (k) => !consumedKeys.has(k) && (PRIMARY_KEYS.test(k) || imageInputs.includes(k)),
  )
  const advancedKeys = allKeys.filter(
    (k) => !consumedKeys.has(k) && !primaryKeys.includes(k),
  )

  // ─── Persist last-used inputs in localStorage, keyed per workflow_id ──
  // On first paint after a workflow is loaded, if inputs are all empty,
  // restore from localStorage. (Image refs are NOT restored since their
  // upload tokens expire.)
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    if (!workflowId) return
    if (allKeys.length === 0) return
    const allEmpty = allKeys.every((k) => inputs[k] === '' || inputs[k] === undefined)
    if (!allEmpty) {
      restoredRef.current = true
      return
    }
    try {
      const raw = localStorage.getItem(LAST_INPUTS_KEY_PREFIX + workflowId)
      if (!raw) {
        restoredRef.current = true
        return
      }
      const saved = JSON.parse(raw) as Record<string, unknown>
      // Filter out image keys (tokens have expired or weren't persisted)
      const merged: Record<string, unknown> = { ...inputs }
      for (const k of allKeys) {
        if (imageInputs.includes(k)) continue
        if (saved[k] !== undefined && saved[k] !== '') merged[k] = saved[k]
      }
      updateNodeParam(data.id, 'inputs', merged)
    } catch {
      /* ignore JSON errors */
    }
    restoredRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, allKeys.length])

  // Debounced save on input change
  useEffect(() => {
    if (!workflowId || allKeys.length === 0) return
    const timer = window.setTimeout(() => {
      try {
        // Strip image-input tokens before persisting
        const toSave: Record<string, unknown> = {}
        for (const k of Object.keys(inputs)) {
          if (imageInputs.includes(k)) continue
          toSave[k] = inputs[k]
        }
        localStorage.setItem(LAST_INPUTS_KEY_PREFIX + workflowId, JSON.stringify(toSave))
      } catch {
        /* localStorage may be unavailable; ignore */
      }
    }, 400)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, inputs])

  function setInput(key: string, value: unknown) {
    updateNodeParam(data.id, 'inputs', { ...inputs, [key]: value })
  }
  function setInputs(patch: Record<string, unknown>) {
    updateNodeParam(data.id, 'inputs', { ...inputs, ...patch })
  }

  // ─── Result rendering on this node (replaces the standalone Display node) ─
  const result = executionResults.find((r) => r.nodeId === data.id)
  const showResult = result && !result.error
  const resultUrls =
    result?.imageUrls && result.imageUrls.length > 0
      ? result.imageUrls
      : result?.imageUrl
        ? [result.imageUrl]
        : []

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <div className="flex flex-col gap-2">
        {/* Sub-flow reference (read-only — workflow identity is fixed) */}
        <div className="flex items-center gap-1.5 rounded-md border border-vw-console-gold/15 bg-vw-console-gold/5 px-2 py-1">
          <Workflow className="h-3 w-3 flex-shrink-0 text-vw-console-gold" />
          <span
            className="truncate font-mono text-[10px] font-bold uppercase tracking-wider text-vw-console-gold"
            title={workflowId}
          >
            {workflowId || '(not set)'}
          </span>
        </div>

        {loading && (
          <div className="flex items-center gap-1.5 text-white/45">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="font-mono text-[10px] uppercase tracking-wider">Loading…</span>
          </div>
        )}

        {!loading && allKeys.length === 0 && (
          <p className="font-mono text-[10px] italic text-white/40">No inputs declared</p>
        )}

        {/* Primary inputs */}
        {primaryKeys.map((key) => (
          <InputControl
            key={key}
            inputKey={key}
            value={inputs[key]}
            isImage={imageInputs.includes(key)}
            onChange={(v) => setInput(key, v)}
          />
        ))}

        {/* Size presets — only when the workflow exposes width+height together */}
        {hasWidthHeight && (
          <SizePresetControl
            width={typeof inputs.width === 'number' ? inputs.width : Number(inputs.width) || 0}
            height={typeof inputs.height === 'number' ? inputs.height : Number(inputs.height) || 0}
            onChange={(w, h) => setInputs({ width: w, height: h })}
          />
        )}

        {/* Advanced inputs */}
        {advancedKeys.length > 0 && (
          <InlineAdvanced label={`Advanced (${advancedKeys.length})`}>
            {advancedKeys.map((key) => (
              <InputControl
                key={key}
                inputKey={key}
                value={inputs[key]}
                isImage={imageInputs.includes(key)}
                onChange={(v) => setInput(key, v)}
              />
            ))}
          </InlineAdvanced>
        )}

        {/* Inline result — replaces the separate Display node */}
        {showResult && resultUrls.length > 0 && (
          <InlineResultGallery urls={resultUrls} label={data.label ?? meta.label} />
        )}
        {executionStatus === 'error' && result?.error && (
          <div className="flex items-start gap-1.5 rounded-md border border-vw-signal-alert/30 bg-vw-signal-alert/10 px-2 py-1.5">
            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-vw-signal-alert" />
            <span className="font-mono text-[10px] text-vw-signal-alert" title={result.error}>
              {result.error.length > 90 ? result.error.slice(0, 90) + '…' : result.error}
            </span>
          </div>
        )}
      </div>
    </BaseNode>
  )
}

// ───────────────────────────────────────────────────────────────────────────────

function SizePresetControl({
  width,
  height,
  onChange,
}: {
  width: number
  height: number
  onChange: (w: number, h: number) => void
}) {
  const preset = SIZE_PRESETS.find((p) => p.w === width && p.h === height)
  const isCustom = !preset
  const [showCustom, setShowCustom] = useState(isCustom)

  function handleSelect(value: string) {
    if (value === 'custom') {
      setShowCustom(true)
      return
    }
    const p = SIZE_PRESETS.find((x) => x.label === value)
    if (p) {
      onChange(p.w, p.h)
      setShowCustom(false)
    }
  }

  return (
    <InlineField label="size">
      <InlineSelect
        value={isCustom ? 'custom' : preset!.label}
        onChange={(e) => handleSelect(e.target.value)}
      >
        {SIZE_PRESETS.map((p) => (
          <option key={p.label} value={p.label}>
            {p.label}
          </option>
        ))}
        <option value="custom">Custom…</option>
      </InlineSelect>
      {showCustom && (
        <div className="mt-1 grid grid-cols-2 gap-1.5">
          <InlineField label="width">
            <InlineNumberInput
              value={width || ''}
              step={64}
              min={64}
              onChange={(e) => onChange(parseInt(e.target.value || '0', 10), height)}
            />
          </InlineField>
          <InlineField label="height">
            <InlineNumberInput
              value={height || ''}
              step={64}
              min={64}
              onChange={(e) => onChange(width, parseInt(e.target.value || '0', 10))}
            />
          </InlineField>
        </div>
      )}
    </InlineField>
  )
}

interface InputControlProps {
  inputKey: string
  value: unknown
  isImage: boolean
  onChange: (value: unknown) => void
}

function InputControl({ inputKey, value, isImage, onChange }: InputControlProps) {
  if (isImage) return <InlineImagePicker label={inputKey} value={value} onChange={onChange} />
  // Seed gets the dice button
  if (inputKey.toLowerCase() === 'seed') {
    return (
      <InlineField label={inputKey}>
        <InlineSeedInput value={value} onChange={(n) => onChange(n)} />
      </InlineField>
    )
  }
  if (NUMBER_KEYS.test(inputKey)) {
    return (
      <InlineField label={inputKey}>
        <InlineNumberInput
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
      </InlineField>
    )
  }
  if (TEXTAREA_KEYS.test(inputKey)) {
    return (
      <InlineField label={inputKey}>
        <InlineTextArea
          value={String(value ?? '')}
          rows={2}
          onChange={(e) => onChange(e.target.value)}
        />
      </InlineField>
    )
  }
  return (
    <InlineField label={inputKey}>
      <InlineTextInput
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    </InlineField>
  )
}

function InlineImagePicker({
  label,
  value,
  onChange,
}: {
  label: string
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
    <InlineField label={label}>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        onChange={(e) => void handlePick(e)}
        className="hidden"
      />
      {token ? (
        <div className="nodrag flex flex-col gap-1">
          <img
            src={previewUrl}
            alt={label}
            className="max-h-24 w-full rounded-md border border-white/10 object-contain"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 self-start font-mono text-[9px] uppercase tracking-wider text-vw-console-gold transition-colors hover:text-vw-signal-warning disabled:opacity-50"
          >
            <ImagePlus className="h-2.5 w-2.5" />
            {uploading ? 'Uploading' : 'Change'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="nodrag flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/15 bg-vw-console-bg/40 px-2 py-3 text-white/55 transition-colors hover:border-vw-console-violet/40 hover:text-white"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          <span className="font-mono text-[9px] uppercase tracking-wider">
            {uploading ? 'Uploading' : 'Upload'}
          </span>
        </button>
      )}
      {error && (
        <span className="flex items-center gap-1 font-mono text-[9px] text-vw-signal-alert">
          <AlertCircle className="h-2.5 w-2.5" />
          {error}
        </span>
      )}
    </InlineField>
  )
}

function InlineResultGallery({ urls, label }: { urls: string[]; label: string }) {
  if (urls.length === 1) {
    return (
      <a
        href={urls[0]}
        target="_blank"
        rel="noreferrer"
        title="Open full size"
        className="nodrag block"
      >
        <img
          src={urls[0]}
          alt={label}
          className="max-h-48 w-full rounded-md border border-vw-console-border object-contain"
        />
      </a>
    )
  }
  return (
    <div className="nodrag">
      <div className="grid grid-cols-2 gap-1">
        {urls.slice(0, 6).map((u, i) => (
          <a
            key={u}
            href={u}
            target="_blank"
            rel="noreferrer"
            title={`Output ${i + 1}`}
            className="block leading-none"
          >
            <img
              src={u}
              alt={`${label} ${i + 1}`}
              className="h-20 w-full rounded-md border border-vw-console-border object-cover"
            />
          </a>
        ))}
        {urls.length > 6 && (
          <div className="flex items-center justify-center rounded-md border border-dashed border-vw-console-border font-mono text-[11px] text-white/55">
            +{urls.length - 6}
          </div>
        )}
      </div>
      <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-white/45">
        {urls.length} images
      </span>
    </div>
  )
}
