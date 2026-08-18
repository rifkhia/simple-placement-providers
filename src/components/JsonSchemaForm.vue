<template>
  <div class="space-y-4">
    <!-- Schema has properties: render a field per property -->
    <template v-if="hasProperties">
      <div v-for="(propSchema, key) in properties" :key="key">

        <!-- Nested object with its own properties → recurse -->
        <template v-if="propSchema.type === 'object' && propSchema.properties">
          <div class="rounded-lg border border-gray-200 overflow-hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ key }}</span>
              <span v-if="isRequired(key)" class="text-red-500 text-xs">*</span>
              <span class="text-xs text-gray-400">(object)</span>
            </div>
            <div class="p-3">
              <JsonSchemaForm
                :schema="propSchema"
                :modelValue="modelValue[key] || {}"
                :depth="depth + 1"
                @update:modelValue="update(key, $event)"
              />
            </div>
          </div>
        </template>

        <!-- Array → a repeatable list of item editors -->
        <template v-else-if="propSchema.type === 'array'">
          <div class="rounded-lg border border-gray-200 overflow-hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
              <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">{{ key }}</span>
              <span v-if="isRequired(key)" class="text-red-500 text-xs">*</span>
              <span class="text-xs text-gray-400">(list of {{ propSchema.items?.type || 'any' }})</span>
            </div>
            <div class="p-3 space-y-2">
              <p v-if="propSchema.description" class="text-xs text-gray-400">{{ propSchema.description }}</p>
              <p v-if="!items(key).length" class="text-xs text-gray-400">No entries yet.</p>

              <div v-for="(item, idx) in items(key)" :key="idx" class="flex items-start gap-2">
                <div class="flex-1">
                  <!-- Object items recurse; scalars get a single input -->
                  <JsonSchemaForm
                    v-if="propSchema.items?.type === 'object' && propSchema.items?.properties"
                    :schema="propSchema.items"
                    :modelValue="item || {}"
                    :depth="depth + 1"
                    @update:modelValue="setItem(key, idx, $event)"
                  />
                  <input
                    v-else
                    :type="propSchema.items?.type === 'integer' || propSchema.items?.type === 'number' ? 'number' : 'text'"
                    :value="item"
                    @input="setItem(key, idx, coerce(propSchema.items, $event.target.value))"
                    class="input"
                    :placeholder="`${key} #${idx + 1}`"
                  />
                </div>
                <button
                  class="btn btn-sm px-2 text-red-500 hover:bg-red-50 focus:ring-red-400"
                  title="Remove entry"
                  @click="removeItem(key, idx)"
                >✕</button>
              </div>

              <button class="btn-ghost btn btn-sm" @click="addItem(key, propSchema.items)">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add {{ key }}
              </button>
            </div>
          </div>
        </template>

        <!-- Scalar fields -->
        <template v-else>
          <label class="label">
            {{ key }}
            <span v-if="isRequired(key)" class="text-red-500 ml-0.5">*</span>
            <span class="text-xs font-normal text-gray-400 ml-1">({{ propSchema.type || 'any' }})</span>
          </label>
          <p v-if="propSchema.description" class="text-xs text-gray-400 mb-1">{{ propSchema.description }}</p>

          <!-- Boolean -->
          <div v-if="propSchema.type === 'boolean'" class="flex items-center gap-2">
            <input
              type="checkbox"
              :id="`${depth}-${key}`"
              :checked="modelValue[key]"
              @change="update(key, $event.target.checked)"
              class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label :for="`${depth}-${key}`" class="text-sm text-gray-600 cursor-pointer">{{ key }}</label>
          </div>

          <!-- Enum -->
          <select
            v-else-if="propSchema.enum"
            :value="modelValue[key]"
            @change="update(key, $event.target.value)"
            class="input"
          >
            <option value="">-- select --</option>
            <option v-for="opt in propSchema.enum" :key="opt" :value="opt">{{ opt }}</option>
          </select>

          <!-- Number / Integer -->
          <input
            v-else-if="propSchema.type === 'number' || propSchema.type === 'integer'"
            type="number"
            :value="modelValue[key]"
            @input="update(key, coerce(propSchema, $event.target.value))"
            :required="isRequired(key)"
            :min="propSchema.minimum"
            :max="propSchema.maximum"
            class="input"
            :placeholder="key"
          />

          <!-- String multiline -->
          <textarea
            v-else-if="propSchema.type === 'string' && propSchema.format === 'multiline'"
            :value="modelValue[key]"
            @input="update(key, $event.target.value)"
            :required="isRequired(key)"
            rows="3"
            class="input resize-none"
            :placeholder="key"
          />

          <!-- Default: text -->
          <input
            v-else
            type="text"
            :value="modelValue[key]"
            @input="update(key, $event.target.value)"
            :required="isRequired(key)"
            :pattern="propSchema.pattern"
            class="input"
            :placeholder="propSchema.examples?.[0] ?? key"
          />
        </template>
      </div>
    </template>

    <!-- No properties defined: raw JSON textarea -->
    <template v-else>
      <label class="label">
        provider_resources (JSON)
        <span class="text-xs font-normal text-gray-400 ml-1">— no schema properties defined</span>
      </label>
      <textarea
        :value="rawJson"
        @input="onRawJsonInput($event.target.value)"
        rows="5"
        class="input resize-y font-mono text-xs"
        :class="{ 'border-red-400 focus:ring-red-400': jsonError }"
        placeholder='{"key": "value"}'
      />
      <p v-if="jsonError" class="text-xs text-red-500 mt-1">{{ jsonError }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  schema:     { type: Object, default: () => ({}) },
  modelValue: { type: Object, default: () => ({}) },
  depth:      { type: Number, default: 0 },
})
const emit = defineEmits(['update:modelValue'])

const properties     = computed(() => props.schema?.properties || {})
const hasProperties  = computed(() => Object.keys(properties.value).length > 0)
const requiredFields = computed(() => props.schema?.required || [])
const isRequired     = (key) => requiredFields.value.includes(key)

function update(key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

/** Keep the typed value in the shape the schema asks for; blank stays blank. */
function coerce(schema, raw) {
  if (raw === '') return ''
  if (schema?.type === 'integer') return parseInt(raw, 10)
  if (schema?.type === 'number') return parseFloat(raw)
  return raw
}

// --- Array items ---
const items = (key) => Array.isArray(props.modelValue[key]) ? props.modelValue[key] : []

function setItem(key, idx, value) {
  const next = [...items(key)]
  next[idx] = value
  update(key, next)
}

function addItem(key, itemSchema) {
  const blank = itemSchema?.type === 'object' ? {}
    : itemSchema?.type === 'boolean' ? false
    : ''
  update(key, [...items(key), blank])
}

function removeItem(key, idx) {
  update(key, items(key).filter((_, i) => i !== idx))
}

// Raw JSON fallback
const rawJson  = ref(JSON.stringify(props.modelValue || {}, null, 2))
const jsonError = ref('')

watch(() => props.modelValue, (val) => {
  if (!hasProperties.value) rawJson.value = JSON.stringify(val || {}, null, 2)
}, { deep: true })

function onRawJsonInput(val) {
  rawJson.value = val
  try {
    const parsed = JSON.parse(val)
    jsonError.value = ''
    emit('update:modelValue', parsed)
  } catch (e) {
    jsonError.value = 'Invalid JSON: ' + e.message
  }
}
</script>
