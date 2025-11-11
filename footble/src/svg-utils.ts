import html2canvas from 'html2canvas'

export const copySvgAsImage = async (svgContainer: HTMLElement | null) => {
  if (!svgContainer) {
    throw new Error('SVG container not found')
  }

  const svgElement = svgContainer.querySelector('svg')
  if (!svgElement) {
    throw new Error('SVG not found')
  }

  const imageElements = svgElement.querySelectorAll('image')
  const originalHrefs: string[] = []

  // Pre-load all images as data URLs to avoid CORS issues
  for (let i = 0; i < imageElements.length; i++) {
    const imgEl = imageElements[i]
    const href = imgEl.getAttribute('href') || ''
    originalHrefs.push(href)

    try {
      // Try to load as data URL, fallback to original if it fails
      const dataURL = await loadImageAsDataURL(href)
      imgEl.setAttribute('href', dataURL)
    } catch (err) {
      console.warn('Failed to load image as data URL:', href, err)
      // Keep original href
    }
  }

  // Now capture with html2canvas
  const canvas = await html2canvas(svgContainer, {
    backgroundColor: '#000000',
    scale: 2
  })

  // Restore original hrefs
  imageElements.forEach((imgEl, i) => {
    imgEl.setAttribute('href', originalHrefs[i])
  })

  // Convert canvas to blob
  canvas.toBlob(async blob => {
    if (!blob) {
      return
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob
        })
      ])
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, 'image/png')
}

const loadImageAsDataURL = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
