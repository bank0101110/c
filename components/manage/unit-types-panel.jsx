"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createUnitTypeAction, deleteUnitTypeAction } from "@/app/manage/actions";
import { matchesUnitQuery, sortUnits, unitSearchText } from "@/lib/stock";

const VISIBLE_LIMIT = 50;

export function UnitTypesPanel({ unitTypes, setUnitTypes }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = Boolean(name.trim()) && Number(qty) >= 1;

  // หน่วยมีได้เป็นหลักร้อย เลยต้องค้นหาได้ และตัดจำนวนที่วาดจริงไม่ให้หน้ายืด
  const matches = useMemo(() => {
    if (!query.trim()) return unitTypes;
    return unitTypes.filter((unitType) =>
      matchesUnitQuery(unitSearchText(unitType), query)
    );
  }, [unitTypes, query]);

  const visible = matches.slice(0, VISIBLE_LIMIT);
  const hiddenCount = matches.length - visible.length;

  function handleCreate(event) {
    event.preventDefault();
    if (!canSubmit) return;

    startTransition(async () => {
      const result = await createUnitTypeAction(name.trim(), Number(qty));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUnitTypes((prev) => sortUnits([...prev, result.unitType]));
      setName("");
      setQty("1");
      setError(null);
    });
  }

  function handleDelete(id) {
    startTransition(async () => {
      const result = await deleteUnitTypeAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUnitTypes((prev) => prev.filter((unitType) => unitType.id !== id));
      setError(null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>หน่วยนับ</CardTitle>
        <CardDescription>
          ตัวคูณคือ 1 หน่วยนี้เท่ากับกี่หน่วยย่อยที่สุด — หน่วยย่อยที่สุดใส่ 1
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <form onSubmit={handleCreate} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="unit-name">ชื่อหน่วย</Label>
              <Input
                id="unit-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="เช่น ลัง"
                disabled={isPending}
              />
            </div>
            <div className="flex w-20 flex-col gap-1.5">
              <Label htmlFor="unit-qty">ตัวคูณ</Label>
              <Input
                id="unit-qty"
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={isPending || !canSubmit}>
            <Plus />
            เพิ่มหน่วยนับ
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {unitTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">ยังไม่มีหน่วยนับ</p>
        ) : (
          <>
            {/* icon เป็น flex item จริง ไม่ใช่ absolute ทับบน input เลยไม่มีทางชนข้อความ */}
            <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:h-8 dark:bg-input/30">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`ค้นหา ${unitTypes.length} หน่วย — ชื่อ หรือ "ลัง 20"`}
                aria-label="ค้นหาหน่วยนับ"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground md:text-sm"
              />
            </div>

            {matches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ไม่พบหน่วยที่ตรงกับ &ldquo;{query.trim()}&rdquo;
              </p>
            ) : (
              <ul className="flex max-h-80 flex-col divide-y divide-border overflow-y-auto overscroll-contain rounded-xl border border-border">
                {visible.map((unitType) => (
                  <li
                    key={unitType.id}
                    className="flex items-center gap-2 py-1.5 pr-1.5 pl-3"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {unitType.name}
                    </span>
                    <Badge variant="secondary">×{unitType.qty}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(unitType.id)}
                      disabled={isPending}
                      aria-label={`ลบ ${unitType.name}`}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {hiddenCount > 0 && (
              <p className="text-xs text-muted-foreground">
                แสดง {visible.length} จาก {matches.length} — พิมพ์ค้นหาเพื่อดูที่เหลืออีก{" "}
                {hiddenCount}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
