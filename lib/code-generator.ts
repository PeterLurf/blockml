import { TensorValidator } from "./tensor-validation"

export function generatePyTorchCode(nodes: any[], edges: any[]): string {
  const imports = `import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

`

  const modelClass = generateModelClass(nodes, edges)
  const trainingScript = generateTrainingScript(nodes)
  const dataLoader = generateDataLoader()
  const validationComments = generateValidationComments(nodes, edges)

  return imports + validationComments + "\n\n" + modelClass + "\n\n" + dataLoader + "\n\n" + trainingScript
}

function generateValidationComments(nodes: any[], edges: any[]): string {
  const validationResults = TensorValidator.validateGraph(nodes, edges)

  if (validationResults.length === 0) {
    return `# Model Validation: ✓ All tensor shapes are compatible`
  }

  let comments = `# Model Validation Warnings:\n`
  validationResults.forEach((result, index) => {
    comments += `# ${index + 1}. ${result.error}\n`
  })

  return comments
}

function generateModelClass(nodes: any[], edges: any[]): string {
  const layerNodes = nodes.filter((node) =>
    [
      "Dense",
      "Conv2D",
      "MaxPooling2D",
      "Dropout",
      "Flatten",
      "LSTM",
      "Add",
      "Concatenate",
      "Activation",
      "BatchNorm",
      "LayerNorm",
    ].includes(node.data.blockType),
  )

  let modelCode = `class BlockMLModel(nn.Module):
    def __init__(self):
        super(BlockMLModel, self).__init__()
        
`

  // Generate layer definitions with proper parameter handling
  layerNodes.forEach((node, index) => {
    const layerCode = generateLayerCode(node, index)
    const shapeComment = generateShapeComment(node)
    modelCode += `        ${layerCode}  ${shapeComment}\n`
  })

  modelCode += `
    def forward(self, x):
        # Forward pass with proper tensor flow
`

  // Generate forward pass with proper connection handling
  const sortedNodes = topologicalSort(layerNodes, edges)
  const nodeOutputs: Record<string, string> = {}

  sortedNodes.forEach((node, index) => {
    const forwardCode = generateForwardCode(node, index, nodeOutputs, edges)
    const expectedShape = getExpectedOutputShape(node)
    modelCode += `        ${forwardCode}  # Expected shape: ${expectedShape}\n`
    nodeOutputs[node.id] = `x${index}`
  })

  modelCode += `        return x
`

  return modelCode
}

function topologicalSort(nodes: any[], edges: any[]): any[] {
  // Simple topological sort for proper execution order
  const sorted: any[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(nodeId: string) {
    if (visiting.has(nodeId)) return // Cycle detection
    if (visited.has(nodeId)) return

    visiting.add(nodeId)

    // Visit dependencies first
    edges.forEach((edge) => {
      if (edge.target === nodeId) {
        visit(edge.source)
      }
    })

    visiting.delete(nodeId)
    visited.add(nodeId)

    const node = nodes.find((n) => n.id === nodeId)
    if (node) sorted.push(node)
  }

  nodes.forEach((node) => visit(node.id))
  return sorted
}

function generateForwardCode(node: any, index: number, nodeOutputs: Record<string, string>, edges: any[]): string {
  const { blockType, parameters } = node.data
  const varName = `x${index}`

  // Find input connections
  const inputConnections = edges.filter((edge) => edge.target === node.id)
  let inputVar = index === 0 ? "x" : `x${index - 1}`

  if (inputConnections.length > 0) {
    const sourceNode = inputConnections[0].source
    const sourceIndex = Object.keys(nodeOutputs).indexOf(sourceNode)
    inputVar = sourceIndex >= 0 ? `x${sourceIndex}` : "x"
  }

  switch (blockType) {
    case "Dense":
      const activation = parameters.activation || "relu"
      if (activation === "relu") {
        return `${varName} = F.relu(self.fc${index}(${inputVar}))`
      } else if (activation === "sigmoid") {
        return `${varName} = torch.sigmoid(self.fc${index}(${inputVar}))`
      } else if (activation === "softmax") {
        return `${varName} = F.softmax(self.fc${index}(${inputVar}), dim=1)`
      } else {
        return `${varName} = self.fc${index}(${inputVar})`
      }
    case "Conv2D":
      return `${varName} = F.relu(self.conv${index}(${inputVar}))`
    case "MaxPooling2D":
      return `${varName} = self.pool${index}(${inputVar})`
    case "Dropout":
      return `${varName} = self.dropout${index}(${inputVar})`
    case "Flatten":
      return `${varName} = self.flatten${index}(${inputVar})`
    case "LSTM":
      return `${varName}, _ = self.lstm${index}(${inputVar})`
    case "Add":
      // Handle residual connections
      const addInputs = inputConnections.slice(0, 2)
      if (addInputs.length >= 2) {
        const input1 = nodeOutputs[addInputs[0].source] || "x"
        const input2 = nodeOutputs[addInputs[1].source] || "x"
        return `${varName} = ${input1} + ${input2}`
      }
      return `${varName} = ${inputVar}`
    case "Concatenate":
      const concatInputs = inputConnections.slice(0, 2)
      if (concatInputs.length >= 2) {
        const input1 = nodeOutputs[concatInputs[0].source] || "x"
        const input2 = nodeOutputs[concatInputs[1].source] || "x"
        return `${varName} = torch.cat([${input1}, ${input2}], dim=${parameters.axis || -1})`
      }
      return `${varName} = ${inputVar}`
    case "Activation":
      const actType = parameters.activation || "relu"
      if (actType === "relu") {
        return `${varName} = F.relu(${inputVar})`
      } else if (actType === "sigmoid") {
        return `${varName} = torch.sigmoid(${inputVar})`
      } else if (actType === "tanh") {
        return `${varName} = torch.tanh(${inputVar})`
      }
      return `${varName} = ${inputVar}`
    case "BatchNorm":
      return `${varName} = self.batchnorm${index}(${inputVar})`
    case "LayerNorm":
      return `${varName} = self.layernorm${index}(${inputVar})`
    default:
      return `${varName} = ${inputVar}  # ${blockType}`
  }
}

function generateLayerCode(node: any, index: number): string {
  const { blockType, parameters } = node.data

  switch (blockType) {
    case "Dense":
      return `self.fc${index} = nn.Linear(${parameters.input_features || 784}, ${parameters.units || 64})`
    case "Conv2D":
      return `self.conv${index} = nn.Conv2d(${parameters.in_channels || 1}, ${parameters.filters || 32}, ${parameters.kernel_size || 3}, padding=1)`
    case "MaxPooling2D":
      return `self.pool${index} = nn.MaxPool2d(${parameters.pool_size || 2})`
    case "Dropout":
      return `self.dropout${index} = nn.Dropout(${parameters.rate || 0.2})`
    case "Flatten":
      return `self.flatten${index} = nn.Flatten()`
    case "LSTM":
      return `self.lstm${index} = nn.LSTM(${parameters.input_size || 128}, ${parameters.units || 128}, batch_first=True)`
    case "BatchNorm":
      return `self.batchnorm${index} = nn.BatchNorm1d(${parameters.num_features || 64})`
    case "LayerNorm":
      return `self.layernorm${index} = nn.LayerNorm(${parameters.normalized_shape || 64})`
    default:
      return `# ${blockType} layer`
  }
}

function generateDataLoader(): string {
  return `def create_data_loader(dataset_name='mnist', batch_size=32):
    """Create a data loader for the specified dataset with proper tensor shapes"""
    if dataset_name == 'mnist':
        # MNIST: 28x28 grayscale images, 10 classes
        X = torch.randn(1000, 784)  # Flattened 28x28 images
        y = torch.randint(0, 10, (1000,))  # 10 classes
    elif dataset_name == 'cifar10':
        # CIFAR-10: 32x32 RGB images, 10 classes
        X = torch.randn(1000, 3, 32, 32)  # 3 channels, 32x32
        y = torch.randint(0, 10, (1000,))  # 10 classes
    else:
        # Default: tabular data
        X = torch.randn(1000, 784)
        y = torch.randint(0, 2, (1000,))  # Binary classification
    
    print(f"Dataset shape: X={X.shape}, y={y.shape}")
    dataset = TensorDataset(X, y)
    return DataLoader(dataset, batch_size=batch_size, shuffle=True)
`
}

function generateTrainingScript(nodes: any[]): string {
  const optimizerNode = nodes.find((node) => ["SGD", "Adam"].includes(node.data.blockType))
  const lossNode = nodes.find((node) => ["CrossEntropy", "MSE"].includes(node.data.blockType))

  const optimizerCode =
    optimizerNode?.data.blockType === "SGD"
      ? `optimizer = optim.SGD(model.parameters(), lr=${optimizerNode.data.parameters.learning_rate || 0.01})`
      : `optimizer = optim.Adam(model.parameters(), lr=${optimizerNode?.data.parameters.learning_rate || 0.001})`

  const lossCode =
    lossNode?.data.blockType === "CrossEntropy" ? `criterion = nn.CrossEntropyLoss()` : `criterion = nn.MSELoss()`

  return `def train_model(model, train_loader, epochs=10):
    """Training function with tensor shape validation"""
    ${optimizerCode}
    ${lossCode}
    
    model.train()
    train_losses = []
    train_accuracies = []
    
    # Print model summary
    print("Model Architecture:")
    print(model)
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        correct = 0
        total = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            # Print tensor shapes for first batch
            if epoch == 0 and batch_idx == 0:
                print(f"Input batch shape: {data.shape}")
                print(f"Target batch shape: {target.shape}")
            
            optimizer.zero_grad()
            
            # Forward pass with shape validation
            try:
                output = model(data)
                if epoch == 0 and batch_idx == 0:
                    print(f"Output shape: {output.shape}")
                
                loss = criterion(output, target)
            except RuntimeError as e:
                print(f"Shape mismatch error: {e}")
                print(f"Input shape: {data.shape}")
                raise e
            
            # Backward pass
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            
            # Calculate accuracy
            _, predicted = torch.max(output.data, 1)
            total += target.size(0)
            correct += (predicted == target).sum().item()
        
        avg_loss = epoch_loss / len(train_loader)
        accuracy = 100 * correct / total
        
        train_losses.append(avg_loss)
        train_accuracies.append(accuracy)
        
        print(f'Epoch [{epoch+1}/{epochs}], Loss: {avg_loss:.4f}, Accuracy: {accuracy:.2f}%')
    
    return train_losses, train_accuracies

# Example usage with shape validation
if __name__ == "__main__":
    # Create model and data loader
    model = BlockMLModel()
    train_loader = create_data_loader('mnist', batch_size=32)
    
    # Print tensor flow information
    print("=== Tensor Shape Validation ===")
    sample_batch = next(iter(train_loader))
    print(f"Sample input shape: {sample_batch[0].shape}")
    print(f"Sample target shape: {sample_batch[1].shape}")
    
    # Train the model
    print("\\n=== Starting Training ===")
    losses, accuracies = train_model(model, train_loader, epochs=10)
    
    # Plot training metrics
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(losses)
    plt.title('Training Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    
    plt.subplot(1, 2, 2)
    plt.plot(accuracies)
    plt.title('Training Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy (%)')
    
    plt.tight_layout()
    plt.show()
    
    # Save the model
    torch.save(model.state_dict(), 'blockml_model.pth')
    print("Model saved as 'blockml_model.pth'")
`
}

function generateShapeComment(node: any): string {
  const { blockType, parameters } = node.data

  switch (blockType) {
    case "Dense":
      return ` # Linear(${parameters.input_features || 784}, ${parameters.units || 64})`
    case "Conv2D":
      return ` # Conv2d(${parameters.in_channels || 1}, ${parameters.filters || 32}, ${parameters.kernel_size || 3})`
    case "MaxPooling2D":
      return ` # MaxPool2d(${parameters.pool_size || 2})`
    case "Dropout":
      return ` # Dropout(${parameters.rate || 0.2})`
    case "Flatten":
      return ` # Flatten`
    case "LSTM":
      return ` # LSTM(${parameters.input_size || 128}, ${parameters.units || 128})`
    case "BatchNorm":
      return ` # BatchNorm1d(${parameters.num_features || 64})`
    case "LayerNorm":
      return ` # LayerNorm(${parameters.normalized_shape || 64})`
    default:
      return ` # ${blockType} layer`
  }
}

function getExpectedOutputShape(node: any): string {
  const { blockType, parameters } = node.data

  switch (blockType) {
    case "Dense":
      return `(batch_size, ${parameters.units || 64})`
    case "Conv2D":
      return `(batch_size, ${parameters.filters || 32}, height, width)` // Adjust height and width based on kernel_size and padding
    case "MaxPooling2D":
      return `(batch_size, channels, height/pool_size, width/pool_size)` // Adjust height and width based on pool_size
    case "Flatten":
      return `(batch_size, num_features)` // Calculate num_features based on input shape
    case "LSTM":
      return `(batch_size, seq_len, ${parameters.units || 128})`
    case "BatchNorm":
      return `(batch_size, ${parameters.num_features || 64})`
    case "LayerNorm":
      return `(batch_size, ${parameters.normalized_shape || 64})`
    case "Add":
    case "Concatenate":
    case "Activation":
    case "Dropout":
      return `(same as input)`
    default:
      return `(unknown)`
  }
}
