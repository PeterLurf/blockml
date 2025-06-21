"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Download, Eye, Brain, BarChart3, Layers } from "lucide-react"
import { MODEL_TEMPLATES, type ModelTemplate } from "@/lib/model-templates"
import { useBlockMLStore } from "@/lib/store"

export function ModelTemplates() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")
  const [previewTemplate, setPreviewTemplate] = useState<ModelTemplate | null>(null)

  const { setNodes, setConnections } = useBlockMLStore()

  const filteredTemplates = MODEL_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === "all" || template.difficulty === selectedDifficulty

    return matchesSearch && matchesCategory && matchesDifficulty
  })

  const loadTemplate = (template: ModelTemplate) => {
    setNodes(template.nodes)
    setConnections(template.connections)
    setPreviewTemplate(null)
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      vision: Eye,
      nlp: Brain,
      tabular: BarChart3,
      custom: Layers,
    }
    return icons[category as keyof typeof icons] || Layers
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: "bg-green-100 text-green-800",
      intermediate: "bg-yellow-100 text-yellow-800",
      advanced: "bg-red-100 text-red-800",
    }
    return colors[difficulty as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Model Templates</h2>
        <Badge variant="outline" className="text-xs">
          {filteredTemplates.length} templates
        </Badge>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="vision">Vision</SelectItem>
              <SelectItem value="nlp">NLP</SelectItem>
              <SelectItem value="tabular">Tabular</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Templates Grid */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {filteredTemplates.map((template) => {
            const CategoryIcon = getCategoryIcon(template.category)
            return (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <CategoryIcon className="w-4 h-4 text-gray-600" />
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </div>
                    <Badge className={`text-xs ${getDifficultyColor(template.difficulty)}`}>
                      {template.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-gray-600">{template.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{template.nodes.length} blocks</span>
                    <span>{template.connections.length} connections</span>
                    <span>{template.expectedAccuracy} accuracy</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setPreviewTemplate(template)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>{template.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">{template.description}</p>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <strong>Category:</strong> {template.category}
                            </div>
                            <div>
                              <strong>Difficulty:</strong> {template.difficulty}
                            </div>
                            <div>
                              <strong>Suggested Dataset:</strong> {template.suggestedDataset}
                            </div>
                            <div>
                              <strong>Expected Accuracy:</strong> {template.expectedAccuracy}
                            </div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Architecture Overview</h4>
                            <div className="space-y-1 text-sm">
                              {template.nodes.map((node, index) => (
                                <div key={node.id} className="flex items-center space-x-2">
                                  <span className="text-gray-500">{index + 1}.</span>
                                  <span>{node.data.blockType}</span>
                                  <span className="text-gray-500">
                                    (
                                    {Object.entries(node.data.parameters)
                                      .slice(0, 2)
                                      .map(([k, v]) => `${k}=${v}`)
                                      .join(", ")}
                                    )
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <Button onClick={() => loadTemplate(template)} className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Load Template
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button size="sm" onClick={() => loadTemplate(template)} className="flex-1">
                      <Download className="w-3 h-3 mr-1" />
                      Load
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No templates match your criteria</p>
        </div>
      )}
    </div>
  )
}
