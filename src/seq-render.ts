import type { SeqLayoutResult } from './seq-layout.ts'
import { svgEl } from './shapes.ts'
import { NODE_FONT, EDGE_FONT, GROUP_FONT } from './measure.ts'

const HEADER_H = 36
const MARGIN = 30

function fontToCss(font: string): Record<string, string> {
  const parts = font.split(' ')
  const attrs: Record<string, string> = {}
  for (const p of parts) {
    if (/^\d{3}$/.test(p)) attrs['font-weight'] = p
    else if (p.endsWith('px')) attrs['font-size'] = p
    else if (!attrs['font-family']) attrs['font-family'] = parts.slice(parts.indexOf(p)).join(' ')
  }
  return attrs
}

export function renderSequence(result: SeqLayoutResult, container: HTMLElement) {
  container.innerHTML = ''
  if (result.participants.length === 0) return

  const pad = 10
  const svg = svgEl('svg', {
    viewBox: `${-pad} ${-pad} ${result.totalWidth + pad * 2} ${result.totalHeight + pad * 2}`,
    class: 'diagram-svg',
  }) as SVGSVGElement

  // Defs
  const defs = svgEl('defs')
  const marker = svgEl('marker', {
    id: 'arrowhead',
    viewBox: '0 0 10 10',
    refX: 9, refY: 5,
    markerWidth: 7, markerHeight: 7,
    orient: 'auto',
  })
  marker.appendChild(svgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', class: 'arrow-fill' }))
  defs.appendChild(marker)

  const markerRev = svgEl('marker', {
    id: 'arrowhead-reverse',
    viewBox: '0 0 10 10',
    refX: 1, refY: 5,
    markerWidth: 7, markerHeight: 7,
    orient: 'auto',
  })
  markerRev.appendChild(svgEl('path', { d: 'M 10 1 L 0 5 L 10 9 z', class: 'arrow-fill' }))
  defs.appendChild(markerRev)

  svg.appendChild(defs)

  const lifelineBottom = result.totalHeight - MARGIN - HEADER_H

  // Blocks layer (behind everything)
  const blockLayer = svgEl('g', { class: 'layer-blocks' })
  const leftmostX = result.participants[0]?.x ?? MARGIN
  const rightmostX = result.participants[result.participants.length - 1]?.x ?? MARGIN
  const blockLeft = leftmostX - 60
  const blockWidth = rightmostX - leftmostX + 120

  for (const block of result.blocks) {
    const g = svgEl('g', { class: 'seq-block' })

    // Block rectangle
    g.appendChild(svgEl('rect', {
      x: blockLeft, y: block.y,
      width: blockWidth, height: block.height,
      rx: 3, class: 'seq-block-rect',
    }))

    // Block type label (top-left corner)
    const labelBg = svgEl('rect', {
      x: blockLeft, y: block.y,
      width: 40, height: 18,
      rx: 3, class: 'seq-block-label-bg',
    })
    g.appendChild(labelBg)

    const fontAttrs = fontToCss(GROUP_FONT)
    const typeText = svgEl('text', {
      x: blockLeft + 5, y: block.y + 13,
      class: 'seq-block-type', ...fontAttrs,
    })
    typeText.textContent = block.type
    g.appendChild(typeText)

    // Block condition label
    const condText = svgEl('text', {
      x: blockLeft + 45, y: block.y + 13,
      class: 'seq-block-cond', ...fontAttrs,
    })
    condText.textContent = `[${block.label}]`
    g.appendChild(condText)

    // Else dividers
    for (const section of block.sections) {
      g.appendChild(svgEl('line', {
        x1: blockLeft, y1: section.y,
        x2: blockLeft + blockWidth, y2: section.y,
        class: 'seq-block-divider',
      }))
      if (section.label) {
        const elseText = svgEl('text', {
          x: blockLeft + 10, y: section.y + 14,
          class: 'seq-block-cond', ...fontAttrs,
        })
        elseText.textContent = `[${section.label}]`
        g.appendChild(elseText)
      } else {
        const elseText = svgEl('text', {
          x: blockLeft + 10, y: section.y + 14,
          class: 'seq-block-cond', ...fontAttrs,
        })
        elseText.textContent = '[else]'
        g.appendChild(elseText)
      }
    }

    blockLayer.appendChild(g)
  }
  svg.appendChild(blockLayer)

  // Lifelines
  const lifelineLayer = svgEl('g', { class: 'layer-lifelines' })
  for (const p of result.participants) {
    lifelineLayer.appendChild(svgEl('line', {
      x1: p.x, y1: MARGIN + HEADER_H,
      x2: p.x, y2: lifelineBottom,
      class: 'seq-lifeline',
    }))
  }
  svg.appendChild(lifelineLayer)

  // Participant headers (top)
  const headerLayer = svgEl('g', { class: 'layer-headers' })
  for (const p of result.participants) {
    const g = svgEl('g', { class: 'seq-participant' })

    // Top header
    g.appendChild(svgEl('rect', {
      x: p.x - p.headerW / 2, y: MARGIN,
      width: p.headerW, height: HEADER_H,
      rx: 4, class: 'node-shape',
    }))
    const fontAttrs = fontToCss(NODE_FONT)
    const text = svgEl('text', {
      x: p.x, y: MARGIN + HEADER_H / 2,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      class: 'node-label', ...fontAttrs,
    })
    text.textContent = p.label
    g.appendChild(text)

    // Bottom header (mirror)
    g.appendChild(svgEl('rect', {
      x: p.x - p.headerW / 2, y: lifelineBottom,
      width: p.headerW, height: HEADER_H,
      rx: 4, class: 'node-shape',
    }))
    const textB = svgEl('text', {
      x: p.x, y: lifelineBottom + HEADER_H / 2,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      class: 'node-label', ...fontAttrs,
    })
    textB.textContent = p.label
    g.appendChild(textB)

    headerLayer.appendChild(g)
  }
  svg.appendChild(headerLayer)

  // Dividers
  const dividerLayer = svgEl('g', { class: 'layer-dividers' })
  for (const div of result.dividers) {
    const g = svgEl('g', { class: 'seq-divider' })
    g.appendChild(svgEl('line', {
      x1: leftmostX - 50, y1: div.y,
      x2: rightmostX + 50, y2: div.y,
      class: 'seq-divider-line',
    }))
    if (div.label) {
      const fontAttrs = fontToCss(EDGE_FONT)
      const bg = svgEl('rect', { class: 'seq-divider-bg', rx: 3 })
      const text = svgEl('text', {
        x: (leftmostX + rightmostX) / 2, y: div.y + 4,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        class: 'seq-divider-text', ...fontAttrs,
      })
      text.textContent = div.label
      g.appendChild(bg)
      g.appendChild(text)
      bg.setAttribute('data-for-text', 'true')
    }
    dividerLayer.appendChild(g)
  }
  svg.appendChild(dividerLayer)

  // Messages
  const msgLayer = svgEl('g', { class: 'layer-messages' })
  for (const msg of result.messages) {
    const g = svgEl('g', { class: 'seq-message' })

    if (msg.self) {
      // Self-message: goes right then back
      const d = [
        `M ${msg.fromX} ${msg.y}`,
        `h ${30}`,
        `v ${20}`,
        `h ${-30}`,
      ].join(' ')
      const path = svgEl('path', {
        d, fill: 'none', class: 'edge-path',
        'marker-end': 'url(#arrowhead)',
      })
      if (msg.kind === 'dashed') path.setAttribute('stroke-dasharray', '6 3')
      g.appendChild(path)

      if (msg.label) {
        const fontAttrs = fontToCss(EDGE_FONT)
        const text = svgEl('text', {
          x: msg.fromX + 35, y: msg.y + 6,
          class: 'edge-label', ...fontAttrs,
        })
        text.textContent = msg.label
        g.appendChild(text)
      }
    } else {
      // Normal message
      const path = svgEl('line', {
        x1: msg.fromX, y1: msg.y,
        x2: msg.toX, y2: msg.y,
        class: 'edge-path',
        'marker-end': 'url(#arrowhead)',
      })
      if (msg.bidi) path.setAttribute('marker-start', 'url(#arrowhead-reverse)')
      if (msg.kind === 'dashed') path.setAttribute('stroke-dasharray', '6 3')
      if (msg.kind === 'crossed') {
        path.setAttribute('stroke-dasharray', '2 4')
        path.setAttribute('opacity', '0.5')
      }
      g.appendChild(path)

      if (msg.label) {
        const fontAttrs = fontToCss(EDGE_FONT)
        const midX = (msg.fromX + msg.toX) / 2
        const text = svgEl('text', {
          x: midX, y: msg.y - 8,
          'text-anchor': 'middle',
          class: 'edge-label', ...fontAttrs,
        })
        text.textContent = msg.label
        g.appendChild(text)
      }
    }

    msgLayer.appendChild(g)
  }
  svg.appendChild(msgLayer)

  container.appendChild(svg)

  // Post-process: size divider label backgrounds
  requestAnimationFrame(() => {
    const bgs = svg.querySelectorAll('[data-for-text]')
    bgs.forEach(bg => {
      const text = bg.nextElementSibling as SVGTextElement
      if (!text) return
      try {
        const bbox = text.getBBox()
        bg.setAttribute('x', String(bbox.x - 6))
        bg.setAttribute('y', String(bbox.y - 3))
        bg.setAttribute('width', String(bbox.width + 12))
        bg.setAttribute('height', String(bbox.height + 6))
      } catch { /* */ }
    })
  })
}
