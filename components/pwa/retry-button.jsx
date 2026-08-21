"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

// หน้า /offline ถูกเสิร์ฟจาก cache ของ service worker กด reload คือให้ลองยิงเน็ตใหม่อีกรอบ
export function RetryButton() {
  return (
    <Button onClick={() => window.location.reload()}>
      <RefreshCw />
      ลองใหม่อีกครั้ง
    </Button>
  );
}
