const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const module = { exports: {} }
  new Function("require", "module", "exports", code)(
    (name) => {
      if (name in dependencies) return dependencies[name]
      throw new Error(`Unexpected import: ${name}`)
    },
    module,
    module.exports,
  )
  return module.exports
}
const { buildPublicResultsRows, buildActivity, buildChoiceSummary, getLondonDay } = load(
  "lib/results-workspace.ts",
  { "@/lib/form-image-storage": load("lib/form-image-storage.ts") },
)
const field = (key, extra = {}) => ({ id: key, key, label: key, type: "text", required: false, ...extra })
const response = (id, date, answers = {}) => ({
  id,
  form_id: "form",
  created_at: date,
  status: "submitted",
  answers,
})
const meta = (key, extra = {}) => ({
  id: key,
  key,
  label: key,
  type: "multi_select",
  isSecure: false,
  isRanked: true,
  ...extra,
})

test("public payload preserves ranked arrays, comma-containing titles, false and zero", () => {
  const fields = [
    field("movies", { type: "multi_select", is_ranked: true }),
    field("consent", { type: "boolean" }),
    field("score", { type: "rating" }),
  ]
  const choices = ["A film, with a comma", "Second choice", "Third choice"]
  const [row] = buildPublicResultsRows(fields, [
    response("one", "2026-11-13T12:00:00Z", { movies: choices, consent: false, score: 0 }),
  ])
  assert.deepEqual(row.choices.movies, choices)
  assert.equal(row.values.consent, "No")
  assert.equal(row.values.score, "0")
})
test("protected scalar, array, and image answers never enter the public payload", () => {
  const fields = [
    field("email", { is_secure: true }),
    field("choices", { type: "multi_select", is_secure: true }),
    field("image", { type: "image", is_secure: true }),
  ]
  const rows = buildPublicResultsRows(fields, [
    response("one", "2026-11-13T12:00:00Z", {
      email: "private@example.com",
      choices: ["secret choice"],
      image: { url: "https://secret.example/photo" },
    }),
  ])
  assert.deepEqual(rows[0].choices, {})
  const payload = JSON.stringify(rows)
  for (const secret of ["private@example.com", "secret choice", "secret.example"])
    assert.ok(!payload.includes(secret))
  assert.equal(rows[0].values.email, "••••••••")
})
test("London calendar days account for BST at the UTC midnight boundary", () => {
  assert.equal(getLondonDay("2026-07-01T23:30:00Z"), "2026-07-02")
  assert.equal(getLondonDay("2026-11-13T23:30:00Z"), "2026-11-13")
})
test("activity fills missing days, accumulates in date order, and identifies peaks", () => {
  const rows = buildPublicResultsRows(
    [],
    [
      response("c", "2026-11-13T19:30:00Z"),
      response("a", "2026-11-11T18:00:00Z"),
      response("b", "2026-11-13T19:00:00Z"),
    ],
  )
  const a = buildActivity(rows, Date.parse("2026-11-13T20:00:00Z"))
  assert.deepEqual(
    a.points.map((p) => p.count),
    [1, 0, 2],
  )
  assert.deepEqual(
    a.points.map((p) => p.cumulative),
    [1, 1, 3],
  )
  assert.equal(a.recent, 2)
  assert.equal(a.latest, "2026-11-13T19:30:00Z")
  assert.deepEqual(a.peakDay, ["2026-11-13", 2])
  assert.equal(a.peakHour, 19)
})
test("the last 24 hours is a rolling window, excluding future records", () => {
  const rows = buildPublicResultsRows(
    [],
    [
      response("a", "2026-11-12T11:59:59Z"),
      response("b", "2026-11-12T12:00:00Z"),
      response("c", "2026-11-12T12:00:01Z"),
      response("d", "2026-11-14T12:00:00Z"),
    ],
  )
  assert.equal(buildActivity(rows, Date.parse("2026-11-13T12:00:00Z")).recent, 1)
})
test("long date ranges use complete monthly buckets including empty months", () => {
  const rows = buildPublicResultsRows(
    [],
    [response("a", "2024-01-31T12:00:00Z"), response("b", "2026-03-03T12:00:00Z")],
  )
  const a = buildActivity(rows, 0)
  assert.equal(a.monthly, true)
  assert.equal(a.points.length, 27)
  assert.equal(a.points[1].count, 0)
  assert.equal(a.points.at(-1).cumulative, 2)
})
test("ranked summaries count first preferences and preserve all rank positions", () => {
  const rows = buildPublicResultsRows(
    [field("movies", { type: "multi_select" })],
    [
      response("a", "2026-11-13T12:00:00Z", { movies: ["B", "A", "C"] }),
      response("b", "2026-11-13T12:00:00Z", { movies: ["A", "C", "B"] }),
    ],
  )
  const a = buildChoiceSummary(meta("movies"), rows)
  assert.equal(a.answered, 2)
  const b = a.options.find((o) => o.label === "B")
  assert.equal(b.count, 1)
  assert.deepEqual(b.positions, [1, 0, 1])
  assert.equal(b.averageRank, 2)
  const c = a.options.find((o) => o.label === "C")
  assert.equal(c.count, 0)
  assert.deepEqual(c.positions, [0, 1, 1])
  assert.equal(c.averageRank, 2.5)
})
test("unranked selections count every choice once per answer and skip missing answers", () => {
  const rows = buildPublicResultsRows(
    [field("choices", { type: "multi_select" })],
    [
      response("a", "2026-11-13T12:00:00Z", { choices: ["A", "B", "A"] }),
      response("b", "2026-11-13T12:00:00Z", {}),
    ],
  )
  const summary = buildChoiceSummary(meta("choices", { isRanked: false }), rows)
  assert.equal(summary.answered, 1)
  assert.deepEqual(
    summary.options.map((o) => o.count),
    [1, 1],
  )
})
test("filtered analytics use exactly the supplied subset, not global totals or page size", () => {
  const rows = buildPublicResultsRows(
    [field("choices", { type: "select" })],
    Array.from({ length: 30 }, (_, i) =>
      response(String(i), "2026-11-13T12:00:00Z", { choices: i < 3 ? "A" : "B" }),
    ),
  )
  const filtered = rows.filter((r) => r.values.choices === "A")
  assert.equal(buildActivity(filtered, Date.now()).points[0].cumulative, 3)
  assert.equal(buildChoiceSummary(meta("choices", { type: "select", isRanked: false }), filtered).answered, 3)
})
test("empty and protected analytics do not fabricate counts or expose answers", () => {
  const activity = buildActivity([], Date.now())
  assert.deepEqual(activity.points, [])
  assert.equal(activity.peakHour, null)
  assert.equal(activity.recent, 0)
  assert.equal(activity.latest, "")
  assert.equal(buildChoiceSummary(meta("secret", { isSecure: true }), []), null)
  assert.deepEqual(buildChoiceSummary(meta("movies"), []), { answered: 0, options: [] })
})
