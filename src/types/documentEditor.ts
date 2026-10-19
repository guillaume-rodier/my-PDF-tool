export interface EditorImage {
  id: string
  name: string
  dataUrl: string
  x: number
  y: number
  width: number
  height: number
  rotation: number
  aspectRatio: number
}

export interface EditorPage {
  id: string
  sourceFile: File
  sourceName: string
  sourceType: 'pdf' | 'image'
  pdfPageNumber?: number
  width: number
  height: number
  rotation: number
  images: EditorImage[]
}
