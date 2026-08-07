"use client";

import { PackageSearch } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { UserMenu } from "@/components/auth/user-menu";
import { SearchBox } from "@/components/landing/search-box";

// showSearch เปิดเฉพาะหน้าที่อยู่ใต้ SearchProvider (ตอนนี้คือหน้าแรก)
// หน้าอื่นอย่าง /manage ไม่มี provider ถ้าเผลอเปิดจะพังตั้งแต่ render แรก
export function Navbar({ currentUser = null, showSearch = false }) {
  return (
    <header
      id="top"
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur"
    >
      <div className="relative mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <a href="#top" className="group flex items-center gap-2 font-semibold">
          <PackageSearch className="size-5 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" />
          {siteConfig.name}
        </a>

        <div className="flex items-center gap-2 sm:gap-4">
          <nav className="flex items-center gap-3 text-sm font-medium text-muted-foreground sm:gap-6">
            {siteConfig.nav.map((item) => (
              // ขีดใต้วิ่งจากซ้ายไปขวาด้วย scale-x ลื่นกว่าการอนิเมท width
              <a
                key={item.href}
                href={item.href}
                className="relative py-1 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-foreground after:transition-transform after:duration-300 hover:text-foreground hover:after:scale-x-100"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {showSearch && <SearchBox />}

          <UserMenu user={currentUser} />
        </div>
      </div>
    </header>
  );
}
