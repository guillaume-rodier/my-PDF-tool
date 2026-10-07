import type { PdfTool } from '@/types/pdf'

export const pdfTools: PdfTool[] = [
  {
    id: 'merge-pdf',
    name: 'Fusionner des PDF',
    description: 'Combine plusieurs fichiers PDF dans un ordre précis.',
    icon: 'mdi-file-document-multiple-outline',
    route: '/tools/merge-pdf',
    available: true,
  },
  {
    id: 'split-pdf',
    name: 'Diviser un PDF',
    description: 'Extraire des pages sélectionnées depuis un document PDF.',
    icon: 'mdi-file-split-outline',
    route: '/tools/split-pdf',
    available: false,
  },
  {
    id: 'compress-pdf',
    name: 'Compresser un PDF',
    description: 'Réduire la taille d’un PDF avec une approche locale.',
    icon: 'mdi-zip-box-outline',
    route: '/tools/compress-pdf',
    available: false,
  },
  {
    id: 'pdf-to-images',
    name: 'PDF vers images',
    description: 'Convertir les pages PDF en fichiers image exportables.',
    icon: 'mdi-image-multiple-outline',
    route: '/tools/pdf-to-images',
    available: false,
  },
  {
    id: 'images-to-pdf',
    name: 'Images vers PDF',
    description: 'Assembler plusieurs images dans un seul document PDF.',
    icon: 'mdi-image-plus-outline',
    route: '/tools/images-to-pdf',
    available: false,
  },
  {
    id: 'rotate-pdf',
    name: 'Rotation de PDF',
    description: 'Faire pivoter une ou plusieurs pages sans les sortir du navigateur.',
    icon: 'mdi-rotate-right',
    route: '/tools/rotate-pdf',
    available: false,
  },
]
