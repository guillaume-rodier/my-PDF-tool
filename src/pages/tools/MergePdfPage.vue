<script setup lang="ts">
  import { computed, onBeforeUnmount, ref } from 'vue'

  import AppHeader from '@/components/layout/AppHeader.vue'
  import PdfDropzone from '@/components/pdf/PdfDropzone.vue'
  import PdfFileList from '@/components/pdf/PdfFileList.vue'
  import { mergePdfFiles, validatePdfFiles } from '@/services/pdf/mergePdf'

  const selectedFiles = ref<File[]>([])
  const processing = ref(false)
  const errorMessage = ref('')
  const downloadUrl = ref('')

  const canMerge = computed(() => selectedFiles.value.length >= 2)

  function resetGeneratedFile () {
    if (downloadUrl.value) {
      URL.revokeObjectURL(downloadUrl.value)
      downloadUrl.value = ''
    }
  }

  function removeFile (index: number) {
    selectedFiles.value = selectedFiles.value.filter((_, currentIndex) => currentIndex !== index)
    resetGeneratedFile()
  }

  function reorderFiles (payload: { from: number, to: number }) {
    const nextFiles = [...selectedFiles.value]
    const [movedFile] = nextFiles.splice(payload.from, 1)

    if (!movedFile) {
      return
    }

    nextFiles.splice(payload.to, 0, movedFile)
    selectedFiles.value = nextFiles
    resetGeneratedFile()
  }

  async function handleMerge () {
    if (!canMerge.value) {
      errorMessage.value = 'Sélectionnez au moins deux fichiers PDF pour effectuer la fusion.'
      return
    }

    try {
      processing.value = true
      errorMessage.value = ''
      validatePdfFiles(selectedFiles.value)

      const mergedBlob = await mergePdfFiles(selectedFiles.value)

      resetGeneratedFile()
      downloadUrl.value = URL.createObjectURL(mergedBlob)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur inconnue est survenue.'
      errorMessage.value = message
    } finally {
      processing.value = false
    }
  }

  onBeforeUnmount(() => resetGeneratedFile())
</script>

<template>
  <div>
    <AppHeader />

    <v-main class="bg-grey-lighten-5">
      <v-container class="py-8">
        <v-row justify="center">
          <v-col cols="12" lg="8" md="10">
            <v-card border class="pa-4 pa-md-6 rounded-xl" elevation="0">
              <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center mb-5 gap-3">
                <div>
                  <div class="text-overline text-primary font-weight-bold">Outil</div>
                  <h1 class="text-h4 font-weight-bold mb-1">Fusionner des PDF</h1>

                  <p class="text-body-2 text-medium-emphasis mb-0">
                    Ajoutez plusieurs fichiers, réorganisez-les et exportez un PDF unique.
                  </p>
                </div>

                <v-btn
                  color="primary"
                  :disabled="!canMerge || processing"
                  :loading="processing"
                  size="large"
                  @click="handleMerge"
                >
                  Fusionner les PDF
                </v-btn>
              </div>

              <PdfDropzone v-model="selectedFiles" label="Ajouter des PDF" />

              <div class="mt-6">
                <div class="d-flex align-center justify-space-between mb-3">
                  <h2 class="text-h6 mb-0">Fichiers sélectionnés</h2>

                  <v-chip color="primary" size="small" variant="tonal">
                    {{ selectedFiles.length }} {{ selectedFiles.length > 1 ? 'fichiers' : 'fichier' }}
                  </v-chip>
                </div>

                <PdfFileList :files="selectedFiles" @remove="removeFile" @reorder="reorderFiles" />
              </div>

              <v-alert
                v-if="errorMessage"
                class="mt-6"
                closable
                type="error"
                variant="tonal"
                @click:close="errorMessage = ''"
              >
                {{ errorMessage }}
              </v-alert>

              <v-alert v-if="downloadUrl" class="mt-6 mb-0" type="success" variant="tonal">
                <div class="d-flex flex-column flex-md-row align-center justify-space-between gap-3 w-100">
                  <span>Le PDF fusionné est prêt à être téléchargé.</span>

                  <v-btn color="success" download="document-fusionne.pdf" :href="downloadUrl" variant="flat">
                    Télécharger le résultat
                  </v-btn>
                </div>
              </v-alert>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>
