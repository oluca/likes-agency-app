import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseEnv } from "@/lib/supabase/env";

// Optimistic auth check + session refresh. Real authorization lives in src/lib/dal.ts.
export async function proxy(request: NextRequest) {
  const env = readSupabaseEnv();
  const { pathname } = request.nextUrl;

  const isApi = pathname.startsWith("/api/");
  const isAuthPage = ["/login", "/signup", "/forgot-password"].includes(pathname);
  // /invite/* handles its own sign-in redirect so the invite token survives.
  const isPublic = isAuthPage || pathname.startsWith("/auth/") || pathname.startsWith("/invite/");
  const isProtectedPage = !isApi && !isPublic;

  if (!env) {
    // Not configured yet: keep public pages reachable, block everything protected.
    if (isApi) return NextResponse.json({ detail: "Nicht angemeldet" }, { status: 401 });
    if (isProtectedPage) return NextResponse.redirect(new URL("/login", request.url));
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  let signedIn = !!data?.claims;
  // Auth pages: confirm with the auth server, otherwise a valid-looking but revoked
  // session would bounce /login <-> / forever.
  if (signedIn && isAuthPage) {
    const { data: userData } = await supabase.auth.getUser();
    signedIn = !!userData.user;
  }

  if (!signedIn && isApi) {
    return NextResponse.json({ detail: "Nicht angemeldet" }, { status: 401 });
  }
  if (!signedIn && isProtectedPage) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  if (signedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
