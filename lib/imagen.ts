export async function comprimirImagen(
  file: File,
  maxLado = 1000,
  calidad = 0.72,
): Promise<{ blob: Blob; dataUrl: string }> {
  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('No se pudo leer la foto. Usa una imagen JPG o PNG.')
  }
  const esc = Math.min(1, maxLado / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * esc)
  const h = Math.round(bmp.height * esc)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob(
      (b) => (b ? res(b) : rej(new Error('No se pudo procesar la foto'))),
      'image/jpeg',
      calidad,
    ),
  )
  const dataUrl = await new Promise<string>((res) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.readAsDataURL(blob)
  })
  return { blob, dataUrl }
}