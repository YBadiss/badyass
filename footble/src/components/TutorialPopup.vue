<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Storage from '../models/Storage.ts'

interface Props {
  storage: Storage
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const isVisible = ref(false)

onMounted(() => {
  // Check if tutorial has been seen before
  const hasSeenTutorial = props.storage.retrieve('tutorial/seen')
  if (!hasSeenTutorial) {
    isVisible.value = true
  }
})

const closeTutorial = () => {
  props.storage.store('tutorial/seen', 'true')
  isVisible.value = false
  emit('close')
}

const showTutorial = () => {
  isVisible.value = true
}

defineExpose({ showTutorial })
</script>

<template>
  <Transition name="fade">
    <div v-if="isVisible" class="tutorial-overlay" @click="closeTutorial">
      <div class="tutorial-popup" @click.stop>
        <div class="tutorial-header">
          <h2>How to Play</h2>
          <button class="close-button" @click="closeTutorial">&times;</button>
        </div>

        <div class="tutorial-content">
          <div class="tutorial-section">
            <p class="tutorial-text">
              Welcome to Footble! Find the player of the day based on their transfer history.
            </p>
          </div>

          <div class="tutorial-images">
            <div class="tutorial-image-container">
              <img src="/tuto2.png" alt="Tutorial step 2" class="tutorial-image" />
              <p class="image-caption">
                Players are rated by their similarity to the player of the day.
              </p>
            </div>

            <div class="tutorial-image-container">
              <img src="/tuto3.png" alt="Tutorial step 3" class="tutorial-image" />
              <p class="image-caption">Find the player of the day in the list of players to win!</p>
            </div>
          </div>
        </div>

        <div class="tutorial-footer">
          <button class="start-button" @click="closeTutorial">Got it, let's play!</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.tutorial-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.tutorial-popup {
  background: #1a1a1a;
  border: 2px solid #667eea;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.tutorial-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #333;
}

.tutorial-header h2 {
  font-size: 1.75rem;
  color: #ffffff;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #667eea;
}

.tutorial-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.tutorial-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tutorial-text {
  color: #ffffff;
  font-size: 1.125rem;
  line-height: 1.6;
  margin: 0;
}

.tutorial-images {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  justify-content: center;
}

.tutorial-image-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  max-width: 50%;
}

.tutorial-image {
  width: 100%;
  height: auto;
  border-radius: 8px;
  border: 2px solid #333;
}

.image-caption {
  color: #999;
  font-size: 0.875rem;
  font-style: italic;
  margin: 0;
  text-align: center;
}

.tutorial-footer {
  padding: 1.5rem;
  border-top: 2px solid #333;
  display: flex;
  justify-content: center;
}

.start-button {
  padding: 1rem 2rem;
  background: #667eea;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.start-button:hover {
  background: #764ba2;
}

.start-button:active {
  transform: scale(0.98);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .tutorial-content {
    padding: 1.5rem;
  }

  .tutorial-header h2 {
    font-size: 1.5rem;
  }

  .tutorial-text {
    font-size: 1rem;
  }

  .tutorial-images {
    flex-direction: column;
  }

  .tutorial-image-container {
    max-width: 100%;
  }
}
</style>
