interface ViewState {
  x: number
  y: number
  scale: number
}

export function initPanZoom(container: HTMLElement) {
  let view: ViewState = { x: 0, y: 0, scale: 1 }
  let dragging = false
  let lastX = 0
  let lastY = 0

  function getSvg(): SVGSVGElement | null {
    return container.querySelector('svg')
  }

  // Store original viewBox when SVG changes
  let origVB: number[] = [0, 0, 400, 300]

  const observer = new MutationObserver(() => {
    const svg = getSvg()
    if (svg) {
      const vb = svg.getAttribute('viewBox')?.split(' ').map(Number)
      if (vb && vb.length === 4) origVB = [...vb]
      view = { x: 0, y: 0, scale: 1 }
    }
  })
  observer.observe(container, { childList: true })

  function resetView() {
    const svg = getSvg()
    if (!svg) return
    view = { x: 0, y: 0, scale: 1 }
    svg.setAttribute('viewBox', origVB.join(' '))
  }

  container.addEventListener('wheel', (e) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(10, view.scale * factor))

    const svg = getSvg()
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height

    const w = origVB[2] / view.scale
    const h = origVB[3] / view.scale
    const newW = origVB[2] / newScale
    const newH = origVB[3] / newScale

    view.x += (w - newW) * mx
    view.y += (h - newH) * my
    view.scale = newScale

    const x = origVB[0] + view.x
    const y = origVB[1] + view.y
    svg.setAttribute('viewBox', `${x} ${y} ${newW} ${newH}`)
  }, { passive: false })

  container.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    // Don't start pan if clicking on a draggable node
    if ((e.target as Element).closest('.node[data-id]')) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    container.style.cursor = 'grabbing'
    container.setPointerCapture(e.pointerId)
  })

  container.addEventListener('pointermove', (e) => {
    if (!dragging) return
    const svg = getSvg()
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const vb = svg.getAttribute('viewBox')?.split(' ').map(Number)
    if (!vb || vb.length !== 4) return

    const dx = ((e.clientX - lastX) / rect.width) * vb[2]
    const dy = ((e.clientY - lastY) / rect.height) * vb[3]

    view.x -= dx
    view.y -= dy

    const x = origVB[0] + view.x
    const y = origVB[1] + view.y
    svg.setAttribute('viewBox', `${x} ${y} ${vb[2]} ${vb[3]}`)

    lastX = e.clientX
    lastY = e.clientY
  })

  const endDrag = () => {
    dragging = false
    container.style.cursor = ''
  }
  container.addEventListener('pointerup', endDrag)
  container.addEventListener('pointercancel', endDrag)

  container.addEventListener('dblclick', resetView)

  return { reset: resetView }
}
