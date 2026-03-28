// Extracts interactive node/edge data from Mermaid's rendered SVG DOM
// and annotates elements with data-id/data-from/data-to for interactivity.

export interface InteractiveNode {
  id: string
  label: string
  el: SVGGElement
}

export interface InteractiveEdge {
  from: string
  to: string
  label: string
  el: SVGGElement
}

export interface InteractiveData {
  nodes: InteractiveNode[]
  edges: InteractiveEdge[]
}

export function extractInteractiveData(svg: SVGSVGElement): InteractiveData {
  const nodes: InteractiveNode[] = []
  const edges: InteractiveEdge[] = []

  // Mermaid flowchart nodes have class "node" and id like "flowchart-A-0"
  svg.querySelectorAll('.node').forEach(el => {
    const g = el as SVGGElement
    const rawId = g.id
    const nodeId = parseNodeId(rawId)
    if (!nodeId) return

    const label = extractTextContent(g)
    g.setAttribute('data-id', nodeId)
    nodes.push({ id: nodeId, label, el: g })
  })

  // Mermaid edges have class "edgePath" or "flowchart-link"
  svg.querySelectorAll('.edgePath').forEach(el => {
    const g = el as SVGGElement
    const parsed = parseEdgeId(g)
    if (!parsed) return

    g.setAttribute('data-from', parsed.from)
    g.setAttribute('data-to', parsed.to)

    // Try to find associated label in edgeLabels
    const label = findEdgeLabel(svg, g)
    edges.push({ from: parsed.from, to: parsed.to, label, el: g })
  })

  return { nodes, edges }
}

// Parse node ID from Mermaid's internal format: "flowchart-A-0" → "A"
function parseNodeId(rawId: string): string | null {
  if (!rawId) return null
  // Mermaid uses "flowchart-{id}-{index}" pattern
  const match = rawId.match(/^flowchart-(.+?)-\d+$/)
  if (match) return match[1]
  // Fallback: just use the raw ID
  return rawId
}

// Parse edge connections from Mermaid's edge element
// Mermaid edges have class like "LS-A LE-B" (link-start, link-end)
function parseEdgeId(el: SVGGElement): { from: string; to: string } | null {
  const classList = el.getAttribute('class') || ''

  const startMatch = classList.match(/LS-(\S+)/)
  const endMatch = classList.match(/LE-(\S+)/)
  if (startMatch && endMatch) {
    return { from: startMatch[1], to: endMatch[1] }
  }

  // Fallback: try aria-label or id parsing
  const id = el.id
  if (id) {
    // Mermaid edge IDs can be "L-A-B-0" format
    const match = id.match(/^L-(.+?)-(.+?)-\d+$/)
    if (match) return { from: match[1], to: match[2] }
  }

  return null
}

function extractTextContent(g: SVGGElement): string {
  const texts: string[] = []
  g.querySelectorAll('text, tspan').forEach(t => {
    const text = t.textContent?.trim()
    if (text) texts.push(text)
  })
  // Deduplicate (tspan text is also in parent text)
  return [...new Set(texts)].join(' ') || ''
}

function findEdgeLabel(svg: SVGSVGElement, edgePath: SVGGElement): string {
  // Mermaid puts edge labels in a separate .edgeLabels group
  // The label index corresponds to the edge index
  const allEdges = Array.from(svg.querySelectorAll('.edgePath'))
  const idx = allEdges.indexOf(edgePath)
  if (idx === -1) return ''

  const allLabels = svg.querySelectorAll('.edgeLabel')
  const labelEl = allLabels[idx]
  if (!labelEl) return ''

  return labelEl.textContent?.trim() || ''
}
