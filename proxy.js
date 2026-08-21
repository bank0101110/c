import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// เช็คแค่ว่ามี cookie session ติดมาไหม ไม่ได้ยิง DB — proxy วิ่งทุก request รวม prefetch
// cookie ปลอมได้ ของจริงเช็คอีกทีที่หน้า /manage, /pick และใน Server Action ทุกตัว
export function proxy(request) {
  if (getSessionCookie(request)) return NextResponse.next();

  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // /pick เป็นเครื่องมือหลังร้านเหมือน /manage — เด้งตั้งแต่ตรงนี้จะได้ไม่ต้องเรนเดอร์หน้าทิ้ง
  matcher: ["/manage/:path*", "/pick/:path*"],
};
