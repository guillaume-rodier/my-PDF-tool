<script setup lang="ts">
  import type { PdfTool } from '@/types/pdf'

  defineProps<{
    tool: PdfTool
  }>()
</script>

<template>
  <v-card
    border
    class="h-100"
    :class="{ 'tool-card--unavailable': !tool.available }"
    :disabled="!tool.available"
    elevation="0"
    rounded="xl"
    :to="tool.available ? tool.route : undefined"
    variant="flat"
  >
    <v-card-item class="pb-3">
      <template #prepend>
        <v-avatar class="mr-2" :color="tool.available ? 'primary' : 'grey-lighten-2'" size="48">
          <v-icon :color="tool.available ? 'on-primary' : 'grey-darken-1'" size="24">{{ tool.icon }}</v-icon>
        </v-avatar>
      </template>

      <v-card-title class="text-h6 font-weight-bold">{{ tool.name }}</v-card-title>
    </v-card-item>

    <v-card-text class="pt-0 text-body-2 text-medium-emphasis">
      {{ tool.description }}
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-btn
        v-if="tool.available"
        append-icon="mdi-arrow-right"
        color="primary"
        :to="tool.route"
        variant="tonal"
      >
        Ouvrir
      </v-btn>

      <v-chip v-else color="grey-darken-1" size="small" variant="tonal">À venir</v-chip>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
  .tool-card--unavailable {
    opacity: 0.58;
    cursor: not-allowed;
  }
</style>
