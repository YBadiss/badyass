<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  bundledVersion,
  extensionDownloadUrl,
  installedVersion,
  isChromium,
  isOutdated
} from '../extension'

const DISMISS_KEY = 'fivefind-extension-dismissed'

const readDismissed = () => {
  try {
    return localStorage.getItem(DISMISS_KEY) === bundledVersion
  } catch {
    return false
  }
}

const dismissed = ref(readDismissed())
const copied = ref(false)

const outdated = computed(() => !!installedVersion && isOutdated(installedVersion, bundledVersion))
const state = computed<'missing' | 'outdated' | 'ok'>(() =>
  !installedVersion ? 'missing' : outdated.value ? 'outdated' : 'ok'
)

const dismiss = (value: boolean) => {
  dismissed.value = value
  try {
    if (value) localStorage.setItem(DISMISS_KEY, bundledVersion)
    else localStorage.removeItem(DISMISS_KEY)
  } catch {
    // Storage unavailable: only hide for this visit
  }
}

// Chrome refuses to open chrome:// URLs from a web page, so clicking copies the address
const copyExtensionsUrl = async () => {
  try {
    await navigator.clipboard.writeText('chrome://extensions')
    copied.value = true
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <template v-if="isChromium && state !== 'ok'">
    <div v-if="!dismissed" class="extension-banner">
      <div class="banner-header">
        <h2 v-if="state === 'missing'">Ouvrir le créneau directement sur lefive.fr</h2>
        <h2 v-else>Nouvelle version de l'extension FiveFind (v{{ bundledVersion }})</h2>
        <button type="button" class="close-button" aria-label="Masquer" @click="dismiss(true)">
          ×
        </button>
      </div>

      <template v-if="state === 'missing'">
        <p class="banner-text">
          <strong>Sans l'extension</strong>, «&nbsp;Réserver&nbsp;» ouvre seulement la page du
          centre sur lefive.fr : vous choisissez ensuite le jour et l'heure vous-même.
        </p>
        <p class="banner-text">
          <strong>Avec l'extension</strong> (Chrome, Edge, Brave), le bouton devient «&nbsp;Ouvrir
          le créneau&nbsp;» et lefive.fr affiche directement le créneau choisi, même si vous devez
          d'abord vous connecter.
        </p>
      </template>
      <p v-else class="banner-text">
        Vous avez la v{{ installedVersion }}. Installez la v{{ bundledVersion }} pour continuer à
        ouvrir les créneaux directement.
      </p>

      <ol class="steps">
        <li>
          <a :href="extensionDownloadUrl" download class="download-button">
            Télécharger l'extension
          </a>
          puis décompressez le fichier : vous obtenez un dossier <code>fivefind-extension</code>.
          <template v-if="state === 'outdated'">
            Remplacez l'ancien dossier par celui-ci.
          </template>
        </li>
        <li>
          Ouvrez
          <!-- Chrome blocks web pages from opening chrome:// URLs, so the link copies it instead -->
          <a href="chrome://extensions" class="chrome-link" @click.prevent="copyExtensionsUrl">
            chrome://extensions
          </a>
          <span v-if="copied" class="copied-hint">
            Adresse copiée : collez-la dans la barre d'adresse d'un nouvel onglet (Chrome ne permet
            pas de l'ouvrir depuis un site).
          </span>
        </li>
        <template v-if="state === 'missing'">
          <li>Activez le <strong>Mode développeur</strong> (interrupteur en haut à droite).</li>
          <li>
            Cliquez sur <strong>Charger l'extension non empaquetée</strong> et sélectionnez le
            dossier <code>fivefind-extension</code>. Ne supprimez pas ce dossier ensuite : Chrome
            l'utilise en continu.
          </li>
        </template>
        <li v-else>Sur la carte FiveFind, cliquez sur l'icône ↻ (Actualiser).</li>
        <li>
          Rechargez cette page : le bouton des créneaux devient «&nbsp;Ouvrir le créneau&nbsp;».
        </li>
      </ol>
    </div>

    <button v-else type="button" class="reopen-link" @click="dismiss(false)">
      {{ state === 'missing' ? "Installer l'extension FiveFind" : "Mettre à jour l'extension" }}
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

.steps {
  margin: 0;
  padding-left: var(--spacing-lg);
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
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

code {
  background-color: var(--color-bg-code);
  padding: 0.1rem var(--spacing-xs);
  border-radius: var(--radius-sm);
  font-family: monospace;
}

.chrome-link {
  font-family: monospace;
  text-decoration: underline;
  cursor: pointer;
}

.copied-hint {
  display: block;
  margin-top: var(--spacing-xs);
  font-size: var(--font-xs);
  color: var(--color-status-available-text);
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
