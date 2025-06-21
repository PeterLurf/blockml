"use client"

import { create } from "zustand"

interface Position {
  x: number
  y: number
}

interface BlockNode {
  id: string
  type: string
  position: Position
  data: {
    blockType: string
    label: string
    inputs: string[]
    outputs: string[]
    parameters: Record<string, any>
  }
}

interface Connection {
  id: string
  source: string
  target: string
  sourceHandle: string
  targetHandle: string
  isValid?: boolean
  validationError?: string
}

interface BlockMLState {
  nodes: BlockNode[]
  edges: Connection[]
  setNodes: (nodes: BlockNode[]) => void
  setEdges: (edges: Connection[]) => void
  setConnections: (connections: Connection[]) => void
  addNode: (node: BlockNode) => void
  removeNode: (nodeId: string) => void
  updateNode: (nodeId: string, data: any) => void
  saveProject: () => void
  loadProject: () => void
}

export const useBlockMLStore = create<BlockMLState>((set, get) => ({
  nodes: [],
  edges: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setConnections: (connections) => set({ edges: connections }),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })),

  updateNode: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node)),
    })),

  saveProject: () => {
    const { nodes, edges } = get()
    const project = { nodes, edges, timestamp: new Date().toISOString() }
    localStorage.setItem("blockml-project", JSON.stringify(project))

    // Also trigger download
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "blockml-project.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  loadProject: () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const project = JSON.parse(e.target?.result as string)
            set({ nodes: project.nodes || [], edges: project.edges || [] })
          } catch (error) {
            alert("Error loading project file")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  },
}))
