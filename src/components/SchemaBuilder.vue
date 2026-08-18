<template>
  <div class="space-y-2">
    <div v-if="!fields.length" class="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-center text-sm text-gray-400">
      No properties yet.
    </div>

    <div
      v-for="(field, i) in fields"
      :key="field.id"
      class="rounded-lg border bg-white"
      :class="dupes.has(field.name.trim()) ? 'border-red-300' : 'border-gray-200'"
    >
      <!-- Main row: name, type, mandatory -->
      <div class="flex flex-wrap items-end gap-2 px-3 py-2.5">
        <div class="flex-1 min-w-40">
          <label class="label mb-1 text-xs">Property name</label>
          <input
            v-model="field.name"
            class="input"
            :class="{ 'border-red-400': dupes.has(field.name.trim()) }"
            placeholder="e.g. region"
          />
        </div>

        <div class="w-32">
          <label class="label mb-1 text-xs">Type</label>
          <select v-model="field.type" class="input" @change="onTypeChange(field)">
            <option v-for="t in FIELD_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <div v-if="field.type === 'array'" class="w-32">
          <label class="label mb-1 text-xs">Item type</label>
          <select v-model="field.itemType" class="input" @change="onTypeChange(field)">
            <option v-for="t in ITEM_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>

        <label class="flex items-center gap-2 h-[38px] px-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            v-model="field.required"
            class="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-gray-600">Mandatory</span>
        </label>

        <div class="flex items-center gap-0.5 h-[38px]">
          <button
            class="btn-ghost btn btn-sm px-2"
            :title="open.has(field.id) ? 'Hide details' : 'Description, allowed values'"
            @click="toggle(field.id)"
          >
            <svg class="w-3.5 h-3.5 transition-transform" :class="{ 'rotate-180': open.has(field.id) }"
                 fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <button class="btn-ghost btn btn-sm px-2" title="Move up" :disabled="i === 0" @click="move(i, -1)">↑</button>
          <button class="btn-ghost btn btn-sm px-2" title="Move down" :disabled="i === fields.length - 1" @click="move(i, 1)">↓</button>
          <button class="btn btn-sm px-2 text-red-500 hover:bg-red-50 focus:ring-red-400" title="Remove property" @click="remove(i)">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Details: description + enum -->
      <div v-if="open.has(field.id)" class="px-3 pb-3 pt-1 border-t border-gray-100 space-y-2">
        <div>
          <label class="label mb-1 text-xs">Description</label>
          <input v-model="field.description" class="input" placeholder="Shown as a hint on the placement form" />
        </div>
        <div v-if="field.type === 'string'">
          <label class="label mb-1 text-xs">Allowed values</label>
          <input v-model="field.enumValues" class="input" placeholder="comma separated — e.g. small, medium, large" />
          <p class="text-xs text-gray-400 mt-1">Leave empty for a free-text field; fill it in to get a dropdown.</p>
        </div>
      </div>

      <!-- Nested properties for objects (and arrays of objects) -->
      <div v-if="nests(field)" class="border-t border-gray-100 bg-gray-50/60 px-3 py-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {{ field.type === 'array' ? 'Properties of each item' : 'Properties' }}
          </span>
          <button class="btn-ghost btn btn-sm" @click="addChild(field)">+ Add property</button>
        </div>
        <div class="pl-3 border-l-2 border-gray-200">
          <SchemaBuilder :fields="field.children" />
        </div>
      </div>
    </div>

    <button class="btn-ghost btn btn-sm border border-dashed border-gray-300 w-full justify-center" @click="add">
      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      Add property
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { FIELD_TYPES, ITEM_TYPES, newField, duplicateNames } from '../utils/schema.js'

// `fields` is edited in place — the array and its nodes are the shared source of
// truth, which keeps renames, reordering and nesting free of v-model plumbing.
const props = defineProps({
  fields: { type: Array, required: true },
})

const open = ref(new Set())
const dupes = computed(() => duplicateNames(props.fields))

const nests = (field) => field.type === 'object' || (field.type === 'array' && field.itemType === 'object')

function toggle(id) {
  const next = new Set(open.value)
  next.has(id) ? next.delete(id) : next.add(id)
  open.value = next
}

function add() {
  props.fields.push(newField())
}

function addChild(field) {
  field.children.push(newField())
}

function remove(i) {
  props.fields.splice(i, 1)
}

function move(i, delta) {
  const target = i + delta
  if (target < 0 || target >= props.fields.length) return
  const [field] = props.fields.splice(i, 1)
  props.fields.splice(target, 0, field)
}

function onTypeChange(field) {
  // Children are kept when switching away from `object` so flipping the type
  // back and forth doesn't throw away nested work; they're simply not emitted.
  if (nests(field) && field.children.length === 0) field.children.push(newField())
}
</script>
