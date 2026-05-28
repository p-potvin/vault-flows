import { useRef, useState } from 'react'
import type { NodeProps, Node } from '@xyflow/react'
import { Upload, Loader2, ImagePlus, AlertCircle } from 'lucide-react'

import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useFlowStore } from '@/store/flowStore'
import { uploadImage, uploadPreviewUrl } from '@/api/client'

type ImageInputNodeData = FlowNode & { [key: string]: unknown }

export function ImageInputNode({ data }: NodeProps<Node<ImageInputNodeData>>) {
  const meta = NODE_REGISTRY['image_input']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewUrl = typeof data.params?.preview_url === 'string' ? data.params.preview_url : ''
  const filename = typeof data.params?.filename === 'string' ? data.params.filename : ''
  const hasUpload = previewUrl && filename

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      const res = await uploadImage(file)
      updateNodeParam(data.id, 'image_ref', res.token)
      updateNodeParam(data.id, 'preview_url', uploadPreviewUrl(res.token))
      updateNodeParam(data.id, 'filename', res.filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function pick(ev: React.MouseEvent) {
    ev.stopPropagation()
    fileRef.current?.click()
  }

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
        onChange={(e) => void handleFile(e)}
        className="hidden"
      />
      {hasUpload ? (
        <div className="nodrag flex flex-col gap-1">
          <img
            src={previewUrl}
            alt={filename}
            className="max-h-32 w-full rounded-md border border-white/10 object-contain"
          />
          <span
            className="truncate font-mono text-[10px] text-white/55"
            title={filename}
          >
            {filename}
          </span>
          <button
            type="button"
            onClick={pick}
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
          onClick={pick}
          disabled={uploading}
          className="nodrag flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-white/15 bg-vw-console-bg/40 px-2 py-4 text-white/55 transition-colors hover:border-vw-console-violet/40 hover:text-white"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider">
            {uploading ? 'Uploading' : 'Upload image'}
          </span>
        </button>
      )}
      {error && (
        <p className="mt-1 flex items-center gap-1 font-mono text-[9px] text-vw-signal-alert" title={error}>
          <AlertCircle className="h-2.5 w-2.5" />
          {error}
        </p>
      )}
    </BaseNode>
  )
}
