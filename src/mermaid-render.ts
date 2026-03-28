import mermaid from 'mermaid'

let initialized = false

function getMermaidTheme(): string {
  const t = document.documentElement.getAttribute('data-theme')
  return t === 'light' ? 'default' : 'dark'
}

function initMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: getMermaidTheme() as 'dark' | 'default',
    flowchart: { htmlLabels: false, curve: 'basis' },
    sequence: { useMaxWidth: false },
    suppressErrorRendering: true,
  })
  initialized = true
}

export function updateMermaidTheme() {
  initialized = false // force re-init on next render
}

let renderCounter = 0

export async function renderMermaid(source: string): Promise<string> {
  if (!initialized) initMermaid()

  const id = `ddash-${++renderCounter}`
  const { svg } = await mermaid.render(id, source)
  return svg
}
