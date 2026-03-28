// Node dragging, hover tooltips, and click-to-highlight for flow diagrams.
// Called after each render with the SVG container and layout result.

import type { LayoutResult } from './layout.ts'

let cleanup: (() => void) | null = null

export function initInteractivity(container: HTMLElement, layout: LayoutResult) {
  // Clean up previous listeners
  if (cleanup) cleanup()

  const svg = container.querySelector('svg') as SVGSVGElement | null
  if (!svg) return

  const controllers: AbortController[] = []

  // Build adjacency: nodeId → connected edge elements
  const edgesByNode = new Map<string, SVGElement[]>()
  svg.querySelectorAll('.edge[data-from][data-to]').forEach(el => {
    const from = el.getAttribute('data-from')!
    const to = el.getAttribute('data-to')!
    if (!edgesByNode.has(from)) edgesByNode.set(from, [])
    if (!edgesByNode.has(to)) edgesByNode.set(to, [])
    edgesByNode.get(from)!.push(el as SVGElement)
    edgesByNode.get(to)!.push(el as SVGElement)
  })

  // ---- Node dragging ----

  svg.querySelectorAll('.node[data-id]').forEach(nodeEl => {
    const ac = new AbortController()
    controllers.push(ac)
    const el = nodeEl as SVGGElement
    const nodeId = el.getAttribute('data-id')!

    // Find this node's layout position
    const nodeLayout = layout.nodes.find(n => n.id === nodeId)
    if (!nodeLayout) return

    let offsetX = 0
    let offsetY = 0
    let dragging = false
    let startPointer = { x: 0, y: 0 }

    el.style.cursor = 'grab'

    el.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation() // Prevent pan-zoom
      dragging = true
      el.style.cursor = 'grabbing'
      el.setPointerCapture(e.pointerId)

      // Convert client coords to SVG coords
      const pt = svgPoint(svg, e.clientX, e.clientY)
      startPointer = { x: pt.x - offsetX, y: pt.y - offsetY }
    }, { signal: ac.signal })

    el.addEventListener('pointermove', (e: PointerEvent) => {
      if (!dragging) return
      const pt = svgPoint(svg, e.clientX, e.clientY)
      offsetX = pt.x - startPointer.x
      offsetY = pt.y - startPointer.y

      // Move the node
      el.setAttribute('transform', `translate(${offsetX}, ${offsetY})`)

      // Update connected edges
      updateEdgesForNode(svg, layout, nodeId, offsetX, offsetY)
    }, { signal: ac.signal })

    const endDrag = () => {
      if (!dragging) return
      dragging = false
      el.style.cursor = 'grab'
    }
    el.addEventListener('pointerup', endDrag, { signal: ac.signal })
    el.addEventListener('pointercancel', endDrag, { signal: ac.signal })
  })

  // ---- Click to highlight ----

  let highlighted: string | null = null

  const svgAc = new AbortController()
  controllers.push(svgAc)

  svg.addEventListener('click', (e: MouseEvent) => {
    const nodeEl = (e.target as Element).closest('.node[data-id]')

    // Clear previous highlight
    svg.querySelectorAll('.node.highlighted').forEach(n => n.classList.remove('highlighted'))
    svg.querySelectorAll('.edge.highlighted').forEach(n => n.classList.remove('highlighted'))

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

    // Highlight connected edges
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

  svg.querySelectorAll('.node[data-id]').forEach(nodeEl => {
    const ac = new AbortController()
    controllers.push(ac)
    const el = nodeEl as SVGGElement
    const nodeId = el.getAttribute('data-id')!
    const nodeLayout = layout.nodes.find(n => n.id === nodeId)
    if (!nodeLayout) return

    const connectedEdges = edgesByNode.get(nodeId) || []
    const connections = connectedEdges.map(e => {
      const from = e.getAttribute('data-from')!
      const to = e.getAttribute('data-to')!
      return from === nodeId ? `→ ${to}` : `← ${from}`
    })

    el.addEventListener('mouseenter', () => {
      if (!tooltip) return
      let html = `<strong>${nodeId}</strong>`
      if (nodeLayout.label !== nodeId) html += `<br>${nodeLayout.label}`
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
  })

  cleanup = () => {
    controllers.forEach(ac => ac.abort())
    if (tooltip) tooltip.style.display = 'none'
  }
}

// ---- Helpers ----

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: clientX, y: clientY }
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: transformed.x, y: transformed.y }
}

// Offset map for dragged nodes — tracks cumulative displacement
const dragOffsets = new Map<string, { x: number; y: number }>()

function updateEdgesForNode(svg: SVGSVGElement, layout: LayoutResult, nodeId: string, dx: number, dy: number) {
  dragOffsets.set(nodeId, { x: dx, y: dy })

  // Find all edges that connect to this node and redraw their paths
  svg.querySelectorAll('.edge[data-from], .edge[data-to]').forEach(edgeEl => {
    const from = edgeEl.getAttribute('data-from')!
    const to = edgeEl.getAttribute('data-to')!
    if (from !== nodeId && to !== nodeId) return

    // Find original edge layout
    const edgeLayout = layout.edges.find(e => e.from === from && e.to === to)
    if (!edgeLayout) return

    const fromOffset = dragOffsets.get(from) || { x: 0, y: 0 }
    const toOffset = dragOffsets.get(to) || { x: 0, y: 0 }

    // Recompute edge path with offsets applied
    const points = edgeLayout.points.map((pt, i) => {
      if (i === 0) {
        return { x: pt.x + fromOffset.x, y: pt.y + fromOffset.y }
      }
      if (i === edgeLayout.points.length - 1) {
        return { x: pt.x + toOffset.x, y: pt.y + toOffset.y }
      }
      // Intermediate points: interpolate offset based on position
      const t = i / (edgeLayout.points.length - 1)
      return {
        x: pt.x + fromOffset.x * (1 - t) + toOffset.x * t,
        y: pt.y + fromOffset.y * (1 - t) + toOffset.y * t,
      }
    })

    const pathStr = points.length > 0
      ? `M ${points[0].x} ${points[0].y}` + points.slice(1).map(p => ` L ${p.x} ${p.y}`).join('')
      : ''

    const pathEl = edgeEl.querySelector('.edge-path')
    if (pathEl) pathEl.setAttribute('d', pathStr)

    // Update label position
    const labelEl = edgeEl.querySelector('.edge-label') as SVGTextElement | null
    const bgEl = edgeEl.querySelector('.edge-label-bg') as SVGRectElement | null
    if (labelEl && points.length > 0) {
      const mid = points[Math.floor(points.length / 2)]
      labelEl.setAttribute('x', String(mid.x))
      labelEl.setAttribute('y', String(mid.y - 6))
      if (bgEl) {
        try {
          const bbox = labelEl.getBBox()
          bgEl.setAttribute('x', String(bbox.x - 4))
          bgEl.setAttribute('y', String(bbox.y - 2))
          bgEl.setAttribute('width', String(bbox.width + 8))
          bgEl.setAttribute('height', String(bbox.height + 4))
        } catch { /* */ }
      }
    }
  })
}
