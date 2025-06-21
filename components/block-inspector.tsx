"use client"
// Added directive to ensure this component runs on the client side

import React, { useCallback, useState, useEffect } from "react"
import { useBlockMLStore } from "@/lib/store"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BLOCK_DEFINITIONS } from "@/lib/tensor-validation"

export function BlockInspector() {
  const { selectedNodeId, nodes, updateNode, setSelectedNode } = useBlockMLStore()

  const node = nodes.find((n) => n.id === selectedNodeId)

  const [localParams, setLocalParams] = useState<Record<string, any>>({})

  // When a new node is selected, ensure it has parameters and sync local state
  useEffect(() => {
    if (!node) return

    const defParams = BLOCK_DEFINITIONS[node.data.blockType]?.parameters || {}
    const currentParams = node.data.parameters && Object.keys(node.data.parameters).length > 0 ? node.data.parameters : defParams

    // If the node didn't have parameters, seed them now so every panel stays consistent
    if (!node.data.parameters || Object.keys(node.data.parameters).length === 0) {
      updateNode(node.id, { parameters: { ...defParams } })
    }

    setLocalParams(currentParams)
  }, [node, updateNode])

  const handleChange = useCallback(
    (key: string, value: any) => {
      if (!node) return

      let parsedVal: any = value

      // Convert strings that represent numbers to actual numbers
      if (typeof value === "string") {
        parsedVal = value === "" ? "" : isNaN(Number(value)) ? value : Number(value)
      }

      // Update local state for immediate UI feedback
      setLocalParams((prev) => ({ ...prev, [key]: parsedVal }))

      // Persist to global store
      updateNode(node.id, {
        parameters: {
          ...(node.data.parameters || {}),
          [key]: parsedVal,
        },
      })
    },
    [node, updateNode],
  )

  if (!node) {
    return (
      <div className="p-4 text-sm text-gray-500">Select a block to edit its parameters.</div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{node.data.label} Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(localParams).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={key}>{key}</Label>
              {key === "activation" && typeof val === "string" ? (
                <Select
                  value={val}
                  onValueChange={(v) => handleChange(key, v)}
                >
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
              ) : typeof val === "boolean" ? (
                <Switch
                  id={key}
                  checked={val}
                  onCheckedChange={(checked: boolean) => handleChange(key, checked)}
                />
              ) : (
                <Input
                  id={key}
                  value={String(val)}
                  onChange={(e) => handleChange(key, e.target.value)}
                  type={typeof val === "number" ? "number" : "text"}
                />
              )}
            </div>
          ))}
          <Button variant="outline" onClick={() => setSelectedNode(null)}>
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 