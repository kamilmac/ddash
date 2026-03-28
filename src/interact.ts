// Click-to-highlight and hover tooltips for Mermaid diagrams.

import type { InteractiveData } from './extract.ts'

let cleanup: (() => void) | null = null

export function initInteractivity(container: HTMLElement, data: InteractiveData) {
  if (cleanup) cleanup()

  const svg = container.querySelector('svg') as SVGSVGElement | null
  if (!svg) return

  const controllers: AbortController[] = []

  // Build adjacency: nodeId → connected edge elements
  const edgesByNode = new Map<string, SVGElement[]>()
  for (const edge of data.edges) {
    if (!edgesByNode.has(edge.from)) edgesByNode.set(edge.from, [])
    if (!edgesByNode.has(edge.to)) edgesByNode.set(edge.to, [])
    edgesByNode.get(edge.from)!.push(edge.el)
    edgesByNode.get(edge.to)!.push(edge.el)
  }

  // ---- Click to highlight ----

  let highlighted: string | null = null
  const svgAc = new AbortController()
  controllers.push(svgAc)

  svg.addEventListener('click', (e: MouseEvent) => {
    const nodeEl = (e.target as Element).closest('.node[data-id]')

    svg.querySelectorAll('.node.highlighted').forEach(n => n.classList.remove('highlighted'))
    svg.querySelectorAll('.edgePath.highlighted').forEach(n => n.classList.remove('highlighted'))

    if (!nodeEl) {
      highlighted = null
      return
    }

    const nodeId = nodeEl.getAttribute('data-id')!

    if (highlighted === nodeId) {
      highlighted = null
      return
    }

    highlighted = nodeId
    nodeEl.classList.add('highlighted')

    const connectedEdges = edgesByNode.get(nodeId) || []
    connectedEdges.forEach(edge => edge.classList.add('highlighted'))
  }, { signal: svgAc.signal })

  // ---- Tooltip ----

  let tooltip = document.getElementById('ddash-tooltip')
  if (!tooltip) {
    tooltip = document.createElement('div')
    tooltip.id = 'ddash-tooltip'
    tooltip.className = 'ddash-tooltip'
    document.body.appendChild(tooltip)
  }

  for (const node of data.nodes) {
    const ac = new AbortController()
    controllers.push(ac)
    const el = node.el

    const connectedEdges = edgesByNode.get(node.id) || []
    const connections = connectedEdges.map(e => {
      const from = e.getAttribute('data-from')!
      const to = e.getAttribute('data-to')!
      return from === node.id ? `→ ${to}` : `← ${from}`
    })

    el.addEventListener('mouseenter', () => {
      if (!tooltip) return
      let html = `<strong>${node.id}</strong>`
      if (node.label !== node.id) html += `<br>${node.label}`
      if (connections.length > 0) html += `<br><span class="ddash-tooltip-dim">${connections.join(', ')}</span>`
      tooltip.innerHTML = html
      tooltip.style.display = 'block'
    }, { signal: ac.signal })

    el.addEventListener('mousemove', (e: MouseEvent) => {
      if (!tooltip) return
      tooltip.style.left = `${e.clientX + 12}px`
      tooltip.style.top = `${e.clientY + 12}px`
    }, { signal: ac.signal })

    el.addEventListener('mouseleave', () => {
      if (!tooltip) return
      tooltip.style.display = 'none'
    }, { signal: ac.signal })
  }

  cleanup = () => {
    controllers.forEach(ac => ac.abort())
    if (tooltip) tooltip.style.display = 'none'
  }
}
