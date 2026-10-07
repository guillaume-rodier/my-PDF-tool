export interface PdfTool {
  id: string
  name: string
  description: string
  icon: string
  route: string
  available: boolean
}

export interface PdfFileItem {
  id: string
  file: File
}
