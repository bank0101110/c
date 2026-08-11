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
import { useToast } from "@/components/ui/toast";
import { ImageField, uploadPendingImage } from "@/components/manage/image-field";
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

/**
 * เพิ่มสินค้าใหม่ — ชื่อ รูป หน่วยนับ และยอดเริ่มต้น
 *
 * หน่วยที่เลือกตรงนี้เป็นของ "ตัวเลือกเริ่มต้น" ที่ระบบสร้างให้อัตโนมัติหนึ่งตัว
 * ไม่ใช่หน่วยของตัวสินค้า (สินค้าไม่มีหน่วยของตัวเองแล้ว) ส่วนหน่วยอื่นและตัวเลือกเพิ่มเติม
 * ไปจัดการต่อที่ปุ่มจัดการตัวเลือกในตารางสินค้า
 */
export function NewProductDialog({ unitTypes, setUnitTypes, onCreated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [baseUnitTypeId, setBaseUnitTypeId] = useState("");
  const [qty, setQty] = useState("0");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // สร้างหน่วยใหม่ได้ในตัว ไม่ต้องปิด dialog ไปสร้างที่แท็บหน่วยนับก่อน
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [unitError, setUnitError] = useState(null);

  const canCreateUnit = Boolean(unitName.trim());

  // ยอดเก็บเป็นหน่วยย่อยที่สุด หน่วยเริ่มต้นจึงต้องเป็น ×1
  const baseOptions = useMemo(() => unitOptions(baseUnitTypes(unitTypes)), [unitTypes]);
  const selectedOption =
    baseOptions.find((option) => String(option.id) === baseUnitTypeId) ?? null;
  const baseUnit = unitTypes.find((unitType) => String(unitType.id) === baseUnitTypeId);

  const canSubmit =
    Boolean(name.trim()) && Boolean(baseUnitTypeId) && Number(qty) >= 0;

  function reset() {
    setName("");
    setImageUrl("");
    setImageFile(null);
    setBaseUnitTypeId("");
    setQty("0");
    setShowNewUnit(false);
    setUnitName("");
    setUnitError(null);
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

    // เก็บค่าไว้ก่อนปิด เพราะ reset() จะล้าง state ทิ้งทันที
    const productName = name.trim();
    const pendingImage = imageFile;
    const typedImageUrl = imageUrl.trim() || null;
    const startQty = Number(qty);
    const unitId = Number(baseUnitTypeId);

    reset();
    setOpen(false);

    startTransition(async () => {
      let finalImageUrl = typedImageUrl;
      if (pendingImage) {
        const uploaded = await uploadPendingImage(pendingImage);
        if (!uploaded.ok) {
          toast({
            variant: "destructive",
            title: `สร้าง ${productName} ไม่สำเร็จ`,
            description: uploaded.error,
            duration: 0,
          });
          return;
        }
        finalImageUrl = uploaded.url;
      }

      // หน่วยเสริมไม่ต้องส่งแล้ว ไปเพิ่มทีหลังที่กล่องจัดการตัวเลือก
      const result = await createProductAction(
        productName,
        finalImageUrl,
        unitId,
        startQty,
        []
      );

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: `สร้าง ${productName} ไม่สำเร็จ`,
          description: result.error,
          duration: 0,
        });
        return;
      }

      onCreated(result.product);
      toast({ variant: "success", title: `เพิ่ม ${productName} แล้ว` });
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
          <DialogDescription>
            ระบบจะสร้างตัวเลือกเริ่มต้นให้หนึ่งตัว เพิ่มตัวเลือกอื่นได้ทีหลัง
          </DialogDescription>
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
            pendingFile={imageFile}
            onPendingFileChange={setImageFile}
            disabled={isPending}
          />

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>หน่วยนับ</Label>
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
                      ? "ยังไม่มีหน่วย ×1 — กดสร้างหน่วยใหม่"
                      : `ค้นหา ${baseOptions.length} หน่วย`
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
