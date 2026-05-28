import type { NodeProps, Node } from '@xyflow/react'
import { AlertCircle, FileText } from 'lucide-react'

import { BaseNode } from './BaseNode'
import { useFlowStore } from '@/store/flowStore'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'

type DisplayNodeData = FlowNode & { [key: string]: unknown }

export function DisplayNode({ data }: NodeProps<Node<DisplayNodeData>>) {
  const meta = NODE_REGISTRY['display']
  const executionResults = useFlowStore((s) => s.executionResults)
  const result = executionResults.find((r) => r.nodeId === data.id)

  if (!result) {
    return (
      <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
        <p className="font-mono text-[10px] italic text-white/35">No result yet</p>
      </BaseNode>
    )
  }

  if (result.error) {
    return (
      <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
        <div className="flex items-start gap-1.5">
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-vw-signal-alert" />
          <p
            className="line-clamp-4 break-words font-sans text-xs text-vw-signal-alert"
            title={result.error}
          >
            {result.error}
          </p>
        </div>
      </BaseNode>
    )
  }

  // Image preview (single or gallery)
  if (result.kind === 'image' && result.imageUrl) {
    const urls =
      result.imageUrls && result.imageUrls.length > 0 ? result.imageUrls : [result.imageUrl]
    const isGallery = urls.length > 1

    return (
      <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
        {isGallery ? (
          <div className="grid max-w-[240px] grid-cols-2 gap-1">
            {urls.slice(0, 6).map((u, i) => (
              <a
                key={u}
                href={u}
                target="_blank"
                rel="noreferrer"
                title={`Output ${i + 1} — open full size`}
                className="block leading-none"
              >
                <img
                  src={u}
                  alt={`${data.label ?? 'output'} ${i + 1}`}
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
        ) : (
          <a href={urls[0]} target="_blank" rel="noreferrer" title="Open full size">
            <img
              src={urls[0]}
              alt={data.label ?? 'output'}
              className="max-h-40 max-w-[220px] rounded-md border border-vw-console-border object-contain"
            />
          </a>
        )}
        {isGallery && (
          <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/45">
            {urls.length} images
          </span>
        )}
      </BaseNode>
    )
  }

  // JSON / job_result
  if ((result.kind === 'json' || result.kind === 'job_result') && result.data) {
    return (
      <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
        <pre
          className="line-clamp-6 break-words whitespace-pre-wrap font-mono text-[10px] text-white/75"
          title={JSON.stringify(result.data, null, 2)}
        >
          {JSON.stringify(result.data, null, 2).slice(0, 280)}
        </pre>
      </BaseNode>
    )
  }

  // File reference
  if (result.kind === 'file' && result.fileRef) {
    return (
      <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
        <div className="flex items-center gap-1.5">
          <FileText className="h-3 w-3 flex-shrink-0 text-vw-console-gold" />
          <span
            className="truncate font-mono text-[10px] text-vw-console-gold"
            title={result.fileRef}
          >
            {result.fileRef}
          </span>
        </div>
      </BaseNode>
    )
  }

  // Default: text output
  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <p
        className="line-clamp-4 break-words font-sans text-xs leading-snug text-white/85"
        title={result.output}
      >
        {result.output}
      </p>
    </BaseNode>
  )
}
