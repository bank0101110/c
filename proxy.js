import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// เช็คแค่ว่ามี cookie session ติดมาไหม ไม่ได้ยิง DB — proxy วิ่งทุก request รวม prefetch
// cookie ปลอมได้ ของจริงเช็คอีกทีที่หน้า /manage กับใน Server Action ทุกตัว
export function proxy(request) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/manage/:path*",
};
