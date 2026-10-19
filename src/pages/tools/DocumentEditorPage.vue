<script setup lang="ts">
  import type { EditorImage, EditorPage } from '@/types/documentEditor'

  import { computed, onBeforeUnmount, ref } from 'vue'
  import AppHeader from '@/components/layout/AppHeader.vue'
  import DocumentPageCanvas from '@/components/pdf/DocumentPageCanvas.vue'
  import PdfDropzone from '@/components/pdf/PdfDropzone.vue'
  import PdfFileList from '@/components/pdf/PdfFileList.vue'
  import { createEditorPages, exportEditorPages, readImageForPage } from '@/services/pdf/documentEditor'
  import { centerImageOnPage, constrainImageToPage } from '@/utils/imageAlignment'

  const selectedFiles = ref<File[]>([])
  const pages = ref<EditorPage[]>([])
  const isEditorOpen = ref(false)
  const selectedPageId = ref<string | null>(null)
  const selectedImageId = ref<string | null>(null)
  const isLoading = ref(false)
  const isExporting = ref(false)
  const errorMessage = ref('')
  const downloadUrl = ref('')
  const additionalFilesInput = ref<HTMLInputElement | null>(null)
  const imagesInput = ref<HTMLInputElement | null>(null)

  const selectedPage = computed(() => pages.value.find(page => page.id === selectedPageId.value) ?? null)
  const selectedImage = computed(() => selectedPage.value?.images.find(image => image.id === selectedImageId.value) ?? null)
  const selectedImageWidthPercent = computed(() => {
    if (!selectedImage.value || !selectedPage.value) {
      return 0
    }

    return Math.round((selectedImage.value.width / selectedPage.value.width) * 100)
  })

  function clearDownload () {
    if (downloadUrl.value) {
      URL.revokeObjectURL(downloadUrl.value)
      downloadUrl.value = ''
    }
  }

  function clearError () {
    errorMessage.value = ''
  }

  function readableError (error: unknown): string {
    return error instanceof Error ? error.message : 'Une erreur est survenue pendant le traitement du document.'
  }

  function removeSelectedFile (index: number) {
    selectedFiles.value = selectedFiles.value.filter((_, currentIndex) => currentIndex !== index)
  }

  function reorderSelectedFiles (payload: { from: number, to: number }) {
    const nextFiles = [...selectedFiles.value]
    const [file] = nextFiles.splice(payload.from, 1)

    if (!file) {
      return
    }

    nextFiles.splice(payload.to, 0, file)
    selectedFiles.value = nextFiles
  }

  async function loadInitialFiles () {
    try {
      isLoading.value = true
      clearError()
      pages.value = await createEditorPages(selectedFiles.value)
      selectedPageId.value = pages.value[0]?.id ?? null
      selectedImageId.value = pages.value[0]?.images[0]?.id ?? null
      isEditorOpen.value = true
      clearDownload()
    } catch (error) {
      errorMessage.value = readableError(error)
    } finally {
      isLoading.value = false
    }
  }

  async function appendDocuments (fileList: FileList | null) {
    const files = Array.from(fileList ?? [])

    if (files.length === 0) {
      return
    }

    try {
      isLoading.value = true
      clearError()
      const newPages = await createEditorPages(files)

      pages.value = [...pages.value, ...newPages]
      selectedFiles.value = [...selectedFiles.value, ...files]
      selectedPageId.value = newPages[0]?.id ?? selectedPageId.value
      selectedImageId.value = newPages[0]?.images[0]?.id ?? null
      clearDownload()
    } catch (error) {
      errorMessage.value = readableError(error)
    } finally {
      isLoading.value = false
      if (additionalFilesInput.value) {
        additionalFilesInput.value.value = ''
      }
    }
  }

  async function appendImages (fileList: FileList | null) {
    if (!selectedPage.value) {
      return
    }

    const files = Array.from(fileList ?? [])

    try {
      clearError()

      for (const file of files) {
        const image = await readImageForPage(file, selectedPage.value)

        selectedPage.value.images.push(image)
        selectedImageId.value = image.id
      }

      clearDownload()
    } catch (error) {
      errorMessage.value = readableError(error)
    } finally {
      if (imagesInput.value) {
        imagesInput.value.value = ''
      }
    }
  }

  function selectPage (page: EditorPage) {
    selectedPageId.value = page.id
    selectedImageId.value = null
  }

  function updateImage (payload: { imageId: string, changes: Partial<EditorImage> }) {
    const image = selectedPage.value?.images.find(item => item.id === payload.imageId)

    if (!image) {
      return
    }

    Object.assign(image, constrainImageToPage({ ...image, ...payload.changes }, selectedPage.value!.width, selectedPage.value!.height))
    clearDownload()
  }

  function rotatePage (degrees: number) {
    if (!selectedPage.value) {
      return
    }

    selectedPage.value.rotation = (selectedPage.value.rotation + degrees + 360) % 360
    clearDownload()
  }

  function rotateSelectedImage (degrees: number) {
    if (!selectedImage.value) {
      return
    }

    updateImage({
      imageId: selectedImage.value.id,
      changes: { rotation: (selectedImage.value.rotation + degrees + 360) % 360 },
    })
  }

  function resizeSelectedImage (value: string | number | number[]) {
    if (!selectedImage.value || !selectedPage.value || Array.isArray(value)) {
      return
    }

    const widthPercent = Number(value)

    if (!Number.isFinite(widthPercent) || widthPercent <= 0) {
      return
    }

    const image = selectedImage.value
    const width = (selectedPage.value.width * widthPercent) / 100
    const height = width / image.aspectRatio

    updateImage({ imageId: image.id, changes: { width, height } })
  }

  function centerSelectedImage (axis: 'horizontal' | 'vertical') {
    if (!selectedImage.value || !selectedPage.value) {
      return
    }

    const centered = centerImageOnPage(selectedImage.value, selectedPage.value.width, selectedPage.value.height, axis)

    updateImage({ imageId: selectedImage.value.id, changes: centered })
  }

  function deleteSelectedImage () {
    if (!selectedPage.value || !selectedImage.value) {
      return
    }

    const selectedIndex = selectedPage.value.images.findIndex(image => image.id === selectedImageId.value)

    selectedPage.value.images = selectedPage.value.images.filter(image => image.id !== selectedImageId.value)
    selectedImageId.value = selectedPage.value.images[Math.max(selectedIndex - 1, 0)]?.id ?? null
    clearDownload()
  }

  function deletePage (pageId: string) {
    const deletedIndex = pages.value.findIndex(page => page.id === pageId)

    pages.value = pages.value.filter(page => page.id !== pageId)

    if (pages.value.length === 0) {
      selectedFiles.value = []
      isEditorOpen.value = false
    }

    if (selectedPageId.value === pageId) {
      const replacement = pages.value[Math.min(deletedIndex, pages.value.length - 1)]

      selectedPageId.value = replacement?.id ?? null
      selectedImageId.value = replacement?.images[0]?.id ?? null
    }

    clearDownload()
  }

  function returnToFiles () {
    isEditorOpen.value = false
    clearError()
    clearDownload()
  }

  function movePage (index: number, direction: -1 | 1) {
    const targetIndex = index + direction

    if (targetIndex < 0 || targetIndex >= pages.value.length) {
      return
    }

    const nextPages = [...pages.value]
    const [page] = nextPages.splice(index, 1)

    if (page) {
      nextPages.splice(targetIndex, 0, page)
      pages.value = nextPages
      clearDownload()
    }
  }

  async function exportDocument () {
    try {
      isExporting.value = true
      clearError()
      const pdfBlob = await exportEditorPages(pages.value)

      clearDownload()
      downloadUrl.value = URL.createObjectURL(pdfBlob)
    } catch (error) {
      errorMessage.value = readableError(error)
    } finally {
      isExporting.value = false
    }
  }

  onBeforeUnmount(clearDownload)
</script>

<template>
  <div>
    <AppHeader />

    <v-main class="editor-main">
      <v-container class="py-8">
        <v-row justify="center">
          <v-col cols="12" lg="8" md="10">
            <v-card border class="editor-card pa-4 pa-md-6 rounded-xl" elevation="0">
              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center mb-5 ga-3">
                <div class="d-flex align-center ga-3">
                  <v-btn
                    v-if="isEditorOpen"
                    aria-label="Retour à la sélection des fichiers"
                    icon="mdi-arrow-left"
                    title="Retour à la sélection des fichiers"
                    variant="text"
                    @click="returnToFiles"
                  />

                  <div>
                    <div class="text-overline text-primary font-weight-bold">Outil</div>
                    <h1 class="text-h4 font-weight-bold mb-1">Composer un PDF</h1>

                    <p class="text-body-2 text-medium-emphasis mb-0">
                      Réunissez vos PDF et images, ajustez les pages puis exportez le résultat.
                    </p>
                  </div>
                </div>

                <v-btn
                  v-if="!isEditorOpen"
                  color="primary"
                  :disabled="selectedFiles.length === 0 || isLoading"
                  :loading="isLoading"
                  prepend-icon="mdi-arrow-right"
                  size="large"
                  @click="loadInitialFiles"
                >
                  Ouvrir dans l’éditeur
                </v-btn>

                <v-btn
                  v-else
                  color="primary"
                  :loading="isExporting"
                  prepend-icon="mdi-file-export-outline"
                  size="large"
                  @click="exportDocument"
                >
                  Exporter le PDF
                </v-btn>
              </div>

              <v-alert
                v-if="errorMessage"
                class="mb-5"
                closable
                type="error"
                variant="tonal"
                @click:close="clearError"
              >
                {{ errorMessage }}
              </v-alert>

              <section v-if="!isEditorOpen" class="start-panel">
                <PdfDropzone
                  v-model="selectedFiles"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  helper-text="Formats acceptés : PDF, JPG, JPEG, PNG et WebP. L’ordre de sélection définit l’ordre initial des pages."
                  label="Ajouter des PDF et des images"
                />

                <div class="d-flex align-center justify-space-between mt-6 mb-3">
                  <h2 class="text-h6 mb-0">Fichiers sélectionnés</h2>

                  <v-chip color="primary" size="small" variant="tonal">
                    {{ selectedFiles.length }} {{ selectedFiles.length > 1 ? 'fichiers' : 'fichier' }}
                  </v-chip>
                </div>

                <PdfFileList :files="selectedFiles" @remove="removeSelectedFile" @reorder="reorderSelectedFiles" />
              </section>

              <section v-else class="editor-workspace">
                <aside aria-label="Pages du document" class="page-rail">
                  <div class="d-flex align-center justify-space-between mb-3">
                    <h2 class="text-subtitle-1 font-weight-bold mb-0">Pages</h2>
                    <v-chip size="small" variant="tonal">{{ pages.length }}</v-chip>
                  </div>

                  <div class="page-list">
                    <article
                      v-for="(page, index) in pages"
                      :key="page.id"
                      class="page-row"
                      :class="{ 'page-row--selected': page.id === selectedPageId }"
                    >
                      <button class="page-select" type="button" @click="selectPage(page)">
                        <span class="page-number">{{ index + 1 }}</span>

                        <span class="page-label">
                          <span>{{ page.sourceType === 'pdf' ? 'Page PDF' : 'Image' }} {{ page.pdfPageNumber ?? '' }}</span>
                          <small>{{ page.sourceName }}</small>
                        </span>
                      </button>

                      <div class="page-actions">
                        <v-btn
                          aria-label="Monter la page"
                          density="compact"
                          :disabled="index === 0"
                          icon="mdi-chevron-up"
                          size="x-small"
                          variant="text"
                          @click="movePage(index, -1)"
                        />

                        <v-btn
                          aria-label="Descendre la page"
                          density="compact"
                          :disabled="index === pages.length - 1"
                          icon="mdi-chevron-down"
                          size="x-small"
                          variant="text"
                          @click="movePage(index, 1)"
                        />

                        <v-btn
                          :aria-label="`Supprimer la page ${index + 1}`"
                          density="compact"
                          icon="mdi-close"
                          size="x-small"
                          variant="text"
                          @click="deletePage(page.id)"
                        />
                      </div>
                    </article>
                  </div>

                  <div class="page-rail-actions mt-4">
                    <v-btn block prepend-icon="mdi-file-plus-outline" variant="outlined" @click="additionalFilesInput?.click()">
                      Ajouter des fichiers
                    </v-btn>

                    <input
                      ref="additionalFilesInput"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      class="visually-hidden"
                      multiple
                      type="file"
                      @change="appendDocuments(($event.target as HTMLInputElement).files)"
                    >
                  </div>
                </aside>

                <main class="canvas-column">
                  <div class="canvas-toolbar">
                    <div class="d-flex align-center flex-wrap ga-2">
                      <span class="canvas-page-name">
                        {{ selectedPage?.sourceName }}
                        <span v-if="selectedPage?.pdfPageNumber">· page {{ selectedPage.pdfPageNumber }}</span>
                      </span>

                      <v-divider class="mx-1" vertical />

                      <v-btn
                        aria-label="Tourner la page à gauche"
                        icon="mdi-rotate-left"
                        size="small"
                        variant="text"
                        @click="rotatePage(-90)"
                      />

                      <v-btn
                        aria-label="Tourner la page à droite"
                        icon="mdi-rotate-right"
                        size="small"
                        variant="text"
                        @click="rotatePage(90)"
                      />
                    </div>

                    <v-btn
                      color="primary"
                      prepend-icon="mdi-image-plus-outline"
                      size="small"
                      variant="tonal"
                      @click="imagesInput?.click()"
                    >
                      Ajouter une image
                    </v-btn>

                    <input
                      ref="imagesInput"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      class="visually-hidden"
                      multiple
                      type="file"
                      @change="appendImages(($event.target as HTMLInputElement).files)"
                    >
                  </div>

                  <div class="canvas-area">
                    <div v-if="selectedPage" class="canvas-inner">
                      <DocumentPageCanvas
                        :page="selectedPage"
                        :selected-image-id="selectedImageId"
                        @deselect-image="selectedImageId = null"
                        @select-image="selectedImageId = $event"
                        @update-image="updateImage"
                      />
                    </div>

                    <v-progress-linear v-if="isLoading" class="canvas-progress" color="primary" indeterminate />
                  </div>

                  <v-alert class="mt-4" density="compact" type="info" variant="tonal">
                    Les pages PDF conservent leur texte. Les images ajoutées restent des éléments image dans le document exporté.
                  </v-alert>

                  <v-alert
                    v-if="downloadUrl"
                    class="mt-4"
                    density="comfortable"
                    type="success"
                    variant="tonal"
                  >
                    <div class="d-flex align-center justify-space-between flex-wrap ga-3">
                      <span>Votre document est prêt.</span>

                      <v-btn color="success" download="document-compose.pdf" :href="downloadUrl" variant="flat">
                        Télécharger le PDF
                      </v-btn>
                    </div>
                  </v-alert>
                </main>

                <aside aria-label="Propriétés de l’élément sélectionné" class="properties-panel">
                  <h2 class="text-subtitle-1 font-weight-bold mb-4">Mise en page</h2>

                  <template v-if="selectedImage">
                    <div class="selected-image-name">
                      <v-icon color="primary" size="20">mdi-image-outline</v-icon>
                      <span>{{ selectedImage.name }}</span>
                    </div>

                    <div class="property-label mt-5">Largeur de l’image</div>

                    <v-text-field
                      hide-details
                      min="1"
                      :model-value="selectedImageWidthPercent"
                      suffix="% de la page"
                      type="number"
                      @update:model-value="resizeSelectedImage"
                    />

                    <div class="property-label mt-6">Rotation de l’image</div>

                    <div class="image-rotation-actions">
                      <v-btn block prepend-icon="mdi-rotate-left" variant="outlined" @click="rotateSelectedImage(-90)">
                        −90°
                      </v-btn>

                      <v-btn append-icon="mdi-rotate-right" block variant="outlined" @click="rotateSelectedImage(90)">
                        +90°
                      </v-btn>
                    </div>

                    <div class="property-label mt-6">Centrage sur la page</div>

                    <div class="image-alignment-actions">
                      <v-btn
                        block
                        prepend-icon="mdi-align-horizontal-center"
                        variant="outlined"
                        @click="centerSelectedImage('horizontal')"
                      >
                        Horizontal
                      </v-btn>

                      <v-btn
                        block
                        prepend-icon="mdi-align-vertical-center"
                        variant="outlined"
                        @click="centerSelectedImage('vertical')"
                      >
                        Vertical
                      </v-btn>
                    </div>

                    <v-btn
                      block
                      class="mt-6"
                      color="error"
                      prepend-icon="mdi-delete-outline"
                      variant="text"
                      @click="deleteSelectedImage"
                    >
                      Supprimer l’image
                    </v-btn>
                  </template>

                  <div v-else class="properties-empty">
                    <v-icon color="medium-emphasis" size="28">mdi-cursor-default-click-outline</v-icon>

                    <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
                      Sélectionnez une image pour modifier sa taille ou sa rotation.
                    </p>
                  </div>
                </aside>
              </section>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>

<style scoped>
  .editor-main {
    min-height: calc(100vh - 64px);
    background: #f3f5f8;
  }

  .editor-workspace {
    display: grid;
    grid-template-columns: minmax(150px, 210px) minmax(0, 1fr);
    gap: clamp(10px, 2vw, 18px);
    align-items: start;
  }

  .page-rail,
  .properties-panel {
    padding: 16px;
    overflow: auto;
    border: 1px solid #e1e5eb;
    border-radius: 10px;
    background: #fff;
  }

  .properties-panel {
    grid-column: 2;
  }

  .image-rotation-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .image-alignment-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .page-list {
    display: grid;
    gap: 7px;
  }

  .page-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    border: 1px solid transparent;
    border-radius: 7px;
    background: #f6f7f9;
  }

  .page-row--selected {
    border-color: rgb(var(--v-theme-primary));
    background: rgb(var(--v-theme-primary), 0.07);
  }

  .page-select {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
    padding: 9px 5px 9px 9px;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .page-number {
    display: grid;
    width: 30px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid #d9dee7;
    border-radius: 4px;
    background: white;
    color: #465064;
    font-size: 12px;
  }

  .page-label {
    display: grid;
    min-width: 0;
    gap: 3px;
    font-size: 12px;
  }

  .page-label small,
  .selected-image-name span {
    overflow: hidden;
    color: #697386;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .page-actions {
    display: flex;
    flex-direction: column;
    padding-right: 4px;
  }

  .page-rail-actions {
    display: grid;
    gap: 8px;
  }

  .canvas-column {
    min-width: 0;
  }

  .canvas-toolbar {
    display: flex;
    min-height: 52px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border: 1px solid #e1e5eb;
    border-radius: 9px 9px 0 0;
    background: #fff;
  }

  .canvas-page-name {
    max-width: min(40vw, 350px);
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .canvas-area {
    position: relative;
    min-height: 0;
    padding: clamp(8px, 2vw, 28px);
    overflow: visible;
    border: 1px solid #e1e5eb;
    border-top: 0;
    background-color: #e9edf2;
    background-image: radial-gradient(#c8ced8 0.8px, transparent 0.8px);
    background-size: 16px 16px;
  }

  .canvas-inner {
    min-width: 0;
  }

  .canvas-progress {
    position: absolute;
    inset: 0 0 auto;
  }

  .selected-image-name {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
  }

  .selected-image-name span {
    font-size: 13px;
  }

  .property-label {
    margin-bottom: 8px;
    color: #414b5d;
    font-size: 12px;
    font-weight: 600;
  }

  .properties-empty {
    display: grid;
    min-height: 130px;
    align-content: center;
    justify-items: center;
    padding: 12px;
    border: 1px dashed #d6dce5;
    border-radius: 7px;
    text-align: center;
  }

  .start-panel {
    max-width: 900px;
    margin: 0 auto;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    clip-path: inset(50%);
  }

  @media (max-width: 700px) {
    .editor-workspace {
      grid-template-columns: minmax(0, 1fr);
    }

    .page-rail,
    .properties-panel {
      position: static;
      grid-column: 1;
      max-height: none;
    }

    .page-rail {
      order: 1;
    }

    .canvas-column {
      order: 2;
    }

    .properties-panel {
      order: 3;
    }

    .canvas-area {
      padding: 8px;
    }

    .canvas-toolbar {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
