import { updateMermaidTheme } from './mermaid-render.ts'

let currentTheme: string = 'dark'
let rerender: (() => void) | null = null

function applyTheme(t: string): void {
  currentTheme = t
  document.documentElement.setAttribute('data-theme', t)
  localStorage.setItem('ddash-theme', t)
  const icon = document.getElementById('themeIcon')!
  icon.innerHTML = t === 'dark'
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
    : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
  updateMermaidTheme()
  if (rerender) rerender()
}

export function getTheme(): string {
  return currentTheme
}

export function onThemeChange(callback: () => void): void {
  rerender = callback
}

export function initTheme(): void {
  currentTheme = localStorage.getItem('ddash-theme') || 'dark'
  applyTheme(currentTheme)
  document.getElementById('themeBtn')!.addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark')
  })
}
