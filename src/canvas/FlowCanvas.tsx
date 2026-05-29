import { useCallback, useEffect, useRef, type DragEvent } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useFlowStore } from '@/store/flowStore'
import type { FlowNode, FlowEdge, NodeType } from '@/nodes/types'
import { NODE_REGISTRY } from '@/nodes/registry'
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
  // ReactFlowProvider is required so the inner canvas can use useReactFlow()
  // (which we need for screenToFlowPosition during drag-drop from the
  // NodeBrowserSidebar).
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  )
}

function FlowCanvasInner() {
  const storeNodes = useFlowStore((s) => s.nodes)
  const storeEdges = useFlowStore((s) => s.edges)
  const setStoreNodes = useFlowStore((s) => s.setNodes)
  const setStoreEdges = useFlowStore((s) => s.setEdges)
  const selectNode = useFlowStore((s) => s.selectNode)
  const addNode = useFlowStore((s) => s.addNode)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

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
  //
  // We also reconcile additions (NodeBrowserSidebar.addNode) and removals
  // (canvas Delete key) here — without that, new nodes pushed into the
  // store after mount never render because rfNodes was only initialized
  // from storeNodes at mount time.
  useEffect(() => {
    setRfNodes((current) => {
      let changed = false
      const byId = new Map(current.map((n) => [n.id, n]))
      const next: Node[] = []
      for (const storeNode of storeNodes) {
        const existing = byId.get(storeNode.id)
        if (!existing) {
          changed = true
          next.push(flowNodeToRF(storeNode))
          continue
        }
        const oldData = existing.data as unknown as FlowNode
        if (oldData.params === storeNode.params && oldData.label === storeNode.label) {
          next.push(existing)
          continue
        }
        changed = true
        next.push({
          ...existing,
          data: { ...storeNode } as unknown as Record<string, unknown>,
        })
      }
      // Detect removals — any rfNode whose id is no longer in the store.
      if (!changed && next.length !== current.length) changed = true
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

  // ─── Drag-drop from NodeBrowserSidebar ───────────────────────────────────
  // The sidebar sets `application/vault-flows-node` to the NodeType. We
  // accept the drop, resolve the screen point to graph coordinates, and
  // call the store's addNode so the new node lands where the user dropped.
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      const type = event.dataTransfer.getData('application/vault-flows-node')
      if (!type || !(type in NODE_REGISTRY)) return
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      addNode(type as NodeType, position)
    },
    [addNode, screenToFlowPosition],
  )

  return (
    <div className="h-full w-full" ref={wrapperRef} onDragOver={onDragOver} onDrop={onDrop}>
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
              load_text: 'var(--vault-console-gold)',
              load_file: 'var(--vault-console-gold)',
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
