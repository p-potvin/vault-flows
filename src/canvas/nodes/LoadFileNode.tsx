import type { NodeProps, Node } from '@xyflow/react'
import { File as FileIcon, Upload } from 'lucide-react'

import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useFlowStore } from '@/store/flowStore'
import { InlineField, InlineTextInput } from './inline'

type LoadFileNodeData = FlowNode & { [key: string]: unknown }

/**
 * Load an arbitrary file. Two ways to populate `file_ref`:
 *   1. Pick a local file — we capture its name and mime so the run-time
 *      can stage an upload (token resolution happens server-side).
 *   2. Paste an existing server-side path or signed ref directly.
 */
export function LoadFileNode({ data }: NodeProps<Node<LoadFileNodeData>>) {
  const meta = NODE_REGISTRY['load_file']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)

  const fileRef = typeof data.params?.file_ref === 'string' ? data.params.file_ref : ''
  const filename = typeof data.params?.filename === 'string' ? data.params.filename : ''
  const mime = typeof data.params?.mime === 'string' ? data.params.mime : ''

  function handleFile(file: File | undefined) {
    if (!file) return
    // Stage a client-side ref. Server-side upload-token resolution lives in
    // the runner; here we just record what the user picked so the inspector
    // and runner can act on it.
    updateNodeParam(data.id, 'filename', file.name)
    updateNodeParam(data.id, 'mime', file.type || '')
    updateNodeParam(data.id, 'file_ref', `local:${file.name}`)
  }

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <InlineField label="file">
        <label
          className="nodrag flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-vw-console-bg/70 px-2 py-1.5 text-[10px] text-white/65 transition-colors hover:border-vw-console-gold/40 hover:text-vw-console-gold"
          title="Pick a file"
        >
          <Upload className="h-3 w-3" />
          <span className="truncate">{filename || 'Choose a file…'}</span>
          <input
            type="file"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </InlineField>

      <InlineField label="ref">
        <InlineTextInput
          value={fileRef}
          placeholder="local:filename or /path/to/file"
          onChange={(e) => updateNodeParam(data.id, 'file_ref', e.target.value)}
          className="font-mono"
        />
      </InlineField>

      {(filename || mime) && (
        <div className="mt-0.5 flex items-center gap-1 truncate font-mono text-[9px] text-white/35">
          <FileIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{filename}</span>
          {mime && <span className="text-white/25">· {mime}</span>}
        </div>
      )}
    </BaseNode>
  )
}
