import { PDFDocument } from 'pdf-lib'

const PDF_TYPES = new Set(['application/pdf', 'application/x-pdf'])

export function validatePdfFiles (files: File[]): File[] {
  if (!files || files.length === 0) {
    throw new Error('Sélectionnez au moins un fichier PDF à fusionner.')
  }

  const invalidFiles = files.filter(file => !isPdfFile(file))

  if (invalidFiles.length > 0) {
    throw new Error(`Le fichier ${invalidFiles[0].name} n'est pas un PDF valide.`)
  }

  return files
}

function isPdfFile (file: File): boolean {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()

  return name.endsWith('.pdf') || PDF_TYPES.has(type) || type === 'application/octet-stream'
}

function toArrayBuffer (bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)

  return buffer
}

export async function mergePdfFiles (files: File[]): Promise<Blob> {
  const validFiles = validatePdfFiles(files)

  if (validFiles.length < 2) {
    throw new Error('Sélectionnez au moins deux fichiers PDF pour les fusionner.')
  }

  const mergedPdf = await PDFDocument.create()

  for (const file of validFiles) {
    const sourceBytes = await file.arrayBuffer()
    const sourcePdf = await PDFDocument.load(sourceBytes)
    const pageIndices = sourcePdf.getPageIndices()
    const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices)

    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }
  }

  const mergedBytes = await mergedPdf.save()

  return new Blob([toArrayBuffer(mergedBytes)], { type: 'application/pdf' })
}
