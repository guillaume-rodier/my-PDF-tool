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
    elevation="0"
    rounded="xl"
    :to="tool.route"
    variant="flat"
  >
    <v-card-item class="pb-3">
      <template #prepend>
        <v-avatar class="mr-2" color="primary" size="48">
          <v-icon color="on-primary" size="24">{{ tool.icon }}</v-icon>
        </v-avatar>
      </template>

      <v-card-title class="text-h6 font-weight-bold">{{ tool.name }}</v-card-title>
    </v-card-item>

    <v-card-text class="pt-0 text-body-2 text-medium-emphasis">
      {{ tool.description }}
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-btn append-icon="mdi-arrow-right" color="primary" :to="tool.route" variant="tonal">
        Ouvrir
      </v-btn>
    </v-card-actions>
  </v-card>
</template>
