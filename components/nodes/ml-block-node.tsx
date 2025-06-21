"use client"

import { memo, useState } from "react"
import { Handle, Position, type NodeProps } from "reactflow"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, Info } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface MLBlockData {
  blockType: string
  label: string
  inputs: string[]
  outputs: string[]
  parameters: Record<string, any>
}

export const MLBlockNode = memo(({ data, selected }: NodeProps<MLBlockData>) => {
  const [parameters, setParameters] = useState(data.parameters)
  const [showTooltip, setShowTooltip] = useState(false)

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

  const updateParameter = (key: string, value: any) => {
    setParameters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Card className={`min-w-[200px] ${getBlockColor(data.blockType)} ${selected ? "ring-2 ring-blue-500" : ""}`}>
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
            >
              <Info className="h-3 w-3" />
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
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
                      <Input
                        id={key}
                        value={value}
                        onChange={(e) => updateParameter(key, e.target.value)}
                        type={typeof value === "number" ? "number" : "text"}
                      />
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
        {data.inputs.map((input, index) => (
          <div key={`input-${index}`} className="relative">
            <Handle
              type="target"
              position={Position.Left}
              id={input}
              style={{ top: 20 + index * 25 }}
              className="w-3 h-3 bg-gray-400"
            />
            <span className="text-xs text-gray-600 ml-4" style={{ position: "absolute", top: -8 + index * 25 }}>
              {input}
            </span>
          </div>
        ))}

        {/* Output Handles */}
        {data.outputs.map((output, index) => (
          <div key={`output-${index}`} className="relative">
            <Handle
              type="source"
              position={Position.Right}
              id={output}
              style={{ top: 20 + index * 25 }}
              className="w-3 h-3 bg-gray-600"
            />
            <span
              className="text-xs text-gray-600 mr-4 text-right"
              style={{ position: "absolute", top: -8 + index * 25, right: 16 }}
            >
              {output}
            </span>
          </div>
        ))}

        {/* Parameter Summary */}
        <div className="mt-2 text-xs text-gray-500">
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
        <div className="absolute z-10 p-2 bg-black text-white text-xs rounded shadow-lg -top-8 left-0 whitespace-nowrap">
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
