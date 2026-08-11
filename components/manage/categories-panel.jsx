"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

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
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [isCreating, startCreate] = useTransition();
  // ลบทีละตัว — ใช้ isPending ตัวเดียวจะปิดปุ่มทั้งการ์ดตอนลบหมวดเดียว
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [, startMutate] = useTransition();

  const sortByName = (list) => [...list].sort((a, b) => a.name.localeCompare(b.name));

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
          <ul className="flex flex-col gap-1">
            {categories.map((category) => {
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
      </CardContent>
    </Card>
  );
}
