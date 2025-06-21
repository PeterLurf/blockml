"use client"

// Enhanced WebGPU runtime with more realistic training simulation

export interface TrainingConfig {
  epochs: number
  batchSize: number
  learningRate: number
  optimizer: "adam" | "sgd"
  lossFunction: "categoricalCrossentropy" | "meanSquaredError"
}

export interface TrainingMetrics {
  epoch: number
  loss: number
  accuracy: number
  valLoss?: number
  valAccuracy?: number
  learningRate?: number
  gradientNorm?: number
}

export class WebGPURuntime {
  private isInitialized = false
  private model: any = null
  private trainingData: any = null
  private validationData: any = null
  private trainingHistory: TrainingMetrics[] = []
  private isTraining = false

  async initialize(): Promise<boolean> {
    try {
      // Check for WebGPU support
      if (navigator.gpu) {
        console.log("WebGPU is supported")
        this.isInitialized = true
        return true
      } else {
        console.log("WebGPU not supported, using CPU fallback")
        this.isInitialized = true
        return true
      }
    } catch (error) {
      console.error("Failed to initialize runtime:", error)
      return false
    }
  }

  async buildModelFromGraph(nodes: any[], edges: any[]): Promise<any> {
    if (!this.isInitialized) {
      throw new Error("Runtime not initialized")
    }

    console.log("Building model from", nodes.length, "nodes and", edges.length, "edges")

    // Validate the graph structure
    const layerNodes = nodes.filter((n) =>
      ["Dense", "Conv2D", "MaxPooling2D", "Dropout", "Flatten", "LSTM", "Add", "Concatenate"].includes(
        n.data.blockType,
      ),
    )

    if (layerNodes.length === 0) {
      throw new Error("No valid layers found in the model")
    }

    // Create a more detailed model structure
    this.model = {
      layers: layerNodes,
      connections: edges,
      compiled: true,
      totalParams: this.calculateTotalParams(layerNodes),
      architecture: this.generateArchitectureSummary(layerNodes, edges),
      complexity: this.calculateModelComplexity(layerNodes),
    }

    return this.model
  }

  async loadDataset(datasetName: string): Promise<void> {
    console.log("Loading dataset:", datasetName)

    // Simulate dataset loading with realistic parameters
    const datasets = {
      mnist: {
        samples: 60000,
        valSamples: 10000,
        features: 784,
        classes: 10,
        difficulty: 0.8, // How easy it is to learn (0-1)
        noiseLevel: 0.1,
      },
      cifar10: {
        samples: 50000,
        valSamples: 10000,
        features: [32, 32, 3],
        classes: 10,
        difficulty: 0.6, // Harder than MNIST
        noiseLevel: 0.15,
      },
      iris: {
        samples: 120,
        valSamples: 30,
        features: 4,
        classes: 3,
        difficulty: 0.9, // Easy dataset
        noiseLevel: 0.05,
      },
    }

    this.trainingData = datasets[datasetName as keyof typeof datasets] || datasets.mnist
    this.validationData = this.trainingData
  }

  async trainModel(
    config: TrainingConfig,
    onEpochEnd: (metrics: TrainingMetrics) => void,
    onTrainingComplete: (history: TrainingMetrics[]) => void,
  ): Promise<void> {
    if (!this.model || !this.trainingData) {
      throw new Error("Model or training data not available")
    }

    console.log("Starting training with config:", config)
    this.isTraining = true
    this.trainingHistory = []

    // Calculate realistic training parameters based on model and data
    const modelComplexity = this.model.complexity
    const datasetDifficulty = this.trainingData.difficulty
    const noiseLevel = this.trainingData.noiseLevel

    // Base learning curves - more realistic
    const getRealisticLoss = (epoch: number, totalEpochs: number) => {
      const progress = epoch / totalEpochs

      // Initial loss based on number of classes and complexity
      const initialLoss = Math.log(this.trainingData.classes) + modelComplexity * 0.5

      // Learning rate decay effect
      const learningDecay = config.optimizer === "adam" ? 0.95 : 0.9
      const effectiveLR = config.learningRate * Math.pow(learningDecay, epoch / 10)

      // Main learning curve - exponential decay with plateaus
      let baseLoss = initialLoss * Math.exp(-progress * 3.0 * datasetDifficulty)

      // Add realistic noise and fluctuations
      const noise = (Math.random() - 0.5) * noiseLevel * (1 - progress * 0.5)
      const cyclicNoise = Math.sin(epoch * 0.5) * 0.02 * (1 - progress)

      // Overfitting simulation for complex models
      if (modelComplexity > 2 && progress > 0.7) {
        const overfitFactor = (progress - 0.7) * modelComplexity * 0.1
        baseLoss += overfitFactor
      }

      return Math.max(0.01, baseLoss + noise + cyclicNoise)
    }

    const getRealisticAccuracy = (epoch: number, totalEpochs: number, loss: number) => {
      const progress = epoch / totalEpochs

      // Base accuracy curve - sigmoid-like growth
      const maxAccuracy = Math.min(0.98, 0.5 + datasetDifficulty * 0.45)
      let baseAccuracy = maxAccuracy * (1 - Math.exp(-progress * 4.0))

      // Relationship with loss
      const lossInfluence = Math.max(0, 1 - loss / 2)
      baseAccuracy *= lossInfluence

      // Add realistic fluctuations
      const noise = (Math.random() - 0.5) * 0.02 * (1 - progress * 0.7)

      // Early training instability
      if (epoch < 3) {
        baseAccuracy *= 0.3 + progress * 0.7
      }

      return Math.max(0.1, Math.min(maxAccuracy, baseAccuracy + noise))
    }

    // Training loop with realistic timing
    for (let epoch = 0; epoch < config.epochs; epoch++) {
      if (!this.isTraining) break // Allow stopping

      const progress = epoch / config.epochs

      // Calculate metrics
      const loss = getRealisticLoss(epoch, config.epochs)
      const accuracy = getRealisticAccuracy(epoch, config.epochs, loss)

      // Validation metrics (slightly worse than training)
      const valLoss = loss + 0.05 + Math.random() * 0.03
      const valAccuracy = accuracy - 0.02 + Math.random() * 0.01

      // Learning rate schedule
      const currentLR = config.learningRate * Math.pow(0.95, Math.floor(epoch / 10))

      // Gradient norm simulation
      const gradientNorm = 1.0 * Math.exp(-progress * 2) + Math.random() * 0.1

      const metrics: TrainingMetrics = {
        epoch: epoch + 1,
        loss,
        accuracy,
        valLoss,
        valAccuracy: Math.max(0.1, valAccuracy),
        learningRate: currentLR,
        gradientNorm,
      }

      this.trainingHistory.push(metrics)
      onEpochEnd(metrics)

      // Realistic training time - varies by model complexity and batch size
      const baseTime = 200 + modelComplexity * 100
      const batchTimeMultiplier = Math.log(config.batchSize) / Math.log(32)
      const epochTime = baseTime * batchTimeMultiplier + Math.random() * 100

      await new Promise((resolve) => setTimeout(resolve, epochTime))
    }

    this.isTraining = false
    onTrainingComplete(this.trainingHistory)
  }

  stopTraining(): void {
    this.isTraining = false
  }

  getModelSummary(): string {
    if (!this.model) {
      return "No model available"
    }

    return this.model.architecture || "Model summary not available"
  }

  getBackendInfo(): string {
    if (navigator.gpu) {
      return "WebGPU (Hardware Accelerated)"
    } else {
      return "CPU (Software Fallback)"
    }
  }

  dispose(): void {
    this.stopTraining()
    this.model = null
    this.trainingData = null
    this.validationData = null
    this.trainingHistory = []
  }

  private calculateTotalParams(layers: any[]): number {
    let totalParams = 0

    layers.forEach((layer) => {
      const { blockType, parameters } = layer.data

      switch (blockType) {
        case "Dense":
          const inputSize = parameters.input_features || 784
          const outputSize = parameters.units || 64
          totalParams += inputSize * outputSize + outputSize // weights + bias
          break
        case "Conv2D":
          const filters = parameters.filters || 32
          const kernelSize = parameters.kernel_size || 3
          const inChannels = parameters.in_channels || 1
          totalParams += kernelSize * kernelSize * inChannels * filters + filters
          break
        case "LSTM":
          const hiddenSize = parameters.units || 128
          const inputSize2 = parameters.input_size || 128
          totalParams += 4 * (inputSize2 * hiddenSize + hiddenSize * hiddenSize + hiddenSize)
          break
      }
    })

    return totalParams
  }

  private calculateModelComplexity(layers: any[]): number {
    // Calculate relative model complexity (0-5 scale)
    let complexity = 0

    layers.forEach((layer) => {
      const { blockType, parameters } = layer.data

      switch (blockType) {
        case "Dense":
          complexity += Math.log10((parameters.units || 64) / 10)
          break
        case "Conv2D":
          complexity += Math.log10((parameters.filters || 32) / 8) + 0.5
          break
        case "LSTM":
          complexity += Math.log10((parameters.units || 128) / 32) + 1
          break
        case "MultiHeadAttention":
          complexity += 2
          break
        case "Dropout":
          complexity -= 0.2 // Regularization reduces effective complexity
          break
      }
    })

    return Math.max(0.5, Math.min(5, complexity))
  }

  private generateArchitectureSummary(layers: any[], edges: any[]): string {
    let summary = "Model Architecture:\n"
    summary += `Total Layers: ${layers.length}\n`
    summary += `Total Connections: ${edges.length}\n`
    summary += `Estimated Parameters: ${this.calculateTotalParams(layers).toLocaleString()}\n`
    summary += `Model Complexity: ${this.calculateModelComplexity(layers).toFixed(1)}/5.0\n\n`

    layers.forEach((layer, index) => {
      summary += `${index + 1}. ${layer.data.blockType}`
      if (Object.keys(layer.data.parameters).length > 0) {
        const params = Object.entries(layer.data.parameters)
          .slice(0, 2)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ")
        summary += ` (${params})`
      }
      summary += "\n"
    })

    return summary
  }
}

// Singleton instance
export const webgpuRuntime = new WebGPURuntime()
