import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
const PUBLIC_FILE = /\.(.*)$/

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname === "/" ||
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/terms-of-service") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data } = await supabase.auth.getSession()

  if (!data.session?.user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/sign-in"
    redirectUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const user = data.session.user
  const userEmail = user.email?.toLowerCase().trim()

  if (!userEmail) {
    await supabase.auth.signOut()
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/sign-in"
    redirectUrl.searchParams.set("reason", "no_email")
    return NextResponse.redirect(redirectUrl)
  }

  // Check if user has admin roles in app_metadata
  let roles = user.app_metadata?.roles as {
    super_admin: boolean
    forms: { read: boolean; create: boolean; update: boolean; delete: boolean }
    news: { read: boolean; create: boolean; update: boolean; delete: boolean }
    events: { read: boolean; create: boolean; update: boolean; delete: boolean }
  } | undefined

  // Fallback: Check if user exists in admins table (for existing sessions or missed syncs)
  if (!roles) {
    const { data: adminUser } = await supabase
      .from("admins")
      .select("roles")
      .eq("email", userEmail)
      .single()

    if (adminUser) {
      roles = adminUser.roles as typeof roles
    }
  }

  if (!roles) {
    await supabase.auth.signOut()
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/sign-in"
    redirectUrl.searchParams.set("reason", "unauthorized")
    return NextResponse.redirect(redirectUrl)
  }

  // Role-Based Access Control

  // Define protected routes and their required roles
  // If a user is super_admin, they have access to everything automatically
  if (!roles.super_admin) {
    if (pathname.startsWith("/dashboard/admins")) {
      // Only super_admins can access the admins page
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized_access", request.url))
    }

    if (pathname.startsWith("/dashboard/forms") && !roles.forms?.read) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized_access", request.url))
    }

    if (pathname.startsWith("/dashboard/newsletters") && !roles.news?.read) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized_access", request.url))
    }

    if (pathname.startsWith("/dashboard/events") && !roles.events?.read) {
      return NextResponse.redirect(new URL("/dashboard?error=unauthorized_access", request.url))
    }
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
}