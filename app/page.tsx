"use client"

import { useState } from "react"
import { GraphEditor } from "@/components/graph-editor"
import { BlockLibrary } from "@/components/block-library"
import { TrainingPanel } from "@/components/training-panel"
import { ExportPanel } from "@/components/export-panel"
import { AssistantPanel } from "@/components/assistant-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Play, Square, Download, Save, FolderOpen } from "lucide-react"
import { useBlockMLStore } from "@/lib/store"

export default function BlockMLApp() {
  const [isTraining, setIsTraining] = useState(false)
  const { nodes, edges, saveProject, loadProject } = useBlockMLStore()

  const handleStartTraining = () => {
    setIsTraining(true)
  }

  const handleStopTraining = () => {
    setIsTraining(false)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">BlockML</h1>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleStartTraining}
              disabled={isTraining || nodes.length === 0}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-1" />
              {isTraining ? "Training..." : "Train"}
            </Button>
            <Button onClick={handleStopTraining} disabled={!isTraining} size="sm" variant="outline">
              <Square className="w-4 h-4 mr-1" />
              Stop
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={saveProject}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={loadProject}>
            <FolderOpen className="w-4 h-4 mr-1" />
            Load
          </Button>
          <Button size="sm" variant="outline">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Block Library */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <BlockLibrary />
          </div>
        </div>

        {/* Center - Graph Editor */}
        <div className="flex-1 relative overflow-hidden">
          <GraphEditor isTraining={isTraining} />
        </div>

        {/* Right Sidebar - Panels */}
        <div className="w-96 bg-white border-l border-gray-200 overflow-hidden">
          <Tabs defaultValue="training" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0">
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="export">Export</TabsTrigger>
              <TabsTrigger value="assistant">Assistant</TabsTrigger>
            </TabsList>

            <TabsContent value="training" className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <TrainingPanel
                  isTraining={isTraining}
                  onStartTraining={handleStartTraining}
                  onStopTraining={handleStopTraining}
                />
              </div>
            </TabsContent>

            <TabsContent value="export" className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <ExportPanel />
              </div>
            </TabsContent>

            <TabsContent value="assistant" className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto">
                <AssistantPanel />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
