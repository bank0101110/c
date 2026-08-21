import Link from "next/link";
import { WifiOff } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { RetryButton } from "@/components/pwa/retry-button";

// หน้านี้ต้องเป็น static ล้วน ๆ (ห้ามแตะ DB) เพราะ service worker เก็บ HTML ไว้ตั้งแต่ตอนติดตั้ง
// แล้วหยิบมาแสดงตอนที่เน็ตใช้ไม่ได้
export const metadata = {
  title: "ออฟไลน์",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <WifiOff className="size-6 text-muted-foreground" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold">ตอนนี้ออฟไลน์อยู่</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          {siteConfig.name} ต้องต่อเน็ตเพื่อดึงยอดสต็อกล่าสุด ยอดที่ค้างอยู่ในเครื่องอาจไม่ตรงกับของจริง
          เลยไม่เอามาแสดง ต่อเน็ตแล้วลองใหม่อีกครั้ง
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <RetryButton />
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          กลับหน้าแรก
        </Button>
      </div>
    </main>
  );
}
