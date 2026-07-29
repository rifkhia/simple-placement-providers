<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40" @click="$emit('cancel')" />
        <div class="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">{{ title }}</h3>
              <p class="text-sm text-gray-500 mt-0.5">{{ message }}</p>
            </div>
          </div>
          <div class="flex gap-3 justify-end">
            <button class="btn-ghost btn" @click="$emit('cancel')">Cancel</button>
            <button class="btn-danger btn" @click="$emit('confirm')">Delete</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
defineProps({ show: Boolean, title: String, message: String })
defineEmits(['confirm', 'cancel'])
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
