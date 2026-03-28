const SVG_NS = 'http://www.w3.org/2000/svg'

export function svgEl(tag: string, attrs: Record<string, string | number> = {}): SVGElement {
  const el = document.createElementNS(SVG_NS, tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

export function boxShape(cx: number, cy: number, w: number, h: number): SVGElement {
  return svgEl('rect', {
    x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 4,
  })
}

export function diamondShape(cx: number, cy: number, w: number, h: number): SVGElement {
  const pts = [
    `${cx},${cy - h / 2}`,
    `${cx + w / 2},${cy}`,
    `${cx},${cy + h / 2}`,
    `${cx - w / 2},${cy}`,
  ].join(' ')
  return svgEl('polygon', { points: pts })
}

export function roundedShape(cx: number, cy: number, w: number, h: number): SVGElement {
  return svgEl('rect', {
    x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: h / 2,
  })
}

export function cylinderShape(cx: number, cy: number, w: number, h: number): SVGElement {
  const rx = w / 2
  const ry = Math.min(8, h / 5)
  const top = cy - h / 2
  const x = cx - rx

  const d = [
    `M ${x} ${top + ry}`,
    `a ${rx} ${ry} 0 1 1 ${w} 0`,
    `v ${h - 2 * ry}`,
    `a ${rx} ${ry} 0 1 1 ${-w} 0`,
    `Z`,
    `M ${x} ${top + ry}`,
    `a ${rx} ${ry} 0 1 0 ${w} 0`,
  ].join(' ')

  return svgEl('path', { d })
}
