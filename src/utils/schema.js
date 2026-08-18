// Bridge between a JSON Schema (what the backend stores in `provider.rules`)
// and the flat, editable field tree the SchemaBuilder UI works with.
//
// A field node looks like:
//   { id, name, type, required, description, enumValues, itemType, children, extra }
//
// `extra` keeps any schema keyword we don't render a control for (pattern,
// minimum, format, $comment, …) so editing a provider in the builder never
// silently drops constraints it doesn't understand.

export const FIELD_TYPES = ['string', 'integer', 'number', 'boolean', 'object', 'array']
export const ITEM_TYPES = ['string', 'integer', 'number', 'boolean', 'object']

// Keywords the builder owns; everything else round-trips through `extra`.
const OWNED_KEYS = ['type', 'description', 'enum', 'properties', 'required', 'items']

let seq = 0
const uid = () => `f${++seq}`

function pickExtra(schema) {
  const extra = {}
  for (const [k, v] of Object.entries(schema || {})) {
    if (!OWNED_KEYS.includes(k)) extra[k] = v
  }
  return extra
}

export function newField(name = '') {
  return {
    id: uid(),
    name,
    type: 'string',
    required: false,
    description: '',
    enumValues: '',
    itemType: 'string',
    children: [],
    extra: {},
  }
}

export function blankSchema() {
  return { type: 'object', properties: {} }
}

/** Root-level keywords the builder doesn't own (title, additionalProperties, …). */
export function schemaExtras(schema) {
  return pickExtra(schema)
}

/** JSON Schema → ordered list of field nodes. */
export function schemaToFields(schema) {
  const properties = schema?.properties || {}
  const required = Array.isArray(schema?.required) ? schema.required : []
  return Object.entries(properties).map(([name, sub]) => fieldFromSchema(name, sub, required.includes(name)))
}

function fieldFromSchema(name, schema, required) {
  const raw = schema && typeof schema === 'object' ? schema : {}
  const type = FIELD_TYPES.includes(raw.type) ? raw.type : 'string'

  const field = {
    ...newField(name),
    type,
    required,
    description: typeof raw.description === 'string' ? raw.description : '',
    enumValues: Array.isArray(raw.enum) ? raw.enum.join(', ') : '',
    extra: pickExtra(raw),
  }

  if (type === 'object') {
    field.children = schemaToFields(raw)
  } else if (type === 'array') {
    const items = raw.items && typeof raw.items === 'object' ? raw.items : {}
    field.itemType = ITEM_TYPES.includes(items.type) ? items.type : 'string'
    if (field.itemType === 'object') field.children = schemaToFields(items)
    // The item schema's own extras live on the item, not the field — keep them.
    field.itemExtra = pickExtra(items)
    field.itemDescription = typeof items.description === 'string' ? items.description : ''
  }

  return field
}

function parseEnum(text) {
  return String(text || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean)
}

/** Ordered field nodes → JSON Schema object. */
export function fieldsToSchema(fields, extras = {}) {
  const properties = {}
  const required = []

  for (const field of fields || []) {
    const name = (field.name || '').trim()
    if (!name) continue          // half-typed rows never reach the payload
    properties[name] = fieldToSchema(field)
    if (field.required) required.push(name)
  }

  const schema = { ...extras, type: 'object', properties }
  if (required.length) schema.required = required
  return schema
}

function fieldToSchema(field) {
  if (field.type === 'object') {
    const schema = fieldsToSchema(field.children, field.extra)
    if (field.description?.trim()) schema.description = field.description.trim()
    return schema
  }

  if (field.type === 'array') {
    const items = field.itemType === 'object'
      ? fieldsToSchema(field.children, field.itemExtra || {})
      : { ...(field.itemExtra || {}), type: field.itemType }
    if (field.itemDescription?.trim()) items.description = field.itemDescription.trim()

    const schema = { ...field.extra, type: 'array', items }
    if (field.description?.trim()) schema.description = field.description.trim()
    return schema
  }

  const schema = { ...field.extra, type: field.type }
  const values = parseEnum(field.enumValues)
  if (field.type === 'string' && values.length) schema.enum = values
  if (field.description?.trim()) schema.description = field.description.trim()
  return schema
}

/**
 * Collect human-readable problems (blank names, duplicates) across the tree.
 * `path` prefixes nested errors so "region" and "network.region" read apart.
 */
export function validateFields(fields, path = '') {
  const errors = []
  const seen = new Set()

  for (const field of fields || []) {
    const name = (field.name || '').trim()
    const label = path ? `${path}.${name || '(unnamed)'}` : (name || '(unnamed)')

    if (!name) {
      errors.push(`${path ? `${path}: ` : ''}a property is missing a name.`)
    } else if (seen.has(name)) {
      errors.push(`Duplicate property "${label}".`)
    } else {
      seen.add(name)
    }

    const nests = field.type === 'object' || (field.type === 'array' && field.itemType === 'object')
    if (nests) errors.push(...validateFields(field.children, label))
  }

  return errors
}

/** Names already used by siblings — the builder highlights these inline. */
export function duplicateNames(fields) {
  const counts = new Map()
  for (const field of fields || []) {
    const name = (field.name || '').trim()
    if (name) counts.set(name, (counts.get(name) || 0) + 1)
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name))
}

/** One-line summary for the provider table, e.g. "3 props · 1 required". */
export function describeSchema(schema) {
  const count = Object.keys(schema?.properties || {}).length
  const required = Array.isArray(schema?.required) ? schema.required.length : 0
  if (!count) return 'No properties'
  return `${count} ${count === 1 ? 'property' : 'properties'}${required ? ` · ${required} required` : ''}`
}
