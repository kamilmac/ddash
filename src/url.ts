import LZString from 'lz-string'

const URL_LIMIT = 32000

function encode(content: string): string {
  return LZString.compressToEncodedURIComponent(content)
}

function decode(encoded: string): string {
  return LZString.decompressFromEncodedURIComponent(encoded)
}

export function updateURL(content: string): void {
  if (!content || !content.trim()) {
    history.replaceState(null, '', window.location.pathname)
    return
  }

  const encoded = encode(content)
  if (encoded.length > URL_LIMIT) {
    // Truncate at a newline boundary
    const ratio = encoded.length / content.length
    let targetLen = Math.floor(URL_LIMIT / ratio * 0.9)
    let truncated = content.substring(0, targetLen)
    const lastNewline = truncated.lastIndexOf('\n')
    if (lastNewline > targetLen * 0.5) truncated = truncated.substring(0, lastNewline)
    const truncEncoded = encode(truncated)
    history.replaceState(null, '', '#' + truncEncoded)
    return
  }

  history.replaceState(null, '', '#' + encoded)
}

export function loadFromURL(): string | null {
  const hash = window.location.hash.substring(1)
  if (!hash) return null
  return decode(hash)
}
