<script setup lang="ts">
  import ToolCard from '@/components/common/ToolCard.vue'
  import AppHeader from '@/components/layout/AppHeader.vue'
  import { pdfTools } from '@/data/tools'
</script>

<template>
  <div>
    <AppHeader />

    <v-main class="bg-grey-lighten-5">
      <v-container class="py-8 py-md-12">
        <v-row class="align-center mb-8">
          <v-col cols="12" md="7">
            <div class="text-overline text-primary font-weight-bold">Boîte à outils PDF</div>
            <h1 class="text-h2 font-weight-bold mb-4">Une boîte à outils PDF simple et rapide.</h1>

            <p class="text-h6 text-medium-emphasis mb-6">
              Gérer vos documents directement dans le navigateur, sans compte ni complication.
            </p>

            <div class="d-flex flex-wrap gap-3">
              <v-btn color="primary" size="large" to="/tools/merge-pdf">Lancer la fusion</v-btn>
              <v-btn size="large" to="/" variant="outlined">Découvrir les outils</v-btn>
            </div>
          </v-col>

          <v-col cols="12" md="5">
            <v-card border class="pa-5" elevation="0" rounded="2xl">
              <div class="d-flex align-center justify-space-between mb-4">
                <div>
                  <div class="text-overline text-primary">Traitement local</div>
                  <div class="text-h6 font-weight-bold">Aucune donnée envoyée</div>
                </div>

                <v-icon color="primary" size="36">mdi-shield-check</v-icon>
              </div>

              <v-list class="bg-transparent" density="comfortable">
                <v-list-item prepend-icon="mdi-file-document-check-outline">
                  <v-list-item-title>Modèle pensé pour l’ergonomie</v-list-item-title>
                </v-list-item>

                <v-list-item prepend-icon="mdi-lightning-bolt-outline">
                  <v-list-item-title>Traitement dans le navigateur</v-list-item-title>
                </v-list-item>

                <v-list-item prepend-icon="mdi-cog-outline">
                  <v-list-item-title>Architecture extensible</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-card>
          </v-col>
        </v-row>

        <div class="mb-5">
          <div class="text-overline text-primary font-weight-bold">Outils disponibles</div>
          <h2 class="text-h4 font-weight-bold mb-1">Catalogue des outils</h2>
        </div>

        <v-row>
          <v-col
            v-for="tool in pdfTools"
            :key="tool.id"
            cols="12"
            md="4"
            sm="6"
          >
            <ToolCard :tool="tool" />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </div>
</template>
