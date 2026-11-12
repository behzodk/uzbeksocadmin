/** Free-text rules shared by public form renderers and the submission API. */
export interface TextInputRules {
  type: string
  blocked_words?: string[]
  blocked_words_message?: string
  allow_non_latin?: boolean
}
export function isFreeTextField(field: Pick<TextInputRules, "type">) {
  return field.type === "text" || field.type === "textarea" || field.type === "email"
}
// Preserve ordinary punctuation, including typographic apostrophes. Never silently
// remove invalid input or transliterate names into a different alphabet.
const STANDARD_LATIN_INPUT = /^[\x20-\x7E\r\n\t\p{P}\p{Zs}]*$/u
const WORD_CHARACTER = /[\p{L}\p{N}]/u
const canonicalize = (text: string) => text.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim()

export function validateTextInput(field: TextInputRules, value: unknown): string | null {
  if (!isFreeTextField(field) || typeof value !== "string" || !value) return null
  if (!field.allow_non_latin && !STANDARD_LATIN_INPUT.test(value)) {
    return "Use standard Latin letters (A-Z), numbers and punctuation only."
  }
  const text = canonicalize(value)
  for (const entry of field.blocked_words || []) {
    const word = canonicalize(entry)
    if (!word) continue
    let position = text.indexOf(word)
    while (position !== -1) {
      const before = Array.from(text.slice(0, position)).pop()
      const after = Array.from(text.slice(position + word.length))[0]
      if ((!before || !WORD_CHARACTER.test(before)) && (!after || !WORD_CHARACTER.test(after))) {
        return field.blocked_words_message?.trim() || "Please enter a different value."
      }
      position = text.indexOf(word, position + 1)
    }
  }
  return null
}
