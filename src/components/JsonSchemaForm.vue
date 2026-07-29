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
                @update:modelValue="update(key, $event)"
              />
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
            @input="update(key, propSchema.type === 'integer' ? parseInt($event.target.value) : parseFloat($event.target.value))"
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
