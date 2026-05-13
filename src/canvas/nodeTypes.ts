import type { NodeTypes } from '@xyflow/react'
import { InputNode } from './nodes/InputNode'
import { LLMNode } from './nodes/LLMNode'
import { TransformNode } from './nodes/TransformNode'
import { OutputNode } from './nodes/OutputNode'
import { DisplayNode } from './nodes/DisplayNode'

export const nodeTypes: NodeTypes = {
  input: InputNode,
  llm: LLMNode,
  transform: TransformNode,
  output: OutputNode,
  display: DisplayNode,
}
