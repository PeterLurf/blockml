"use client"

import { memo, useEffect, useMemo, useRef } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Info } from "lucide-react"
import { useBlockMLStore } from "@/lib/store"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BLOCK_DEFINITIONS } from "@/lib/tensor-validation"

interface MLBlockData {
  blockType: string
  label: string
  inputs: string[]
  outputs: string[]
  parameters: Record<string, any>
}

export const MLBlockNode = memo(({ id, data, selected }: NodeProps<MLBlockData>) => {
  const defaultParams = useMemo(() => BLOCK_DEFINITIONS[data.blockType]?.parameters || {}, [data.blockType])
  const { updateNode, setSelectedNode } = useBlockMLStore()
  
  // Use a ref to track if this is the initial render
  const isInitialMount = useRef(true)
  
  // Initialize parameters only once when the component mounts
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      
      // Only initialize if parameters are empty and defaultParams are not empty
      if (!data.parameters || Object.keys(data.parameters).length === 0) {
        if (Object.keys(defaultParams).length > 0) {
          updateNode(id, { parameters: { ...defaultParams } })
        }
      }
    }
  }, [id, data.parameters, defaultParams, updateNode])
  
  // Use the parameters from props directly, but fallback to defaultParams if empty
  const parameters = useMemo(() => {
    return data.parameters && Object.keys(data.parameters).length > 0 
      ? data.parameters 
      : defaultParams
  }, [data.parameters, defaultParams])

  const getBlockColor = (blockType: string) => {
    // Match colors with BlockLibrary definitions so the node looks identical
    const colorMap: Record<string, string> = {
      // Core Layers
      Dense: "bg-blue-100 border-blue-300",
      Conv2D: "bg-green-100 border-green-300",
      MaxPooling2D: "bg-purple-100 border-purple-300",
      Dropout: "bg-yellow-100 border-yellow-300",
      Flatten: "bg-indigo-100 border-indigo-300",
      LSTM: "bg-red-100 border-red-300",

      // Normalization
      BatchNorm: "bg-teal-100 border-teal-300",
      LayerNorm: "bg-emerald-100 border-emerald-300",

      // Activation
      Activation: "bg-lime-100 border-lime-300",

      // Advanced / Attention / Math Ops
      Add: "bg-pink-100 border-pink-300",
      Concatenate: "bg-cyan-100 border-cyan-300",
      MultiHeadAttention: "bg-violet-100 border-violet-300",

      // Data
      DataLoader: "bg-gray-100 border-gray-300",

      // Optimizers
      SGD: "bg-orange-100 border-orange-300",
      Adam: "bg-orange-100 border-orange-300",

      // Losses
      CrossEntropy: "bg-red-100 border-red-300",
      MSE: "bg-red-100 border-red-300",
    }
    return colorMap[blockType] || "bg-gray-100 border-gray-300"
  }

  const handleParameterChange = (key: string, value: any) => {
    // Update the node parameters in the global store
    updateNode(id, { 
      parameters: { 
        ...(data.parameters || {}),
        [key]: value 
      } 
    })
  }

  const renderParameterInput = (key: string, value: any) => {
    const definition = BLOCK_DEFINITIONS[data.blockType]?.parameters[key]
    if (!definition) return null // Or some fallback UI

    // Handle enums (like activation functions)
    if (definition.type === "enum" && definition.options) {
      return (
        <Select value={String(value)} onValueChange={(v) => handleParameterChange(key, v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {definition.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    // Handle booleans
    if (definition.type === "boolean") {
      return (
        <Switch
          id={key}
          checked={Boolean(value)}
          onCheckedChange={(checked) => handleParameterChange(key, checked)}
        />
      )
    }

    // Handle numbers (integers and floats)
    if (definition.type === "integer" || definition.type === "float") {
      return (
        <Input
          id={key}
          type="number"
          value={String(value)}
          onChange={(e) => {
            const rawValue = e.target.value
            const parsedValue = definition.type === "integer" ? parseInt(rawValue, 10) : parseFloat(rawValue)
            // Allow clearing the input, but store NaN if invalid to prevent crashes
            handleParameterChange(key, rawValue === "" ? "" : isNaN(parsedValue) ? rawValue : parsedValue)
          }}
          placeholder={definition.defaultValue?.toString()}
        />
      )
    }

    // Default to text input
    return (
      <Input
        id={key}
        value={String(value)}
        onChange={(e) => handleParameterChange(key, e.target.value)}
        placeholder={definition.defaultValue?.toString()}
      />
    )
  }

  return (
    <Card
      onClick={() => setSelectedNode(id)}
      className={`w-[220px] shadow-lg rounded-xl border-2 ${getBlockColor(data.blockType)} ${
        selected ? "ring-2 ring-blue-500" : (data as any).isCompatible ? "ring-2 ring-green-400/80" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 nodrag"
                    onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getBlockDescription(data.blockType)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>


          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Input Handles */}
        {data.inputs.map((input, index) => {
          return (
            <div key={`input-${index}`} className="relative flex items-center h-5">
              <Handle
                type="target"
                position={Position.Left}
                id={input}
                style={{ top: "50%", left: -7, transform: "translateY(-50%)" }}
                className="w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
              />
              <span className="text-[11px] text-gray-700 ml-1 select-none whitespace-nowrap">{input}</span>
            </div>
          )
        })}

        {/* Output Handles */}
        {data.outputs.map((output, index) => {
           return (
             <div key={`output-${index}`} className="relative flex items-center justify-end h-5">
               <span className="text-[11px] text-gray-700 mr-1 select-none whitespace-nowrap">{output}</span>
               <Handle
                 type="source"
                 position={Position.Right}
                 id={output}
                 style={{ top: "50%", right: -7, transform: "translateY(-50%)" }}
                 className="w-3.5 h-3.5 bg-green-600 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
               />
             </div>
           )
         })}

        {/* Parameter Summary */}
        {Object.keys(parameters).length > 0 && (
          <div className="mt-2 text-[10px] text-gray-600 bg-white/60 rounded-md p-1.5 backdrop-blur-sm mr-8 max-w-[150px]">
            {Object.entries(parameters)
              .slice(0, 3) // Show up to 3 params
              .map(([key, value]) => (
                <div key={key} className="truncate">
                  <span className="font-medium">{key}:</span> {String(value)}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
})

MLBlockNode.displayName = "MLBlockNode"

function getBlockDescription(blockType: string): string {
  const descriptions: Record<string, string> = {
    Dense: "Fully connected layer with configurable units and activation",
    Conv2D: "2D convolutional layer for feature extraction",
    MaxPooling2D: "Max pooling layer for downsampling",
    Dropout: "Regularization layer to prevent overfitting",
    LSTM: "Long Short-Term Memory layer for sequences",
    Attention: "Multi-head attention mechanism",
    DataLoader: "Loads and batches training data",
    SGD: "Stochastic Gradient Descent optimizer",
    Adam: "Adam optimizer with adaptive learning rates",
    CrossEntropy: "Cross-entropy loss for classification",
    MSE: "Mean Squared Error loss for regression",
  }
  return descriptions[blockType] || "Machine learning block"
}
