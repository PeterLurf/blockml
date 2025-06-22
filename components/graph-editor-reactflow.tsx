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
  const skipStoreSync = React.useRef(false)
  useEffect(() => {
    if (skipStoreSync.current) {
      skipStoreSync.current = false
      return
    }
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
  // Validate connection live and block illegal ones
  const isValidConnection = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n: Node) => n.id === connection.source)
      const targetNode = nodes.find((n: Node) => n.id === connection.target)
      if (!sourceNode || !targetNode) return false
      return TensorValidator.validateConnection(
        sourceNode as any,
        connection.sourceHandle || "",
        targetNode as any,
        connection.targetHandle || "",
      ).isValid
    },
    [nodes],
  )

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

        // Only add edge if validator marks it valid
        if (!isValid) return eds;
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
   *  Compatibility highlighting
   * -----------------------------------------------------------------*/
  const selectedNodeId = useBlockMLStore((s) => s.selectedNodeId)
  const prevCompat = React.useRef<Set<string>>(new Set())

  useEffect(() => {
    // Compute and update compatibility status on every selection or node list change
    if (!selectedNodeId) {
      // Clear compatibility flags
      const cleared = nodes.map((n) =>
        (n.data as any)?.isCompatible ? { ...n, data: { ...(n.data as any), isCompatible: false } } : n,
      )
      // update only if something changed
      const changed = cleared.some((c, idx) => c !== nodes[idx])
      if (changed) {
        skipStoreSync.current = true
        setNodes(cleared)
      }
      return
    }

    const selectedNode = nodes.find((n) => n.id === selectedNodeId)
    if (!selectedNode) return

    // Build a set of compatible node ids
    const compatibleIds: Set<string> = new Set()

    nodes.forEach((other) => {
      const selData = selectedNode.data as any
      const selOutputs: string[] = Array.isArray(selData.outputs) ? selData.outputs : []
      const selInputs: string[] = Array.isArray(selData.inputs) ? selData.inputs : []
      const otherData = other.data as any
      const otherOutputs: string[] = Array.isArray(otherData.outputs) ? otherData.outputs : []
      const otherInputs: string[] = Array.isArray(otherData.inputs) ? otherData.inputs : []
      if (other.id === selectedNodeId) return
      let compatible = false
      // Selected -> other
      selOutputs.forEach((out: string) => {
        otherInputs.forEach((inp: string) => {
          if (
            TensorValidator.validateConnection(
              selectedNode as any,
              out,
              other as any,
              inp,
            ).isValid
          ) {
            compatible = true
          }
        })
      })
      // Other -> selected
      otherOutputs.forEach((out: string) => {
        selInputs.forEach((inp: string) => {
          if (
            TensorValidator.validateConnection(other as any, out, selectedNode as any, inp).isValid
          ) {
            compatible = true
          }
        })
      })
      if (compatible) compatibleIds.add(other.id)
    })

    // Only continue if compatibleIds actually changed
    const prev = prevCompat.current
    const sameSize = prev.size === compatibleIds.size
    let same = sameSize
    if (same) {
      for (const id of compatibleIds) {
        if (!prev.has(id)) {
          same = false
          break
        }
      }
    }
    if (same) return

    prevCompat.current = compatibleIds

    // Prepare updated nodes array
    const updated = nodes.map((n) => {
      const isCompatible = compatibleIds.has(n.id)
      return isCompatible === (n.data as any)?.isCompatible ? n : { ...n, data: { ...(n.data as any), isCompatible } }
    })
    // Trigger state update
    skipStoreSync.current = true
    setNodes(updated)
  }, [selectedNodeId, nodes.length])

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
        onSelectionChange={(params) => {
          const first = Array.isArray(params.nodes) && params.nodes.length ? params.nodes[0].id : null;
          setSelectedNode(first ?? null);
        }}
        defaultEdgeOptions={defaultEdgeOptions as any}
        isValidConnection={isValidConnection}
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