const ALLOWED = ["image/png", "image/jpeg", "image/webp"]
const MAX_DATA_URL = 300_000
const EDGE = 256

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "")
    reader.onerror = () => reject(new Error("That image could not be read"))
    reader.readAsDataURL(blob)
  })
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file)
    } catch {
      // Fall through to the <img> decoder on browsers without bitmap support.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error("That image could not be read"))
      image.src = url
    })
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 5_000)
  }
}

export async function readAvatarFile(file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error("Use a PNG, JPEG or WebP image")
  const source = await loadImage(file)
  const width = "width" in source ? source.width : EDGE
  const height = "height" in source ? source.height : EDGE
  const side = Math.min(width, height)
  const canvas = document.createElement("canvas")
  canvas.width = EDGE
  canvas.height = EDGE
  const context = canvas.getContext("2d")
  if (!context) throw new Error("This browser cannot resize images")
  context.drawImage(
    source,
    Math.max(0, (width - side) / 2),
    Math.max(0, (height - side) / 2),
    side,
    side,
    0,
    0,
    EDGE,
    EDGE,
  )
  if ("close" in source) source.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", 0.82)
  })
  const dataUrl = blob ? await blobToDataUrl(blob) : await blobToDataUrl(file)
  if (!dataUrl) throw new Error("That image could not be read")
  if (dataUrl.length > MAX_DATA_URL) throw new Error("That image is too large. Pick a smaller one.")
  return dataUrl
}
