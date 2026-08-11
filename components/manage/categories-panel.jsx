"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/manage/actions";

export function CategoriesPanel({ categories, setCategories }) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [isCreating, startCreate] = useTransition();
  // ลบทีละตัว — ใช้ isPending ตัวเดียวจะปิดปุ่มทั้งการ์ดตอนลบหมวดเดียว
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [, startMutate] = useTransition();

  const sortByName = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  // การกรองหนักกว่าการอัปเดตช่องพิมพ์ ปล่อยให้ตัวอักษรขึ้นจอก่อนแล้วค่อยตามด้วยรายการ
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    if (!needle) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(needle));
  }, [categories, deferredQuery]);

  function markBusy(id, busy) {
    setBusyIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleCreate(event) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    startCreate(async () => {
      const result = await createCategoryAction(trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCategories((prev) => sortByName([...prev, { ...result.category, _count: { products: 0 } }]));
      setName("");
      setError(null);
    });
  }

  function handleRename(category) {
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === category.name) {
      setEditingId(null);
      return;
    }

    markBusy(category.id, true);
    startMutate(async () => {
      const result = await updateCategoryAction(category.id, trimmed);
      markBusy(category.id, false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCategories((prev) =>
        sortByName(
          prev.map((item) =>
            item.id === category.id ? { ...item, name: result.category.name } : item
          )
        )
      );
      setEditingId(null);
      setError(null);
    });
  }

  function handleDelete(category) {
    markBusy(category.id, true);
    startMutate(async () => {
      const result = await deleteCategoryAction(category.id);
      markBusy(category.id, false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
      setError(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>หมวดหมู่</CardTitle>
        <CardDescription>
          ลบหมวดแล้วสินค้าไม่หาย แค่หลุดออกไปอยู่กลุ่ม “ไม่มีหมวดหมู่”
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <form onSubmit={handleCreate} className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="category-name">ชื่อหมวดหมู่</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="เช่น ถุงพลาสติก"
              disabled={isCreating}
            />
          </div>
          <Button type="submit" disabled={!name.trim() || isCreating}>
            <Plus />
            เพิ่ม
          </Button>
        </form>

        {error && <p className="text-xs font-medium text-destructive">{error}</p>}

        {categories.length === 0 ? (
          <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีหมวดหมู่
          </p>
        ) : (
          <>
            {/* icon เป็น flex item จริง ไม่ใช่ absolute ทับบน input เลยไม่มีทางชนข้อความ */}
            <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:h-9 dark:bg-input/30">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`ค้นหาใน ${categories.length} หมวดหมู่`}
                aria-label="ค้นหาหมวดหมู่"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
              {query && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setQuery("")}
                  aria-label="ล้างคำค้นหา"
                >
                  <X />
                </Button>
              )}
            </div>

            {matches.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                ไม่พบหมวดหมู่ที่ตรงกับ &ldquo;{deferredQuery.trim()}&rdquo;
              </p>
            ) : (
          <ul className="flex flex-col gap-1">
            {matches.map((category) => {
              const busy = busyIds.has(category.id);
              const editing = editingId === category.id;

              return (
                <li
                  key={category.id}
                  className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
                >
                  {editing ? (
                    <>
                      <Input
                        className="h-8 flex-1"
                        value={editingName}
                        autoFocus
                        disabled={busy}
                        onChange={(event) => setEditingName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleRename(category);
                          if (event.key === "Escape") setEditingId(null);
                        }}
                      />
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="บันทึกชื่อ"
                        disabled={busy}
                        onClick={() => handleRename(category)}
                      >
                        <Check />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="ยกเลิก"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        <X />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 truncate text-sm">{category.name}</span>
                      <Badge variant="secondary">{category._count?.products ?? 0}</Badge>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`แก้ชื่อ ${category.name}`}
                        disabled={busy}
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="destructive"
                        aria-label={`ลบ ${category.name}`}
                        disabled={busy}
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
