<script setup lang="ts">
  import { ref } from 'vue'

  const model = defineModel<File[]>({ default: () => [] as File[] })

  const props = withDefaults(
    defineProps<{
      accept?: string
      multiple?: boolean
      label?: string
      helperText?: string
    }>(),
    {
      accept: '.pdf,application/pdf',
      multiple: true,
      label: 'Sélectionner des fichiers PDF',
      helperText: 'Glissez-déposez vos fichiers ici ou choisissez-les dans votre ordinateur.',
    },
  )

  const inputRef = ref<HTMLInputElement | null>(null)
  const isDragging = ref(false)

  function addFiles (fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return
    }

    const nextFiles = Array.from(fileList)
    const currentFiles = model.value ?? []

    model.value = props.multiple ? [...currentFiles, ...nextFiles] : nextFiles
  }

  function triggerInput () {
    inputRef.value?.click()
  }

  function handleDrop (event: DragEvent) {
    event.preventDefault()
    isDragging.value = false
    addFiles(event.dataTransfer?.files ?? null)
  }
</script>

<template>
  <v-card
    class="dropzone pa-6 text-center cursor-pointer"
    :class="{ 'dropzone--dragging': isDragging }"
    rounded="xl"
    variant="tonal"
    @click="triggerInput"
    @dragenter.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @dragover.prevent="isDragging = true"
    @drop.prevent="handleDrop"
  >
    <v-icon color="primary" size="44">mdi-cloud-upload-outline</v-icon>
    <div class="text-h6 mt-3 font-weight-medium">{{ label }}</div>
    <div class="text-body-2 text-medium-emphasis mt-2">{{ helperText }}</div>

    <v-btn class="mt-4" color="primary" variant="flat" @click.stop="triggerInput">
      Choisir des fichiers
    </v-btn>

    <input
      ref="inputRef"
      :accept="accept"
      class="d-none"
      :multiple="multiple"
      type="file"
      @change="addFiles(($event.target as HTMLInputElement)?.files ?? null)"
    >
  </v-card>
</template>

<style scoped>
  .dropzone {
    border: 1.5px dashed rgba(var(--v-theme-primary), 0.45);
    transition: all 0.2s ease-in-out;
  }

  .dropzone--dragging {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.05);
    transform: translateY(-1px);
  }
</style>
