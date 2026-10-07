import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'

import { mergePdfFiles, validatePdfFiles } from './mergePdf'

function toArrayBuffer (bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)

  return buffer
}

async function createPdfFile (name: string, pageCount = 1): Promise<File> {
  const pdfDoc = await PDFDocument.create()

  for (let index = 0; index < pageCount; index += 1) {
    pdfDoc.addPage()
  }

  const bytes = await pdfDoc.save()

  return new File([toArrayBuffer(bytes)], name, { type: 'application/pdf' })
}

describe('validatePdfFiles', () => {
  it('accepts only valid PDF files', () => {
    const valid = [new File(['%PDF-1.4'], 'first.pdf', { type: 'application/pdf' })]
    const invalid = [new File(['hello'], 'notes.txt', { type: 'text/plain' })]

    expect(() => validatePdfFiles(valid)).not.toThrow()
    expect(() => validatePdfFiles(invalid)).toThrowError(/PDF/i)
  })
})

describe('mergePdfFiles', () => {
  it('merges multiple input PDFs into a single PDF', async () => {
    const first = await createPdfFile('first.pdf', 1)
    const second = await createPdfFile('second.pdf', 2)

    const merged = await mergePdfFiles([first, second])

    expect(merged).toBeInstanceOf(Blob)
    expect(merged.size).toBeGreaterThan(0)
  })
})
