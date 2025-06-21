"use client"

import type React from "react"

import { useRef, useState, useCallback, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ZoomIn, ZoomOut, Maximize, Trash2, AlertTriangle, CheckCircle, Move } from "lucide-react"
import { useBlockMLStore } from "@/lib/store"
import { TensorValidator, BLOCK_DEFINITIONS, type ValidationResult } from "@/lib/tensor-validation"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Position {
  x: number
  y: number
}

interface BlockNode {
  id: string
  type: string
  position: Position
  data: {
    blockType: string
    label: string
    inputs: string[]
    outputs: string[]
    parameters: Record<string, any>
  }
}

interface Connection {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  isValid?: boolean
  validationError?: string
}

interface GraphEditorProps {
  isTraining: boolean
}

export function GraphEditor({ isTraining }: GraphEditorProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [connections, setConnections] = useState<Connection[]>([])
  const [connecting, setConnecting] = useState<{
    nodeId: string
    handle: string
    type: "input" | "output"
    startPosition: Position
  } | null>(null)
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 })
  const [validationErrors, setValidationErrors] = useState<ValidationResult[]>([])
  const [hoveredPort, setHoveredPort] = useState<{
    nodeId: string
    port: string
    type: "input" | "output"
  } | null>(null)
  const [compatiblePorts, setCompatiblePorts] = useState<Set<string>>(new Set())

  const { nodes, setNodes, addNode, removeNode, setConnections: setStoreConnections } = useBlockMLStore()

  // Update store connections when local connections change
  useEffect(() => {
    setStoreConnections(connections)
  }, [connections, setStoreConnections])

  const validateAllConnections = useCallback(() => {
    const errors = TensorValidator.validateGraph(nodes, connections)
    setValidationErrors(errors)
  }, [nodes, connections])

  const findCompatiblePorts = useCallback(
    (sourceNodeId: string, sourcePort: string, sourceType: "input" | "output") => {
      const compatible = new Set<string>()
      const sourceNode = nodes.find((n) => n.id === sourceNodeId)
      if (!sourceNode) return compatible

      nodes.forEach((targetNode) => {
        if (targetNode.id === sourceNodeId) return

        const targetPorts = sourceType === "output" ? targetNode.data.inputs : targetNode.data.outputs
        const targetType = sourceType === "output" ? "input" : "output"

        targetPorts.forEach((targetPort) => {
          const validation = TensorValidator.validateConnection(
            sourceType === "output" ? sourceNode : targetNode,
            sourceType === "output" ? sourcePort : targetPort,
            sourceType === "input" ? sourceNode : targetNode,
            sourceType === "input" ? sourcePort : targetPort,
          )

          if (validation.isValid) {
            compatible.add(`${targetNode.id}-${targetPort}-${targetType}`)
          }
        })
      })

      return compatible
    },
    [nodes],
  )

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const canvasBounds = canvasRef.current?.getBoundingClientRect()
      if (canvasBounds) {
        setMousePosition({
          x: (e.clientX - canvasBounds.left - pan.x) / zoom,
          y: (e.clientY - canvasBounds.top - pan.y) / zoom,
        })
      }
    }

    const handleMouseUp = () => {
      if (connecting) {
        setConnecting(null)
        setCompatiblePorts(new Set())
      }
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [connecting, pan, zoom])

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target === canvasRef.current || e.target === svgRef.current) && !connecting) {
        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
        setSelectedNode(null)
      }
    },
    [pan, connecting],
  )

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && !draggedNode && !connecting) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        })
      }

      // Handle node dragging
      if (draggedNode) {
        const deltaX = (e.clientX - dragStart.x) / zoom
        const deltaY = (e.clientY - dragStart.y) / zoom

        setNodes(
          nodes.map((node) =>
            node.id === draggedNode
              ? {
                  ...node,
                  position: {
                    x: node.position.x + deltaX,
                    y: node.position.y + deltaY,
                  },
                }
              : node,
          ),
        )

        setDragStart({ x: e.clientX, y: e.clientY })
      }
    },
    [isDragging, dragStart, draggedNode, nodes, setNodes, zoom, connecting],
  )

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false)
    setDraggedNode(null)
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.2, 3))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.2, 0.3))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const handleFitToScreen = useCallback(() => {
    if (nodes.length === 0) return

    const canvasBounds = canvasRef.current?.getBoundingClientRect()
    if (!canvasBounds) return

    const minX = Math.min(...nodes.map((n) => n.position.x))
    const maxX = Math.max(...nodes.map((n) => n.position.x + 224))
    const minY = Math.min(...nodes.map((n) => n.position.y))
    const maxY = Math.max(...nodes.map((n) => n.position.y + 200))

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    const padding = 50
    const zoomX = (canvasBounds.width - padding * 2) / contentWidth
    const zoomY = (canvasBounds.height - padding * 2) / contentHeight
    const newZoom = Math.min(Math.min(zoomX, zoomY), 2)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2
    const newPanX = canvasBounds.width / 2 - centerX * newZoom
    const newPanY = canvasBounds.height / 2 - centerY * newZoom

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }, [nodes])

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const canvasBounds = canvasRef.current?.getBoundingClientRect()
      const blockType = event.dataTransfer.getData("application/blockml")

      if (!blockType || !canvasBounds) return

      const position = {
        x: (event.clientX - canvasBounds.left - pan.x) / zoom,
        y: (event.clientY - canvasBounds.top - pan.y) / zoom,
      }

      const blockDef = BLOCK_DEFINITIONS[blockType]
      if (!blockDef) return

      const newNode: BlockNode = {
        id: `${blockType}-${Date.now()}`,
        type: "mlBlock",
        position,
        data: {
          blockType,
          label: blockType,
          inputs: blockDef.inputs.map((input) => input.name),
          outputs: blockDef.outputs.map((output) => output.name),
          parameters: { ...blockDef.parameters },
        },
      }

      addNode(newNode)
    },
    [pan, zoom, addNode],
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const handleNodeMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedNode(nodeId)
    setDraggedNode(nodeId)
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    })
  }, [])

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      removeNode(nodeId)
      setConnections((prev) => prev.filter((conn) => conn.source !== nodeId && conn.target !== nodeId))
    },
    [removeNode],
  )

  const handlePortMouseDown = useCallback(
    (nodeId: string, handle: string, type: "input" | "output", e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      const node = nodes.find((n) => n.id === nodeId)
      if (!node) return

      // Get the actual screen position of the port
      const screenPos = getPortScreenPosition(node, handle, type)

      // Convert back to canvas coordinates for consistency
      const startPosition = {
        x: (screenPos.x - pan.x) / zoom,
        y: (screenPos.y - pan.y) / zoom,
      }

      setConnecting({ nodeId, handle, type, startPosition })
      const compatible = findCompatiblePorts(nodeId, handle, type)
      setCompatiblePorts(compatible)

      console.log("Starting connection:", { nodeId, handle, type, screenPos, startPosition })
    },
    [nodes, findCompatiblePorts, zoom, pan],
  )

  const handlePortMouseUp = useCallback(
    (nodeId: string, handle: string, type: "input" | "output", e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (connecting && connecting.nodeId !== nodeId && connecting.type !== type) {
        const sourceNode = nodes.find((n) => n.id === (connecting.type === "output" ? connecting.nodeId : nodeId))
        const targetNode = nodes.find((n) => n.id === (connecting.type === "input" ? connecting.nodeId : nodeId))

        if (sourceNode && targetNode) {
          const sourcePort = connecting.type === "output" ? connecting.handle : handle
          const targetPort = connecting.type === "input" ? connecting.handle : handle

          // Check if connection already exists
          const existingConnection = connections.find(
            (conn) =>
              conn.source === sourceNode.id &&
              conn.target === targetNode.id &&
              conn.sourceHandle === sourcePort &&
              conn.targetHandle === targetPort,
          )

          if (!existingConnection) {
            const validation = TensorValidator.validateConnection(sourceNode, sourcePort, targetNode, targetPort)

            const newConnection: Connection = {
              id: `${sourceNode.id}-${targetNode.id}-${sourcePort}-${targetPort}-${Date.now()}`,
              source: sourceNode.id,
              target: targetNode.id,
              sourceHandle: sourcePort,
              targetHandle: targetPort,
              isValid: validation.isValid,
              validationError: validation.error,
            }

            setConnections((prev) => [...prev, newConnection])
            console.log("Connection created:", newConnection)

            setTimeout(() => validateAllConnections(), 100)
          }
        }
      }

      setConnecting(null)
      setCompatiblePorts(new Set())
    },
    [connecting, nodes, connections, validateAllConnections],
  )

  const handlePortHover = useCallback((nodeId: string, port: string, type: "input" | "output") => {
    setHoveredPort({ nodeId, port, type })
  }, [])

  const handlePortLeave = useCallback(() => {
    setHoveredPort(null)
  }, [])

  const getPortTooltip = (nodeId: string, portName: string, type: "input" | "output") => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return null

    const blockDef = BLOCK_DEFINITIONS[node.data.blockType]
    if (!blockDef) return null

    const portDef = (type === "input" ? blockDef.inputs : blockDef.outputs).find((p) => p.name === portName)
    if (!portDef) return null

    const shapeStr = TensorValidator.getShapeString(portDef.shape)
    return `${portDef.description}\nShape: ${shapeStr}`
  }

  // Improved spline path generation
  const getSplinePath = (start: Position, end: Position) => {
    const dx = end.x - start.x
    const dy = end.y - start.y

    // Calculate control points for a smooth curve
    const distance = Math.sqrt(dx * dx + dy * dy)
    const controlOffset = Math.min(distance * 0.6, 150) // Limit control point distance

    // Horizontal control points for better flow
    const cp1x = start.x + controlOffset
    const cp1y = start.y
    const cp2x = end.x - controlOffset
    const cp2y = end.y

    return `M ${start.x} ${start.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${end.x} ${end.y}`
  }

  const getPortScreenPosition = (node: BlockNode, portName: string, type: "input" | "output"): Position => {
    const portIndex = type === "input" ? node.data.inputs.indexOf(portName) : node.data.outputs.indexOf(portName)

    // Calculate the actual screen position including zoom and pan
    const nodeScreenX = node.position.x * zoom + pan.x
    const nodeScreenY = node.position.y * zoom + pan.y

    // Port positioning: inputs on left (x=0), outputs on right (x=224*zoom)
    // Vertical position: header height (60px) + port spacing (32px each)
    const portX = nodeScreenX + (type === "output" ? 224 * zoom : 0)
    const portY = nodeScreenY + (60 + portIndex * 32) * zoom

    return { x: portX, y: portY }
  }

  return (
    <div className="w-full h-full relative bg-gray-100 overflow-hidden">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="absolute top-4 left-4 z-20 max-w-md">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-sm">
                    {error.error}
                  </div>
                ))}
                {validationErrors.length > 3 && (
                  <div className="text-sm">...and {validationErrors.length - 3} more errors</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <Button size="sm" variant="outline" onClick={validateAllConnections} title="Validate Connections">
          <CheckCircle className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleResetView} title="Reset View">
          <Maximize className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={handleFitToScreen} title="Fit to Screen">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </Button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 bg-white px-2 py-1 rounded text-xs border">
        {Math.round(zoom * 100)}%
      </div>

      {/* Connection status */}
      {connecting && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-blue-500 text-white px-3 py-1 rounded text-sm">
          Connecting {connecting.type} port "{connecting.handle}" - drag to target port
        </div>
      )}

      {/* Port Tooltip */}
      {hoveredPort && (
        <div className="absolute z-30 bg-black text-white text-xs p-2 rounded shadow-lg pointer-events-none whitespace-pre-line">
          {getPortTooltip(hoveredPort.nodeId, hoveredPort.port, hoveredPort.type)}
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Connections SVG */}
        <svg ref={svgRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
          {/* Existing connections */}
          {connections.map((connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source)
            const targetNode = nodes.find((n) => n.id === connection.target)

            if (!sourceNode || !targetNode) {
              return null
            }

            const sourcePos = getPortScreenPosition(sourceNode, connection.sourceHandle, "output")
            const targetPos = getPortScreenPosition(targetNode, connection.targetHandle, "input")

            const strokeColor = connection.isValid === false ? "#ef4444" : "#22c55e"
            const strokeWidth = connection.isValid === false ? "3" : "2.5"

            const path = getSplinePath(sourcePos, targetPos)

            return (
              <g key={connection.id}>
                {/* Connection shadow for depth */}
                <path
                  d={path}
                  stroke="rgba(0,0,0,0.1)"
                  strokeWidth={Number(strokeWidth) + 1}
                  fill="none"
                  transform="translate(1,1)"
                />
                {/* Main connection path */}
                <path
                  d={path}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={connection.isValid === false ? "8,4" : "none"}
                  markerEnd="url(#arrowhead)"
                  className="transition-all duration-200"
                />
                {/* Error indicator */}
                {connection.isValid === false && (
                  <circle
                    cx={(sourcePos.x + targetPos.x) / 2}
                    cy={(sourcePos.y + targetPos.y) / 2}
                    r="6"
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth="2"
                  />
                )}
              </g>
            )
          })}

          {/* Active connection being drawn */}
          {connecting && (
            <>
              <path
                d={getSplinePath(
                  {
                    x: connecting.startPosition.x * zoom + pan.x,
                    y: connecting.startPosition.y * zoom + pan.y,
                  },
                  {
                    x: mousePosition.x * zoom + pan.x,
                    y: mousePosition.y * zoom + pan.y,
                  },
                )}
                stroke="#3b82f6"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="8,4"
                markerEnd="url(#arrowhead-blue)"
                opacity="0.8"
              />
            </>
          )}

          <defs>
            <marker id="arrowhead" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
              <polygon points="0 0, 12 4, 0 8" fill="#22c55e" />
            </marker>
            <marker id="arrowhead-blue" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
              <polygon points="0 0, 12 4, 0 8" fill="#3b82f6" />
            </marker>
            <marker id="arrowhead-error" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
              <polygon points="0 0, 12 4, 0 8" fill="#ef4444" />
            </marker>
          </defs>
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className="absolute"
            style={{
              transform: `translate(${node.position.x * zoom + pan.x}px, ${node.position.y * zoom + pan.y}px) scale(${zoom})`,
              transformOrigin: "top left",
              zIndex: selectedNode === node.id ? 10 : 2,
            }}
          >
            <MLBlockNode
              node={node}
              isSelected={selectedNode === node.id}
              isTraining={isTraining}
              connecting={connecting}
              compatiblePorts={compatiblePorts}
              onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
              onDelete={() => handleDeleteNode(node.id)}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
              onPortHover={handlePortHover}
              onPortLeave={handlePortLeave}
            />
          </div>
        ))}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <h3 className="text-lg font-medium mb-2">Start Building Your Model</h3>
              <p className="text-sm">Drag blocks from the library or choose a template</p>
              <p className="text-xs mt-2 text-gray-400">
                Click and drag from output ports (right) to input ports (left)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MLBlockNodeProps {
  node: BlockNode
  isSelected: boolean
  isTraining: boolean
  connecting: { nodeId: string; handle: string; type: "input" | "output"; startPosition: Position } | null
  compatiblePorts: Set<string>
  onMouseDown: (e: React.MouseEvent) => void
  onDelete: () => void
  onPortMouseDown: (nodeId: string, handle: string, type: "input" | "output", e: React.MouseEvent) => void
  onPortMouseUp: (nodeId: string, handle: string, type: "input" | "output", e: React.MouseEvent) => void
  onPortHover: (nodeId: string, port: string, type: "input" | "output") => void
  onPortLeave: () => void
}

function MLBlockNode({
  node,
  isSelected,
  isTraining,
  connecting,
  compatiblePorts,
  onMouseDown,
  onDelete,
  onPortMouseDown,
  onPortMouseUp,
  onPortHover,
  onPortLeave,
}: MLBlockNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)

  const getBlockColor = (blockType: string) => {
    const colorMap: Record<string, string> = {
      Dense: "bg-blue-100 border-blue-300",
      Conv2D: "bg-green-100 border-green-300",
      MaxPooling2D: "bg-purple-100 border-purple-300",
      Dropout: "bg-yellow-100 border-yellow-300",
      Flatten: "bg-indigo-100 border-indigo-300",
      LSTM: "bg-red-100 border-red-300",
      Add: "bg-pink-100 border-pink-300",
      Concatenate: "bg-cyan-100 border-cyan-300",
      Activation: "bg-lime-100 border-lime-300",
      BatchNorm: "bg-teal-100 border-teal-300",
      LayerNorm: "bg-emerald-100 border-emerald-300",
      MultiHeadAttention: "bg-violet-100 border-violet-300",
      DataLoader: "bg-gray-100 border-gray-300",
      SGD: "bg-orange-100 border-orange-300",
      Adam: "bg-orange-100 border-orange-300",
      CrossEntropy: "bg-red-100 border-red-300",
      MSE: "bg-red-100 border-red-300",
    }
    return colorMap[blockType] || "bg-gray-100 border-gray-300"
  }

  const getPortColor = (portName: string, type: "input" | "output", isConnecting: boolean, isCompatible: boolean) => {
    if (isConnecting && isCompatible) {
      return "bg-green-500 hover:bg-green-600 ring-4 ring-green-300 ring-opacity-50 scale-125 shadow-lg"
    }
    if (isConnecting) {
      return "bg-blue-500 hover:bg-blue-600 ring-2 ring-blue-300"
    }

    const blockDef = BLOCK_DEFINITIONS[node.data.blockType]
    if (!blockDef) return "bg-gray-400"

    const portDef = (type === "input" ? blockDef.inputs : blockDef.outputs).find((p) => p.name === portName)
    if (!portDef) return "bg-gray-400"

    const typeColors = {
      float32: "bg-blue-500 hover:bg-blue-600 shadow-md",
      int32: "bg-green-500 hover:bg-green-600 shadow-md",
      bool: "bg-purple-500 hover:bg-purple-600 shadow-md",
    }

    return typeColors[portDef.shape.dtype] || "bg-gray-500 hover:bg-gray-600 shadow-md"
  }

  return (
    <Card
      ref={nodeRef}
      className={`w-56 cursor-move ${getBlockColor(node.data.blockType)} ${
        isSelected ? "ring-2 ring-blue-500 shadow-lg" : "shadow-md"
      } ${isTraining ? "opacity-75" : ""} transition-all duration-200 hover:shadow-lg`}
      onMouseDown={onMouseDown}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm">{node.data.label}</h4>
            <Badge variant="outline" className="text-xs mt-1">
              {node.data.blockType}
            </Badge>
          </div>
          <div className="flex space-x-1">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              <Move className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Input handles */}
        <div className="space-y-2 mb-3">
          {node.data.inputs.map((input, index) => {
            const portKey = `${node.id}-${input}-input`
            const isCompatible = compatiblePorts.has(portKey)
            const isConnecting = connecting !== null

            return (
              <div key={input} className="flex items-center relative">
                <div
                  className={`w-4 h-4 rounded-full cursor-pointer border-2 border-white transition-all duration-200 ${getPortColor(
                    input,
                    "input",
                    isConnecting,
                    isCompatible,
                  )} hover:scale-110`}
                  onMouseDown={(e) => onPortMouseDown(node.id, input, "input", e)}
                  onMouseUp={(e) => onPortMouseUp(node.id, input, "input", e)}
                  onMouseEnter={() => onPortHover(node.id, input, "input")}
                  onMouseLeave={onPortLeave}
                  style={{
                    position: "absolute",
                    left: "-10px",
                    zIndex: 30,
                    top: "2px",
                  }}
                />
                <span className="text-xs text-gray-600 ml-4 font-mono select-none">{input}</span>
                {isCompatible && (
                  <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 animate-pulse">
                    ✓
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* Output handles */}
        <div className="space-y-2 mb-3">
          {node.data.outputs.map((output, index) => {
            const portKey = `${node.id}-${output}-output`
            const isCompatible = compatiblePorts.has(portKey)
            const isConnecting = connecting !== null

            return (
              <div key={output} className="flex items-center justify-end relative">
                {isCompatible && (
                  <Badge variant="outline" className="mr-2 text-xs bg-green-50 text-green-700 animate-pulse">
                    ✓
                  </Badge>
                )}
                <span className="text-xs text-gray-600 mr-4 font-mono select-none">{output}</span>
                <div
                  className={`w-4 h-4 rounded-full cursor-pointer border-2 border-white transition-all duration-200 ${getPortColor(
                    output,
                    "output",
                    isConnecting,
                    isCompatible,
                  )} hover:scale-110`}
                  onMouseDown={(e) => onPortMouseDown(node.id, output, "output", e)}
                  onMouseUp={(e) => onPortMouseUp(node.id, output, "output", e)}
                  onMouseEnter={() => onPortHover(node.id, output, "output")}
                  onMouseLeave={onPortLeave}
                  style={{
                    position: "absolute",
                    right: "-10px",
                    zIndex: 30,
                    top: "2px",
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* Parameters preview */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          {Object.entries(node.data.parameters)
            .slice(0, 2)
            .map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span>{key}:</span>
                <span className="font-mono">{String(value)}</span>
              </div>
            ))}
          {Object.keys(node.data.parameters).length > 2 && <div className="text-center">...</div>}
        </div>
      </div>
    </Card>
  )
}
