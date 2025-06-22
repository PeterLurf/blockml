"use client"

import React, { useState, useEffect } from "react"
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

// Discrete option lists for specific parameter keys
const DISCRETE_OPTIONS: Record<string, string[]> = {
  activation: [
    "relu",
    "sigmoid",
    "tanh",
    "softmax",
    "linear",
    "gelu",
    "leaky_relu",
  ],
  dataset: [
    "mnist",
    "cifar10",
    "imagenet",
  ],
  loss: [
    "crossentropy",
    "mse",
  ],
  optimizer: [
    "sgd",
    "adam",
    "rmsprop",
  ],
  padding: [
    "valid",
    "same",
  ],
}

export function BlockInspector() {
  // ------------------------------------------------------------------
  //  Zustand store integration
  // ------------------------------------------------------------------
  const { selectedNodeId, nodes, updateNode, setSelectedNode } = useBlockMLStore()

  // Find the selected node directly; memo-ised for perf but recalculated only
  // when nodes array or the selected id actually changes.
  const node = React.useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null
  }, [nodes, selectedNodeId])

  // ------------------------------------------------------------------
  //  Helper utilities
  // ------------------------------------------------------------------
  const getEffectiveParams = React.useCallback(() => {
    if (!node) return {}
    const definition = BLOCK_DEFINITIONS[node.data.blockType]
    // Merge defaults (definition.parameters) with node-specific overrides.
    return {
      ...(definition?.parameters ?? {}),
      ...(node.data.parameters ?? {}),
    }
  }, [node])

  const params = getEffectiveParams()

  const handleParameterChange = (key: string, value: any) => {
    if (!node) return
    updateNode(node.id, {
      parameters: {
        ...node.data.parameters,
        [key]: value,
      },
    })
  }

  const inferParamDef = (
    blockType: string,
    key: string,
    value: any,
  ): { type: string; options?: string[] } => {
    const explicit = BLOCK_DEFINITIONS[blockType]?.parameters[key]
    if (explicit) return explicit as any
    // Fallback inference
    return {
      type:
        typeof value === "number"
          ? Number.isInteger(value)
            ? "integer"
            : "float"
          : typeof value === "boolean"
          ? "boolean"
          : "string",
    }
  }

  const renderInput = (key: string, value: any) => {
    if (!node) return null
    const def = inferParamDef(node.data.blockType, key, value) as any

    // If parameter has an explicit options array in definition use that, otherwise fall back to DISCRETE_OPTIONS mapping
const optionsList = def.options ?? DISCRETE_OPTIONS[key]

if (optionsList && optionsList.length) {
  return (
    <Select value={String(value)} onValueChange={(v) => handleParameterChange(key, v)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {optionsList.map((opt: string) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

switch (def.type) {
      case "enum":
        return (
          <Select value={String(value)} onValueChange={(v) => handleParameterChange(key, v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {def.options?.map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "boolean":
        return (
          <Switch id={key} checked={Boolean(value)} onCheckedChange={(c) => handleParameterChange(key, c)} />
        )
      case "integer":
      case "float":
        return (
          <Input
            id={key}
            type="number"
            value={String(value)}
            onChange={(e) => {
              const raw = e.target.value
              const parsed = def.type === "integer" ? parseInt(raw, 10) : parseFloat(raw)
              handleParameterChange(key, raw === "" ? "" : isNaN(parsed) ? raw : parsed)
            }}
          />
        )
      default:
        return (
          <Input id={key} value={String(value)} onChange={(e) => handleParameterChange(key, e.target.value)} />
        )
    }
  }

  // ------------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------------
  if (!node) {
    return <div className="p-4 text-sm text-gray-500">Select a block to inspect its parameters.</div>
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{node.data.label} Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(params).length ? (
            Object.entries(params).map(([k, v]) => (
              <div key={k} className="space-y-2">
                <Label htmlFor={k} className="capitalize">
                  {k.replace(/_/g, " ")}
                </Label>
                {renderInput(k, v)}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">This block has no parameters.</div>
          )}
          <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>
            Deselect
          </Button>
        </CardContent>
      </Card>
    </div>
  )
;/* Legacy parameter editor (deprecated) -- BEGIN
    if (!node) {
      setLocalParams({})
      return
    }

    const definition = BLOCK_DEFINITIONS[node.data.blockType]
    const defaultParams = definition?.parameters || {}
    const hasParameters = node.data.parameters && Object.keys(node.data.parameters).length > 0
    const currentParams = hasParameters ? node.data.parameters : defaultParams

    // If the node in the store lacks parameters, update it to ensure consistency.
    if (!hasParameters) {
      updateNode(node.id, { parameters: { ...defaultParams } })
    }

    setLocalParams(currentParams)
  }, [node, updateNode])

  const handleParameterChange = (key: string, value: any) => {
    if (!node) return

    const newParams = { ...localParams, [key]: value }
    setLocalParams(newParams) // Update local state for a responsive UI
    updateNode(node.id, { parameters: newParams }) // Persist change to the global store
  }

  const renderParameterInput = (key: string, value: any) => {
    if (!node) return null
    const definition = BLOCK_DEFINITIONS[node.data.blockType]?.parameters[key]
    // If no explicit definition exists, infer a basic one from the current value
    const inferredDefinition = !definition
      ? {
          type: typeof value === "number"
            ? Number.isInteger(value)
              ? "integer"
              : "float"
            : typeof value === "boolean"
            ? "boolean"
            : "string",
        }
      : definition

    const paramDef = inferredDefinition as any; // paramDef now guaranteed to have a "type" field


    if (paramDef.type === "enum" && paramDef.options) {
      return (
        <Select value={String(value)} onValueChange={(v) => handleParameterChange(key, v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
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

    if (paramDef.type === "boolean") {
      return (
        <Switch
          id={key}
          checked={Boolean(value)}
          onCheckedChange={(checked) => handleParameterChange(key, checked)}
        />
      )
    }

    if (paramDef.type === "integer" || paramDef.type === "float") {
      return (
        <Input
          id={key}
          type="number"
          value={String(value)}
          onChange={(e) => {
            const rawValue = e.target.value
            const parsedValue = paramDef.type === "integer" ? parseInt(rawValue, 10) : parseFloat(rawValue)
            handleParameterChange(key, rawValue === "" ? "" : isNaN(parsedValue) ? rawValue : parsedValue)
          }}
          placeholder={definition.defaultValue?.toString()}
        />
      )
    }

    return (
      <Input
        id={key}
        value={String(value)}
        onChange={(e) => handleParameterChange(key, e.target.value)}
        placeholder={definition.defaultValue?.toString()}
      />
    )
  }

  if (!node) {
    return (
      <div className="p-4 text-sm text-gray-500">Select a block to inspect its parameters.</div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{node.data.label} Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(localParams).length > 0 ? (
            Object.entries(localParams).map(([key, val]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="capitalize">
                  {key.replace(/_/g, " ")}
                </Label>
                {renderParameterInput(key, val)}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">This block has no parameters to configure.</div>
          )}
          <Button variant="outline" size="sm" onClick={() => setSelectedNode(null)}>
            Deselect
          </Button>
        </CardContent>
      </Card>
    </div>
  )
*/
}