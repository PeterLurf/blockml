"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useBlockMLStore } from "@/lib/store"
import { webgpuRuntime, type TrainingConfig, type TrainingMetrics } from "@/lib/webgpu-runtime"
import { AlertCircle, CheckCircle, Cpu, Zap } from "lucide-react"

interface TrainingPanelProps {
  isTraining: boolean
  onStartTraining: () => void
  onStopTraining: () => void
}

export function TrainingPanel({ isTraining, onStartTraining, onStopTraining }: TrainingPanelProps) {
  const [dataset, setDataset] = useState("mnist")
  const [epochs, setEpochs] = useState(10)
  const [batchSize, setBatchSize] = useState(32)
  const [learningRate, setLearningRate] = useState(0.001)
  const [optimizer, setOptimizer] = useState<"adam" | "sgd">("adam")
  const [lossFunction, setLossFunction] = useState<"categoricalCrossentropy" | "meanSquaredError">(
    "categoricalCrossentropy",
  )

  const [currentEpoch, setCurrentEpoch] = useState(0)
  const [trainingData, setTrainingData] = useState<TrainingMetrics[]>([])
  const [currentMetrics, setCurrentMetrics] = useState<TrainingMetrics | null>(null)
  const [modelSummary, setModelSummary] = useState("")
  const [backendInfo, setBackendInfo] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [trainingError, setTrainingError] = useState<string | null>(null)

  const { nodes, edges } = useBlockMLStore()
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize WebGPU runtime on component mount
  useEffect(() => {
    const initializeRuntime = async () => {
      try {
        const success = await webgpuRuntime.initialize()
        if (success) {
          setIsInitialized(true)
          setBackendInfo(webgpuRuntime.getBackendInfo())
          setInitError(null)
        } else {
          setInitError("Failed to initialize WebGPU runtime")
        }
      } catch (error) {
        setInitError(`Initialization error: ${error}`)
      }
    }

    initializeRuntime()

    return () => {
      webgpuRuntime.dispose()
    }
  }, [])

  const handleStartTraining = async () => {
    if (nodes.length === 0) {
      alert("Please add some blocks to your model first!")
      return
    }

    if (!isInitialized) {
      alert("Runtime not initialized!")
      return
    }

    try {
      setTrainingError(null)
      setCurrentEpoch(0)
      setTrainingData([])
      setCurrentMetrics(null)

      onStartTraining()
      abortControllerRef.current = new AbortController()

      // Build model from graph
      console.log("Building model from graph...")
      const model = await webgpuRuntime.buildModelFromGraph(nodes, edges)
      setModelSummary(webgpuRuntime.getModelSummary())

      // Load dataset
      console.log("Loading dataset...")
      await webgpuRuntime.loadDataset(dataset)

      // Configure training
      const config: TrainingConfig = {
        epochs,
        batchSize,
        learningRate,
        optimizer,
        lossFunction,
      }

      // Start training
      console.log("Starting training...")
      await webgpuRuntime.trainModel(
        config,
        (metrics: TrainingMetrics) => {
          setCurrentEpoch(metrics.epoch)
          setCurrentMetrics(metrics)
          setTrainingData((prev) => [...prev, metrics])
        },
        (history: TrainingMetrics[]) => {
          console.log("Training completed!", history)
          onStopTraining()
        },
      )
    } catch (error) {
      console.error("Training error:", error)
      setTrainingError(`Training failed: ${error}`)
      onStopTraining()
    }
  }

  const handleStopTraining = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    onStopTraining()
  }

  const progress = epochs > 0 ? (currentEpoch / epochs) * 100 : 0

  return (
    <div className="p-4 space-y-4">
      {/* Runtime Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            {isInitialized ? (
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
            )}
            Runtime Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant={isInitialized ? "default" : "destructive"}>{isInitialized ? "Ready" : "Not Ready"}</Badge>
              {backendInfo.includes("WebGPU") ? (
                <Zap className="w-4 h-4 text-yellow-500" />
              ) : (
                <Cpu className="w-4 h-4 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-600">{backendInfo}</p>
            {initError && <p className="text-sm text-red-600">{initError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Training Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Training Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataset">Dataset</Label>
              <Select value={dataset} onValueChange={setDataset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mnist">MNIST (Handwritten Digits)</SelectItem>
                  <SelectItem value="cifar10">CIFAR-10 (Images)</SelectItem>
                  <SelectItem value="iris">Iris (Classification)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="optimizer">Optimizer</Label>
              <Select value={optimizer} onValueChange={(value: "adam" | "sgd") => setOptimizer(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adam">Adam</SelectItem>
                  <SelectItem value="sgd">SGD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="epochs">Epochs</Label>
              <Input
                id="epochs"
                type="number"
                value={epochs}
                onChange={(e) => setEpochs(Number.parseInt(e.target.value) || 10)}
                min="1"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchSize">Batch Size</Label>
              <Input
                id="batchSize"
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number.parseInt(e.target.value) || 32)}
                min="1"
                max="512"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="learningRate">Learning Rate</Label>
              <Input
                id="learningRate"
                type="number"
                step="0.0001"
                value={learningRate}
                onChange={(e) => setLearningRate(Number.parseFloat(e.target.value) || 0.001)}
                min="0.0001"
                max="1"
              />
            </div>
          </div>

          <div className="flex space-x-2">
            <Button onClick={handleStartTraining} disabled={isTraining || !isInitialized} className="flex-1">
              {isTraining ? "Training..." : "Start Training"}
            </Button>
            <Button onClick={handleStopTraining} disabled={!isTraining} variant="outline">
              Stop
            </Button>
          </div>

          {trainingError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{trainingError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Progress */}
      {isTraining && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Training Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>
                  Epoch {currentEpoch} of {epochs}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>

            {currentMetrics && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Loss</div>
                  <div className="font-mono text-lg">{currentMetrics.loss.toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Accuracy</div>
                  <div className="font-mono text-lg">{(currentMetrics.accuracy * 100).toFixed(2)}%</div>
                </div>
                {currentMetrics.valLoss && (
                  <div>
                    <div className="text-gray-600">Val Loss</div>
                    <div className="font-mono text-lg">{currentMetrics.valLoss.toFixed(4)}</div>
                  </div>
                )}
                {currentMetrics.valAccuracy && (
                  <div>
                    <div className="text-gray-600">Val Accuracy</div>
                    <div className="font-mono text-lg">{(currentMetrics.valAccuracy * 100).toFixed(2)}%</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Training Metrics Chart */}
      {trainingData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Training Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="epoch" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="loss" stroke="#ef4444" name="Loss" strokeWidth={2} />
                  <Line type="monotone" dataKey="accuracy" stroke="#22c55e" name="Accuracy" strokeWidth={2} />
                  {trainingData[0]?.valLoss && (
                    <Line
                      type="monotone"
                      dataKey="valLoss"
                      stroke="#f97316"
                      name="Val Loss"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                  {trainingData[0]?.valAccuracy && (
                    <Line
                      type="monotone"
                      dataKey="valAccuracy"
                      stroke="#10b981"
                      name="Val Accuracy"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Summary */}
      {modelSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={modelSummary}
              readOnly
              className="font-mono text-sm h-32"
              placeholder="Model summary will appear here..."
            />
          </CardContent>
        </Card>
      )}

      {/* Model Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Model Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <div>Blocks: {nodes.length}</div>
            <div>Connections: {edges.length}</div>
            <div>Status: {isTraining ? "Training" : "Ready"}</div>
            <div>Backend: {backendInfo}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
