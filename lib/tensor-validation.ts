"use client"

export interface TensorShape {
  dimensions: (number | null)[] // null represents dynamic/batch dimension
  dtype: "float32" | "int32" | "bool"
}

export interface BlockPort {
  name: string
  shape: TensorShape
  description: string
}

export interface BlockDefinition {
  type: string
  inputs: BlockPort[]
  outputs: BlockPort[]
  parameters: Record<string, any>
}

// Extended block definitions with new advanced blocks
export const BLOCK_DEFINITIONS: Record<string, BlockDefinition> = {
  DataLoader: {
    type: "DataLoader",
    inputs: [],
    outputs: [
      {
        name: "data",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Training data batches",
      },
      {
        name: "labels",
        shape: { dimensions: [null, -1], dtype: "int32" },
        description: "Training labels",
      },
    ],
    parameters: { batch_size: 32, shuffle: true, dataset: "mnist" },
  },

  Dense: {
    type: "Dense",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Input features",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Dense layer output",
      },
    ],
    parameters: { units: 64, activation: "relu" },
  },

  Conv2D: {
    type: "Conv2D",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1, -1, -1], dtype: "float32" },
        description: "4D image tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1, -1, -1], dtype: "float32" },
        description: "Convolved feature maps",
      },
    ],
    parameters: { filters: 32, kernel_size: 3, activation: "relu" },
  },

  MaxPooling2D: {
    type: "MaxPooling2D",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1, -1, -1], dtype: "float32" },
        description: "4D feature maps",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1, -1, -1], dtype: "float32" },
        description: "Pooled feature maps",
      },
    ],
    parameters: { pool_size: 2 },
  },

  Flatten: {
    type: "Flatten",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Multi-dimensional input",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Flattened output",
      },
    ],
    parameters: {},
  },

  Dropout: {
    type: "Dropout",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Input tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Dropout applied",
      },
    ],
    parameters: { rate: 0.2 },
  },

  LSTM: {
    type: "LSTM",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1, -1], dtype: "float32" },
        description: "Sequential input",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "LSTM output",
      },
    ],
    parameters: { units: 128, return_sequences: false },
  },

  // New advanced blocks
  Add: {
    type: "Add",
    inputs: [
      {
        name: "input1",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "First input tensor",
      },
      {
        name: "input2",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Second input tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Element-wise sum",
      },
    ],
    parameters: {},
  },

  Concatenate: {
    type: "Concatenate",
    inputs: [
      {
        name: "input1",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "First input tensor",
      },
      {
        name: "input2",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Second input tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Concatenated tensor",
      },
    ],
    parameters: { axis: -1 },
  },

  Activation: {
    type: "Activation",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Input tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Activated tensor",
      },
    ],
    parameters: { activation: "relu" },
  },

  BatchNorm: {
    type: "BatchNorm",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Input tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Normalized tensor",
      },
    ],
    parameters: { momentum: 0.99, epsilon: 1e-3 },
  },

  LayerNorm: {
    type: "LayerNorm",
    inputs: [
      {
        name: "input",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Input tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Layer normalized tensor",
      },
    ],
    parameters: { epsilon: 1e-6 },
  },

  MultiHeadAttention: {
    type: "MultiHeadAttention",
    inputs: [
      {
        name: "query",
        shape: { dimensions: [null, -1, -1], dtype: "float32" },
        description: "Query tensor",
      },
      {
        name: "key",
        shape: { dimensions: [null, -1, -1], dtype: "float32" },
        description: "Key tensor",
      },
      {
        name: "value",
        shape: { dimensions: [null, -1, -1], dtype: "float32" },
        description: "Value tensor",
      },
    ],
    outputs: [
      {
        name: "output",
        shape: { dimensions: [null, -1, -1], dtype: "float32" },
        description: "Attention output",
      },
    ],
    parameters: { heads: 8, dim: 512, dropout: 0.1 },
  },

  CrossEntropy: {
    type: "CrossEntropy",
    inputs: [
      {
        name: "predictions",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Model predictions",
      },
      {
        name: "targets",
        shape: { dimensions: [null, -1], dtype: "int32" },
        description: "True labels",
      },
    ],
    outputs: [
      {
        name: "loss",
        shape: { dimensions: [], dtype: "float32" },
        description: "Cross-entropy loss",
      },
    ],
    parameters: {},
  },

  MSE: {
    type: "MSE",
    inputs: [
      {
        name: "predictions",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "Model predictions",
      },
      {
        name: "targets",
        shape: { dimensions: [null, -1], dtype: "float32" },
        description: "True targets",
      },
    ],
    outputs: [
      {
        name: "loss",
        shape: { dimensions: [], dtype: "float32" },
        description: "Mean squared error",
      },
    ],
    parameters: {},
  },

  SGD: {
    type: "SGD",
    inputs: [
      {
        name: "gradients",
        shape: { dimensions: [-1], dtype: "float32" },
        description: "Model gradients",
      },
    ],
    outputs: [
      {
        name: "updates",
        shape: { dimensions: [-1], dtype: "float32" },
        description: "Parameter updates",
      },
    ],
    parameters: { learning_rate: 0.01, momentum: 0.0 },
  },

  Adam: {
    type: "Adam",
    inputs: [
      {
        name: "gradients",
        shape: { dimensions: [-1], dtype: "float32" },
        description: "Model gradients",
      },
    ],
    outputs: [
      {
        name: "updates",
        shape: { dimensions: [-1], dtype: "float32" },
        description: "Parameter updates",
      },
    ],
    parameters: { learning_rate: 0.001, beta1: 0.9, beta2: 0.999, epsilon: 1e-7 },
  },
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  warning?: string
  inferredShape?: TensorShape
}

export class TensorValidator {
  static validateConnection(
    sourceBlock: any,
    sourcePort: string,
    targetBlock: any,
    targetPort: string,
  ): ValidationResult {
    const sourceDef = BLOCK_DEFINITIONS[sourceBlock.data.blockType]
    const targetDef = BLOCK_DEFINITIONS[targetBlock.data.blockType]

    if (!sourceDef || !targetDef) {
      return {
        isValid: false,
        error: `Unknown block type: ${!sourceDef ? sourceBlock.data.blockType : targetBlock.data.blockType}`,
      }
    }

    const sourcePortDef = sourceDef.outputs.find((p) => p.name === sourcePort)
    const targetPortDef = targetDef.inputs.find((p) => p.name === targetPort)

    if (!sourcePortDef || !targetPortDef) {
      return {
        isValid: false,
        error: `Port not found: ${!sourcePortDef ? `${sourcePort} on ${sourceBlock.data.blockType}` : `${targetPort} on ${targetBlock.data.blockType}`}`,
      }
    }

    // Check data type compatibility
    if (sourcePortDef.shape.dtype !== targetPortDef.shape.dtype) {
      const compatibleTypes = this.getCompatibleTypes(sourcePortDef.shape.dtype)
      if (!compatibleTypes.includes(targetPortDef.shape.dtype)) {
        return {
          isValid: false,
          error: `Data type mismatch: ${sourcePortDef.shape.dtype} cannot connect to ${targetPortDef.shape.dtype}`,
        }
      }
    }

    // Check shape compatibility
    const shapeValidation = this.validateShapeCompatibility(
      sourcePortDef.shape,
      targetPortDef.shape,
      sourceBlock.data.parameters,
      targetBlock.data.parameters,
    )

    if (!shapeValidation.isValid) {
      return {
        ...shapeValidation,
        error: `Shape incompatible: ${shapeValidation.error}`,
      }
    }

    return {
      isValid: true,
      inferredShape: this.inferOutputShape(sourceBlock, sourcePort) ?? undefined,
    }
  }

  private static getCompatibleTypes(dtype: string): string[] {
    const typeCompatibility: Record<string, string[]> = {
      float32: ["float32"],
      int32: ["int32", "float32"],
      bool: ["bool", "int32", "float32"],
    }
    return typeCompatibility[dtype] || []
  }

  private static validateShapeCompatibility(
    sourceShape: TensorShape,
    targetShape: TensorShape,
    sourceParams: any,
    targetParams: any,
  ): ValidationResult {
    const sourceDims = sourceShape.dimensions
    const targetDims = targetShape.dimensions

    if (sourceDims.length === 0 && targetDims.length === 0) {
      return { isValid: true }
    }

    if (sourceDims.length !== targetDims.length) {
      if (targetDims.includes(-1)) {
        return {
          isValid: true,
          warning: "Shape will be inferred at runtime",
        }
      }

      return {
        isValid: false,
        error: `Dimension mismatch: ${sourceDims.length}D → ${targetDims.length}D`,
      }
    }

    for (let i = 0; i < sourceDims.length; i++) {
      const sourceDim = sourceDims[i]
      const targetDim = targetDims[i]

      if (sourceDim === null || targetDim === null || sourceDim === -1 || targetDim === -1) {
        continue
      }

      if (sourceDim !== targetDim) {
        return {
          isValid: false,
          error: `Shape mismatch at dimension ${i}: ${sourceDim} → ${targetDim}`,
        }
      }
    }

    return { isValid: true }
  }

  static inferOutputShape(block: any, portName: string): TensorShape | null {
    const blockDef = BLOCK_DEFINITIONS[block.data.blockType]
    if (!blockDef) return null

    const portDef = blockDef.outputs.find((p) => p.name === portName)
    if (!portDef) return null

    const inferredShape: TensorShape = {
      dimensions: [...portDef.shape.dimensions],
      dtype: portDef.shape.dtype,
    }

    switch (block.data.blockType) {
      case "Dense":
        if (inferredShape.dimensions.length >= 2) {
          inferredShape.dimensions[1] = block.data.parameters.units || 64
        }
        break

      case "Conv2D":
        if (inferredShape.dimensions.length === 4) {
          inferredShape.dimensions[3] = block.data.parameters.filters || 32
        }
        break

      case "MaxPooling2D":
        if (inferredShape.dimensions.length === 4) {
          const poolSize = block.data.parameters.pool_size || 2
          const dim1 = inferredShape.dimensions[1]
          if (dim1 != null && dim1 !== -1) {
            inferredShape.dimensions[1] = Math.floor(dim1 / poolSize)
          }
          const dim2 = inferredShape.dimensions[2]
          if (dim2 != null && dim2 !== -1) {
            inferredShape.dimensions[2] = Math.floor(dim2 / poolSize)
          }
        }
        break

      case "LSTM":
        if (inferredShape.dimensions.length >= 2) {
          inferredShape.dimensions[1] = block.data.parameters.units || 128
        }
        break

      case "MultiHeadAttention":
        if (inferredShape.dimensions.length >= 3) {
          inferredShape.dimensions[2] = block.data.parameters.dim || 512
        }
        break
    }

    return inferredShape
  }

  static getShapeString(shape: TensorShape): string {
    const dimStr = shape.dimensions
      .map((dim) => {
        if (dim === null) return "batch"
        if (dim === -1) return "?"
        return dim.toString()
      })
      .join(" × ")

    return `(${dimStr}) ${shape.dtype}`
  }

  static validateGraph(nodes: any[], connections: any[]): ValidationResult[] {
    const results: ValidationResult[] = []

    for (const connection of connections) {
      const sourceNode = nodes.find((n) => n.id === connection.source)
      const targetNode = nodes.find((n) => n.id === connection.target)

      if (sourceNode && targetNode) {
        const result = this.validateConnection(sourceNode, connection.sourceHandle, targetNode, connection.targetHandle)

        if (!result.isValid) {
          results.push({
            ...result,
            error: `${sourceNode.data.label} → ${targetNode.data.label}: ${result.error}`,
          })
        }
      }
    }

    return results
  }

  static debugConnection(sourceBlock: any, sourcePort: string, targetBlock: any, targetPort: string): string {
    const sourceDef = BLOCK_DEFINITIONS[sourceBlock.data.blockType]
    const targetDef = BLOCK_DEFINITIONS[targetBlock.data.blockType]

    if (!sourceDef || !targetDef) return "Block definition not found"

    const sourcePortDef = sourceDef.outputs.find((p) => p.name === sourcePort)
    const targetPortDef = targetDef.inputs.find((p) => p.name === targetPort)

    if (!sourcePortDef || !targetPortDef) return "Port definition not found"

    return `
Connection Debug:
Source: ${sourceBlock.data.blockType}.${sourcePort} -> ${this.getShapeString(sourcePortDef.shape)}
Target: ${targetBlock.data.blockType}.${targetPort} -> ${this.getShapeString(targetPortDef.shape)}
Compatible: ${sourcePortDef.shape.dtype === targetPortDef.shape.dtype}
    `.trim()
  }
}
