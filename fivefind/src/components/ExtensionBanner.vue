<script setup lang="ts">
import { ref } from 'vue'
import { chromeStoreUrl, installedVersion, isChromium } from '../extension'

const DISMISS_KEY = 'fivefind-extension-dismissed'

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) !== null
  } catch {
    return false
  }
}

const dismissed = ref(readDismissed())

const dismiss = (value: boolean) => {
  dismissed.value = value
  try {
    if (value) localStorage.setItem(DISMISS_KEY, '1')
    else localStorage.removeItem(DISMISS_KEY)
  } catch {
    // Storage unavailable: only hide for this visit
  }
}
</script>

<template>
  <!-- Store installs update themselves, so the banner only matters when the extension is missing -->
  <template v-if="isChromium && !installedVersion">
    <div v-if="!dismissed" class="extension-banner">
      <div class="banner-header">
        <h2>Ouvrir le créneau directement sur lefive.fr</h2>
        <button type="button" class="close-button" aria-label="Masquer" @click="dismiss(true)">
          ×
        </button>
      </div>

      <p class="banner-text">
        <strong>Sans l'extension</strong>, «&nbsp;Réserver&nbsp;» ouvre seulement la page du centre
        sur lefive.fr : vous choisissez ensuite le jour et l'heure vous-même.
      </p>
      <p class="banner-text">
        <strong>Avec l'extension</strong> (Chrome, Edge, Brave), le bouton devient «&nbsp;Ouvrir le
        créneau&nbsp;» et lefive.fr affiche directement le créneau choisi, même si vous devez
        d'abord vous connecter.
      </p>

      <p class="banner-text">
        <a :href="chromeStoreUrl" target="_blank" rel="noopener noreferrer" class="download-button">
          Ajouter à Chrome
        </a>
        puis rechargez cette page.
      </p>
    </div>

    <button v-else type="button" class="reopen-link" @click="dismiss(false)">
      Installer l'extension FiveFind
    </button>
  </template>
</template>

<style scoped>
.extension-banner {
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-primary);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
}

.banner-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-md);
}

.banner-header h2 {
  margin: 0;
  font-size: var(--font-lg);
}

.close-button {
  padding: 0 var(--spacing-xs);
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: var(--font-lg);
  line-height: 1;
  cursor: pointer;
}

.banner-text {
  margin: var(--spacing-sm) 0 var(--spacing-md);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.download-button {
  display: inline-block;
  padding: var(--spacing-xs) var(--spacing-md);
  margin-right: var(--spacing-xs);
  border-radius: var(--radius-md);
  background-color: var(--color-primary);
  color: white;
  font-weight: 600;
}

.download-button:hover {
  background-color: var(--color-primary-hover);
  color: white;
}

.reopen-link {
  margin-bottom: var(--spacing-md);
  padding: 0;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-sm);
  cursor: pointer;
}
</style>
