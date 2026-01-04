<script setup lang="ts">
interface Props {
  after: string
  before: string
  status: string[]
}

interface Emits {
  (e: 'update:after', value: string): void
  (e: 'update:before', value: string): void
  (e: 'update:status', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const updateAfter = (event: Event & { target: HTMLInputElement }) => {
  emit('update:after', event.target.value)
}

const updateBefore = (event: Event & { target: HTMLInputElement }) => {
  emit('update:before', event.target.value)
}

const updateStatus = (event: Event & { target: HTMLInputElement }) => {
  const target = event.target
  const currentStatus = [...props.status]

  if (target.checked) {
    if (!currentStatus.includes(target.value)) {
      currentStatus.push(target.value)
    }
  } else {
    const index = currentStatus.indexOf(target.value)
    if (index > -1) {
      currentStatus.splice(index, 1)
    }
  }

  emit('update:status', currentStatus)
}
</script>

<template>
  <div class="filters">
    <div class="filter-group">
      <label for="filter-after">After:</label>
      <input
        id="filter-after"
        :value="after"
        type="datetime-local"
        class="filter-input"
        @input="updateAfter"
      />
    </div>

    <div class="filter-group">
      <label for="filter-before">Before:</label>
      <input
        id="filter-before"
        :value="before"
        type="datetime-local"
        class="filter-input"
        @input="updateBefore"
      />
    </div>

    <div class="filter-group status-filter">
      <label>Status:</label>
      <div class="status-checkboxes">
        <label class="checkbox-label">
          <input
            :checked="status.includes('AVAILABLE')"
            type="checkbox"
            value="AVAILABLE"
            class="checkbox-input"
            @change="updateStatus"
          />
          <span>Available</span>
        </label>
        <label class="checkbox-label">
          <input
            :checked="status.includes('FULL')"
            type="checkbox"
            value="FULL"
            class="checkbox-input"
            @change="updateStatus"
          />
          <span>Full</span>
        </label>
        <label class="checkbox-label">
          <input
            :checked="status.includes('PASSED')"
            type="checkbox"
            value="PASSED"
            class="checkbox-input"
            @change="updateStatus"
          />
          <span>Passed</span>
        </label>
        <label class="checkbox-label">
          <input
            :checked="status.includes('CANCELLED')"
            type="checkbox"
            value="CANCELLED"
            class="checkbox-input"
            @change="updateStatus"
          />
          <span>Cancelled</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-light);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  align-items: flex-start;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-group label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.filter-input {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
  transition: border-color var(--transition-fast);
}

.filter-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Style the datetime picker icon/button */
.filter-input::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(0.5);
}

.filter-input::-webkit-calendar-picker-indicator:hover {
  filter: invert(0.3);
}

.status-filter {
  flex: 1;
  min-width: 250px;
}

.status-checkboxes {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.checkbox-input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}
</style>
