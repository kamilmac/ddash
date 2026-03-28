import type { LayoutResult, LayoutNode, LayoutEdge, LayoutGroup } from './layout.ts'
import type { NodeShape } from './parser.ts'
import { svgEl, boxShape, diamondShape, roundedShape, cylinderShape, circleShape } from './shapes.ts'
import { NODE_FONT, EDGE_FONT, GROUP_FONT } from './measure.ts'

function fontToCss(font: string): Record<string, string> {
  // Parse "600 13px ..." into font-weight and font-size
  const parts = font.split(' ')
  const attrs: Record<string, string> = {}
  for (const p of parts) {
    if (/^\d{3}$/.test(p)) attrs['font-weight'] = p
    else if (p.endsWith('px')) attrs['font-size'] = p
    else if (!attrs['font-family']) attrs['font-family'] = parts.slice(parts.indexOf(p)).join(' ')
  }
  return attrs
}

function nodeShapeEl(shape: NodeShape, cx: number, cy: number, w: number, h: number): SVGElement {
  switch (shape) {
    case 'diamond': return diamondShape(cx, cy, w, h)
    case 'rounded': return roundedShape(cx, cy, w, h)
    case 'cylinder': return cylinderShape(cx, cy, w, h)
    case 'circle': return circleShape(cx, cy, w, h)
    default: return boxShape(cx, cy, w, h)
  }
}

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return ''
  const parts = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 1; i < points.length; i++) {
    parts.push(`L ${points[i].x} ${points[i].y}`)
  }
  return parts.join(' ')
}

function renderGroup(group: LayoutGroup): SVGElement {
  const g = svgEl('g', { class: 'group' })
  const rect = svgEl('rect', {
    x: group.x - group.width / 2,
    y: group.y - group.height / 2,
    width: group.width,
    height: group.height,
    rx: 6,
    class: 'group-rect',
  })
  g.appendChild(rect)

  const fontAttrs = fontToCss(GROUP_FONT)
  const text = svgEl('text', {
    x: group.x - group.width / 2 + 10,
    y: group.y - group.height / 2 + 16,
    class: 'group-label',
    ...fontAttrs,
  })
  text.textContent = group.label
  g.appendChild(text)

  return g
}

function renderNode(node: LayoutNode): SVGElement {
  const g = svgEl('g', { class: 'node', 'data-id': node.id })

  const shape = nodeShapeEl(node.shape, node.x, node.y, node.width, node.height)
  shape.setAttribute('class', 'node-shape')
  g.appendChild(shape)

  const fontAttrs = fontToCss(NODE_FONT)
  const lines = node.label.split('\n')
  if (lines.length === 1) {
    const text = svgEl('text', {
      x: node.x,
      y: node.y,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      class: 'node-label',
      ...fontAttrs,
    })
    text.textContent = node.label
    g.appendChild(text)
  } else {
    const lineHeight = 16
    const startY = node.y - ((lines.length - 1) * lineHeight) / 2
    for (let i = 0; i < lines.length; i++) {
      const text = svgEl('text', {
        x: node.x,
        y: startY + i * lineHeight,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        class: 'node-label',
        ...fontAttrs,
      })
      text.textContent = lines[i]
      g.appendChild(text)
    }
  }

  return g
}

function renderEdge(edge: LayoutEdge): SVGElement {
  const g = svgEl('g', { class: 'edge', 'data-from': edge.from, 'data-to': edge.to })

  const path = svgEl('path', {
    d: pointsToPath(edge.points),
    class: 'edge-path',
    fill: 'none',
    'marker-end': 'url(#arrowhead)',
  })

  if (edge.bidi) path.setAttribute('marker-start', 'url(#arrowhead-reverse)')

  if (edge.kind === 'dashed') {
    path.setAttribute('stroke-dasharray', '6 3')
  } else if (edge.kind === 'crossed') {
    path.setAttribute('stroke-dasharray', '2 4')
    path.setAttribute('opacity', '0.5')
  }

  g.appendChild(path)

  if (edge.label) {
    // Position label at midpoint of path
    const mid = edge.points[Math.floor(edge.points.length / 2)]
    if (mid) {
      const fontAttrs = fontToCss(EDGE_FONT)
      // Background rect for readability
      const bg = svgEl('rect', {
        class: 'edge-label-bg',
        rx: 3,
      })
      const text = svgEl('text', {
        x: mid.x,
        y: mid.y - 6,
        'text-anchor': 'middle',
        'dominant-baseline': 'auto',
        class: 'edge-label',
        ...fontAttrs,
      })
      text.textContent = edge.label
      g.appendChild(bg)
      g.appendChild(text)

      // We'll position the bg rect after the text is in the DOM (see postProcess)
      bg.setAttribute('data-for-text', 'true')
    }
  }

  return g
}

function postProcessLabels(svg: SVGElement) {
  // Size background rects to fit their text siblings
  const bgs = svg.querySelectorAll('.edge-label-bg[data-for-text]')
  bgs.forEach(bg => {
    const text = bg.nextElementSibling as SVGTextElement
    if (!text) return
    try {
      const bbox = text.getBBox()
      bg.setAttribute('x', String(bbox.x - 4))
      bg.setAttribute('y', String(bbox.y - 2))
      bg.setAttribute('width', String(bbox.width + 8))
      bg.setAttribute('height', String(bbox.height + 4))
    } catch {
      // getBBox can fail if element isn't rendered
    }
  })
}

export function renderDiagram(result: LayoutResult, container: HTMLElement) {
  container.innerHTML = ''
  if (result.nodes.length === 0) return

  const pad = 10
  const svg = svgEl('svg', {
    viewBox: `${-pad} ${-pad} ${result.width + pad * 2} ${result.height + pad * 2}`,
    class: 'diagram-svg',
  }) as SVGSVGElement

  // Defs: arrowheads
  const defs = svgEl('defs')

  const marker = svgEl('marker', {
    id: 'arrowhead',
    viewBox: '0 0 10 10',
    refX: 9, refY: 5,
    markerWidth: 7, markerHeight: 7,
    orient: 'auto',
  })
  const arrow = svgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', class: 'arrow-fill' })
  marker.appendChild(arrow)
  defs.appendChild(marker)

  const markerRev = svgEl('marker', {
    id: 'arrowhead-reverse',
    viewBox: '0 0 10 10',
    refX: 1, refY: 5,
    markerWidth: 7, markerHeight: 7,
    orient: 'auto',
  })
  const arrowRev = svgEl('path', { d: 'M 10 1 L 0 5 L 10 9 z', class: 'arrow-fill' })
  markerRev.appendChild(arrowRev)
  defs.appendChild(markerRev)

  svg.appendChild(defs)

  // Render layers: groups -> edges -> nodes
  const groupLayer = svgEl('g', { class: 'layer-groups' })
  for (const group of result.groups) groupLayer.appendChild(renderGroup(group))
  svg.appendChild(groupLayer)

  const edgeLayer = svgEl('g', { class: 'layer-edges' })
  for (const edge of result.edges) edgeLayer.appendChild(renderEdge(edge))
  svg.appendChild(edgeLayer)

  const nodeLayer = svgEl('g', { class: 'layer-nodes' })
  for (const node of result.nodes) nodeLayer.appendChild(renderNode(node))
  svg.appendChild(nodeLayer)

  container.appendChild(svg)

  // Post-process: size label backgrounds after SVG is in DOM
  requestAnimationFrame(() => postProcessLabels(svg))
}
