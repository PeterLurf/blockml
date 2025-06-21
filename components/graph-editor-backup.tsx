"use client"

import type React from "react"
import { useRef, useState, useCallback, useEffect } from "react"

// UI Components
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Icons
import { ZoomIn, ZoomOut, Maximize, Trash2, AlertTriangle, CheckCircle, Move } from "lucide-react"

// Store and Utils
import { useBlockMLStore } from "@/lib/store"
import { TensorValidator, BLOCK_DEFINITIONS, type ValidationResult } from "@/lib/tensor-validation"

// Types and Interfaces
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

// Constants
const BLOCK_DIMENSIONS = {
  width: 224,
  headerHeight: 80,
  portHeight: 24,
  portRadius: 8,
} as const

const ZOOM_LIMITS = {
  min: 0.1,
  max: 5,
} as const

const PAN_ZOOM_CONFIG = {
  baseZoomIntensity: 0.08,
  buttonZoomFactor: 1.15,
  keyboardZoomFactor: 1.2,
} as const

export function GraphEditor({ isTraining }: GraphEditorProps) {
  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const animationFrameRef = useRef<number>()

  // Pan and Zoom State
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [spacePressed, setSpacePressed] = useState(false)

  // Node and Connection State
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [draggedNode, setDraggedNode] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<{
    nodeId: string
    handle: string
    type: "input" | "output"
    startPosition: Position
  } | null>(null)
  const [mousePosition, setMousePosition] = useState<Position>({ x: 0, y: 0 })

  // Validation and UI State
  const [validationErrors, setValidationErrors] = useState<ValidationResult[]>([])
  const [hoveredPort, setHoveredPort] = useState<{
    nodeId: string
    port: string
    type: "input" | "output"
  } | null>(null)
  const [compatiblePorts, setCompatiblePorts] = useState<Set<string>>(new Set())

  // Store
  const { nodes, edges: connections, setNodes, addNode, removeNode, setConnections: setStoreConnections } = useBlockMLStore()

  // Validation and Utility Functions
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

  const getPortScreenPosition = useCallback((node: BlockNode, portName: string, type: "input" | "output"): Position => {
    const portIndex = type === "input" ? node.data.inputs.indexOf(portName) : node.data.outputs.indexOf(portName)

    // Calculate the actual screen position including zoom and pan
    const nodeScreenX = node.position.x * zoom + pan.x
    const nodeScreenY = node.position.y * zoom + pan.y

    // Port positioning calculations
    const portX = nodeScreenX + (type === "output" ? (BLOCK_DIMENSIONS.width + 8) * zoom : -8 * zoom)
    const portY = nodeScreenY + (BLOCK_DIMENSIONS.headerHeight + (portIndex * BLOCK_DIMENSIONS.portHeight) + BLOCK_DIMENSIONS.portRadius) * zoom

    return { x: portX, y: portY }
  }, [zoom, pan])

  const getSplinePath = useCallback((start: Position, end: Position) => {
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
  }, [])

  const getPortTooltip = useCallback((nodeId: string, portName: string, type: "input" | "output") => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return null

    const blockDef = BLOCK_DEFINITIONS[node.data.blockType]
    if (!blockDef) return null

    const portDef = (type === "input" ? blockDef.inputs : blockDef.outputs).find((p) => p.name === portName)
    if (!portDef) return null

    const shapeStr = TensorValidator.getShapeString(portDef.shape)
    return `${portDef.description}\nShape: ${shapeStr}`
  }, [nodes])

  // Zoom and Pan Controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * PAN_ZOOM_CONFIG.buttonZoomFactor, ZOOM_LIMITS.max))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / PAN_ZOOM_CONFIG.buttonZoomFactor, ZOOM_LIMITS.min))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Cancel previous animation frame if still pending
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Use requestAnimationFrame for smooth performance
      animationFrameRef.current = requestAnimationFrame(() => {
        const canvasBounds = canvasRef.current?.getBoundingClientRect()
        if (canvasBounds) {
          setMousePosition({
            x: (e.clientX - canvasBounds.left - pan.x) / zoom,
            y: (e.clientY - canvasBounds.top - pan.y) / zoom,
          })
        }

        // Handle canvas panning with improved smoothness
        if (isDragging && !draggedNode && !connecting) {
          const newPanX = e.clientX - dragStart.x
          const newPanY = e.clientY - dragStart.y
          setPan({
            x: newPanX,
            y: newPanY,
          })
        }

        // Handle node dragging with better precision
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
      })
    }

    const handleMouseUp = () => {
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      if (connecting) {
        setConnecting(null)
        setCompatiblePorts(new Set())
      }
      setIsDragging(false)
      setDraggedNode(null)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      
      // Clean up animation frame on unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [connecting, pan, zoom, isDragging, draggedNode, dragStart, nodes, setNodes])

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Pan with middle mouse button (button 1), left mouse button on empty canvas, or space+left click
      if (
        (e.button === 1 || 
         (e.button === 0 && (e.target === canvasRef.current || e.target === svgRef.current)) ||
         (e.button === 0 && spacePressed)) &&
        !connecting
      ) {
        setIsDragging(true)
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
        setSelectedNode(null)
        e.preventDefault()
      }
    },
    [pan, connecting, spacePressed],
  )

  // Remove the old mouse move handler since we're using global listeners
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    // This is now handled by the global mouse move listener
  }, [])

  const handleCanvasMouseUp = useCallback(() => {
    // This is now handled by the global mouse up listener
  }, [])

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev * 1.15, 5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev / 1.15, 0.1))
  }, [])

  const handleResetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  // Enhanced wheel zoom functionality with better smoothness
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return

      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // More granular zoom control with variable sensitivity based on zoom level
      const baseZoomIntensity = 0.08
      const currentZoomFactor = zoom < 1 ? 1.5 : zoom > 2 ? 0.7 : 1
      const zoomIntensity = baseZoomIntensity * currentZoomFactor
      
      const zoomFactor = e.deltaY > 0 ? (1 - zoomIntensity) : (1 + zoomIntensity)
      const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.1), 5)
      
      // Zoom towards mouse position with improved precision
      const zoomRatio = newZoom / zoom
      setZoom(newZoom)
      setPan({
        x: mouseX - (mouseX - pan.x) * zoomRatio,
        y: mouseY - (mouseY - pan.y) * zoomRatio,
      })
    },
    [zoom, pan],
  )

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
      setStoreConnections(connections.filter((conn) => conn.source !== nodeId && conn.target !== nodeId))
    },
    [removeNode, connections, setStoreConnections],
  )

  const handleDeleteConnection = useCallback(
    (connectionId: string) => {
      setStoreConnections(connections.filter((conn) => conn.id !== connectionId))
    },
    [connections, setStoreConnections],
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

            setStoreConnections([...connections, newConnection])
            console.log("Connection created:", newConnection)
            console.log("Total connections now:", connections.length + 1)

            setTimeout(() => validateAllConnections(), 100)
          } else {
            console.log("Connection already exists, not creating duplicate")
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

    // Looking at the actual blocks in the screenshot, let me adjust the calculations:
    // The blocks appear to be ~224px wide and ports are positioned relative to the block
    
    const blockWidth = 224 // Standard block width
    const headerHeight = 80 // Header with title and badge
    const portHeight = 24 // Height per port row
    const portRadius = 8 // Port circle radius
    
    // Port X position: 
    // - Input ports: slightly left of block edge (-8px from left edge)
    // - Output ports: slightly right of block edge (width + 8px)
    const portX = nodeScreenX + (type === "output" ? (blockWidth + 8) * zoom : -8 * zoom)
    
    // Port Y position: header height + (port index * port spacing) + port center
    const portY = nodeScreenY + (headerHeight + (portIndex * portHeight) + portRadius) * zoom

    return { x: portX, y: portY }
  }

  // Enhanced keyboard controls for pan and zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        setSpacePressed(true)
        e.preventDefault()
      }
      
      // Zoom with keyboard shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.code === 'Equal' || e.code === 'NumpadAdd') {
          e.preventDefault()
          setZoom((prev) => Math.min(prev * 1.2, 5))
        } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
          e.preventDefault()
          setZoom((prev) => Math.max(prev / 1.2, 0.1))
        } else if (e.code === 'Digit0') {
          e.preventDefault()
          setZoom(1)
          setPan({ x: 0, y: 0 })
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return (
    <div className="w-full h-full relative bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="w-full h-full" 
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="absolute top-4 left-4 z-20 max-w-md">
          <Alert variant="destructive" className="shadow-lg border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                {validationErrors.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-sm font-medium">
                    {error.error}
                  </div>
                ))}
                {validationErrors.length > 3 && (
                  <div className="text-sm text-red-600">...and {validationErrors.length - 3} more errors</div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg border-gray-200 hover:border-gray-300"
          onClick={() => {
            setStoreConnections([])
            console.log("All connections cleared")
          }} 
          title="Clear All Connections"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg border-gray-200 hover:border-gray-300"
          onClick={validateAllConnections} 
          title="Validate Connections"
        >
          <CheckCircle className="w-4 h-4 mr-1" />
          Validate
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg border-gray-200 hover:border-gray-300"
          onClick={handleZoomIn} 
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg border-gray-200 hover:border-gray-300"
          onClick={handleZoomOut} 
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg border-gray-200 hover:border-gray-300"
          onClick={handleResetView} 
          title="Reset View"
        >
          <Maximize className="w-4 h-4" />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/90 backdrop-blur-sm shadow-md hover:shadow-lg border-gray-200 hover:border-gray-300"
          onClick={handleFitToScreen} 
          title="Fit to Screen"
        >
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

      {/* Zoom indicator with enhanced styling */}
      <div className={`absolute top-20 left-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm border shadow-md font-medium transition-all duration-200 ${
        spacePressed ? 'border-blue-400 bg-blue-50/90' : ''
      }`}>
        <div className="flex items-center space-x-2">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          {spacePressed && (
            <span className="text-blue-600 text-xs">SPACE: Pan Mode</span>
          )}
        </div>
      </div>

      {/* Connection status */}
      {connecting && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm border border-blue-400">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              Connecting {connecting.type} port "{connecting.handle}" - drag to target port
            </span>
          </div>
        </div>
      )}

      {/* Port Tooltip */}
      {hoveredPort && (
        <div className="absolute z-30 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-xl pointer-events-none whitespace-pre-line border border-gray-700 backdrop-blur-sm">
          {getPortTooltip(hoveredPort.nodeId, hoveredPort.port, hoveredPort.type)}
        </div>
      )}

      {/* Connection deletion hint */}
      {connections.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm border shadow-md text-gray-700">
          <div className="flex items-center space-x-2">
            <span className="text-lg">💡</span>
            <span>Click on connections to delete them</span>
          </div>
        </div>
      )}

      {/* Pan and zoom instructions */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-xs border shadow-md text-gray-600">
        <div className="space-y-1">
          <div>🖱️ Click & drag canvas to pan • Scroll wheel to zoom</div>
          <div>⌨️ Space+drag to pan • Ctrl/Cmd + / - to zoom • Ctrl/Cmd+0 to reset</div>
          <div>Left-click nodes to select • Drag nodes to move • Drag ports to connect</div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`w-full h-full ${
          isDragging 
            ? 'cursor-grabbing' 
            : connecting 
            ? 'cursor-crosshair' 
            : spacePressed
            ? 'cursor-grab'
            : 'cursor-default'
        }`}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onContextMenu={(e) => e.preventDefault()} // Prevent right-click menu
        style={{
          backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Connections SVG */}
        <svg 
          ref={svgRef} 
          className="absolute inset-0" 
          style={{ 
            zIndex: 1, 
            width: '100%', 
            height: '100%',
            left: 0,
            top: 0,
            pointerEvents: 'none'
          }}
        >
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
                {/* Main connection path */}
                <path
                  d={path}
                  stroke="#d1d5db"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={connection.isValid === false ? "8,4" : "none"}
                  className="transition-all duration-200 cursor-pointer hover:stroke-red-500"
                  style={{ pointerEvents: 'stroke', strokeWidth: '8' }}
                  onClick={() => handleDeleteConnection(connection.id)}
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
                    style={{ pointerEvents: 'all', cursor: 'pointer' }}
                    onClick={() => handleDeleteConnection(connection.id)}
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
                stroke="#d1d5db"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="6,6"
                opacity="0.8"
                style={{ pointerEvents: 'none' }}
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
            <marker id="arrowhead-connecting" markerWidth="12" markerHeight="8" refX="11" refY="4" orient="auto">
              <polygon points="0 0, 12 4, 0 8" fill="#22c55e" />
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
        ))}      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <h3 className="text-lg font-medium mb-2">Start Building Your Model</h3>
            <p className="text-sm">Drag blocks from the library or choose a template</p>
            <p className="text-xs mt-2 text-gray-400">
              Click and drag from output ports (right) to input ports (left)
            </p>
            <p className="text-xs mt-1 text-gray-400">
              Click on connections to delete them
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
        isSelected ? "ring-2 ring-blue-400 shadow-xl" : "shadow-lg"
      } ${isTraining ? "opacity-75" : ""} transition-all duration-300 hover:shadow-xl hover:scale-[1.02] backdrop-blur-sm bg-opacity-90 border-0`}
      onMouseDown={onMouseDown}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-sm text-gray-900">{node.data.label}</h4>
            <Badge variant="outline" className="text-xs mt-1 bg-white/70 border-gray-300">
              {node.data.blockType}
            </Badge>
          </div>
          <div className="flex space-x-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 hover:bg-white/50 rounded-full"
            >
              <Move className="h-3 w-3 text-gray-600" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 hover:bg-red-100 rounded-full" 
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        </div>

        {/* Input handles */}
        <div className="space-y-3 mb-4">
          {node.data.inputs.map((input, index) => {
            const portKey = `${node.id}-${input}-input`
            const isCompatible = compatiblePorts.has(portKey)
            const isConnecting = connecting !== null

            return (
              <div key={input} className="flex items-center relative">
                <div
                  className={`w-4 h-4 rounded-full cursor-pointer border-2 border-white shadow-sm transition-all duration-200 ${getPortColor(
                    input,
                    "input",
                    isConnecting,
                    isCompatible,
                  )} hover:scale-125 hover:shadow-md`}
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
                <span className="text-xs text-gray-700 ml-4 font-medium select-none">{input}</span>
                {isCompatible && (
                  <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200 animate-pulse">
                    ✓
                  </Badge>
                )}
              </div>
            )
          })}
        </div>

        {/* Output handles */}
        <div className="space-y-3 mb-4">
          {node.data.outputs.map((output, index) => {
            const portKey = `${node.id}-${output}-output`
            const isCompatible = compatiblePorts.has(portKey)
            const isConnecting = connecting !== null

            return (
              <div key={output} className="flex items-center justify-end relative">
                {isCompatible && (
                  <Badge variant="outline" className="mr-2 text-xs bg-green-50 text-green-700 border-green-200 animate-pulse">
                    ✓
                  </Badge>
                )}
                <span className="text-xs text-gray-700 mr-4 font-medium select-none">{output}</span>
                <div
                  className={`w-4 h-4 rounded-full cursor-pointer border-2 border-white shadow-sm transition-all duration-200 ${getPortColor(
                    output,
                    "output",
                    isConnecting,
                    isCompatible,
                  )} hover:scale-125 hover:shadow-md`}
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
        <div className="text-xs text-gray-600 bg-gray-50/70 backdrop-blur-sm p-3 rounded-lg border border-gray-200/50">
          {Object.entries(node.data.parameters)
            .slice(0, 2)
            .map(([key, value]) => (
              <div key={key} className="flex justify-between items-center py-1">
                <span className="font-medium text-gray-700">{key}:</span>
                <span className="font-mono text-gray-900 bg-white px-2 py-0.5 rounded">{String(value)}</span>
              </div>
            ))}
          {Object.keys(node.data.parameters).length > 2 && (
            <div className="text-center text-gray-500 pt-1">
              +{Object.keys(node.data.parameters).length - 2} more
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
