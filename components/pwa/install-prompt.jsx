"use client";

import { useEffect, useState } from "react";
import { Download, PackageSearch, Share, SquarePlus, X } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Button } from "@/components/ui/button";

// จำการกดปิดไว้ในเครื่อง ไม่งั้นแถบนี้จะโผล่ทุกครั้งที่เปลี่ยนหน้า น่ารำคาญกว่ามีประโยชน์
const DISMISSED_KEY = "stockly:install-dismissed";

// ให้ดูเนื้อหาก่อนสักพัก ค่อยชวนติดตั้ง อย่าเพิ่งไปบังหน้าจอตั้งแต่วินาทีแรกที่เปิดเว็บ
const IOS_HINT_DELAY_MS = 5000;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari บน iOS ไม่รองรับ display-mode ใช้ธงเฉพาะตัวนี้แทน
    window.navigator.standalone === true
  );
}

function isDismissed() {
  try {
    return Boolean(window.localStorage.getItem(DISMISSED_KEY));
  } catch {
    // โหมดส่วนตัวของบางเบราว์เซอร์อ่าน localStorage ไม่ได้ — ถือว่ายังไม่เคยปิด
    return false;
  }
}

function isIosSafari() {
  const { userAgent, platform, maxTouchPoints } = window.navigator;
  // iPad รุ่นใหม่รายงานตัวเป็น Mac เลยต้องดูว่าจอรับสัมผัสได้ด้วยไหม
  const isIos = /iphone|ipad|ipod/i.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
  // Chrome/Firefox/Edge บน iOS ก็มีคำว่า Safari ใน UA แต่เพิ่มลงหน้าจอโฮมไม่ได้
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);

  return isIos && isSafari;
}

/**
 * ชวนติดตั้งแอปลงหน้าจอโฮม
 *
 * Chrome/Edge บน Android กับเดสก์ท็อปยิง beforeinstallprompt มาให้ กดปุ๊บติดตั้งได้เลย
 * ส่วน Safari บน iOS ไม่มี event นี้และสั่งติดตั้งเองไม่ได้ ทำได้แค่บอกวิธีกดผ่านปุ่มแชร์
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // ติดตั้งไปแล้ว หรือเคยกดปิดไปแล้ว ก็ไม่ต้องชวนอีก
    if (isStandalone() || isDismissed()) return;

    const onBeforeInstallPrompt = (event) => {
      // ต้องกัน default ไว้ก่อน ไม่งั้น Chrome เด้งแถบของตัวเองแทน แล้วเราเก็บ event ไว้ใช้ไม่ได้
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowIosHint(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    const timer = setTimeout(() => {
      if (isIosSafari()) setShowIosHint(true);
    }, IOS_HINT_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      clearTimeout(timer);
    };
  }, []);

  function close() {
    setDeferredPrompt(null);
    setShowIosHint(false);

    try {
      window.localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // เก็บไม่ได้ก็ปิดแค่รอบนี้พอ
    }
  }

  async function install() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // event ใช้ได้ครั้งเดียว ไม่ว่าจะติดตั้งหรือกดยกเลิก ต้องรอ Chrome ส่งมาใหม่เอง
    close();
  }

  if (!deferredPrompt && !showIosHint) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="flex w-full max-w-md items-start gap-3 rounded-xl bg-popover p-3 shadow-lg ring-1 ring-border">
        <PackageSearch className="mt-0.5 size-5 shrink-0" />

        <div className="flex-1 text-sm">
          <p className="font-medium">ติดตั้ง {siteConfig.name} ลงเครื่อง</p>

          {deferredPrompt ? (
            <>
              <p className="mt-1 text-muted-foreground">
                เปิดเช็กสต็อกได้จากหน้าจอโฮม เต็มจอ ไม่มีแถบเบราว์เซอร์
              </p>
              <Button size="sm" className="mt-2.5" onClick={install}>
                <Download />
                ติดตั้ง
              </Button>
            </>
          ) : (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-muted-foreground">
              แตะ
              <Share className="size-4" aria-label="ปุ่มแชร์" />
              แล้วเลือก
              <SquarePlus className="size-4" aria-hidden="true" />
              <span className="font-medium text-foreground">เพิ่มไปยังหน้าจอโฮม</span>
            </p>
          )}
        </div>

        <Button variant="ghost" size="icon-sm" onClick={close} aria-label="ปิด">
          <X />
        </Button>
      </div>
    </div>
  );
}
