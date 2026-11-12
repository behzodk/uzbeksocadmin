const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

// Load the actual TypeScript modules without Next.js or a live database.
function loadModule(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8")
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function("require", "module", "exports", code)((name) => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name]
    throw new Error(`Unexpected dependency: ${name}`)
  }, module, module.exports)
  return module.exports
}

const validation = loadModule("lib/form-validation.ts")
const { validateFormField: validate } = validation
const base = { id: "answer", key: "answer", label: "Answer", type: "text", required: true }
const field = (overrides) => ({ ...base, ...overrides })

const cases = [
  ["null limits allow normal text", {}, "Alice", null],
  ["required text rejects whitespace", {}, "  ", "required"],
  ["text rejects object", {}, {}, "valid text"],
  ["minimum is enforced", { min_count: 6 }, "Alice", "at least"],
  ["maximum is enforced", { max_count: 4 }, "Alice", "no more"],
  ["zero maximum is enforced", { max_count: 0 }, "A", "no more"],
  ["exact boundary is accepted", { min_count: 5, max_count: 5 }, "Alice", null],
  ["required email", { type: "email" }, "", "required"],
  ["invalid email", { type: "email" }, "bad", "valid email"],
  ["valid email", { type: "email" }, "alice@example.com", null],
  ["student domain enforced", { type: "email", is_student_email: true }, "alice@example.com", "student.bham.ac.uk"],
  ["student address accepted", { type: "email", is_student_email: true }, "Alice@STUDENT.BHAM.AC.UK", null],
  ["select rejects unknown option", { type: "select", options: ["A", "B"] }, "C", "valid option"],
  ["select accepts option", { type: "select", options: ["A", "B"] }, "A", null],
  ["multi-select rejects unknown option", { type: "multi_select", options: ["A"] }, ["B"], "valid options"],
  ["multi-select rejects duplicate", { type: "multi_select", options: ["A"] }, ["A", "A"], "duplicates"],
  ["multi-select rejects wrong type", { type: "multi_select", options: ["A"] }, "A", "valid options"],
  ["multi-select minimum enforced", { type: "multi_select", options: ["A", "B"], min_count: 2 }, ["A"], "at least"],
  ["ranked valid ordering", { type: "multi_select", is_ranked: true, options: ["A", "B"] }, ["B", "A"], null],
  ["rating required", { type: "rating" }, null, "rating"],
  ["rating rejects string", { type: "rating" }, "3", "valid rating"],
  ["rating rejects NaN", { type: "rating" }, NaN, "valid rating"],
  ["rating rejects infinity", { type: "rating" }, Infinity, "valid rating"],
  ["rating rejects out of range", { type: "rating", scale_min: 1, scale_max: 5 }, 6, "between"],
  ["rating rejects fractions", { type: "rating" }, 2.5, "whole number"],
  ["rating allows configured fractions", { type: "rating", allow_float: true }, 2.5, null],
  ["required boolean rejects false", { type: "boolean" }, false, "required"],
  ["boolean rejects string", { type: "boolean" }, "true", "valid checkbox"],
  ["optional false accepted", { type: "boolean", required: false }, false, null],
  ["required image rejects missing", { type: "image" }, null, "image"],
  ["image rejects invalid object", { type: "image" }, {}, "valid image"],
  ["image rejects unsafe URL", { type: "image" }, { url: "javascript:alert(1)" }, "valid image"],
  ["uploaded image accepted", { type: "image" }, { url: "https://example.com/image.jpg", path: "forms/image.jpg" }, null],
]
for (const [name, overrides, value, expected] of cases) {
  test(name, () => {
    const error = validate(field({ min_count: null, max_count: null, ...overrides }), value)
    if (expected === null) assert.equal(error, null)
    else assert.ok(error?.includes(expected), error)
  })
}

test("browser username and API full address use equivalent email rules", () => {
  const student = field({ type: "email", is_student_email: true })
  assert.equal(validate(student, "alice", { studentEmailMode: "username" }), null)
  assert.equal(validate(student, "alice@student.bham.ac.uk"), null)
  assert.ok(validate(student, "alice other", { studentEmailMode: "username" }))
  assert.ok(validate(student, "alice@example.com", { studentEmailMode: "username" }))
})

test("browser validates selected images before upload", () => {
  assert.equal(validate(field({ type: "image" }), undefined, { hasSelectedImage: true }), null)
  assert.ok(validate(field({ type: "image" }), undefined, { hasSelectedImage: false }))
})

function routeHarness(fields) {
  const inserts = []
  const route = loadModule("app/api/forms/[id]/submit/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    zod: require("zod"),
    "@/lib/form-schema": loadModule("lib/form-schema.ts"),
    "@/lib/form-validation": validation,
    "@/lib/public-forms": {
      getPublicFormById: async () => ({ id: "form-id", is_active: true, schema: { fields } }),
      isPublicFormFull: () => false,
    },
    "@/lib/supabase/admin": {
      getSupabaseAdminClient: () => ({ from: () => ({ insert: async (row) => { inserts.push(row); return { error: null } } }) }),
    },
  })
  return {
    inserts,
    submit: (answers) => route.POST({ json: async () => ({ answers }) }, { params: Promise.resolve({ id: "form-id" }) }),
  }
}

test("API rejects invalid answers without inserting and returns field errors", async () => {
  const harness = routeHarness([
    field({ key: "name" }), field({ key: "email", type: "email" }),
    field({ key: "choice", type: "select", options: ["A"] }), field({ key: "rating", type: "rating" }),
  ])
  const result = await harness.submit({ email: "invalid", choice: "B", rating: 99 })
  assert.equal(result.status, 400)
  assert.deepEqual(Object.keys(result.body.errors), ["name", "email", "choice", "rating"])
  assert.equal(harness.inserts.length, 0)
})

test("API accepts valid answers, normalizes them and omits hidden/content/unknown fields", async () => {
  const harness = routeHarness([
    field({ key: "name", max_count: null }), field({ key: "email", type: "email" }),
    field({ key: "choice", type: "select", options: ["No", "Yes"] }),
    field({ key: "hidden", conditional: { field_key: "choice", option: "Yes" } }),
    field({ key: "content", type: "content" }),
  ])
  const result = await harness.submit({ name: " Alice ", email: "ALICE@EXAMPLE.COM", choice: "No", hidden: {}, content: "ignored", unknown: "ignored" })
  assert.equal(result.status, 200)
  assert.equal(harness.inserts.length, 1)
  assert.deepEqual(harness.inserts[0].answers, { name: "Alice", email: "alice@example.com", choice: "No" })
})

test("API enforces required conditional field when visible", async () => {
  const harness = routeHarness([
    field({ key: "choice", type: "select", options: ["Yes"] }),
    field({ key: "detail", conditional: { field_key: "choice", option: "Yes" } }),
  ])
  assert.equal((await harness.submit({ choice: "Yes" })).status, 400)
  assert.equal(harness.inserts.length, 0)
})

const { getVisibleFormFields } = loadModule("lib/form-schema.ts")
const chain = [
  field({ key: "root", type: "select", options: ["Yes", "No"] }),
  field({ key: "child", type: "select", options: ["Yes", "No"], conditional: { field_key: "root", option: "Yes" } }),
  field({ key: "grandchild", conditional: { field_key: "child", option: "Yes" } }),
  field({ key: "greatGrandchild", conditional: { field_key: "grandchild", option: "Yes" } }),
]

test("hiding a parent hides all descendants despite retained answers", () => {
  assert.deepEqual(getVisibleFormFields(chain, { root: "No", child: "Yes", grandchild: "Yes" }).map((f) => f.key), ["root"])
})

test("all matching ancestors reveal a deep conditional chain", () => {
  assert.deepEqual(getVisibleFormFields(chain, { root: "Yes", child: "Yes", grandchild: "Yes" }).map((f) => f.key), chain.map((f) => f.key))
})

test("a non-matching intermediate answer hides only its descendants", () => {
  assert.deepEqual(getVisibleFormFields(chain, { root: "Yes", child: "No", grandchild: "Yes" }).map((f) => f.key), ["root", "child"])
})

test("missing parents, forward references, and cycles remain hidden", () => {
  const malformed = [
    field({ key: "missing", conditional: { field_key: "absent", option: "Yes" } }),
    field({ key: "a", conditional: { field_key: "b", option: "Yes" } }),
    field({ key: "b", conditional: { field_key: "a", option: "Yes" } }),
  ]
  assert.deepEqual(getVisibleFormFields(malformed, { absent: "Yes", a: "Yes", b: "Yes" }), [])
})

test("API ignores required descendants and stale data beneath hidden parents", async () => {
  const harness = routeHarness(chain)
  const result = await harness.submit({ root: "No", child: "Yes", grandchild: {}, greatGrandchild: "stale" })
  assert.equal(result.status, 200)
  assert.deepEqual(harness.inserts[0].answers, { root: "No" })
})

test("API enforces required descendants when all ancestors match", async () => {
  const harness = routeHarness(chain)
  const result = await harness.submit({ root: "Yes", child: "Yes" })
  assert.equal(result.status, 400)
  assert.ok(result.body.errors.grandchild)
  assert.equal(harness.inserts.length, 0)
})
