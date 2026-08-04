"use client";

import { useRef, useState } from "react";
import { Menu, PackageSearch, Search, X } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSearch } from "@/components/landing/search-context";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { query, setQuery } = useSearch();
  const searchInputRef = useRef(null);

  function openSearch() {
    setSearchOpen(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  return (
    <header
      id="top"
      className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur"
    >
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        {searchOpen ? (
          <div className="flex flex-1 items-center gap-2 sm:hidden">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={siteConfig.hero.searchPlaceholder}
              className="h-9 flex-1 border-none bg-transparent px-0 focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close search"
              onClick={closeSearch}
            >
              <X className="size-5" />
            </Button>
          </div>
        ) : (
          <>
            <a href="#top" className="flex items-center gap-2 font-semibold">
              <PackageSearch className="size-5" />
              {siteConfig.name}
            </a>

            <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground sm:flex">
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

            <div className="flex items-center gap-1 sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open search"
                onClick={openSearch}
              >
                <Search className="size-5" />
              </Button>
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label="Open menu">
                      <Menu className="size-5" />
                    </Button>
                  }
                />
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>{siteConfig.name}</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-4 px-4 pb-4 text-base font-medium">
                    {siteConfig.nav.map((item) => (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="text-foreground/90 transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
