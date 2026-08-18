<template>
  <div class="p-8">
    <!-- Header -->
    <div class="mb-8 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Providers</h1>
        <p class="text-gray-500 text-sm mt-1">Manage providers and the validation rules their placements follow.</p>
      </div>
      <button class="btn-primary btn" @click="openCreate">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        New Provider
      </button>
    </div>

    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 flex flex-wrap gap-3 items-end">
      <div class="flex-1 min-w-48">
        <label class="label">Search by name</label>
        <input v-model="search" class="input" placeholder="e.g. openstack" />
      </div>
      <button class="btn-ghost btn" @click="search = ''">Clear</button>
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

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50/50">
              <th class="text-left px-5 py-3 font-medium text-gray-500 w-16">ID</th>
              <th class="text-left px-5 py-3 font-medium text-gray-500">Name</th>
              <th class="text-left px-5 py-3 font-medium text-gray-500">Rules</th>
              <th class="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-if="providers.length === 0">
              <td colspan="4" class="text-center py-12 text-gray-400">No providers found.</td>
            </tr>
            <tr v-for="p in providers" :key="p.id" class="hover:bg-gray-50/60 transition-colors">
              <td class="px-5 py-3.5 text-gray-400 font-mono text-xs">{{ p.id }}</td>
              <td class="px-5 py-3.5 font-medium text-gray-900">{{ p.name }}</td>
              <td class="px-5 py-3.5">
                <button class="badge bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors" @click="showRules(p)">
                  {{ describeSchema(p.rules) }}
                </button>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="flex gap-1.5 justify-end">
                  <button class="btn-ghost btn btn-sm" title="Edit" @click="openEdit(p)">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                    </svg>
                    Edit
                  </button>
                  <button class="btn btn-sm text-red-500 hover:bg-red-50 focus:ring-red-400" title="Delete" @click="deleteTarget = p">
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
    </div>

    <!-- Create / Edit modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="modal.show" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/40" @click="closeModal" />
          <div class="relative bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 class="font-semibold text-gray-900">{{ modal.isEdit ? 'Edit Provider' : 'New Provider' }}</h2>
              <button class="btn-ghost btn btn-sm" @click="closeModal">✕</button>
            </div>

            <div class="overflow-y-auto px-6 py-5 space-y-4">
              <!-- Name -->
              <div>
                <label class="label">Name <span class="text-red-500">*</span></label>
                <input v-model="form.name" class="input" placeholder="e.g. openstack-dc1" />
              </div>

              <!-- Rules editor -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="label mb-0">Rules</label>
                  <div class="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                    <button
                      v-for="t in ['builder', 'json']"
                      :key="t"
                      class="px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors"
                      :class="tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
                      @click="switchTab(t)"
                    >{{ t }}</button>
                  </div>
                </div>
                <p class="text-xs text-gray-400 mb-3">
                  These properties become the form fields shown when a placement picks this provider.
                </p>

                <!-- Builder -->
                <template v-if="tab === 'builder'">
                  <SchemaBuilder :fields="fields" />
                  <details class="mt-3 rounded-lg border border-gray-200 bg-gray-50">
                    <summary class="cursor-pointer select-none px-3 py-2 text-xs font-medium text-gray-500">Preview generated JSON Schema</summary>
                    <pre class="px-3 pb-3 text-xs font-mono text-gray-700 whitespace-pre-wrap break-all">{{ preview }}</pre>
                  </details>
                </template>

                <!-- Raw JSON -->
                <template v-else>
                  <textarea
                    v-model="jsonText"
                    rows="16"
                    class="input resize-y font-mono text-xs"
                    :class="{ 'border-red-400 focus:ring-red-400': jsonError }"
                    placeholder='{"type": "object", "properties": {}}'
                  />
                  <p v-if="jsonError" class="text-xs text-red-500 mt-1">{{ jsonError }}</p>
                </template>
              </div>

              <div v-if="modalError" class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {{ modalError }}
              </div>
            </div>

            <div class="flex gap-3 justify-end px-6 py-4 border-t border-gray-100">
              <button class="btn-ghost btn" @click="closeModal">Cancel</button>
              <button class="btn-primary btn" :disabled="saving" @click="save">
                <svg v-if="saving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {{ modal.isEdit ? 'Save changes' : 'Create provider' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Read-only rules viewer -->
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

    <!-- Confirm delete -->
    <ConfirmModal
      :show="deleteTarget !== null"
      title="Delete provider?"
      :message="`'${deleteTarget?.name}' will be permanently removed. Placements using it may break.`"
      @confirm="doDelete"
      @cancel="deleteTarget = null"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getProviders, createProvider, updateProvider, deleteProvider } from '../api/providers.js'
import SchemaBuilder from '../components/SchemaBuilder.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import {
  blankSchema, schemaToFields, schemaExtras, fieldsToSchema, validateFields, describeSchema,
} from '../utils/schema.js'

// --- State ---
const allProviders = ref([])
const loading = ref(false)
const error = ref('')
const search = ref('')
const toast = ref('')
let toastTimer = null

const modal = ref({ show: false, isEdit: false, id: null })
const form = ref({ name: '' })
const saving = ref(false)
const modalError = ref('')

// The rules editor has two faces over the same schema: the field tree the
// builder mutates in place, and the raw JSON text. `tab` says which one is live.
const tab = ref('builder')
const fields = ref([])
const rootExtras = ref({})
const jsonText = ref('')
const jsonError = ref('')

const deleteTarget = ref(null)
const rulesModal = ref({ show: false, name: '', rules: {} })

// --- Computed ---
const providers = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return allProviders.value
  return allProviders.value.filter(p => (p.name ?? '').toLowerCase().includes(term))
})
const total = computed(() => providers.value.length)
const preview = computed(() => JSON.stringify(fieldsToSchema(fields.value, rootExtras.value), null, 2))

// --- Helpers ---
function showToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 3000)
}

/** Load a schema into both editor faces so switching tabs is lossless. */
function loadRules(rules) {
  const schema = rules && typeof rules === 'object' && !Array.isArray(rules) ? rules : blankSchema()
  fields.value = schemaToFields(schema)
  rootExtras.value = schemaExtras(schema)
  jsonText.value = JSON.stringify(schema, null, 2)
  jsonError.value = ''
  tab.value = 'builder'
}

function switchTab(next) {
  if (next === tab.value) return
  if (next === 'json') {
    jsonText.value = preview.value
    jsonError.value = ''
  } else {
    try {
      const parsed = JSON.parse(jsonText.value || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Rules must be a JSON object.')
      fields.value = schemaToFields(parsed)
      rootExtras.value = schemaExtras(parsed)
      jsonError.value = ''
    } catch (e) {
      jsonError.value = `Can't switch to the builder — ${e.message}`
      return
    }
  }
  tab.value = next
}

/** The schema as the currently active tab defines it. Throws on bad JSON. */
function currentRules() {
  if (tab.value === 'json') {
    const parsed = JSON.parse(jsonText.value || '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Rules must be a JSON object.')
    return parsed
  }
  return fieldsToSchema(fields.value, rootExtras.value)
}

// --- Data loading ---
async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await getProviders(1, -1)
    const items = res?.data?.items ?? res?.data ?? []
    allProviders.value = Array.isArray(items) ? [...items].sort((a, b) => a.id - b.id) : []
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// --- Modal ---
function openCreate() {
  form.value = { name: '' }
  loadRules(blankSchema())
  modal.value = { show: true, isEdit: false, id: null }
  modalError.value = ''
}

function openEdit(p) {
  form.value = { name: p.name }
  loadRules(p.rules)
  modal.value = { show: true, isEdit: true, id: p.id }
  modalError.value = ''
}

function closeModal() {
  modal.value.show = false
}

function showRules(p) {
  rulesModal.value = { show: true, name: p.name, rules: p.rules ?? {} }
}

async function save() {
  if (!form.value.name.trim()) { modalError.value = 'Name is required.'; return }

  if (tab.value === 'builder') {
    const problems = validateFields(fields.value)
    if (problems.length) { modalError.value = problems.join(' '); return }
  }

  let rules
  try {
    rules = currentRules()
  } catch (e) {
    modalError.value = `Invalid JSON: ${e.message}`
    return
  }

  saving.value = true
  modalError.value = ''
  try {
    const payload = { name: form.value.name.trim(), rules }
    if (modal.value.isEdit) {
      await updateProvider(modal.value.id, payload)
      showToast('Provider updated successfully.')
    } else {
      await createProvider(payload)
      showToast('Provider created successfully.')
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
async function doDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteProvider(deleteTarget.value.id)
    showToast('Provider deleted.')
    load()
  } catch (e) {
    error.value = e.message
  } finally {
    deleteTarget.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: all 0.2s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateY(1rem); }
</style>
