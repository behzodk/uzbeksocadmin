import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import roles from "@/lib/roles.json"

const PUBLIC_FILE = /\.(.*)$/
const allowedEmails = new Set(
  [...roles.super_admins, ...roles.admins].map((email) => email.toLowerCase().trim())
)

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

  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/sign-in"
    redirectUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const userEmail = data.user.email?.toLowerCase().trim()
  if (!userEmail || !allowedEmails.has(userEmail)) {
    await supabase.auth.signOut()
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/sign-in"
    redirectUrl.searchParams.set("reason", "unauthorized")
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)"],
}