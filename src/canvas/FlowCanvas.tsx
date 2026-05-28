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

  // Sync store → rfNodes for DATA changes (params, label) — keeps inline form
  // controls reactive to store updates. We intentionally do NOT touch
  // position/measured/selected fields here; React Flow owns those, and
  // overwriting them mid-measure causes the visibility:hidden feedback loop.
  // Identity-checks on params/label avoid unnecessary node re-renders.
  useEffect(() => {
    setRfNodes((current) => {
      let changed = false
      const next = current.map((rfNode) => {
        const storeNode = storeNodes.find((n) => n.id === rfNode.id)
        if (!storeNode) return rfNode
        const oldData = rfNode.data as unknown as FlowNode
        if (oldData.params === storeNode.params && oldData.label === storeNode.label) {
          return rfNode
        }
        changed = true
        return {
          ...rfNode,
          data: { ...storeNode } as unknown as Record<string, unknown>,
        }
      })
      return changed ? next : current
    })
  }, [storeNodes, setRfNodes])

  // Push position changes back into the Zustand store.
  // Dimension/selection changes are RF-internal — syncing them back would
  // reset nodes before RF finishes measuring, causing permanent visibility:hidden.
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes)
      if (changes.some((c) => c.type === 'position')) {
        setRfNodes((current) => {
          setStoreNodes(current.map(rfNodeToFlow))
          return current
        })
      }
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
        style={{ background: 'transparent' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="rgba(255,255,255,0.06)"
        />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as Partial<FlowNode>
            const colorMap: Record<string, string> = {
              input: 'var(--vault-console-gold)',
              image_input: 'var(--vault-console-gold)',
              llm: 'var(--vault-console-violet)',
              model_call: 'var(--vault-console-violet)',
              comfyui_workflow: 'var(--vault-console-gold)',
              transform: 'var(--vault-signal-relay)',
              output: 'var(--vault-signal-online)',
              display: 'var(--vault-signal-online)',
            }
            return (data.type && colorMap[data.type]) ? colorMap[data.type]! : 'rgba(255,255,255,0.3)'
          }}
          maskColor="rgba(0,0,0,0.4)"
        />
      </RF>
    </div>
  )
}
