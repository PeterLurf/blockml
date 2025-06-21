"use client"

import type React from "react"
import { useState, useRef } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ModelTemplates } from "@/components/model-templates"
import { useBlockMLStore } from "@/lib/store"
import {
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Database,
  Zap,
  Target,
  Settings,
  Star,
  Grid,
  List,
  Plus,
  Sparkles,
  Brain,
} from "lucide-react"

const blockCategories = {
  "Core Layers": {
    icon: Layers,
    color: "blue",
    blocks: [
      { name: "Dense", description: "Fully connected layer", color: "bg-blue-100", popularity: 5 },
      { name: "Conv2D", description: "2D convolutional layer", color: "bg-green-100", popularity: 5 },
      { name: "MaxPooling2D", description: "Max pooling layer", color: "bg-purple-100", popularity: 4 },
      { name: "Dropout", description: "Regularization layer", color: "bg-yellow-100", popularity: 5 },
      { name: "Flatten", description: "Flatten multi-dimensional input", color: "bg-indigo-100", popularity: 4 },
      { name: "LSTM", description: "LSTM recurrent layer", color: "bg-red-100", popularity: 3 },
    ],
  },
  Normalization: {
    icon: Settings,
    color: "teal",
    blocks: [
      { name: "BatchNorm", description: "Batch normalization", color: "bg-teal-100", popularity: 4 },
      { name: "LayerNorm", description: "Layer normalization", color: "bg-emerald-100", popularity: 3 },
    ],
  },
  Activation: {
    icon: Zap,
    color: "lime",
    blocks: [{ name: "Activation", description: "Activation function", color: "bg-lime-100", popularity: 3 }],
  },
  Advanced: {
    icon: Star,
    color: "pink",
    blocks: [
      { name: "Add", description: "Element-wise addition (residual)", color: "bg-pink-100", popularity: 4 },
      { name: "Concatenate", description: "Concatenate tensors", color: "bg-cyan-100", popularity: 3 },
      { name: "MultiHeadAttention", description: "Multi-head self-attention", color: "bg-violet-100", popularity: 2 },
    ],
  },
  Data: {
    icon: Database,
    color: "gray",
    blocks: [{ name: "DataLoader", description: "Load training data", color: "bg-gray-100", popularity: 5 }],
  },
  Optimizers: {
    icon: Target,
    color: "orange",
    blocks: [
      { name: "SGD", description: "Stochastic gradient descent", color: "bg-orange-100", popularity: 3 },
      { name: "Adam", description: "Adam optimizer", color: "bg-orange-100", popularity: 4 },
    ],
  },
  "Loss Functions": {
    icon: Target,
    color: "red",
    blocks: [
      { name: "CrossEntropy", description: "Cross-entropy loss", color: "bg-red-100", popularity: 4 },
      { name: "MSE", description: "Mean squared error", color: "bg-red-100", popularity: 3 },
    ],
  },
}

// Quick start templates for common neural network architectures
const quickStartTemplates = {
  simpleClassifier: {
    name: "Simple Classifier",
    description: "Basic neural network for classification tasks",
    nodes: [
      {
        id: "data-1",
        type: "mlBlock",
        position: { x: 100, y: 100 },
        data: {
          blockType: "DataLoader",
          label: "Data Input",
          inputs: [],
          outputs: ["data"],
          parameters: { inputShape: [28, 28, 1], batchSize: 32, dataset: "mnist" },
        },
      },
      {
        id: "flatten-1",
        type: "mlBlock",
        position: { x: 100, y: 200 },
        data: {
          blockType: "Flatten",
          label: "Flatten",
          inputs: ["input"],
          outputs: ["output"],
          parameters: {},
        },
      },
      {
        id: "dense-1",
        type: "mlBlock",
        position: { x: 100, y: 300 },
        data: {
          blockType: "Dense",
          label: "Hidden Layer",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 128, activation: "relu" },
        },
      },
      {
        id: "dense-2",
        type: "mlBlock",
        position: { x: 100, y: 400 },
        data: {
          blockType: "Dense",
          label: "Output Layer",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 10, activation: "softmax" },
        },
      },
    ],
    connections: [
      {
        id: "e1",
        source: "data-1",
        target: "flatten-1",
        sourceHandle: "data",
        targetHandle: "input",
      },
      {
        id: "e2",
        source: "flatten-1",
        target: "dense-1",
        sourceHandle: "output",
        targetHandle: "input",
      },
      {
        id: "e3",
        source: "dense-1",
        target: "dense-2",
        sourceHandle: "output",
        targetHandle: "input",
      },
    ],
  },
}

export function BlockLibrary() {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"name" | "popularity">("popularity")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Core Layers", "Data"]), // Default expanded categories
  )
  const dragImageRef = useRef<HTMLDivElement | null>(null)

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    // Primary custom MIME type for our application
    event.dataTransfer.setData("application/blockml", nodeType)
    // Fallback plain-text MIME type (helps some browsers/platforms show a valid cursor)
    event.dataTransfer.setData("text/plain", nodeType)
    event.dataTransfer.effectAllowed = "copy"

    if (dragImageRef.current) {
      dragImageRef.current.remove()
    }

    const dragImage = document.createElement("div")
    dragImage.innerHTML = `
      <div style="
        background: white; 
        border: 2px solid #3b82f6; 
        border-radius: 8px; 
        padding: 8px 12px; 
        font-size: 12px; 
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: sans-serif;
        color: #1e3a8a;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke: #3b82f6;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        <span>${nodeType}</span>
      </div>
    `
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 20, 20)
    dragImageRef.current = dragImage
  }

  const onDragEnd = () => {
    if (dragImageRef.current) {
      dragImageRef.current.remove()
      dragImageRef.current = null
    }
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const filteredAndSortedBlocks = Object.entries(blockCategories).reduce(
    (
      acc: Partial<typeof blockCategories>,
      [category, categoryData],
    ) => {
      const filteredBlocks = categoryData.blocks
        .filter((block) => block.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
          if (sortBy === "popularity") {
            return b.popularity - a.popularity
          }
          return a.name.localeCompare(b.name)
        })

      if (filteredBlocks.length > 0) {
        acc[category as keyof typeof blockCategories] = { ...categoryData, blocks: filteredBlocks }
      }
      return acc
    },
    {} as Partial<typeof blockCategories>,
  )

  const getPopularityStars = (popularity: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < popularity ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
    ))
  }

  const BlockCard = ({ block, isCompact = false }: { block: any; isCompact?: boolean }) => (
    <Card
      className={`cursor-grab active:cursor-grabbing hover:shadow-lg hover:scale-105 transition-all duration-200 ${block.color} border-2 border-dashed border-gray-300 hover:border-blue-400`}
      draggable
      onDragStart={(event) => onDragStart(event, block.name)}
      onDragEnd={onDragEnd}
    >
      <CardHeader className={isCompact ? "pb-1" : "pb-2"}>
        <div className="flex items-center justify-between">
          <CardTitle className={isCompact ? "text-xs" : "text-sm"}>{block.name}</CardTitle>
          {!isCompact && <div className="flex">{getPopularityStars(block.popularity)}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className={`text-gray-600 ${isCompact ? "text-xs" : "text-xs"}`}>{block.description}</p>
        {isCompact && <div className="flex mt-1">{getPopularityStars(block.popularity)}</div>}
      </CardContent>
    </Card>
  )

  const { setNodes, setConnections } = useBlockMLStore()

  const createSimpleModel = () => {
    const template = quickStartTemplates.simpleClassifier
    setNodes(template.nodes)
    setConnections(template.connections)
  }

  const QuickStart = () => {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Quick Start</h3>
        </div>

        <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow border-dashed border-2 border-purple-200 hover:border-purple-400">
          <div onClick={createSimpleModel} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Simple Classifier</h4>
              <p className="text-xs text-gray-600">Ready-to-train neural network</p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </Card>

        <div className="text-xs text-gray-500 mt-3">
          Click to add a pre-built model architecture to get started quickly.
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white to-gray-50/50">
      <Tabs defaultValue="blocks" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4 bg-gray-100/70 backdrop-blur-sm">
          <TabsTrigger 
            value="blocks"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
          >
            <Layers className="w-4 h-4 mr-2" />
            Blocks
          </TabsTrigger>
          <TabsTrigger 
            value="templates"
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks" className="flex-1 overflow-y-auto">
          {/* Prevent scroll events from bubbling to parent */}
          <div
            className="p-4 space-y-4 h-full"
            onWheel={(e) => {
              e.stopPropagation()
              // Allow normal scrolling within this container
            }}
            onTouchMove={(e) => {
              e.stopPropagation()
            }}
          >
            {/* Quick Start Section */}
            <QuickStart />
            
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Block Library
                </h2>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {Object.values(filteredAndSortedBlocks).reduce((sum, cat) => sum + cat.blocks.length, 0)} blocks
                </Badge>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search blocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/70 backdrop-blur-sm border-gray-200 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                    className={viewMode === "list" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "popularity")}
                  className="text-xs border border-gray-200 rounded-md px-3 py-1 bg-white/70 backdrop-blur-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="popularity">Sort by Popularity</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {Object.entries(filteredAndSortedBlocks).map(([category, categoryData]) => {
                const Icon = categoryData.icon
                const isExpanded = expandedCategories.has(category)

                return (
                  <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="w-full justify-between p-3 h-auto hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 hover:border-blue-100 rounded-lg transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-${categoryData.color}-100`}>
                            <Icon className={`w-4 h-4 text-${categoryData.color}-600`} />
                          </div>
                          <span className="font-medium text-sm">{category}</span>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs bg-${categoryData.color}-50 text-${categoryData.color}-700 border-${categoryData.color}-200`}
                          >
                            {categoryData.blocks.length}
                          </Badge>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-2">
                      {viewMode === "grid" ? (
                        <div className="grid grid-cols-1 gap-2">
                          {categoryData.blocks.map((block) => (
                            <BlockCard key={block.name} block={block} />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {categoryData.blocks.map((block) => (
                            <BlockCard key={block.name} block={block} isCompact />
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Start</h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs justify-start"
                  onClick={() => {
                    setExpandedCategories(new Set(Object.keys(blockCategories)))
                  }}
                >
                  Expand All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs justify-start"
                  onClick={() => {
                    setExpandedCategories(new Set())
                  }}
                >
                  Collapse All
                </Button>
              </div>
            </div>

            {/* Help */}
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="text-sm font-medium text-green-900 mb-2">How to Connect Blocks</h4>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• Drag blocks from library to canvas</li>
                <li>• Click and drag from output ports (right side)</li>
                <li>• Drop on compatible input ports (left side)</li>
                <li>• Green ports = compatible, Red = incompatible</li>
                <li>• Tensor shapes are validated automatically</li>
              </ul>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="flex-1 overflow-y-auto">
          <div onWheel={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} className="h-full">
            <ModelTemplates />
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Start Section */}
      <div className="p-4 bg-white rounded-lg shadow-md mt-4">
        <QuickStart />
      </div>
    </div>
  )
}
