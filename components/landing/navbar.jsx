"use client";

import { PackageSearch } from "lucide-react";

import { siteConfig } from "@/lib/site-config";

export function Navbar() {
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

        <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
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
      </div>
    </header>
  );
}
