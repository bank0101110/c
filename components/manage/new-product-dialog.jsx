"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { createProductAction, createUnitTypeAction } from "@/app/manage/actions";
import {
  sameUnitOption,
  sortUnits,
  unitOptionFilter,
  unitOptionLabel,
  unitOptions,
} from "@/lib/stock";


export function NewProductDialog({ unitTypes, setUnitTypes, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [baseUnitTypeId, setBaseUnitTypeId] = useState("");
  const [qty, setQty] = useState("0");
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  // ฟอร์มสร้างหน่วยใหม่ในตัว ไม่ต้องปิด dialog ไปสร้างที่ panel Unit types ก่อน
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitError, setUnitError] = useState(null);

  const canCreateUnit = Boolean(unitName.trim());

  // หน่วยมีได้เป็นหลักร้อย เลยใช้ combobox ที่พิมพ์ค้นได้แทน dropdown ยาว ๆ
  const options = useMemo(() => unitOptions(unitTypes), [unitTypes]);
  const selectedOption =
    options.find((option) => String(option.id) === baseUnitTypeId) ?? null;

  const baseUnit = unitTypes.find((unitType) => String(unitType.id) === baseUnitTypeId);
  const canSubmit = Boolean(name.trim()) && Boolean(baseUnitTypeId) && Number(qty) >= 0;

  function reset() {
    setName("");
    setImageUrl("");
    setBaseUnitTypeId("");
    setQty("0");
    setError(null);
    setShowNewUnit(false);
    setUnitName("");
    setUnitError(null);
  }

  function handleCreateUnit() {
    if (!canCreateUnit) return;

    startTransition(async () => {
      // หน่วยที่สร้างจากตรงนี้เป็นหน่วยย่อยที่สุดเสมอ เลยไม่ต้องถามตัวคูณ
      const result = await createUnitTypeAction(unitName.trim(), 1);

      if (!result.ok) {
        // มีอยู่แล้วก็เลือกตัวเดิมให้เลย ผู้ใช้จะได้ไม่ต้องไปไล่หาเอง
        if (result.existing) {
          setUnitTypes((prev) =>
            prev.some((unitType) => unitType.id === result.existing.id)
              ? prev
              : sortUnits([...prev, result.existing])
          );
          setBaseUnitTypeId(String(result.existing.id));
          setUnitName("");
          setUnitError(`${result.error} — เลือกตัวเดิมให้แล้ว`);
          return;
        }
        setUnitError(result.error);
        return;
      }
      setUnitTypes((prev) => sortUnits([...prev, result.unitType]));
      // เพิ่งสร้างมาก็น่าจะอยากใช้อันนี้ เลยเลือกให้เลย
      setBaseUnitTypeId(String(result.unitType.id));
      setUnitName("");
      setUnitError(null);
      setShowNewUnit(false);
    });
  }

  // อยู่ใน <form> ของสินค้า กด Enter เฉย ๆ จะไปส่งฟอร์มนอก เลยดักไว้
  function handleUnitKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleCreateUnit();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    // ยอดเริ่มต้นกรอกเป็นหน่วยหลัก แต่เก็บเป็นหน่วยย่อยที่สุด
    const startQty = Number(qty) * (baseUnit?.qty ?? 1);

    startTransition(async () => {
      const result = await createProductAction(
        name.trim(),
        imageUrl.trim() || null,
        Number(baseUnitTypeId),
        startQty
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated(result.product);
      reset();
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // ยังไม่มีหน่วยสักอัน เปิดฟอร์มสร้างหน่วยรอไว้เลย
        if (next) setShowNewUnit(unitTypes.length === 0);
        else reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        New product
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New product</DialogTitle>
          <DialogDescription>Add a product and its base unit of measure.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-name">Name</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Coffee beans"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-image">Image URL</Label>
            <Input
              id="product-image"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>Base unit</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => {
                  setShowNewUnit((prev) => !prev);
                  setUnitError(null);
                }}
                disabled={isPending}
              >
                {showNewUnit ? <X /> : <Plus />}
                {showNewUnit ? "Cancel" : "New unit type"}
              </Button>
            </div>

            <Combobox
              items={options}
              value={selectedOption}
              onValueChange={(option) =>
                setBaseUnitTypeId(option ? String(option.id) : "")
              }
              itemToStringLabel={unitOptionLabel}
              filter={unitOptionFilter}
              isItemEqualToValue={sameUnitOption}
              limit={50}
              autoHighlight
              disabled={isPending || unitTypes.length === 0}
            >
              <ComboboxInputGroup>
                <ComboboxInput
                  placeholder={
                    unitTypes.length === 0
                      ? "No unit types yet"
                      : `ค้นหา ${unitTypes.length} หน่วย — ชื่อ หรือ "ลัง 20"`
                  }
                />
                <ComboboxClear />
                <ComboboxTrigger />
              </ComboboxInputGroup>
              <ComboboxContent>
                <ComboboxEmpty>ไม่พบหน่วยที่ค้นหา</ComboboxEmpty>
                <ComboboxList>
                  {(option) => (
                    <ComboboxItem key={option.id} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>

            {showNewUnit && (
              <div className="mt-1 flex flex-col gap-2 rounded-lg border border-dashed border-border p-2.5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-unit-name">Name</Label>
                  <Input
                    id="new-unit-name"
                    value={unitName}
                    onChange={(event) => setUnitName(event.target.value)}
                    onKeyDown={handleUnitKeyDown}
                    placeholder="e.g. ชิ้น"
                    disabled={isPending}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  สร้างจากตรงนี้ได้เป็นหน่วยย่อยที่สุด (×1) ถ้าอยากได้ตัวคูณ ไปสร้างที่การ์ด Unit types
                </p>

                {unitError && <p className="text-xs text-destructive">{unitError}</p>}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCreateUnit}
                  disabled={!canCreateUnit || isPending}
                >
                  <Plus />
                  Add unit type
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-qty">
              Starting stock{baseUnit ? ` (${baseUnit.name})` : ""}
            </Label>
            <Input
              id="product-qty"
              type="number"
              min={0}
              step={1}
              value={qty}
              onChange={(event) => setQty(event.target.value)}
              disabled={isPending}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button type="submit" disabled={!canSubmit || isPending}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
