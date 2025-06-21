"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ModelTemplates } from "@/components/model-templates"
import { useState } from "react"
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

export function BlockLibrary() {
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [sortBy, setSortBy] = useState<"name" | "popularity">("popularity")
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Core Layers", "Data"]), // Default expanded categories
  )

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/blockml", nodeType)
    event.dataTransfer.effectAllowed = "move"

    // Add visual feedback
    const dragImage = document.createElement("div")
    dragImage.innerHTML = `
      <div style="
        background: white; 
        border: 2px solid #3b82f6; 
        border-radius: 8px; 
        padding: 8px 12px; 
        font-size: 12px; 
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ">
        ${nodeType}
      </div>
    `
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    document.body.appendChild(dragImage)
    event.dataTransfer.setDragImage(dragImage, 50, 20)

    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(category)) {
        newExpanded.delete(category)
      } else {
        newExpanded.add(category)
      }
      return newExpanded
    })
  }

  const filteredCategories = Object.entries(blockCategories).reduce(
    (acc, [category, categoryData]) => {
      const filteredBlocks = categoryData.blocks
        .filter(
          (block) =>
            block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            block.description.toLowerCase().includes(searchTerm.toLowerCase()),
        )
        .sort((a, b) => {
          if (sortBy === "popularity") {
            return b.popularity - a.popularity
          }
          return a.name.localeCompare(b.name)
        })

      if (filteredBlocks.length > 0) {
        acc[category] = { ...categoryData, blocks: filteredBlocks }
      }
      return acc
    },
    {} as typeof blockCategories,
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

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="blocks" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
          <TabsTrigger value="blocks">Blocks</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
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
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Block Library</h2>
                <Badge variant="outline" className="text-xs">
                  {Object.values(filteredCategories).reduce((sum, cat) => sum + cat.blocks.length, 0)} blocks
                </Badge>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search blocks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant={viewMode === "grid" ? "default" : "outline"}
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === "list" ? "default" : "outline"}
                    onClick={() => setViewMode("list")}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "name" | "popularity")}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="popularity">Sort by Popularity</option>
                  <option value="name">Sort by Name</option>
                </select>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              {Object.entries(filteredCategories).map(([category, categoryData]) => {
                const Icon = categoryData.icon
                const isExpanded = expandedCategories.has(category)

                return (
                  <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-2 h-auto hover:bg-gray-50">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-4 h-4 text-${categoryData.color}-600`} />
                          <span className="font-medium text-sm">{category}</span>
                          <Badge variant="secondary" className="text-xs">
                            {categoryData.blocks.length}
                          </Badge>
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
    </div>
  )
}
