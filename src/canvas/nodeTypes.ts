import type { NodeTypes } from '@xyflow/react'
import { InputNode } from './nodes/InputNode'
import { ImageInputNode } from './nodes/ImageInputNode'
import { LoadTextNode } from './nodes/LoadTextNode'
import { LoadFileNode } from './nodes/LoadFileNode'
import { LLMNode } from './nodes/LLMNode'
import { ModelCallNode } from './nodes/ModelCallNode'
import { ComfyUIWorkflowNode } from './nodes/ComfyUIWorkflowNode'
import { TransformNode } from './nodes/TransformNode'
import { OutputNode } from './nodes/OutputNode'
import { DisplayNode } from './nodes/DisplayNode'

export const nodeTypes: NodeTypes = {
  input: InputNode,
  image_input: ImageInputNode,
  load_text: LoadTextNode,
  load_file: LoadFileNode,
  llm: LLMNode,                       // legacy alias for model_call+ollama
  model_call: ModelCallNode,
  comfyui_workflow: ComfyUIWorkflowNode,
  transform: TransformNode,
  output: OutputNode,
  display: DisplayNode,
}
