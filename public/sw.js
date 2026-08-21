/**
 * Service worker ของ Stockly
 *
 * หน้าที่มีสองอย่าง: ทำให้แอปติดตั้งลงเครื่องได้ (Chrome ต้องเห็น fetch handler)
 * และทำให้เปิดแอปตอนเน็ตหลุดแล้วยังได้หน้าที่อ่านออก แทนไดโนเสาร์ของเบราว์เซอร์
 *
 * ขึ้นเวอร์ชันทุกครั้งที่แก้ไฟล์นี้ — ชื่อ cache เปลี่ยนแล้วของเก่าถึงจะถูกล้างตอน activate
 */
const VERSION = "v1";
const SHELL_CACHE = `stockly-shell-${VERSION}`;
const ASSET_CACHE = `stockly-assets-${VERSION}`;
const OFFLINE_URL = "/offline";

const SHELL_ASSETS = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      // ไม่รอให้ปิดแท็บเก่าก่อน เวอร์ชันใหม่ของ sw ทำงานทันที
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // POST ทั้งหมดคือ Server Action (ตัดสต็อก/แก้สินค้า) ห้ามแตะ ต้องวิ่งถึงเซิร์ฟเวอร์เท่านั้น
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // รูปสินค้าอยู่บน Supabase Storage คนละ origin — ปล่อยให้ HTTP cache ของเบราว์เซอร์จัดการเอง
  // จะเก็บเองก็ได้แต่ได้ opaque response ที่เช็ก status ไม่ได้ ไม่คุ้มความเสี่ยงเก็บของเสียค้าง
  if (url.origin !== self.location.origin) return;

  // auth/session ต้องสดเสมอ
  if (url.pathname.startsWith("/api/")) return;

  // RSC payload ของการ navigate/prefetch = ข้อมูลสต็อกสด ๆ ห้าม cache
  if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigateWithOfflineFallback(request));
    return;
  }

  // ไฟล์ใต้ /_next/static ชื่อมี hash ของ build อยู่แล้ว เนื้อในเปลี่ยนไม่ได้ เลยอ่านจาก cache ได้เลย
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:svg|png|jpg|jpeg|webp|ico|woff2?)$/.test(url.pathname)
  );
}

/**
 * หน้าเว็บไม่เก็บลง cache เด็ดขาด
 *
 * ทุกหน้าเป็น force-dynamic และ HTML ผูกกับคนที่ล็อกอินอยู่ (เมนูผู้ใช้/สิทธิ์แก้ไข)
 * ถ้าเก็บไว้ เครื่องที่ใช้ร่วมกันจะเห็นหน้าของคนก่อนหน้า และยอดสต็อกที่เห็นจะเป็นของเก่า
 * ซึ่งอันตรายกว่าการบอกตรง ๆ ว่าตอนนี้ออฟไลน์
 */
async function navigateWithOfflineFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const offline = await cache.match(OFFLINE_URL);
    return offline ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

// คืนของใน cache ก่อนเพื่อความไว แล้วค่อยดึงตัวใหม่มาทับไว้ใช้รอบหน้า
async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);

  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    // ไม่มีของเก่าให้คืนแล้วเน็ตก็ไม่มา — ตอบ error ไปตรง ๆ อย่าคืน undefined ให้ respondWith
    .catch(() => Response.error());

  return cached ?? fresh;
}
