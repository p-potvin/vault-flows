import { useCallback, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useFlowStore } from '@/store/flowStore'
import type { FlowNode, FlowEdge } from '@/nodes/types'
import { nodeTypes } from './nodeTypes'

// ─── Conversion helpers ───────────────────────────────────────────────────────

function flowNodeToRF(fn: FlowNode): Node {
  return {
    id: fn.id,
    type: fn.type,
    position: fn.position,
    // Spread FlowNode into data; cast via unknown so TS doesn't complain
    // about overlap with Record<string,unknown>
    data: fn as unknown as Record<string, unknown>,
  }
}

function rfNodeToFlow(n: Node): FlowNode {
  // data was originally a FlowNode, cast it back
  return {
    ...(n.data as unknown as FlowNode),
    id: n.id,
    position: n.position,
  }
}

function flowEdgeToRF(fe: FlowEdge): Edge {
  return {
    id: fe.id,
    source: fe.source,
    sourceHandle: fe.sourceHandle,
    target: fe.target,
    targetHandle: fe.targetHandle,
  }
}

function rfEdgeToFlow(e: Edge): FlowEdge {
  return {
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle ?? '',
    target: e.target,
    targetHandle: e.targetHandle ?? '',
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

// @xyflow/react v12 ships with JSX.Element return types that clash with
// @types/react v19's stricter JSX namespace. Cast the component so TS
// treats it as a plain React functional component.
const RF = ReactFlow as unknown as React.ComponentType<React.ComponentProps<typeof ReactFlow>>

export function FlowCanvas() {
  const storeNodes = useFlowStore((s) => s.nodes)
  const storeEdges = useFlowStore((s) => s.edges)
  const setStoreNodes = useFlowStore((s) => s.setNodes)
  const setStoreEdges = useFlowStore((s) => s.setEdges)
  const selectNode = useFlowStore((s) => s.selectNode)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>(
    storeNodes.map(flowNodeToRF),
  )
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>(
    storeEdges.map(flowEdgeToRF),
  )

  // Keep RF state in sync when the store is updated externally (e.g. preset load)
  useEffect(() => {
    setRfNodes(storeNodes.map(flowNodeToRF))
  }, [storeNodes, setRfNodes])

  useEffect(() => {
    setRfEdges(storeEdges.map(flowEdgeToRF))
  }, [storeEdges, setRfEdges])

  // Push RF changes back into the Zustand store
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      setRfNodes((current) => {
        setStoreNodes(current.map(rfNodeToFlow))
        return current
      })
    },
    [onNodesChange, setRfNodes, setStoreNodes],
  )

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes)
      setRfEdges((current) => {
        setStoreEdges(current.map(rfEdgeToFlow))
        return current
      })
    },
    [onEdgesChange, setRfEdges, setStoreEdges],
  )

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      selectNode(node.id)
    },
    [selectNode],
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  return (
    <div className="h-full w-full">
      <RF
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode="Delete"
        style={{ background: 'var(--background)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--border)"
        />
        <Controls
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 8px)',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as Partial<FlowNode>
            const colorMap: Record<string, string> = {
              input: 'var(--accent)',
              llm: 'var(--info)',
              transform: 'var(--warning)',
              output: 'var(--success)',
              display: 'var(--text-secondary)',
            }
            return (data.type && colorMap[data.type]) ? colorMap[data.type]! : 'var(--surface-elevated)'
          }}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md, 8px)',
          }}
          maskColor="rgba(0,0,0,0.25)"
        />
      </RF>
    </div>
  )
}
