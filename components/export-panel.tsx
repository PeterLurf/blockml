"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Copy, FileText } from "lucide-react"
import { useBlockMLStore } from "@/lib/store"
import { generatePyTorchCode } from "@/lib/code-generator"

export function ExportPanel() {
  const [generatedCode, setGeneratedCode] = useState("")
  const [exportFormat, setExportFormat] = useState("pytorch")
  const { nodes, edges } = useBlockMLStore()

  const handleGenerateCode = () => {
    if (nodes.length === 0) {
      alert("Please add some blocks to your model first!")
      return
    }

    const code = generatePyTorchCode(nodes, edges)
    setGeneratedCode(code)
  }

  const handleDownload = () => {
    if (!generatedCode) {
      handleGenerateCode()
      return
    }

    const blob = new Blob([generatedCode], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "model.py"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    if (generatedCode) {
      await navigator.clipboard.writeText(generatedCode)
      alert("Code copied to clipboard!")
    }
  }

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Model</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={handleGenerateCode} className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Generate Code
            </Button>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={handleCopy} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>

          <Tabs value={exportFormat} onValueChange={setExportFormat}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pytorch">PyTorch</TabsTrigger>
              <TabsTrigger value="onnx">ONNX</TabsTrigger>
            </TabsList>

            <TabsContent value="pytorch" className="space-y-2">
              <div className="text-sm text-gray-600">Export as PyTorch model with training script</div>
            </TabsContent>

            <TabsContent value="onnx" className="space-y-2">
              <div className="text-sm text-gray-600">Export as ONNX format for cross-platform deployment</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {generatedCode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generated Code</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedCode}
              readOnly
              className="font-mono text-sm h-96"
              placeholder="Generated code will appear here..."
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Export Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Included Files:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• model.py - Model definition</li>
              <li>• train.py - Training script</li>
              <li>• requirements.txt - Dependencies</li>
              <li>• README.md - Usage instructions</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Features:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Complete training loop</li>
              <li>• Model checkpointing</li>
              <li>• Metrics logging</li>
              <li>• Data loading utilities</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
