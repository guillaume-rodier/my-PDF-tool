import { PDFDocument, StandardFonts } from 'pdf-lib'
import * as appPdfjs from 'pdfjs-dist'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { describe, expect, it } from 'vitest'

import { alignImageToPage, centerImageOnPage, constrainImageToPage, getImageBounds } from '@/utils/imageAlignment'
import { exportEditorPages, getOrientedPageSize, isSupportedDocument, validateDocumentFiles } from './documentEditor'

const nodeWorkerUrl = new URL('../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href

appPdfjs.GlobalWorkerOptions.workerSrc = nodeWorkerUrl
pdfjs.GlobalWorkerOptions.workerSrc = nodeWorkerUrl

describe('document file validation', () => {
  it.each([
    new File(['pdf'], 'contract.pdf', { type: 'application/pdf' }),
    new File(['image'], 'photo.jpeg', { type: 'image/jpeg' }),
    new File(['image'], 'scan.png', { type: 'image/png' }),
    new File(['image'], 'graphic.webp', { type: 'image/webp' }),
  ])('accepts supported file %s', file => {
    expect(isSupportedDocument(file)).toBe(true)
  })

  it('rejects unsupported document types', () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })

    expect(isSupportedDocument(file)).toBe(false)
    expect(() => validateDocumentFiles([file])).toThrowError(/format.*pas pris en charge/i)
  })

  it('requires at least one input file', () => {
    expect(() => validateDocumentFiles([])).toThrowError(/au moins un/i)
  })
})

describe('getOrientedPageSize', () => {
  const page = { width: 600, height: 800, rotation: 0 }

  it('keeps the dimensions for portrait pages', () => {
    expect(getOrientedPageSize(page)).toEqual({ width: 600, height: 800 })
  })

  it.each([90, 270, -90])('swaps the dimensions after a quarter turn (%i degrees)', rotation => {
    expect(getOrientedPageSize({ ...page, rotation })).toEqual({ width: 800, height: 600 })
  })
})

describe('exportEditorPages', () => {
  it('keeps PDF text searchable when exporting a PDF page', async () => {
    const source = await PDFDocument.create()
    const sourcePage = source.addPage([600, 800])
    const font = await source.embedFont(StandardFonts.Helvetica)

    sourcePage.drawText('Text remains searchable', { x: 40, y: 740, font, size: 16 })

    const imageDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/jZsAAAAASUVORK5CYII='

    const sourceBytes = await source.save()
    const sourceBuffer = new ArrayBuffer(sourceBytes.byteLength)

    new Uint8Array(sourceBuffer).set(sourceBytes)

    const sourceFile = new File([sourceBuffer], 'source.pdf', { type: 'application/pdf' })
    const result = await exportEditorPages([{
      id: 'source-page-1',
      sourceFile,
      sourceName: sourceFile.name,
      sourceType: 'pdf',
      pdfPageNumber: 1,
      width: 600,
      height: 800,
      rotation: 90,
      images: [{
        id: 'overlay-1',
        name: 'logo.png',
        dataUrl: imageDataUrl,
        x: 40,
        y: 60,
        width: 120,
        height: 80,
        rotation: 0,
        aspectRatio: 1.5,
      }],
    }])
    const resultTask = pdfjs.getDocument({ data: await result.arrayBuffer() })

    try {
      const resultPdf = await resultTask.promise
      const resultPage = await resultPdf.getPage(1)
      const textContent = await resultPage.getTextContent()
      const operatorList = await resultPage.getOperatorList()
      const exportedText = textContent.items
        .filter(item => 'str' in item)
        .map(item => 'str' in item ? item.str : '')
        .join(' ')

      expect(exportedText).toContain('Text remains searchable')
      expect(resultPage.rotate).toBe(90)
      expect(operatorList.fnArray).toContain(pdfjs.OPS.paintImageXObject)
    } finally {
      await resultTask.destroy()
    }
  })
})

describe('image alignment', () => {
  const pageWidth = 600
  const pageHeight = 800
  const image = {
    id: 'image-1',
    name: 'image.png',
    dataUrl: '',
    x: 24,
    y: 30,
    width: 200,
    height: 100,
    rotation: 0,
    aspectRatio: 2,
  }

  it('snaps image edges to page edges and its center to page center', () => {
    const edgeAligned = alignImageToPage({ ...image, x: 5 }, pageWidth, pageHeight, 8)
    const centerAligned = alignImageToPage({ ...image, x: 195 }, pageWidth, pageHeight, 8)

    expect(edgeAligned.image.x).toBe(0)
    expect(edgeAligned.verticalGuide).toBe(0)
    expect(centerAligned.image.x + centerAligned.image.width / 2).toBe(pageWidth / 2)
    expect(centerAligned.verticalGuide).toBe(pageWidth / 2)
  })

  it('keeps the rotated image bounds inside the page', () => {
    const oversizedRotatedImage = { ...image, width: 900, height: 450, rotation: 90 }
    const bounded = constrainImageToPage(oversizedRotatedImage, pageWidth, pageHeight)
    const bounds = getImageBounds(bounded)

    expect(bounds.left).toBeGreaterThanOrEqual(0)
    expect(bounds.top).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(pageWidth)
    expect(bounds.bottom).toBeLessThanOrEqual(pageHeight)
  })

  it('centers an image horizontally and vertically', () => {
    const horizontallyCentered = centerImageOnPage(image, pageWidth, pageHeight, 'horizontal')
    const verticallyCentered = centerImageOnPage(image, pageWidth, pageHeight, 'vertical')

    expect(horizontallyCentered.x + horizontallyCentered.width / 2).toBe(pageWidth / 2)
    expect(verticallyCentered.y + verticallyCentered.height / 2).toBe(pageHeight / 2)
  })
})
