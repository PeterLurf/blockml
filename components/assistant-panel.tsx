"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Bot, User } from "lucide-react"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  timestamp: Date
}

export function AssistantPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "assistant",
      content:
        "Hello! I'm your BlockML assistant. I can help you build ML models, explain errors, and suggest improvements. What would you like to know?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "assistant",
        content: generateAssistantResponse(inputValue),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      setIsLoading(false)
    }, 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="p-4 h-full flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === "user" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start space-x-2">
                      {message.type === "assistant" && <Bot className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      {message.type === "user" && <User className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      <div className="text-sm">{message.content}</div>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Bot className="w-4 h-4" />
                      <div className="text-sm">Thinking...</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex space-x-2 mt-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your ML model..."
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => setInputValue("How do I build a CNN for image classification?")}
            >
              Build CNN for images
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => setInputValue("Explain the difference between Dense and Conv2D layers")}
            >
              Explain layer types
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-xs"
              onClick={() => setInputValue("My model is overfitting, what should I do?")}
            >
              Fix overfitting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function generateAssistantResponse(userInput: string): string {
  const input = userInput.toLowerCase()

  if (input.includes("cnn") || input.includes("convolutional")) {
    return "To build a CNN for image classification:\n\n1. Start with a Conv2D layer for feature extraction\n2. Add MaxPooling2D to reduce spatial dimensions\n3. Stack more Conv2D + MaxPooling2D layers\n4. Add Dropout for regularization\n5. Flatten and add Dense layers for classification\n6. Use appropriate loss function (CrossEntropy for multi-class)\n\nWould you like me to help you set up the specific architecture?"
  }

  if (input.includes("dense") || input.includes("conv2d")) {
    return "Dense vs Conv2D layers:\n\n**Dense Layer:**\n- Fully connected to all inputs\n- Good for final classification\n- Parameters: input_size × output_size\n\n**Conv2D Layer:**\n- Applies filters to local regions\n- Preserves spatial relationships\n- Good for feature extraction\n- Parameters: filter_size × channels\n\nUse Conv2D for images, Dense for final predictions!"
  }

  if (input.includes("overfitting")) {
    return "To fix overfitting, try these techniques:\n\n1. **Add Dropout layers** - randomly disable neurons during training\n2. **Reduce model complexity** - fewer layers or units\n3. **Get more training data** - or use data augmentation\n4. **Early stopping** - stop training when validation loss increases\n5. **Regularization** - L1/L2 penalties\n\nStart with adding Dropout layers with rate 0.2-0.5 after Dense layers!"
  }

  return "I can help you with:\n\n• Building different model architectures\n• Explaining ML concepts and layers\n• Debugging training issues\n• Optimizing model performance\n• Choosing the right loss functions and optimizers\n\nWhat specific aspect would you like to explore?"
}
