import { NextResponse, type NextRequest } from "next/server";

// LOCAL DEMO ONLY: uploads are not stored; every uploaded image shows a placeholder.
export function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO !== "1") return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(new URL("/demo/i-me-1.svg", request.url));
}
