"use client"

import { memo, useState, useEffect } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useBlockMLStore } from "@/lib/store"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BLOCK_DEFINITIONS } from "@/lib/tensor-validation"

interface MLBlockData {
  blockType: string
  label: string
  inputs: string[]
  outputs: string[]
  parameters: Record<string, any>
}

export const MLBlockNode = memo(({ id, data, selected }: NodeProps<MLBlockData>) => {
  const defaultParams = BLOCK_DEFINITIONS[data.blockType]?.parameters || {}
  const initialParams = data.parameters && Object.keys(data.parameters).length > 0 ? data.parameters : defaultParams

  const [parameters, setParameters] = useState<Record<string, any>>(initialParams)
  const [showTooltip, setShowTooltip] = useState(false)

  const { updateNode, setSelectedNode } = useBlockMLStore()

  // Ensure the node always carries at least the default parameters and sync local state
  useEffect(() => {
    const currentParams = data.parameters && Object.keys(data.parameters).length > 0 ? data.parameters : defaultParams

    // Seed missing parameters into the graph store so other panels stay in sync
    if (!data.parameters || Object.keys(data.parameters).length === 0) {
      updateNode(id, { parameters: { ...defaultParams } })
    }

    setParameters(currentParams)
  }, [data.parameters, defaultParams, id, updateNode])

  const getBlockColor = (blockType: string) => {
    const colorMap: Record<string, string> = {
      Dense: "bg-blue-100 border-blue-300",
      Conv2D: "bg-green-100 border-green-300",
      MaxPooling2D: "bg-purple-100 border-purple-300",
      Dropout: "bg-yellow-100 border-yellow-300",
      LSTM: "bg-red-100 border-red-300",
      Attention: "bg-pink-100 border-pink-300",
      DataLoader: "bg-gray-100 border-gray-300",
      SGD: "bg-orange-100 border-orange-300",
      Adam: "bg-orange-100 border-orange-300",
      CrossEntropy: "bg-red-100 border-red-300",
      MSE: "bg-red-100 border-red-300",
    }
    return colorMap[blockType] || "bg-gray-100 border-gray-300"
  }

  const updateParameter = (key: string, rawValue: any) => {
    let parsedValue: any = rawValue

    if (typeof rawValue === "string") {
      parsedValue = rawValue === "" ? "" : isNaN(Number(rawValue)) ? rawValue : Number(rawValue)
    }

    // 1. Local UI update for immediate feedback.
    setParameters((prev) => ({ ...prev, [key]: parsedValue }))

    // 2. Persist the change in the global graph store so every panel stays in sync.
    updateNode(id, {
      parameters: {
        ...(data.parameters || {}),
        [key]: parsedValue,
      },
    })
  }

  return (
    <Card
      onClick={() => setSelectedNode(id)}
      className={`w-[220px] shadow-lg rounded-xl border-2 ${getBlockColor(data.blockType)} ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{data.label}</CardTitle>
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={(e) => {
                e.stopPropagation()
                setSelectedNode(id)
              }}
            >
              <Info className="h-3 w-3" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedNode(id)
                  }}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{data.label} Parameters</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {Object.entries(parameters).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>{key}</Label>
                      {key === "activation" && typeof value === "string" ? (
                        <Select value={value} onValueChange={(v) => updateParameter(key, v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="relu">relu</SelectItem>
                            <SelectItem value="sigmoid">sigmoid</SelectItem>
                            <SelectItem value="tanh">tanh</SelectItem>
                            <SelectItem value="softmax">softmax</SelectItem>
                            <SelectItem value="linear">linear</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : typeof value === "boolean" ? (
                        <Switch
                          id={key}
                          checked={value}
                          onCheckedChange={(checked: boolean) => updateParameter(key, checked)}
                        />
                      ) : (
                        <Input
                          id={key}
                          value={value}
                          onChange={(e) => updateParameter(key, e.target.value)}
                          type={typeof value === "number" ? "number" : "text"}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Input Handles */}
        {data.inputs.map((input, index) => {
          const top = 20 + index * 28
          return (
            <div key={`input-${index}`} className="relative flex items-center h-5">
              <Handle
                type="target"
                position={Position.Left}
                id={input}
                style={{ top, left: -7 }}
                className="w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
              />
              <span className="text-[11px] text-gray-700 ml-1 select-none whitespace-nowrap">{input}</span>
            </div>
          )
        })}

        {/* Output Handles */}
        {data.outputs.map((output, index) => {
          const top = 20 + index * 28
          return (
            <div key={`output-${index}`} className="relative flex items-center justify-end h-5">
              <span className="text-[11px] text-gray-700 mr-1 select-none whitespace-nowrap">{output}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={output}
                style={{ top, right: -7 }}
                className="w-3.5 h-3.5 bg-green-600 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
              />
            </div>
          )
        })}

        {/* Parameter Summary */}
        <div className="mt-2 text-[10px] text-gray-600 bg-white/60 rounded-md p-1.5 backdrop-blur-sm">
          {Object.entries(parameters)
            .slice(0, 2)
            .map(([key, value]) => (
              <div key={key}>
                {key}: {String(value)}
              </div>
            ))}
        </div>
      </CardContent>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-10 p-2 bg-black text-white text-xs rounded shadow-lg -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
          {getBlockDescription(data.blockType)}
        </div>
      )}
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
