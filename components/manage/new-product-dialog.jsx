"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { ImageField } from "@/components/manage/image-field";
import { createProductAction, createUnitTypeAction } from "@/app/manage/actions";
import {
  BASE_UNIT_FACTOR,
  baseUnitTypes,
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

  // หน่วยเสริมเลือกตอนสร้างได้เลย ไม่ต้องสร้างสินค้าเสร็จแล้วค่อยไปกด Edit
  const [showExtraUnits, setShowExtraUnits] = useState(false);
  const [extraUnitIds, setExtraUnitIds] = useState(() => new Set());

  const canCreateUnit = Boolean(unitName.trim());

  // หน่วยหลักเก็บยอดเป็นหน่วยย่อยที่สุด เลยเลือกได้เฉพาะหน่วย ×1
  const baseOptions = useMemo(
    () => unitOptions(baseUnitTypes(unitTypes)),
    [unitTypes]
  );
  const selectedOption =
    baseOptions.find((option) => String(option.id) === baseUnitTypeId) ?? null;

  const baseUnit = unitTypes.find((unitType) => String(unitType.id) === baseUnitTypeId);

  // หน่วยหลักติดมากับสินค้าอยู่แล้ว ไม่ต้องเลือกซ้ำในหน่วยเสริม
  const extraOptions = useMemo(
    () =>
      unitOptions(unitTypes).filter(
        (option) => String(option.id) !== baseUnitTypeId
      ),
    [unitTypes, baseUnitTypeId]
  );
  const selectedExtraOptions = useMemo(
    () => extraOptions.filter((option) => extraUnitIds.has(option.id)),
    [extraOptions, extraUnitIds]
  );

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
    setShowExtraUnits(false);
    setExtraUnitIds(new Set());
  }

  function handleCreateUnit() {
    if (!canCreateUnit) return;

    startTransition(async () => {
      // หน่วยที่สร้างจากตรงนี้เป็นหน่วยย่อยที่สุดเสมอ เลยไม่ต้องถามตัวคูณ
      const result = await createUnitTypeAction(unitName.trim(), BASE_UNIT_FACTOR);

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

  function handleExtraUnitsChange(nextOptions) {
    setExtraUnitIds(new Set(nextOptions.map((option) => option.id)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    // หน่วยหลักเป็น ×1 เสมอ ยอดที่กรอกจึงเป็นหน่วยย่อยที่สุดอยู่แล้ว
    const startQty = Number(qty);
    // เปลี่ยนหน่วยหลักทีหลังอาจทำให้หน่วยเสริมที่เลือกไว้ชนกับหน่วยหลัก เลยกรองอีกที
    const extraIds = [...extraUnitIds].filter(
      (unitTypeId) => String(unitTypeId) !== baseUnitTypeId
    );

    startTransition(async () => {
      const result = await createProductAction(
        name.trim(),
        imageUrl.trim() || null,
        Number(baseUnitTypeId),
        startQty,
        extraIds
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
        // ยังไม่มีหน่วย ×1 สักอัน เปิดฟอร์มสร้างหน่วยรอไว้เลย
        if (next) setShowNewUnit(baseOptions.length === 0);
        else reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Plus />
        เพิ่มสินค้า
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>เพิ่มสินค้า</DialogTitle>
          <DialogDescription>ตั้งชื่อสินค้าและเลือกหน่วยหลักที่ใช้นับ</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-name">ชื่อสินค้า</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="เช่น เมล็ดกาแฟ"
              disabled={isPending}
            />
          </div>

          <ImageField
            id="product-image"
            value={imageUrl}
            onChange={setImageUrl}
            disabled={isPending}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>หน่วยหลัก</Label>
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
                {showNewUnit ? "ยกเลิก" : "สร้างหน่วยใหม่"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              เลือกได้เฉพาะหน่วยย่อยที่สุด (×1) — หน่วยที่มีตัวคูณให้ใส่ไว้ที่ &ldquo;หน่วยอื่น&rdquo;
            </p>

            <Combobox
              items={baseOptions}
              value={selectedOption}
              onValueChange={(option) =>
                setBaseUnitTypeId(option ? String(option.id) : "")
              }
              itemToStringLabel={unitOptionLabel}
              filter={unitOptionFilter}
              isItemEqualToValue={sameUnitOption}
              limit={50}
              autoHighlight
              disabled={isPending || baseOptions.length === 0}
            >
              <ComboboxInputGroup>
                <ComboboxInput
                  placeholder={
                    baseOptions.length === 0
                      ? "ยังไม่มีหน่วย ×1 — กด New unit type"
                      : `ค้นหา ${baseOptions.length} หน่วย ×1 — พิมพ์ชื่อหน่วย`
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
                  <Label htmlFor="new-unit-name">ชื่อหน่วย</Label>
                  <Input
                    id="new-unit-name"
                    value={unitName}
                    onChange={(event) => setUnitName(event.target.value)}
                    onKeyDown={handleUnitKeyDown}
                    placeholder="เช่น ชิ้น"
                    disabled={isPending}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  สร้างจากตรงนี้ได้เป็นหน่วยย่อยที่สุด (×1) ถ้าอยากได้ตัวคูณ ไปสร้างที่การ์ด &ldquo;หน่วยนับ&rdquo;
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
                  เพิ่มหน่วยนับ
                </Button>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>หน่วยอื่น</Label>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowExtraUnits((prev) => !prev)}
                disabled={isPending || extraOptions.length === 0}
              >
                {showExtraUnits ? <X /> : <Plus />}
                {showExtraUnits ? "ยกเลิก" : "เพิ่มหน่วยอื่น"}
              </Button>
            </div>

            {showExtraUnits &&
              (extraOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">ยังไม่มีหน่วยอื่นให้เลือก</p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    หน่วยอื่นที่ใช้ตัดสต็อกสินค้านี้ได้ เช่น ลัง (×12) พิมพ์เพื่อค้นหา
                  </p>

                  <Combobox
                    multiple
                    items={extraOptions}
                    value={selectedExtraOptions}
                    onValueChange={handleExtraUnitsChange}
                    itemToStringLabel={unitOptionLabel}
                    filter={unitOptionFilter}
                    isItemEqualToValue={sameUnitOption}
                    limit={50}
                    disabled={isPending}
                  >
                    <ComboboxInputGroup>
                      <ComboboxChips>
                        <ComboboxValue>
                          {(value) => (
                            <>
                              {value.map((option) => (
                                <ComboboxChip key={option.id} aria-label={option.label}>
                                  {option.label}
                                  <ComboboxChipRemove
                                    aria-label={`Remove ${option.label}`}
                                  />
                                </ComboboxChip>
                              ))}
                              <ComboboxInput
                                placeholder={
                                  value.length > 0
                                    ? ""
                                    : `ค้นหา ${extraOptions.length} หน่วย — ชื่อ หรือ "ลัง 20"`
                                }
                              />
                            </>
                          )}
                        </ComboboxValue>
                      </ComboboxChips>
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
                </>
              ))}

            {!showExtraUnits && selectedExtraOptions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                เลือกไว้ {selectedExtraOptions.length} หน่วย
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="product-qty">
              ยอดเริ่มต้น{baseUnit ? ` (${baseUnit.name})` : ""}
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
              ยกเลิก
            </DialogClose>
            <Button type="submit" disabled={!canSubmit || isPending}>
              สร้างสินค้า
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
