<script setup lang="ts">
  defineProps<{
    files: File[]
  }>()

  const emit = defineEmits<{
    (event: 'remove', index: number): void
    (event: 'reorder', payload: { from: number, to: number }): void
  }>()

  function formatSize (size: number): string {
    if (size < 1024) {
      return `${size} B`
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
</script>

<template>
  <v-card v-if="files.length > 0" class="pa-0" rounded="xl" variant="outlined">
    <v-list density="comfortable" lines="two">
      <v-list-item v-for="(file, index) in files" :key="`${file.name}-${index}`">
        <template #prepend>
          <v-icon color="primary">mdi-file-pdf-box</v-icon>
        </template>

        <v-list-item-title class="text-body-1 font-weight-medium">
          {{ file.name }}
        </v-list-item-title>

        <v-list-item-subtitle>{{ formatSize(file.size) }}</v-list-item-subtitle>

        <template #append>
          <div class="d-flex align-center gap-2">
            <v-btn
              :disabled="index === 0"
              icon="mdi-arrow-up"
              size="small"
              variant="text"
              @click="emit('reorder', { from: index, to: index - 1 })"
            />

            <v-btn
              :disabled="index === files.length - 1"
              icon="mdi-arrow-down"
              size="small"
              variant="text"
              @click="emit('reorder', { from: index, to: index + 1 })"
            />

            <v-btn
              color="error"
              icon="mdi-delete-outline"
              size="small"
              variant="text"
              @click="emit('remove', index)"
            />
          </div>
        </template>
      </v-list-item>
    </v-list>
  </v-card>

  <v-alert v-else class="mb-0" type="info" variant="tonal">
    Aucun fichier sélectionné pour le moment.
  </v-alert>
</template>
