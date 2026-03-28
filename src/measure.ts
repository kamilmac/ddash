export const NODE_FONT = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
export const EDGE_FONT = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
export const GROUP_FONT = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

export const NODE_PAD_X = 20
export const NODE_PAD_Y = 12

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function getCtx(): CanvasRenderingContext2D {
  if (!ctx) {
    canvas = document.createElement('canvas')
    ctx = canvas.getContext('2d')!
  }
  return ctx
}

export function measureText(text: string, font: string): { width: number; height: number } {
  const c = getCtx()
  c.font = font
  const metrics = c.measureText(text)
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  return { width: metrics.width, height: Math.max(height, 16) }
}

export function measureNodeLabel(label: string): { width: number; height: number } {
  const m = measureText(label, NODE_FONT)
  return {
    width: Math.ceil(m.width + NODE_PAD_X * 2),
    height: Math.ceil(m.height + NODE_PAD_Y * 2),
  }
}
