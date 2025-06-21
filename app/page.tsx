"use client"

import { useState } from "react"
import { GraphEditor } from "@/components/graph-editor"
import { BlockLibrary } from "@/components/block-library"
import { TrainingPanel } from "@/components/training-panel"
import { ExportPanel } from "@/components/export-panel"
import { AssistantPanel } from "@/components/assistant-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Square, Download, Save, FolderOpen, Brain } from "lucide-react"
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/80 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                BlockML
              </h1>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
              Desktop App
            </Badge>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleStartTraining}
              disabled={isTraining || nodes.length === 0}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <Play className="w-4 h-4 mr-2" />
              {isTraining ? "Training..." : "Train Model"}
            </Button>
            <Button 
              onClick={handleStopTraining} 
              disabled={!isTraining} 
              size="sm" 
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 shadow-sm"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={saveProject}
            className="bg-white/70 backdrop-blur-sm border-gray-300 hover:bg-white hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Project
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadProject}
            className="bg-white/70 backdrop-blur-sm border-gray-300 hover:bg-white hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            Load Project
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="bg-white/70 backdrop-blur-sm border-gray-300 hover:bg-white hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Model
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Block Library */}
        <div className="w-80 bg-white/70 backdrop-blur-lg border-r border-gray-200/80 overflow-hidden shadow-sm">
          <div className="h-full overflow-y-auto">
            <BlockLibrary />
          </div>
        </div>

        {/* Center - Graph Editor */}
        <div className="flex-1 relative overflow-hidden">
          <GraphEditor isTraining={isTraining} />
        </div>

        {/* Right Sidebar - Panels */}
        <div className="w-96 bg-white/70 backdrop-blur-lg border-l border-gray-200/80 overflow-hidden shadow-sm">
          <Tabs defaultValue="training" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 flex-shrink-0 bg-gray-100/70 backdrop-blur-sm">
              <TabsTrigger 
                value="training"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
              >
                Training
              </TabsTrigger>
              <TabsTrigger 
                value="export"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
              >
                Export
              </TabsTrigger>
              <TabsTrigger 
                value="assistant"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
              >
                Assistant
              </TabsTrigger>
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
