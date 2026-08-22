"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";
import { AccountPanel } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * เมนูของมือถือ — เก็บลิงก์นำทางกับบัญชีผู้ใช้ไว้ในแผ่นสไลด์
 *
 * บนจอ ~360px แถบ navbar มีที่ไม่พอให้ทั้งโลโก้ ลิงก์สามตัว ช่องค้นหา และปุ่มผู้ใช้
 * ทุกอย่างเลยเบียดกันจนกดพลาด ย้ายลิงก์กับบัญชีมาไว้ในนี้แล้วบนแถบเหลือแค่ค้นหากับปุ่มเมนู
 */
export function MobileMenu({ currentUser = null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const close = () => setOpen(false);

  return (
    <>
      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        aria-expanded={open}
        className="sm:hidden"
      >
        <Menu />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        {/* ห้ามใส่ sm:hidden ที่ตัวแผ่น — หมุนจอเป็นแนวนอนตอนเปิดอยู่ (กว้างเกิน sm) แผ่นจะหาย
            แต่ฉากหลังยังค้างบังทั้งหน้า กดอะไรไม่ได้ ปล่อยให้มันแสดงตามปกติแล้วผู้ใช้ปิดเองดีกว่า */}
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{siteConfig.name}</SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-1 px-2">
            {siteConfig.nav.map((item) => {
              // "/" ต้องเทียบแบบตรงตัว ไม่งั้น startsWith ทำให้หน้าแรกติดสถานะปัจจุบันตลอด
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <SheetFooter className="border-t border-border">
            <AccountPanel user={currentUser} onDone={close} />
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
