import { describe, expect, it } from 'vitest'

import { getOrientedPageSize, isSupportedDocument, validateDocumentFiles } from './documentEditor'

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
