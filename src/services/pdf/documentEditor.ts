import type { EditorImage, EditorPage } from '@/types/documentEditor'
import { degrees, PDFDocument } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp)$/i
const PDF_EXTENSION = /\.pdf$/i
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

function loadImage (dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.addEventListener('load', () => resolve(image), { once: true })
    image.addEventListener('error', () => reject(new Error('Une image de la composition ne peut pas être décodée.')), { once: true })
    image.src = dataUrl
  })
}

async function embedEditorImage (pdfDocument: PDFDocument, image: EditorImage) {
  const imageBytes = new Uint8Array(await (await fetch(image.dataUrl)).arrayBuffer())

  if (image.dataUrl.startsWith('data:image/jpeg')) {
    return await pdfDocument.embedJpg(imageBytes)
  }

  if (image.dataUrl.startsWith('data:image/png')) {
    return await pdfDocument.embedPng(imageBytes)
  }

  const imageElement = await loadImage(image.dataUrl)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Le navigateur ne peut pas convertir cette image pour le PDF.')
  }

  canvas.width = imageElement.naturalWidth
  canvas.height = imageElement.naturalHeight
  context.drawImage(imageElement, 0, 0)

  const pngBytes = await (await fetch(canvas.toDataURL('image/png'))).arrayBuffer()

  return await pdfDocument.embedPng(new Uint8Array(pngBytes))
}

function transformViewportPointToPdf (viewport: pdfjs.PageViewport, x: number, y: number) {
  const [a, b, c, d, e, f] = viewport.transform
  const determinant = a * d - b * c
  const translatedX = x - e
  const translatedY = y - f

  return {
    x: (d * translatedX - c * translatedY) / determinant,
    y: (-b * translatedX + a * translatedY) / determinant,
  }
}

function transformViewportVectorToPdf (viewport: pdfjs.PageViewport, x: number, y: number) {
  const [a, b, c, d] = viewport.transform
  const determinant = a * d - b * c

  return {
    x: (d * x - c * y) / determinant,
    y: (-b * x + a * y) / determinant,
  }
}

function getPdfImagePlacement (image: EditorImage, viewport: pdfjs.PageViewport) {
  const radians = (image.rotation * Math.PI) / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const centerX = image.x + image.width / 2
  const centerY = image.y + image.height / 2
  const bottomLeft = transformViewportPointToPdf(
    viewport,
    centerX - (cosine * image.width) / 2 - (sine * image.height) / 2,
    centerY - (sine * image.width) / 2 + (cosine * image.height) / 2,
  )
  const horizontalVector = transformViewportVectorToPdf(viewport, cosine, sine)

  return {
    x: bottomLeft.x,
    y: bottomLeft.y,
    width: image.width,
    height: image.height,
    rotation: (Math.atan2(horizontalVector.y, horizontalVector.x) * 180) / Math.PI,
  }
}

function getImagePagePlacement (image: EditorImage, pageHeight: number) {
  const rotation = (-image.rotation * Math.PI) / 180
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  const centerX = image.x + image.width / 2
  const centerY = pageHeight - image.y - image.height / 2

  return {
    x: centerX - (cosine * image.width) / 2 + (sine * image.height) / 2,
    y: centerY - (sine * image.width) / 2 - (cosine * image.height) / 2,
    rotation: (rotation * 180) / Math.PI,
  }
}

interface ExportPdfCache {
  pdfDocuments: Map<File, Promise<PDFDocument>>
  pdfJsDocuments: Map<File, Promise<pdfjs.PDFDocumentProxy>>
  pdfJsLoadingTasks: Map<File, ReturnType<typeof pdfjs.getDocument>>
}

function getSourcePdf (file: File, cache: ExportPdfCache): Promise<PDFDocument> {
  let documentPromise = cache.pdfDocuments.get(file)

  if (!documentPromise) {
    documentPromise = file.arrayBuffer().then(bytes => PDFDocument.load(bytes))
    cache.pdfDocuments.set(file, documentPromise)
  }

  return documentPromise
}

function getPdfJsSource (file: File, cache: ExportPdfCache): Promise<pdfjs.PDFDocumentProxy> {
  let documentPromise = cache.pdfJsDocuments.get(file)

  if (!documentPromise) {
    documentPromise = file.arrayBuffer().then(bytes => {
      const loadingTask = pdfjs.getDocument({ data: bytes })

      cache.pdfJsLoadingTasks.set(file, loadingTask)

      return loadingTask.promise
    })
    cache.pdfJsDocuments.set(file, documentPromise)
  }

  return documentPromise
}

function normalizeRotation (rotation: number): number {
  return ((rotation % 360) + 360) % 360
}

async function addEditorImage (
  output: PDFDocument,
  outputPage: ReturnType<PDFDocument['addPage']>,
  image: EditorImage,
  viewport?: pdfjs.PageViewport,
) {
  const embeddedImage = await embedEditorImage(output, image)

  if (viewport) {
    const placement = getPdfImagePlacement(image, viewport)

    outputPage.drawImage(embeddedImage, {
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      rotate: degrees(placement.rotation),
    })

    return
  }

  const placement = getImagePagePlacement(image, outputPage.getHeight())

  outputPage.drawImage(embeddedImage, {
    x: placement.x,
    y: placement.y,
    width: image.width,
    height: image.height,
    rotate: degrees(placement.rotation),
  })
}

export async function exportEditorPages (pages: EditorPage[]): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('Ajoutez au moins une page avant de créer le PDF.')
  }

  const output = await PDFDocument.create()
  const cache: ExportPdfCache = {
    pdfDocuments: new Map(),
    pdfJsDocuments: new Map(),
    pdfJsLoadingTasks: new Map(),
  }

  try {
    for (const page of pages) {
      let outputPage: ReturnType<PDFDocument['addPage']>
      let viewport: pdfjs.PageViewport | undefined

      if (page.sourceType === 'pdf') {
        if (!page.pdfPageNumber) {
          throw new Error(`Impossible de retrouver la page PDF « ${page.sourceName} ».`)
        }

        const source = await getSourcePdf(page.sourceFile, cache)
        const sourcePageIndex = page.pdfPageNumber - 1
        const sourcePage = source.getPage(sourcePageIndex)
        const [copiedPage] = await output.copyPages(source, [sourcePageIndex])
        const rotation = normalizeRotation(sourcePage.getRotation().angle + page.rotation)

        copiedPage.setRotation(degrees(rotation))
        outputPage = output.addPage(copiedPage)

        if (page.images.length > 0) {
          const pdfJsSource = await getPdfJsSource(page.sourceFile, cache)
          const pdfJsPage = await pdfJsSource.getPage(page.pdfPageNumber)

          viewport = pdfJsPage.getViewport({ scale: 1 })
        }
      } else {
        outputPage = output.addPage([page.width, page.height])
        outputPage.setRotation(degrees(page.rotation))
      }

      for (const image of page.images) {
        await addEditorImage(output, outputPage, image, viewport)
      }
    }

    const pdfBytes = await output.save()
    const buffer = new ArrayBuffer(pdfBytes.byteLength)
    new Uint8Array(buffer).set(pdfBytes)

    return new Blob([buffer], { type: 'application/pdf' })
  } finally {
    await Promise.allSettled([...cache.pdfJsLoadingTasks.values()].map(task => task.destroy()))
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
