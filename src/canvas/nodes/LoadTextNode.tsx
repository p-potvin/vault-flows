import type { NodeProps, Node } from '@xyflow/react'
import { FileText, Upload } from 'lucide-react'

import { BaseNode } from './BaseNode'
import type { FlowNode } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
import { useFlowStore } from '@/store/flowStore'
import { InlineField, InlineSelect, InlineTextArea } from './inline'

type LoadTextNodeData = FlowNode & { [key: string]: unknown }

/**
 * Load text from a local .txt/.md file (read fully via FileReader) or from
 * a pasted inline blob. Output is `value` either way — the source toggle is
 * just a UI affordance so the user knows where the content came from.
 */
export function LoadTextNode({ data }: NodeProps<Node<LoadTextNodeData>>) {
  const meta = NODE_REGISTRY['load_text']
  const updateNodeParam = useFlowStore((s) => s.updateNodeParam)

  const source = data.params?.source === 'file' ? 'file' : 'inline'
  const value = typeof data.params?.value === 'string' ? data.params.value : ''
  const filename = typeof data.params?.filename === 'string' ? data.params.filename : ''

  function handleFile(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      updateNodeParam(data.id, 'value', text)
      updateNodeParam(data.id, 'filename', file.name)
    }
    reader.readAsText(file)
  }

  return (
    <BaseNode nodeId={data.id} label={data.label ?? meta.label} color={meta.color}>
      <InlineField label="source">
        <InlineSelect
          value={source}
          onChange={(e) => updateNodeParam(data.id, 'source', e.target.value)}
        >
          <option value="inline">Inline (paste text)</option>
          <option value="file">File (.txt / .md)</option>
        </InlineSelect>
      </InlineField>

      {source === 'file' ? (
        <InlineField label="file">
          <label
            className="nodrag flex cursor-pointer items-center gap-1.5 rounded-md border border-white/10 bg-vw-console-bg/70 px-2 py-1.5 text-[10px] text-white/65 transition-colors hover:border-vw-console-gold/40 hover:text-vw-console-gold"
            title="Pick a text file"
          >
            <Upload className="h-3 w-3" />
            <span className="truncate">{filename || 'Choose a text file…'}</span>
            <input
              type="file"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {value && (
            <div className="mt-1 flex items-center gap-1 font-mono text-[9px] text-white/35">
              <FileText className="h-3 w-3" />
              {value.length.toLocaleString()} chars loaded
            </div>
          )}
        </InlineField>
      ) : (
        <InlineField label="text">
          <InlineTextArea
            value={value}
            rows={4}
            placeholder="Paste text content…"
            onChange={(e) => updateNodeParam(data.id, 'value', e.target.value)}
          />
        </InlineField>
      )}
    </BaseNode>
  )
}
