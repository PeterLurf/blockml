import React, { useCallback, useEffect } from "react"
import ReactFlow, {
  Background,
  Connection,
  Edge,
  MarkerType,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Node,
  Controls,
  MiniMap,
} from "reactflow"
import "reactflow/dist/style.css"

import { useBlockMLStore } from "@/lib/store"
import { BLOCK_DEFINITIONS, TensorValidator } from "@/lib/tensor-validation"
import { MLBlockNode } from "@/components/nodes/ml-block-node"

/**
 * External public API expected by the rest of the app.
 */
export interface GraphEditorProps {
  isTraining: boolean
}

/**
 * This component only renders <ReactFlowProvider>. The real implementation lives
 * in the inner component so we can freely use the `useReactFlow` hook provided
 * by React Flow without running into the "hook outside of provider" error.
 */
export function GraphEditor({ isTraining }: GraphEditorProps) {
  return (
    <ReactFlowProvider>
      <GraphEditorInner isTraining={isTraining} />
    </ReactFlowProvider>
  )
}

/**
 * Inner implementation that actually renders the canvas.
 * Currently the `isTraining` flag is not used inside the editor itself but it
 * remains part of the public API so we can, in the future, lock the canvas
 * while the model is training.
 */
function GraphEditorInner({ isTraining }: GraphEditorProps) {
  /** ------------------------------------------------------------------
   *  Global store integration
   * -----------------------------------------------------------------*/
  const {
    nodes: initialStoreNodes,
    edges: initialStoreEdges,
    setNodes: updateStoreNodes,
    setConnections: updateStoreEdges,
    setSelectedNode,
  } = useBlockMLStore()

  /** ------------------------------------------------------------------
   *  Local React Flow state
   * -----------------------------------------------------------------*/
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>(initialStoreNodes as unknown as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>(initialStoreEdges as unknown as Edge[])

  // Keep React Flow state in sync when the global store nodes change elsewhere (e.g., BlockInspector).
  const storeNodes = useBlockMLStore((s) => s.nodes)
  const storeEdges = useBlockMLStore((s) => s.edges)

  React.useEffect(() => {
    setNodes(storeNodes as unknown as Node[])
  }, [storeNodes, setNodes])

  React.useEffect(() => {
    setEdges(storeEdges as unknown as Edge[])
  }, [storeEdges, setEdges])

  // prettier-ignore
  const defaultEdgeOptions = React.useMemo(() => ({
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6', width: 16, height: 16 },
    style: { stroke: '#3b82f6', strokeWidth: 2 },
  }), [])

  /**
   * Keep the global Zustand store in sync so that other panels (training,
   * export, etc.) always see the latest graph state.
   */
  useEffect(() => {
    updateStoreNodes(nodes as any)
  }, [nodes, updateStoreNodes])

  useEffect(() => {
    updateStoreEdges(edges as any)
  }, [edges, updateStoreEdges])

  /** ------------------------------------------------------------------
   *  Drag-and-drop support
   * -----------------------------------------------------------------*/
  const { project } = useReactFlow()

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const blockType =
        event.dataTransfer.getData("application/blockml") || event.dataTransfer.getData("text/plain")

      if (!blockType) return

      const blockDef = BLOCK_DEFINITIONS[blockType]
      if (!blockDef) return

      // Convert screen coordinates to the React Flow internal coordinate space.
      const position = project({ x: event.clientX, y: event.clientY })

      const newNode: Node = {
        id: `${blockType}-${Date.now()}`,
        type: "mlBlock",
        position,
        data: {
          blockType,
          label: blockType,
          inputs: blockDef.inputs.map((i) => i.name),
          outputs: blockDef.outputs.map((o) => o.name),
          parameters: { ...blockDef.parameters },
        },
      }

      setNodes((nds: Node[]): Node[] => nds.concat(newNode))
    },
    [project, setNodes],
  )

  /** ------------------------------------------------------------------
   *  Connection / edge handling with validation
   * -----------------------------------------------------------------*/
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges((eds: Edge[]): Edge[] => {
        // Validate the prospective connection.
        const sourceNode = nodes.find((n: Node) => n.id === params.source)
        const targetNode = nodes.find((n: Node) => n.id === params.target)

        let isValid = true
        let validationError: string | undefined

        if (sourceNode && targetNode) {
          const validation = TensorValidator.validateConnection(
            sourceNode as any,
            params.sourceHandle || "",
            targetNode as any,
            params.targetHandle || "",
          )
          isValid = validation.isValid
          validationError = validation.error
        }

        const styledEdge: Edge = {
          ...(params as Edge),
          style: isValid
            ? { stroke: "#3b82f6", strokeWidth: 2 }
            : { stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "4 2" },
          markerEnd: { type: MarkerType.ArrowClosed, color: isValid ? "#3b82f6" : "#ef4444" },
          data: { isValid, validationError },
        }

        return addEdge(styledEdge, eds)
      })
    },
    [nodes, setEdges],
  )

  /** ------------------------------------------------------------------
   *  Node type registration
   * -----------------------------------------------------------------*/
  const nodeTypes = { mlBlock: MLBlockNode }

  /** ------------------------------------------------------------------
   *  Selection handling
   * -----------------------------------------------------------------*/
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      // Make sure the global store has the freshest copy of nodes before we mark the selection.
      updateStoreNodes(nodes as any)
      setSelectedNode(node.id)
    },
    [nodes, updateStoreNodes, setSelectedNode],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  /** ------------------------------------------------------------------
   *  Render
   * -----------------------------------------------------------------*/
  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        defaultEdgeOptions={defaultEdgeOptions as any}
        fitView
        panOnDrag
        zoomOnScroll
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} size={1} color="#e5e7eb" />
        <MiniMap
          zoomable
          pannable
          nodeColor="#60a5fa"
        />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  )
} 