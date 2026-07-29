<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Providers</h1>
      <p class="text-gray-500 text-sm mt-1">View configured providers and their validation rules.</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700">{{ total }} providers</span>
        <button class="btn-ghost btn btn-sm" @click="load">
          <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          Refresh
        </button>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="flex flex-col items-center gap-3 text-gray-400">
          <svg class="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span class="text-sm">Loading providers…</span>
        </div>
      </div>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50/50">
            <th class="text-left px-5 py-3 font-medium text-gray-500 w-16">ID</th>
            <th class="text-left px-5 py-3 font-medium text-gray-500">Name</th>
            <th class="text-left px-5 py-3 font-medium text-gray-500">Rules (JSON Schema)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-if="providers.length === 0">
            <td colspan="3" class="text-center py-12 text-gray-400">No providers found.</td>
          </tr>
          <tr v-for="p in providers" :key="p.id" class="hover:bg-gray-50/60 transition-colors">
            <td class="px-5 py-3.5 text-gray-400 font-mono text-xs">{{ p.id }}</td>
            <td class="px-5 py-3.5 font-medium text-gray-900">{{ p.name }}</td>
            <td class="px-5 py-3.5">
              <button
                class="btn-ghost btn btn-sm font-mono"
                @click="showRules(p)"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                </svg>
                View schema
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Rules modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="rulesModal.show" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/40" @click="rulesModal.show = false" />
          <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 class="font-semibold text-gray-900">Rules — {{ rulesModal.name }}</h3>
              <button class="btn-ghost btn btn-sm" @click="rulesModal.show = false">✕</button>
            </div>
            <div class="overflow-auto p-5">
              <pre class="text-xs font-mono bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap break-all">{{ JSON.stringify(rulesModal.rules, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getProviders } from '../api/providers.js'

const providers = ref([])
const loading = ref(false)
const error = ref('')
const total = ref(0)

const rulesModal = ref({ show: false, name: '', rules: {} })

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await getProviders(1, -1)
    const items = res?.data?.items ?? res?.data ?? []
    providers.value = Array.isArray(items) ? items.sort((a, b) => a.id - b.id) : []
    total.value = res?.data?.total ?? providers.value.length
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function showRules(p) {
  rulesModal.value = { show: true, name: p.name, rules: p.rules }
}

onMounted(load)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
