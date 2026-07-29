<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Placements</h1>
        <p class="text-gray-500 text-sm mt-1">Manage placement configurations across providers.</p>
      </div>
      <button class="btn-primary btn" @click="openCreate">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        New Placement
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-48">
        <label class="label">Search by name</label>
        <input v-model="filters.name" class="input" placeholder="e.g. production" @keyup.enter="search" />
      </div>
      <div>
        <label class="label">Visible on UI</label>
        <select v-model="filters.visible_on_ui" class="input w-40">
          <option value="">Any</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>
      <div class="flex gap-2">
        <button class="btn-primary btn" @click="search">Search</button>
        <button class="btn-ghost btn" @click="clearFilters">Clear</button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
      {{ error }}
    </div>

    <!-- Success toast -->
    <Transition name="slide">
      <div v-if="toast" class="fixed bottom-6 right-6 z-50 bg-gray-900 text-white rounded-xl px-4 py-3 text-sm shadow-lg flex items-center gap-2">
        <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        {{ toast }}
      </div>
    </Transition>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-700">{{ total }} placements</span>
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
          <span class="text-sm">Loading…</span>
        </div>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="text-left px-5 py-3 font-medium text-gray-500 w-12">ID</th>
              <th class="text-left px-5 py-3 font-medium text-gray-500">Name</th>
              <th class="text-left px-5 py-3 font-medium text-gray-500">Provider</th>
              <th class="text-center px-3 py-3 font-medium text-gray-500">UI</th>
              <th class="text-center px-3 py-3 font-medium text-gray-500">Wrap</th>
              <th class="text-center px-3 py-3 font-medium text-gray-500">Backup</th>
              <th class="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="placements.length === 0">
              <td colspan="8" class="text-center py-12 text-gray-400">No placements found.</td>
            </tr>
            <tr v-for="p in placements" :key="p.id" class="hover:bg-gray-50/60 transition-colors">
              <td class="px-5 py-3.5 text-gray-400 font-mono text-xs">{{ p.id }}</td>
              <td class="px-5 py-3.5 font-medium text-gray-900">{{ p.name }}</td>
              <td class="px-5 py-3.5">
                <span class="badge bg-blue-50 text-blue-700">{{ p.provider?.name ?? p.provider_id }}</span>
              </td>
              <td class="px-3 py-3.5 text-center">
                <span :class="p.visible_on_ui ? 'badge bg-green-50 text-green-700' : 'badge bg-gray-100 text-gray-500'">
                  {{ p.visible_on_ui ? 'Yes' : 'No' }}
                </span>
              </td>
              <td class="px-3 py-3.5 text-center">
                <span :class="p.requires_wrap ? 'badge bg-amber-50 text-amber-700' : 'badge bg-gray-100 text-gray-500'">
                  {{ p.requires_wrap ? 'Yes' : 'No' }}
                </span>
              </td>
              <td class="px-3 py-3.5 text-center">
                <span :class="p.backup ? 'badge bg-purple-50 text-purple-700' : 'badge bg-gray-100 text-gray-500'">
                  {{ p.backup ? 'Yes' : 'No' }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex gap-1.5 justify-end">
                  <button class="btn-ghost btn btn-sm" title="Edit" @click="openEdit(p)">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                    Edit
                  </button>
                  <button class="btn btn-sm text-red-500 hover:bg-red-50 focus:ring-red-400" title="Delete" @click="confirmDelete(p)">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <span class="text-xs text-gray-400">Page {{ page }} of {{ totalPages }}</span>
        <div class="flex gap-1.5">
          <button class="btn-ghost btn btn-sm" :disabled="page <= 1" @click="page--; load()">← Prev</button>
          <button class="btn-ghost btn btn-sm" :disabled="page >= totalPages" @click="page++; load()">Next →</button>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modal.show" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/40" @click="closeModal" />
          <div class="relative bg-white rounded-xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col">
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="font-semibold text-gray-900">{{ modal.isEdit ? 'Edit Placement' : 'New Placement' }}</h2>
              <button class="btn-ghost btn btn-sm" @click="closeModal">✕</button>
            </div>

            <!-- Modal body -->
            <div class="overflow-y-auto px-6 py-5 space-y-4">
              <!-- Name -->
              <div>
                <label class="label">Name <span class="text-red-500">*</span></label>
                <input v-model="form.name" class="input" placeholder="e.g. production-east-1" required />
              </div>

              <!-- Provider -->
              <div>
                <label class="label">Provider <span class="text-red-500">*</span></label>
                <select v-model="form.provider_id" @change="onProviderChange" class="input">
                  <option value="">-- select provider --</option>
                  <option v-for="pv in providers" :key="pv.id" :value="pv.id">{{ pv.name }}</option>
                </select>
              </div>

              <!-- Toggles row -->
              <div class="grid grid-cols-3 gap-4">
                <div class="flex flex-col gap-1.5">
                  <label class="label mb-0">Visible on UI</label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <div class="relative">
                      <input type="checkbox" v-model="form.visible_on_ui" class="sr-only peer" />
                      <div class="w-9 h-5 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors"></div>
                      <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span class="text-sm text-gray-600">{{ form.visible_on_ui ? 'Yes' : 'No' }}</span>
                  </label>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="label mb-0">Requires Wrap</label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <div class="relative">
                      <input type="checkbox" v-model="form.requires_wrap" class="sr-only peer" />
                      <div class="w-9 h-5 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors"></div>
                      <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span class="text-sm text-gray-600">{{ form.requires_wrap ? 'Yes' : 'No' }}</span>
                  </label>
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="label mb-0">Backup</label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <div class="relative">
                      <input type="checkbox" v-model="form.backup" class="sr-only peer" />
                      <div class="w-9 h-5 bg-gray-200 peer-checked:bg-primary-600 rounded-full transition-colors"></div>
                      <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4"></div>
                    </div>
                    <span class="text-sm text-gray-600">{{ form.backup ? 'Yes' : 'No' }}</span>
                  </label>
                </div>
              </div>

              <!-- Provider Resources (dynamic based on provider rules) -->
              <div v-if="form.provider_id">
                <div class="flex items-center gap-2 mb-3">
                  <div class="flex-1 border-t border-gray-100"></div>
                  <span class="text-xs font-medium text-gray-400 uppercase tracking-wider px-2">Provider Resources</span>
                  <div class="flex-1 border-t border-gray-100"></div>
                </div>

                <div v-if="selectedProvider" class="mb-3">
                  <span class="text-xs text-gray-400">
                    Schema from: <strong class="text-gray-600">{{ selectedProvider.name }}</strong>
                  </span>
                </div>

                <JsonSchemaForm
                  :schema="selectedProviderRules"
                  v-model="form.provider_resources"
                />
              </div>
              <div v-else class="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-400 text-center">
                Select a provider to configure resources
              </div>

              <!-- Modal error -->
              <div v-if="modalError" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {{ modalError }}
              </div>
            </div>

            <!-- Modal footer -->
            <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
              <button class="btn-ghost btn" @click="closeModal">Cancel</button>
              <button class="btn-primary btn" :disabled="saving" @click="save">
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ modal.isEdit ? 'Save changes' : 'Create placement' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Confirm delete -->
    <ConfirmModal
      :show="deleteTarget !== null"
      title="Delete placement?"
      :message="`'${deleteTarget?.name}' will be permanently removed.`"
      @confirm="doDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getPlacements, createPlacement, updatePlacement, deletePlacement } from '../api/placements.js'
import { getProviders } from '../api/providers.js'
import JsonSchemaForm from '../components/JsonSchemaForm.vue'
import ConfirmModal from '../components/ConfirmModal.vue'

// --- State ---
const placements = ref([])
const providers = ref([])
const loading = ref(false)
const error = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = 20
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const filters = ref({ name: '', visible_on_ui: '' })
const toast = ref('')
let toastTimer = null

// Modal
const modal = ref({ show: false, isEdit: false, id: null })
const form = ref(emptyForm())
const saving = ref(false)
const modalError = ref('')

const deleteTarget = ref(null)

// --- Computed ---
const selectedProvider = computed(() =>
  providers.value.find(p => p.id === form.value.provider_id) ?? null
)
const selectedProviderRules = computed(() => selectedProvider.value?.rules ?? {})

// --- Helpers ---
function emptyForm() {
  return { name: '', provider_id: '', visible_on_ui: true, requires_wrap: false, backup: false, provider_resources: {} }
}

function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
}

// --- Data loading ---
async function loadProviders() {
  try {
    const res = await getProviders(1, -1)
    const items = res?.data?.items ?? res?.data ?? []
    providers.value = Array.isArray(items) ? items.sort((a, b) => a.id - b.id) : []
  } catch (_) {}
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    // The API's `name` param matches exactly, so for a "contains" search we
    // pull the whole list and filter + paginate client-side instead.
    const search = filters.value.name.trim().toLowerCase()
    const params = search
      ? { page: 1, page_size: -1 }
      : { page: page.value, page_size: pageSize }
    if (filters.value.visible_on_ui !== '') params.visible_on_ui = filters.value.visible_on_ui
    const res = await getPlacements(params)
    const items = res?.data?.items ?? res?.data ?? []
    let list = Array.isArray(items) ? [...items].sort((a, b) => a.id - b.id) : []

    if (search) {
      list = list.filter(p => (p.name ?? '').toLowerCase().includes(search))
      total.value = list.length
      // Clamp the page in case the match count shrank below the current page
      const maxPage = Math.max(1, Math.ceil(list.length / pageSize))
      if (page.value > maxPage) page.value = maxPage
      const start = (page.value - 1) * pageSize
      list = list.slice(start, start + pageSize)
    } else {
      total.value = res?.data?.total ?? list.length
    }

    placements.value = list
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}

function clearFilters() {
  filters.value = { name: '', visible_on_ui: '' }
  page.value = 1
  load()
}

// --- Modal ---
function openCreate() {
  form.value = emptyForm()
  modal.value = { show: true, isEdit: false, id: null }
  modalError.value = ''
}

function openEdit(p) {
  form.value = {
    name: p.name,
    provider_id: p.provider_id,
    visible_on_ui: p.visible_on_ui,
    requires_wrap: p.requires_wrap,
    backup: p.backup,
    provider_resources: { ...(p.provider_resources || {}) },
  }
  modal.value = { show: true, isEdit: true, id: p.id }
  modalError.value = ''
}

function closeModal() {
  modal.value.show = false
}

function onProviderChange() {
  // Reset provider_resources when provider changes (schema changed)
  form.value.provider_resources = {}
}

async function save() {
  if (!form.value.name.trim()) { modalError.value = 'Name is required.'; return }
  if (!form.value.provider_id) { modalError.value = 'Please select a provider.'; return }

  saving.value = true
  modalError.value = ''
  try {
    const payload = {
      name: form.value.name.trim(),
      provider_id: form.value.provider_id,
      visible_on_ui: form.value.visible_on_ui,
      requires_wrap: form.value.requires_wrap,
      backup: form.value.backup,
      provider_resources: form.value.provider_resources,
    }
    if (modal.value.isEdit) {
      await updatePlacement(modal.value.id, payload)
      showToast('Placement updated successfully.')
    } else {
      await createPlacement(payload)
      showToast('Placement created successfully.')
    }
    closeModal()
    load()
  } catch (e) {
    modalError.value = e.message
  } finally {
    saving.value = false
  }
}

// --- Delete ---
function confirmDelete(p) {
  deleteTarget.value = p
}

async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await deletePlacement(deleteTarget.value.id)
    showToast('Placement deleted.')
    deleteTarget.value = null
    load()
  } catch (e) {
    error.value = e.message
    deleteTarget.value = null
  }
}

onMounted(() => {
  loadProviders()
  load()
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(1rem); }
</style>
