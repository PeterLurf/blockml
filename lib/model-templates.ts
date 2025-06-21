"use client"

export interface ModelTemplate {
  id: string
  name: string
  description: string
  category: "vision" | "nlp" | "tabular" | "custom"
  difficulty: "beginner" | "intermediate" | "advanced"
  nodes: any[]
  connections: any[]
  suggestedDataset: string
  expectedAccuracy: string
}

export const MODEL_TEMPLATES: ModelTemplate[] = [
  {
    id: "simple-mlp",
    name: "Simple MLP",
    description: "Basic multi-layer perceptron for tabular data",
    category: "tabular",
    difficulty: "beginner",
    suggestedDataset: "iris",
    expectedAccuracy: "95%+",
    nodes: [
      {
        id: "data-1",
        type: "mlBlock",
        position: { x: 50, y: 100 },
        data: {
          blockType: "DataLoader",
          label: "DataLoader",
          inputs: [],
          outputs: ["data", "labels"],
          parameters: { batch_size: 32, shuffle: true },
        },
      },
      {
        id: "dense-1",
        type: "mlBlock",
        position: { x: 300, y: 80 },
        data: {
          blockType: "Dense",
          label: "Hidden Layer 1",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 64, activation: "relu" },
        },
      },
      {
        id: "dropout-1",
        type: "mlBlock",
        position: { x: 550, y: 80 },
        data: {
          blockType: "Dropout",
          label: "Dropout",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { rate: 0.3 },
        },
      },
      {
        id: "dense-2",
        type: "mlBlock",
        position: { x: 800, y: 80 },
        data: {
          blockType: "Dense",
          label: "Hidden Layer 2",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 32, activation: "relu" },
        },
      },
      {
        id: "dense-3",
        type: "mlBlock",
        position: { x: 1050, y: 80 },
        data: {
          blockType: "Dense",
          label: "Output Layer",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 3, activation: "softmax" },
        },
      },
      {
        id: "loss-1",
        type: "mlBlock",
        position: { x: 1300, y: 120 },
        data: {
          blockType: "CrossEntropy",
          label: "CrossEntropy",
          inputs: ["predictions", "targets"],
          outputs: ["loss"],
          parameters: {},
        },
      },
    ],
    connections: [
      { id: "c1", source: "data-1", target: "dense-1", sourceHandle: "data", targetHandle: "input" },
      { id: "c2", source: "dense-1", target: "dropout-1", sourceHandle: "output", targetHandle: "input" },
      { id: "c3", source: "dropout-1", target: "dense-2", sourceHandle: "output", targetHandle: "input" },
      { id: "c4", source: "dense-2", target: "dense-3", sourceHandle: "output", targetHandle: "input" },
      { id: "c5", source: "dense-3", target: "loss-1", sourceHandle: "output", targetHandle: "predictions" },
      { id: "c6", source: "data-1", target: "loss-1", sourceHandle: "labels", targetHandle: "targets" },
    ],
  },
  {
    id: "cnn-mnist",
    name: "CNN for MNIST",
    description: "Convolutional neural network for handwritten digit recognition",
    category: "vision",
    difficulty: "intermediate",
    suggestedDataset: "mnist",
    expectedAccuracy: "98%+",
    nodes: [
      {
        id: "data-1",
        type: "mlBlock",
        position: { x: 50, y: 150 },
        data: {
          blockType: "DataLoader",
          label: "MNIST Data",
          inputs: [],
          outputs: ["data", "labels"],
          parameters: { batch_size: 64, shuffle: true },
        },
      },
      {
        id: "conv-1",
        type: "mlBlock",
        position: { x: 300, y: 100 },
        data: {
          blockType: "Conv2D",
          label: "Conv2D 1",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { filters: 32, kernel_size: 3, activation: "relu" },
        },
      },
      {
        id: "pool-1",
        type: "mlBlock",
        position: { x: 550, y: 100 },
        data: {
          blockType: "MaxPooling2D",
          label: "MaxPool 1",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { pool_size: 2 },
        },
      },
      {
        id: "conv-2",
        type: "mlBlock",
        position: { x: 800, y: 100 },
        data: {
          blockType: "Conv2D",
          label: "Conv2D 2",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { filters: 64, kernel_size: 3, activation: "relu" },
        },
      },
      {
        id: "pool-2",
        type: "mlBlock",
        position: { x: 1050, y: 100 },
        data: {
          blockType: "MaxPooling2D",
          label: "MaxPool 2",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { pool_size: 2 },
        },
      },
      {
        id: "flatten-1",
        type: "mlBlock",
        position: { x: 1300, y: 100 },
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
        position: { x: 1550, y: 100 },
        data: {
          blockType: "Dense",
          label: "Dense",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 128, activation: "relu" },
        },
      },
      {
        id: "dropout-1",
        type: "mlBlock",
        position: { x: 1800, y: 100 },
        data: {
          blockType: "Dropout",
          label: "Dropout",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { rate: 0.5 },
        },
      },
      {
        id: "output-1",
        type: "mlBlock",
        position: { x: 2050, y: 100 },
        data: {
          blockType: "Dense",
          label: "Output",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 10, activation: "softmax" },
        },
      },
    ],
    connections: [
      { id: "c1", source: "data-1", target: "conv-1", sourceHandle: "data", targetHandle: "input" },
      { id: "c2", source: "conv-1", target: "pool-1", sourceHandle: "output", targetHandle: "input" },
      { id: "c3", source: "pool-1", target: "conv-2", sourceHandle: "output", targetHandle: "input" },
      { id: "c4", source: "conv-2", target: "pool-2", sourceHandle: "output", targetHandle: "input" },
      { id: "c5", source: "pool-2", target: "flatten-1", sourceHandle: "output", targetHandle: "input" },
      { id: "c6", source: "flatten-1", target: "dense-1", sourceHandle: "output", targetHandle: "input" },
      { id: "c7", source: "dense-1", target: "dropout-1", sourceHandle: "output", targetHandle: "input" },
      { id: "c8", source: "dropout-1", target: "output-1", sourceHandle: "output", targetHandle: "input" },
    ],
  },
  {
    id: "resnet-block",
    name: "ResNet Block",
    description: "Residual connection block for deep networks",
    category: "vision",
    difficulty: "advanced",
    suggestedDataset: "cifar10",
    expectedAccuracy: "92%+",
    nodes: [
      {
        id: "input-1",
        type: "mlBlock",
        position: { x: 50, y: 200 },
        data: {
          blockType: "DataLoader",
          label: "Input",
          inputs: [],
          outputs: ["data", "labels"],
          parameters: { batch_size: 32 },
        },
      },
      {
        id: "conv-1",
        type: "mlBlock",
        position: { x: 300, y: 150 },
        data: {
          blockType: "Conv2D",
          label: "Conv 1",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { filters: 64, kernel_size: 3, activation: "relu" },
        },
      },
      {
        id: "conv-2",
        type: "mlBlock",
        position: { x: 550, y: 150 },
        data: {
          blockType: "Conv2D",
          label: "Conv 2",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { filters: 64, kernel_size: 3, activation: "linear" },
        },
      },
      {
        id: "add-1",
        type: "mlBlock",
        position: { x: 800, y: 200 },
        data: {
          blockType: "Add",
          label: "Residual Add",
          inputs: ["input1", "input2"],
          outputs: ["output"],
          parameters: {},
        },
      },
      {
        id: "activation-1",
        type: "mlBlock",
        position: { x: 1050, y: 200 },
        data: {
          blockType: "Activation",
          label: "ReLU",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { activation: "relu" },
        },
      },
    ],
    connections: [
      { id: "c1", source: "input-1", target: "conv-1", sourceHandle: "data", targetHandle: "input" },
      { id: "c2", source: "conv-1", target: "conv-2", sourceHandle: "output", targetHandle: "input" },
      { id: "c3", source: "conv-2", target: "add-1", sourceHandle: "output", targetHandle: "input1" },
      { id: "c4", source: "input-1", target: "add-1", sourceHandle: "data", targetHandle: "input2" }, // Residual connection
      { id: "c5", source: "add-1", target: "activation-1", sourceHandle: "output", targetHandle: "input" },
    ],
  },
  {
    id: "transformer-encoder",
    name: "Transformer Encoder",
    description: "Self-attention transformer encoder block",
    category: "nlp",
    difficulty: "advanced",
    suggestedDataset: "text",
    expectedAccuracy: "85%+",
    nodes: [
      {
        id: "input-1",
        type: "mlBlock",
        position: { x: 50, y: 250 },
        data: {
          blockType: "DataLoader",
          label: "Sequence Input",
          inputs: [],
          outputs: ["data", "labels"],
          parameters: { batch_size: 16, sequence_length: 128 },
        },
      },
      {
        id: "attention-1",
        type: "mlBlock",
        position: { x: 300, y: 200 },
        data: {
          blockType: "MultiHeadAttention",
          label: "Multi-Head Attention",
          inputs: ["query", "key", "value"],
          outputs: ["output"],
          parameters: { heads: 8, dim: 512 },
        },
      },
      {
        id: "add-1",
        type: "mlBlock",
        position: { x: 550, y: 250 },
        data: {
          blockType: "Add",
          label: "Residual Add 1",
          inputs: ["input1", "input2"],
          outputs: ["output"],
          parameters: {},
        },
      },
      {
        id: "norm-1",
        type: "mlBlock",
        position: { x: 800, y: 250 },
        data: {
          blockType: "LayerNorm",
          label: "Layer Norm 1",
          inputs: ["input"],
          outputs: ["output"],
          parameters: {},
        },
      },
      {
        id: "ffn-1",
        type: "mlBlock",
        position: { x: 1050, y: 250 },
        data: {
          blockType: "Dense",
          label: "Feed Forward",
          inputs: ["input"],
          outputs: ["output"],
          parameters: { units: 2048, activation: "relu" },
        },
      },
      {
        id: "add-2",
        type: "mlBlock",
        position: { x: 1300, y: 250 },
        data: {
          blockType: "Add",
          label: "Residual Add 2",
          inputs: ["input1", "input2"],
          outputs: ["output"],
          parameters: {},
        },
      },
      {
        id: "norm-2",
        type: "mlBlock",
        position: { x: 1550, y: 250 },
        data: {
          blockType: "LayerNorm",
          label: "Layer Norm 2",
          inputs: ["input"],
          outputs: ["output"],
          parameters: {},
        },
      },
    ],
    connections: [
      { id: "c1", source: "input-1", target: "attention-1", sourceHandle: "data", targetHandle: "query" },
      { id: "c2", source: "input-1", target: "attention-1", sourceHandle: "data", targetHandle: "key" },
      { id: "c3", source: "input-1", target: "attention-1", sourceHandle: "data", targetHandle: "value" },
      { id: "c4", source: "attention-1", target: "add-1", sourceHandle: "output", targetHandle: "input1" },
      { id: "c5", source: "input-1", target: "add-1", sourceHandle: "data", targetHandle: "input2" }, // Residual
      { id: "c6", source: "add-1", target: "norm-1", sourceHandle: "output", targetHandle: "input" },
      { id: "c7", source: "norm-1", target: "ffn-1", sourceHandle: "output", targetHandle: "input" },
      { id: "c8", source: "ffn-1", target: "add-2", sourceHandle: "output", targetHandle: "input1" },
      { id: "c9", source: "norm-1", target: "add-2", sourceHandle: "output", targetHandle: "input2" }, // Residual
      { id: "c10", source: "add-2", target: "norm-2", sourceHandle: "output", targetHandle: "input" },
    ],
  },
]
