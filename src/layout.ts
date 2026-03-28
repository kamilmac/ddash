import dagre from 'dagre'
import type { Diagram, NodeShape, EdgeKind, NodeRef } from './parser.ts'
import { measureNodeLabel } from './measure.ts'

export interface LayoutNode {
  id: string
  label: string
  shape: NodeShape
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutEdge {
  from: string
  to: string
  label?: string
  kind: EdgeKind
  bidi: boolean
  points: Array<{ x: number; y: number }>
}

export interface LayoutGroup {
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutResult {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  groups: LayoutGroup[]
  width: number
  height: number
}

interface NodeInfo {
  id: string
  label: string
  shape: NodeShape
  group?: string
}

export function layoutDiagram(diagram: Diagram): LayoutResult {
  const nodeMap = new Map<string, NodeInfo>()
  const groups: Array<{ id: string; label: string }> = []
  const groupStack: string[] = []
  const edges: Array<{ from: string; to: string; label?: string; kind: EdgeKind; bidi: boolean }> = []

  function registerNode(ref: NodeRef) {
    if (!ref.id) return
    const existing = nodeMap.get(ref.id)
    if (existing) {
      // First shape wins
      if (ref.shape && existing.shape === 'box') existing.shape = ref.shape
      return
    }
    nodeMap.set(ref.id, {
      id: ref.id,
      label: ref.label,
      shape: ref.shape ?? 'box',
      group: groupStack.length > 0 ? groupStack[groupStack.length - 1] : undefined,
    })
  }

  // Extract nodes, edges, groups from statements
  for (const stmt of diagram.statements) {
    switch (stmt.kind) {
      case 'edge':
        registerNode(stmt.from)
        registerNode(stmt.to)
        edges.push({ from: stmt.from.id, to: stmt.to.id, label: stmt.label, kind: stmt.edgeKind, bidi: stmt.bidi })
        break
      case 'node':
        registerNode(stmt.ref)
        break
      case 'group_start':
        groups.push({ id: stmt.id, label: stmt.label })
        groupStack.push(stmt.id)
        break
      case 'group_end':
        groupStack.pop()
        break
    }
  }

  if (nodeMap.size === 0) {
    return { nodes: [], edges: [], groups: [], width: 0, height: 0 }
  }

  // Build dagre graph
  const g = new dagre.graphlib.Graph({ compound: true })
  g.setGraph({
    rankdir: diagram.direction,
    ranksep: 50,
    nodesep: 40,
    edgesep: 20,
    marginx: 30,
    marginy: 30,
  })
  g.setDefaultEdgeLabel(() => ({}))

  // Add group nodes
  for (const group of groups) {
    g.setNode(group.id, {
      label: group.label,
      clusterLabelPos: 'top',
      paddingTop: 28,
      paddingBottom: 12,
      paddingLeft: 12,
      paddingRight: 12,
    })
  }

  // Add nodes with measured dimensions
  for (const node of nodeMap.values()) {
    const dims = measureNodeLabel(node.label)
    // Diamonds need more space
    const w = node.shape === 'diamond' ? dims.width * 1.3 : dims.width
    const h = node.shape === 'diamond' ? dims.height * 1.5 : dims.height
    g.setNode(node.id, { label: node.label, width: w, height: h })
    if (node.group) g.setParent(node.id, node.group)
  }

  // Add edges — skip edges where a node ID collides with a group ID
  const groupIds = new Set(groups.map(gr => gr.id))
  for (const edge of edges) {
    if (nodeMap.has(edge.from) && nodeMap.has(edge.to) &&
        !groupIds.has(edge.from) && !groupIds.has(edge.to)) {
      g.setEdge(edge.from, edge.to, { label: edge.label || '' })
    }
  }

  try {
    dagre.layout(g)
  } catch {
    // dagre can crash on certain compound graph configurations
    // Fall back to a simple grid layout
    let x = 30, y = 30
    const fallbackNodes: LayoutNode[] = []
    for (const node of nodeMap.values()) {
      const dims = measureNodeLabel(node.label)
      fallbackNodes.push({ id: node.id, label: node.label, shape: node.shape, x, y, width: dims.width, height: dims.height })
      x += dims.width + 40
      if (x > 800) { x = 30; y += 60 }
    }
    return { nodes: fallbackNodes, edges: [], groups: [], width: x + 30, height: y + 60 }
  }

  // Extract positioned nodes
  const layoutNodes: LayoutNode[] = []
  for (const node of nodeMap.values()) {
    const n = g.node(node.id)
    if (!n) continue
    layoutNodes.push({
      id: node.id,
      label: node.label,
      shape: node.shape,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    })
  }

  // Extract positioned edges
  const layoutEdges: LayoutEdge[] = []
  for (const edge of edges) {
    const e = g.edge(edge.from, edge.to)
    if (!e) continue
    layoutEdges.push({
      from: edge.from,
      to: edge.to,
      label: edge.label,
      kind: edge.kind,
      bidi: edge.bidi,
      points: e.points || [],
    })
  }

  // Extract positioned groups
  const layoutGroups: LayoutGroup[] = []
  for (const group of groups) {
    const n = g.node(group.id)
    if (!n) continue
    layoutGroups.push({
      id: group.id,
      label: group.label,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    })
  }

  const graphInfo = g.graph()
  const width = graphInfo.width ?? 400
  const height = graphInfo.height ?? 300

  return { nodes: layoutNodes, edges: layoutEdges, groups: layoutGroups, width, height }
}
