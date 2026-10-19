import type { EditorImage } from '@/types/documentEditor'

export interface ImageAlignmentResult {
  image: EditorImage
  verticalGuide: number | null
  horizontalGuide: number | null
}

export function getImageBounds (image: Pick<EditorImage, 'x' | 'y' | 'width' | 'height' | 'rotation'>) {
  const radians = (image.rotation * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const width = cosine * image.width + sine * image.height
  const height = sine * image.width + cosine * image.height
  const centerX = image.x + image.width / 2
  const centerY = image.y + image.height / 2

  return {
    left: centerX - width / 2,
    top: centerY - height / 2,
    right: centerX + width / 2,
    bottom: centerY + height / 2,
    centerX,
    centerY,
    width,
    height,
  }
}

export function getMaximumImageWidth (
  image: Pick<EditorImage, 'aspectRatio' | 'rotation'>,
  pageWidth: number,
  pageHeight: number,
): number {
  const radians = (image.rotation * Math.PI) / 180
  const cosine = Math.abs(Math.cos(radians))
  const sine = Math.abs(Math.sin(radians))
  const widthFactor = cosine + sine / image.aspectRatio
  const heightFactor = sine + cosine / image.aspectRatio

  return Math.min(pageWidth / widthFactor, pageHeight / heightFactor)
}

export function constrainImageToPage (image: EditorImage, pageWidth: number, pageHeight: number): EditorImage {
  const maxWidth = getMaximumImageWidth(image, pageWidth, pageHeight)
  const width = Math.min(image.width, maxWidth)
  const height = width / image.aspectRatio
  const centerX = image.x + image.width / 2
  const centerY = image.y + image.height / 2
  const resized = {
    ...image,
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
  }
  const bounds = getImageBounds(resized)
  const boundedCenterX = Math.min(Math.max(bounds.centerX, bounds.width / 2), pageWidth - bounds.width / 2)
  const boundedCenterY = Math.min(Math.max(bounds.centerY, bounds.height / 2), pageHeight - bounds.height / 2)

  return {
    ...resized,
    x: boundedCenterX - width / 2,
    y: boundedCenterY - height / 2,
  }
}

function snapAxis (start: number, end: number, pageSize: number, threshold: number) {
  const center = (start + end) / 2
  const targets = [
    { position: start, target: 0 },
    { position: end, target: pageSize },
    { position: center, target: pageSize / 2 },
  ]
  const closest = targets.reduce((best, current) =>
    Math.abs(current.position - current.target) < Math.abs(best.position - best.target) ? current : best,
  )

  if (Math.abs(closest.position - closest.target) > threshold) {
    return { offset: 0, guide: null }
  }

  return { offset: closest.target - closest.position, guide: closest.target }
}

export function alignImageToPage (
  image: EditorImage,
  pageWidth: number,
  pageHeight: number,
  threshold: number,
): ImageAlignmentResult {
  const bounded = constrainImageToPage(image, pageWidth, pageHeight)
  const bounds = getImageBounds(bounded)
  const horizontal = snapAxis(bounds.left, bounds.right, pageWidth, threshold)
  const vertical = snapAxis(bounds.top, bounds.bottom, pageHeight, threshold)
  const aligned = constrainImageToPage({
    ...bounded,
    x: bounded.x + horizontal.offset,
    y: bounded.y + vertical.offset,
  }, pageWidth, pageHeight)
  const alignedBounds = getImageBounds(aligned)

  return {
    image: aligned,
    verticalGuide: horizontal.guide === null
      ? null
      : ([0, pageWidth].includes(horizontal.guide) || alignedBounds.centerX === horizontal.guide ? horizontal.guide : null),
    horizontalGuide: vertical.guide === null
      ? null
      : ([0, pageHeight].includes(vertical.guide) || alignedBounds.centerY === vertical.guide ? vertical.guide : null),
  }
}

export function centerImageOnPage (image: EditorImage, pageWidth: number, pageHeight: number, axis: 'horizontal' | 'vertical'): EditorImage {
  const centered = axis === 'horizontal'
    ? { ...image, x: (pageWidth - image.width) / 2 }
    : { ...image, y: (pageHeight - image.height) / 2 }

  return constrainImageToPage(centered, pageWidth, pageHeight)
}
