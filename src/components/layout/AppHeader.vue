<script setup lang="ts">
  import { pdfTools } from '@/data/tools'

  const tools = pdfTools.filter(tool => tool.available)
</script>

<template>
  <v-app-bar border color="surface" elevation="0" flat>
    <v-container class="d-flex align-center px-4 px-md-6">
      <router-link class="d-flex align-center text-decoration-none text-primary" to="/">
        <v-avatar class="mr-3" color="primary" size="38">
          <v-icon color="on-primary">mdi-file-pdf-box</v-icon>
        </v-avatar>

        <div>
          <div class="text-subtitle-1 font-weight-bold">PaperPilot</div>
        </div>
      </router-link>

      <v-spacer />

      <nav class="d-none d-md-flex align-center gap-2">
        <v-btn to="/" variant="text">Accueil</v-btn>

        <v-btn v-for="tool in tools" :key="tool.id" :to="tool.route" variant="text">
          {{ tool.name }}
        </v-btn>
      </nav>

      <v-btn class="ml-3" color="primary" to="/tools/merge-pdf">
        Ouvrir un outil
      </v-btn>
    </v-container>
  </v-app-bar>
</template>
