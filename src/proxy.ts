import { NextResponse, type NextRequest } from "next/server";

/**
 * Optional password gate for hosting the app somewhere reachable. When
 * APP_PASSWORD is set, every request needs HTTP Basic auth with that password
 * (any user name). Locally, leave it unset and nothing changes.
 */

/** Constant-time comparison, so response timing doesn't leak the password. */
function sameText(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function suppliedPassword(header: string | null): string | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0)));
    const colon = decoded.indexOf(":");
    return colon === -1 ? null : decoded.slice(colon + 1);
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();
  const supplied = suppliedPassword(request.headers.get("authorization"));
  if (supplied !== null && sameText(supplied, password)) return NextResponse.next();
  return new NextResponse("Password required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Language Prep", charset="UTF-8"' },
  });
}

export const config = {
  // Everything except Next's own static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
