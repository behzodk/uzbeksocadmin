import type { Member } from "@/lib/types"

export function getMemberDisplayName(member: Partial<Member>) {
  const fullName = member.full_name?.trim()
  if (fullName) return fullName

  const firstName = member.first_name?.trim() ?? ""
  const lastName = member.last_name?.trim() ?? ""
  const combinedName = `${firstName} ${lastName}`.trim()

  return combinedName || "Unknown"
}

export function getMemberInitials(name: string) {
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName === "Unknown") return "?"

  return trimmedName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
