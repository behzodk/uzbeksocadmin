export interface ResourcePermissions {
  read: boolean
  create: boolean
  update: boolean
  delete: boolean
}

export interface AdminRoles {
  super_admin: boolean
  forms: ResourcePermissions
  news: ResourcePermissions
  events: ResourcePermissions
  competitions: ResourcePermissions
}

type PartialAdminRoles = Partial<AdminRoles> & {
  forms?: Partial<ResourcePermissions>
  news?: Partial<ResourcePermissions>
  events?: Partial<ResourcePermissions>
  competitions?: Partial<ResourcePermissions>
}

export type AdminResource = "forms" | "news" | "events" | "competitions"

export const DEFAULT_PERMISSIONS: ResourcePermissions = {
  read: false,
  create: false,
  update: false,
  delete: false,
}

export const ADMIN_RESOURCES = [
  { key: "forms", label: "Forms" },
  { key: "news", label: "News" },
  { key: "events", label: "Events" },
  { key: "competitions", label: "Competetion" },
] as const satisfies ReadonlyArray<{ key: AdminResource; label: string }>

export function createDefaultAdminRoles(): AdminRoles {
  return {
    super_admin: false,
    forms: { ...DEFAULT_PERMISSIONS },
    news: { ...DEFAULT_PERMISSIONS },
    events: { ...DEFAULT_PERMISSIONS },
    competitions: { ...DEFAULT_PERMISSIONS },
  }
}

export function mergeAdminRoles(roles?: PartialAdminRoles | null): AdminRoles {
  const defaults = createDefaultAdminRoles()

  return {
    ...defaults,
    ...roles,
    forms: { ...defaults.forms, ...roles?.forms },
    news: { ...defaults.news, ...roles?.news },
    events: { ...defaults.events, ...roles?.events },
    competitions: { ...defaults.competitions, ...roles?.competitions },
  }
}
