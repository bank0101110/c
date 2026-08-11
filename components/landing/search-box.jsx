"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearch } from "@/components/landing/search-context";

const MAX_SUGGESTIONS = 6;

/** ตัดชื่อสินค้าออกเป็น 3 ท่อน รอบคำที่ตรง เพื่อไฮไลต์ตรงกลาง */
function splitMatch(name, query) {
  const at = name.toLowerCase().indexOf(query.toLowerCase());
  if (at < 0) return [name, "", ""];
  return [name.slice(0, at), name.slice(at, at + query.length), name.slice(at + query.length)];
}

/**
 * ช่องค้นหา + รายการแนะนำ ใช้ร่วมกันทั้งแบบเต็มบนจอใหญ่และแบบกางบนมือถือ
 * แยกออกมาเป็นตัวเดียวเพื่อไม่ต้องเขียนตรรกะ autocomplete ซ้ำสองที่
 */
function SearchField({ inputRef, onEscape, className }) {
  const { query, setQuery, index } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    // เก็บแค่ที่ขึ้นต้นด้วยคำค้นให้ครบโควตาก่อน แล้วค่อยเติมด้วยตัวที่เจอกลางชื่อ
    // ทำแบบนี้แทน filter ทั้งหมดแล้ว sort — เดิมเรียง array ที่อาจยาวหลายร้อยรายการ
    // ทุกครั้งที่พิมพ์ ทั้งที่สุดท้ายใช้แค่ 6 ตัวแรก
    const starts = [];
    const contains = [];

    for (const entry of index) {
      if (entry.lower.startsWith(needle)) starts.push(entry.product);
      else if (entry.lower.includes(needle)) contains.push(entry.product);
      if (starts.length >= MAX_SUGGESTIONS) break;
    }

    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [index, query]);

  const showList = isOpen && suggestions.length > 0;

  // คำค้นถูกแก้จากที่อื่นได้ด้วย (เช่นกดปิดช่องค้นหาบนมือถือแล้วล้างคำ)
  // ตัวที่ไฮไลต์ไว้อาจชี้เลยขอบรายการใหม่ เลยหนีบให้อยู่ในช่วงเสมอตอน render
  const activeItem = activeIndex < suggestions.length ? activeIndex : -1;

  function pick(name) {
    setQuery(name);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      // ปิดรายการแนะนำก่อน ถ้าปิดอยู่แล้วค่อยส่งต่อให้ตัวแม่ (มือถือใช้ปิดช่องค้นหา)
      if (showList) {
        setIsOpen(false);
        return;
      }
      onEscape?.();
      return;
    }

    if (!showList) {
      if (event.key === "ArrowDown") setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (event.key === "Enter" && activeItem >= 0) {
      event.preventDefault();
      pick(suggestions[activeItem].name);
    }
  }

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            // รายการเปลี่ยนทุกครั้งที่พิมพ์ ตัวที่ไฮไลต์ไว้เดิมไม่ใช่ตัวเดิมอีก
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          // หน่วงไว้ก่อน ไม่งั้น blur ทำงานก่อน click ของรายการแนะนำ แล้วกดไม่ติด
          onBlur={() => setTimeout(() => setIsOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={siteConfig.hero.searchPlaceholder}
          aria-label="ค้นหาสินค้า"
          role="combobox"
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-activedescendant={
            activeItem >= 0 ? `${listId}-${activeItem}` : undefined
          }
          aria-autocomplete="list"
          className="h-9 pl-8"
        />
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl bg-dropdown p-1 shadow-lg ring-1 ring-border"
        >
          {suggestions.map((product, index) => {
            const [before, match, after] = splitMatch(product.name, query.trim());
            return (
              <li key={product.id}>
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === activeItem}
                  // ต้องกันไม่ให้ input เสีย focus ก่อน ไม่งั้น blur ปิดรายการทิ้งก่อนกดโดน
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(product.name)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors sm:py-1.5 ${
                    index === activeItem ? "bg-accent text-accent-foreground" : ""
                  }`}
                >
                  <Search className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {before}
                    <span className="font-semibold">{match}</span>
                    {after}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/**
 * ช่องค้นหาสินค้าใน navbar
 * จอ sm ขึ้นไปโชว์ช่องกรอกเต็ม ๆ ส่วนมือถือยุบเหลือแค่ไอคอน แล้วกดแล้วค่อยกางทับแถบ navbar
 * เพราะพื้นที่บนมือถือมีแค่พอให้โลโก้ เมนู กับปุ่มผู้ใช้อยู่แล้ว
 */
export function SearchBox() {
  const { setQuery } = useSearch();
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);

  // กางแล้วโฟกัสให้เลย ไม่ต้องให้ผู้ใช้แตะสองครั้ง
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // ปิดแล้วล้างคำค้นด้วย ไม่งั้นรายการจะยังโดนกรองค้างอยู่ทั้งที่มองไม่เห็นช่องค้นหาแล้ว
  function close() {
    setIsOpen(false);
    setQuery("");
  }

  return (
    <>
      <SearchField className="relative hidden w-44 sm:block md:w-64" />

      <Button
        size="icon-sm"
        variant="ghost"
        onClick={() => setIsOpen(true)}
        aria-label="ค้นหาสินค้า"
        aria-expanded={isOpen}
        className="sm:hidden"
      >
        <Search />
      </Button>

      {isOpen && (
        // ทับทั้งแถบไปเลย จะได้มีที่ให้พิมพ์เต็มความกว้าง — ตัวแม่ใน navbar เป็น relative อยู่
        <div className="absolute inset-0 z-10 flex items-center gap-1 bg-background px-4 sm:hidden">
          <SearchField inputRef={inputRef} onEscape={close} className="relative flex-1" />
          <Button size="icon-sm" variant="ghost" onClick={close} aria-label="ปิดการค้นหา">
            <X />
          </Button>
        </div>
      )}
    </>
  );
}
