import type { EditorImage, EditorPage } from '@/types/documentEditor'
import { PDFDocument } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp)$/i
const PDF_EXTENSION = /\.pdf$/i
const PAGE_RENDER_SCALE = 2
const MAX_RENDER_PIXELS = 2600

export function isSupportedDocument (file: File): boolean {
  const mimeType = file.type.toLowerCase()

  return PDF_EXTENSION.test(file.name) || IMAGE_EXTENSIONS.test(file.name) || mimeType === 'application/pdf' || IMAGE_TYPES.has(mimeType)
}

export function validateDocumentFiles (files: File[]): File[] {
  if (files.length === 0) {
    throw new Error('Sélectionnez au moins un PDF ou une image.')
  }

  const invalidFile = files.find(file => !isSupportedDocument(file))

  if (invalidFile) {
    throw new Error(`Le format de « ${invalidFile.name} » n’est pas pris en charge. Utilisez un PDF, JPG, PNG ou WebP.`)
  }

  return files
}

export function getOrientedPageSize (page: Pick<EditorPage, 'width' | 'height' | 'rotation'>): { width: number, height: number } {
  const quarterTurn = Math.abs(page.rotation % 180) === 90

  return quarterTurn
    ? { width: page.height, height: page.width }
    : { width: page.width, height: page.height }
}

function createId (): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readFileAsDataUrl (file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error(`Impossible de lire l’image « ${file.name} ».`))
      }
    })
    reader.addEventListener('error', () => reject(new Error(`Impossible de lire l’image « ${file.name} ».`)))
    reader.readAsDataURL(file)
  })
}

function createImageItem (file: File, dataUrl: string, sourceWidth: number, sourceHeight: number, pageWidth: number, pageHeight: number): EditorImage {
  const aspectRatio = sourceWidth / sourceHeight
  const maxWidth = pageWidth * 0.8
  const maxHeight = pageHeight * 0.72
  const width = Math.min(maxWidth, maxHeight * aspectRatio)
  const height = width / aspectRatio

  return {
    id: createId(),
    name: file.name,
    dataUrl,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
    rotation: 0,
    aspectRatio,
  }
}

export async function createEditorPages (files: File[]): Promise<EditorPage[]> {
  validateDocumentFiles(files)

  const pages: EditorPage[] = []

  for (const file of files) {
    if (PDF_EXTENSION.test(file.name) || file.type.toLowerCase() === 'application/pdf') {
      const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() })

      try {
        const pdf = await loadingTask.promise

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const pdfPage = await pdf.getPage(pageNumber)
          const viewport = pdfPage.getViewport({ scale: 1 })

          pages.push({
            id: createId(),
            sourceFile: file,
            sourceName: file.name,
            sourceType: 'pdf',
            pdfPageNumber: pageNumber,
            width: viewport.width,
            height: viewport.height,
            rotation: 0,
            images: [],
          })
        }
      } catch {
        throw new Error(`Le PDF « ${file.name} » ne peut pas être ouvert. Il est peut-être endommagé ou protégé.`)
      } finally {
        await loadingTask.destroy()
      }

      continue
    }

    try {
      const bitmap = await createImageBitmap(file)
      const dataUrl = await readFileAsDataUrl(file)
      const image = createImageItem(file, dataUrl, bitmap.width, bitmap.height, A4_WIDTH, A4_HEIGHT)

      bitmap.close()
      pages.push({
        id: createId(),
        sourceFile: file,
        sourceName: file.name,
        sourceType: 'image',
        width: A4_WIDTH,
        height: A4_HEIGHT,
        rotation: 0,
        images: [image],
      })
    } catch {
      throw new Error(`L’image « ${file.name} » ne peut pas être ouverte dans ce navigateur.`)
    }
  }

  return pages
}

export async function renderPdfPage (page: EditorPage, scale = 1): Promise<string> {
  if (page.sourceType !== 'pdf' || !page.pdfPageNumber) {
    return ''
  }

  const loadingTask = pdfjs.getDocument({ data: await page.sourceFile.arrayBuffer() })

  try {
    const pdf = await loadingTask.promise

    return await renderPdfPageFromDocument(page, pdf, scale)
  } finally {
    await loadingTask.destroy()
  }
}

interface PdfRenderCache {
  documents: Map<File, Promise<pdfjs.PDFDocumentProxy>>
  loadingTasks: Map<File, ReturnType<typeof pdfjs.getDocument>>
}

async function renderPdfPageFromDocument (page: EditorPage, pdf: pdfjs.PDFDocumentProxy, scale: number): Promise<string> {
  const pdfPage = await pdf.getPage(page.pdfPageNumber!)
  const renderScale = Math.min(scale, MAX_RENDER_PIXELS / Math.max(page.width, page.height))
  const viewport = pdfPage.getViewport({ scale: renderScale })
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Le navigateur ne peut pas afficher l’aperçu PDF.')
  }

  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await pdfPage.render({ canvas, canvasContext: context, viewport }).promise

  return canvas.toDataURL('image/png')
}

async function getExportPdfDocument (file: File, cache: PdfRenderCache): Promise<pdfjs.PDFDocumentProxy> {
  let documentPromise = cache.documents.get(file)

  if (!documentPromise) {
    documentPromise = file.arrayBuffer().then(bytes => {
      const loadingTask = pdfjs.getDocument({ data: bytes })

      cache.loadingTasks.set(file, loadingTask)

      return loadingTask.promise
    })
    cache.documents.set(file, documentPromise)
  }

  return await documentPromise
}

function loadImage (dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.addEventListener('load', () => resolve(image), { once: true })
    image.addEventListener('error', () => reject(new Error('Une image de la composition ne peut pas être décodée.')), { once: true })
    image.src = dataUrl
  })
}

async function canvasToPngBytes (canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => {
      if (result) {
        resolve(result)
      } else {
        reject(new Error('Le navigateur ne peut pas encoder cette page en image.'))
      }
    }, 'image/png')
  })

  return new Uint8Array(await blob.arrayBuffer())
}

async function renderPageToPng (page: EditorPage, cache: PdfRenderCache): Promise<Uint8Array> {
  const scale = Math.min(PAGE_RENDER_SCALE, MAX_RENDER_PIXELS / Math.max(page.width, page.height))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Le navigateur ne peut pas préparer l’export PDF.')
  }

  canvas.width = Math.ceil(page.width * scale)
  canvas.height = Math.ceil(page.height * scale)
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  if (page.sourceType === 'pdf') {
    const pdf = await getExportPdfDocument(page.sourceFile, cache)
    const backgroundUrl = await renderPdfPageFromDocument(page, pdf, scale)
    const background = await loadImage(backgroundUrl)

    context.drawImage(background, 0, 0, canvas.width, canvas.height)
  }

  for (const imageItem of page.images) {
    const image = await loadImage(imageItem.dataUrl)
    const x = imageItem.x * scale
    const y = imageItem.y * scale
    const width = imageItem.width * scale
    const height = imageItem.height * scale

    context.save()
    context.translate(x + width / 2, y + height / 2)
    context.rotate((imageItem.rotation * Math.PI) / 180)
    context.drawImage(image, -width / 2, -height / 2, width, height)
    context.restore()
  }

  const outputCanvas = document.createElement('canvas')
  const rotation = ((page.rotation % 360) + 360) % 360
  const quarterTurn = rotation === 90 || rotation === 270

  outputCanvas.width = quarterTurn ? canvas.height : canvas.width
  outputCanvas.height = quarterTurn ? canvas.width : canvas.height

  const outputContext = outputCanvas.getContext('2d')

  if (!outputContext) {
    throw new Error('Le navigateur ne peut pas préparer l’export PDF.')
  }

  switch (rotation) {
    case 90: {
      outputContext.translate(outputCanvas.width, 0)
      outputContext.rotate(Math.PI / 2)

      break
    }
    case 180: {
      outputContext.translate(outputCanvas.width, outputCanvas.height)
      outputContext.rotate(Math.PI)

      break
    }
    case 270: {
      outputContext.translate(0, outputCanvas.height)
      outputContext.rotate(-Math.PI / 2)

      break
    }
  // No default
  }

  outputContext.drawImage(canvas, 0, 0)

  return await canvasToPngBytes(outputCanvas)
}

export async function exportEditorPages (pages: EditorPage[]): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('Ajoutez au moins une page avant de créer le PDF.')
  }

  const output = await PDFDocument.create()
  const cache: PdfRenderCache = { documents: new Map(), loadingTasks: new Map() }

  try {
    for (const page of pages) {
      const orientedSize = getOrientedPageSize(page)
      const pngBytes = await renderPageToPng(page, cache)
      const embeddedImage = await output.embedPng(pngBytes)
      const outputPage = output.addPage([orientedSize.width, orientedSize.height])

      outputPage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: orientedSize.width,
        height: orientedSize.height,
      })
    }

    const pdfBytes = await output.save()
    const buffer = new ArrayBuffer(pdfBytes.byteLength)
    new Uint8Array(buffer).set(pdfBytes)

    return new Blob([buffer], { type: 'application/pdf' })
  } finally {
    await Promise.allSettled([...cache.loadingTasks.values()].map(task => task.destroy()))
  }
}

export function createImageForPage (file: File, page: EditorPage, dataUrl: string, sourceWidth: number, sourceHeight: number): EditorImage {
  return createImageItem(file, dataUrl, sourceWidth, sourceHeight, page.width, page.height)
}

export async function readImageForPage (file: File, page: EditorPage): Promise<EditorImage> {
  if (!IMAGE_EXTENSIONS.test(file.name) && !IMAGE_TYPES.has(file.type.toLowerCase())) {
    throw new Error('Ajoutez une image JPG, PNG ou WebP.')
  }

  try {
    const bitmap = await createImageBitmap(file)
    const dataUrl = await readFileAsDataUrl(file)
    const image = createImageForPage(file, page, dataUrl, bitmap.width, bitmap.height)

    bitmap.close()

    return image
  } catch {
    throw new Error(`L’image « ${file.name} » ne peut pas être ouverte dans ce navigateur.`)
  }
}
