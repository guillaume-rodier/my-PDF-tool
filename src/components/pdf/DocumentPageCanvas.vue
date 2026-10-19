<script setup lang="ts">
  import type { EditorImage, EditorPage } from '@/types/documentEditor'

  import { computed, ref, watch } from 'vue'
  import { getOrientedPageSize, renderPdfPage } from '@/services/pdf/documentEditor'

  const props = defineProps<{
    page: EditorPage
    selectedImageId: string | null
  }>()

  const emit = defineEmits<{
    'select-image': [imageId: string]
    'update-image': [payload: { imageId: string, changes: Partial<EditorImage> }]
    'deselect-image': []
  }>()

  const pdfPreview = ref('')
  const renderError = ref('')
  const artworkRef = ref<HTMLElement | null>(null)
  let renderRequest = 0

  const pageSize = computed(() => getOrientedPageSize(props.page))
  const artworkStyle = computed(() => ({
    aspectRatio: `${pageSize.value.width} / ${pageSize.value.height}`,
    width: `${(props.page.width / pageSize.value.width) * 100}%`,
    height: `${(props.page.height / pageSize.value.height) * 100}%`,
    transform: `translate(-50%, -50%) rotate(${props.page.rotation}deg)`,
  }))

  function imageStyle (image: EditorImage) {
    return {
      left: `${(image.x / props.page.width) * 100}%`,
      top: `${(image.y / props.page.height) * 100}%`,
      width: `${(image.width / props.page.width) * 100}%`,
      height: `${(image.height / props.page.height) * 100}%`,
      transform: `rotate(${image.rotation}deg)`,
    }
  }

  function pointerPosition (event: PointerEvent) {
    const artwork = artworkRef.value

    if (!artwork) {
      return null
    }

    const bounds = artwork.getBoundingClientRect()
    const horizontal = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1)
    const vertical = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1)
    const rotation = ((props.page.rotation % 360) + 360) % 360

    if (rotation === 90) {
      return { x: vertical * props.page.width, y: (1 - horizontal) * props.page.height }
    }

    if (rotation === 180) {
      return { x: (1 - horizontal) * props.page.width, y: (1 - vertical) * props.page.height }
    }

    if (rotation === 270) {
      return { x: (1 - vertical) * props.page.width, y: horizontal * props.page.height }
    }

    return {
      x: horizontal * props.page.width,
      y: vertical * props.page.height,
    }
  }

  function startMove (event: PointerEvent, image: EditorImage) {
    if ((event.target as HTMLElement).closest('.image-resize-handle')) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    emit('select-image', image.id)

    const initialPointer = pointerPosition(event)

    if (!initialPointer) {
      return
    }

    const startPointer = initialPointer
    const initialX = image.x
    const initialY = image.y

    function move (pointerEvent: PointerEvent) {
      const currentPointer = pointerPosition(pointerEvent)

      if (!currentPointer) {
        return
      }

      const x = Math.min(Math.max(initialX + currentPointer.x - startPointer.x, 0), props.page.width - image.width)
      const y = Math.min(Math.max(initialY + currentPointer.y - startPointer.y, 0), props.page.height - image.height)

      emit('update-image', { imageId: image.id, changes: { x, y } })
    }

    function stop () {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop, { once: true })
  }

  function startResize (event: PointerEvent, image: EditorImage) {
    event.preventDefault()
    event.stopPropagation()
    emit('select-image', image.id)

    const initialPointer = pointerPosition(event)

    if (!initialPointer) {
      return
    }

    const startPointer = initialPointer
    const initialWidth = image.width

    function resize (pointerEvent: PointerEvent) {
      const currentPointer = pointerPosition(pointerEvent)

      if (!currentPointer) {
        return
      }

      const widthFromX = initialWidth + currentPointer.x - startPointer.x
      const heightFromY = (image.height + currentPointer.y - startPointer.y) * image.aspectRatio
      const width = Math.min(
        Math.max(Math.max(widthFromX, heightFromY), 32),
        props.page.width * 0.95,
        props.page.height * 0.95 * image.aspectRatio,
      )

      emit('update-image', {
        imageId: image.id,
        changes: {
          width,
          height: width / image.aspectRatio,
          x: Math.min(image.x, props.page.width - width),
          y: Math.min(image.y, props.page.height - width / image.aspectRatio),
        },
      })
    }

    function stop () {
      window.removeEventListener('pointermove', resize)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', resize)
    window.addEventListener('pointerup', stop, { once: true })
  }

  watch(
    () => [props.page.id, props.page.rotation, props.page.sourceFile] as const,
    async () => {
      const request = ++renderRequest
      pdfPreview.value = ''
      renderError.value = ''

      if (props.page.sourceType !== 'pdf') {
        return
      }

      try {
        const preview = await renderPdfPage(props.page, 1)

        if (request === renderRequest) {
          pdfPreview.value = preview
        }
      } catch {
        if (request === renderRequest) {
          renderError.value = 'L’aperçu de cette page PDF est indisponible.'
        }
      }
    },
    { immediate: true },
  )
</script>

<template>
  <div class="page-stage" :style="{ aspectRatio: `${pageSize.width} / ${pageSize.height}` }">
    <div ref="artworkRef" class="page-artwork" :style="artworkStyle" @pointerdown.self="emit('deselect-image')">
      <img v-if="pdfPreview" alt="Aperçu de la page PDF" class="page-background" :src="pdfPreview">
      <div v-else-if="renderError" class="page-placeholder">{{ renderError }}</div>
      <div v-else class="page-placeholder">{{ page.sourceType === 'pdf' ? 'Chargement de la page…' : 'Page blanche' }}</div>

      <div
        v-for="image in page.images"
        :key="image.id"
        :aria-label="`Image ${image.name}`"
        class="placed-image"
        :class="{ 'placed-image--selected': image.id === selectedImageId }"
        role="button"
        :style="imageStyle(image)"
        tabindex="0"
        @click.stop="emit('select-image', image.id)"
        @keydown.enter="emit('select-image', image.id)"
        @keydown.space.prevent="emit('select-image', image.id)"
        @pointerdown="startMove($event, image)"
      >
        <img :alt="image.name" draggable="false" :src="image.dataUrl">

        <button
          v-if="image.id === selectedImageId"
          aria-label="Redimensionner l’image"
          class="image-resize-handle"
          type="button"
          @pointerdown="startResize($event, image)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .page-stage {
    position: relative;
    width: min(100%, 860px);
    margin: 0 auto;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 14px 38px rgb(23 35 52 / 14%);
    touch-action: none;
  }

  .page-artwork {
    position: absolute;
    top: 50%;
    left: 50%;
    overflow: hidden;
    background: #fff;
    transform-origin: center;
  }

  .page-background,
  .page-placeholder {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .page-background {
    object-fit: fill;
  }

  .page-placeholder {
    display: grid;
    place-items: center;
    color: #667085;
    background: repeating-linear-gradient(0deg, #fff 0 28px, #f7f8fa 29px 30px);
    font-size: 13px;
  }

  .placed-image {
    position: absolute;
    display: grid;
    place-items: center;
    cursor: move;
    transform-origin: center;
    user-select: none;
  }

  .placed-image > img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    pointer-events: none;
  }

  .placed-image--selected {
    outline: 2px solid #1f6feb;
    outline-offset: 1px;
  }

  .image-resize-handle {
    position: absolute;
    right: -7px;
    bottom: -7px;
    width: 14px;
    height: 14px;
    padding: 0;
    border: 2px solid #fff;
    border-radius: 50%;
    background: #1f6feb;
    box-shadow: 0 1px 4px rgb(0 0 0 / 32%);
    cursor: nwse-resize;
  }

  @media (max-width: 600px) {
    .page-stage {
      width: 100%;
    }
  }
</style>
