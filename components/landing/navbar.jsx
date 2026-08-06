"use client";

import { PackageSearch } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { UserMenu } from "@/components/auth/user-menu";

export function Navbar({ currentUser = null }) {
  return (
    <header
      id="top"
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur"
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2 font-semibold">
          <PackageSearch className="size-5" />
          {siteConfig.name}
        </a>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground sm:gap-6">
            {siteConfig.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <UserMenu user={currentUser} />
        </div>
      </div>
    </header>
  );
}
