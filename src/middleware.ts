import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/discover/:path*",
    "/matches/:path*",
    "/chats/:path*",
    "/profile/:path*",
    "/items/:path*",
    "/onboarding/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/account/:path*",
    "/users/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
    "/auth/:path*",
  ],
};
