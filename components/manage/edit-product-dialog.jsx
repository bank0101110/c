"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

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
import { ImageField, uploadPendingImage } from "@/components/manage/image-field";
import {
  addUnitAction,
  removeUnitAction,
  updateProductAction,
} from "@/app/manage/actions";
import {
  baseUnitTypes,
  isBaseUnit,
  sameUnitOption,
  unitOptionFilter,
  unitOptionLabel,
  unitOptions,
} from "@/lib/stock";

function unitIdsOf(product) {
  return new Set(product.ProductUnitType.map((entry) => entry.unitTypeId));
}

export function EditProductDialog({ product, unitTypes, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "");
  // ไฟล์ที่เลือกไว้แต่ยังไม่ได้อัปโหลด รออัปตอนกดบันทึก
  const [imageFile, setImageFile] = useState(null);
  const [baseUnitTypeId, setBaseUnitTypeId] = useState(String(product.unitTypeId));
  const [selectedUnitIds, setSelectedUnitIds] = useState(() => unitIdsOf(product));
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const baseId = Number(baseUnitTypeId);

  // หน่วยมีได้เป็นหลักร้อย เลยใช้ combobox ที่พิมพ์ค้นได้ทั้งสองช่อง
  const options = useMemo(() => unitOptions(unitTypes), [unitTypes]);

  // หน่วยหลักเลือกได้เฉพาะ ×1 เหมือนตอนสร้างสินค้า แต่ถ้าของเดิมเป็น ×N ต้องคงไว้ในลิสต์
  // ไม่งั้นช่องจะโล่งเหมือนยังไม่ได้เลือก และผู้ใช้จะแก้ชื่อสินค้านั้นไม่ได้เลย
  const currentBaseUnit = unitTypes.find(
    (unitType) => unitType.id === product.unitTypeId
  );
  const legacyBaseUnit = currentBaseUnit && !isBaseUnit(currentBaseUnit);

  const baseOptions = useMemo(() => {
    const allowed = baseUnitTypes(unitTypes);
    if (currentBaseUnit && !isBaseUnit(currentBaseUnit)) allowed.push(currentBaseUnit);
    return unitOptions(allowed);
  }, [unitTypes, currentBaseUnit]);

  const baseOption = baseOptions.find((option) => option.id === baseId) ?? null;

  // หน่วยหลักไม่ต้องเลือกซ้ำในช่องหน่วยเสริม
  const extraOptions = useMemo(
    () => options.filter((option) => option.id !== baseId),
    [options, baseId]
  );
  const selectedOptions = useMemo(
    () => extraOptions.filter((option) => selectedUnitIds.has(option.id)),
    [extraOptions, selectedUnitIds]
  );

  // unitTypeId -> ProductUnitType.id เอาไว้อ้างตอนถอดหน่วยออก
  const savedUnits = useMemo(
    () => new Map(product.ProductUnitType.map((entry) => [entry.unitTypeId, entry.id])),
    [product.ProductUnitType]
  );

  const canSubmit = Boolean(name.trim()) && Boolean(baseUnitTypeId);

  // เปิดทีไรก็ดึงค่าล่าสุดของสินค้ามาใส่ใหม่ กันค่าค้างจากรอบก่อน
  function seed() {
    setName(product.name);
    setImageUrl(product.imageUrl ?? "");
    setImageFile(null);
    setBaseUnitTypeId(String(product.unitTypeId));
    setSelectedUnitIds(unitIdsOf(product));
    setError(null);
  }

  // แค่เลือกไว้เฉย ๆ ยังไม่ยิง server รอกด Save ทีเดียว
  function handleUnitsChange(nextOptions) {
    setSelectedUnitIds(new Set(nextOptions.map((option) => option.id)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    // หน่วยหลักไม่ต้องมีแถวซ้ำใน ProductUnitType เลยตัดออกจากทั้งฝั่งเพิ่มและสั่งลบถ้ามีค้าง
    const toAdd = unitTypes
      .filter(
        (unitType) =>
          selectedUnitIds.has(unitType.id) &&
          unitType.id !== baseId &&
          !savedUnits.has(unitType.id)
      )
      .map((unitType) => unitType.id);

    const toRemove = [...savedUnits]
      .filter(
        ([unitTypeId]) => !selectedUnitIds.has(unitTypeId) || unitTypeId === baseId
      )
      .map(([, entryId]) => entryId);

    startTransition(async () => {
      // อัปโหลดรูปก่อนแตะหน่วย ถ้าพลาดจะได้ยังไม่มีอะไรถูกแก้เลย
      let finalImageUrl = imageUrl.trim() || null;
      if (imageFile) {
        const uploaded = await uploadPendingImage(imageFile);
        if (!uploaded.ok) {
          setError(uploaded.error);
          return;
        }
        finalImageUrl = uploaded.url;
      }

      let failed = null;

      for (const unitTypeId of toAdd) {
        const result = await addUnitAction(product.id, unitTypeId);
        if (!result.ok) {
          failed = result.error;
          break;
        }
      }

      if (!failed) {
        for (const entryId of toRemove) {
          const result = await removeUnitAction(entryId);
          if (!result.ok) {
            failed = result.error;
            break;
          }
        }
      }

      // ปิดท้ายด้วย update สินค้า จะได้ product ที่รวมหน่วยล่าสุดกลับมาก้อนเดียว
      const result = await updateProductAction(
        product.id,
        name.trim(),
        finalImageUrl,
        baseId
      );
      if (!result.ok) {
        setError(failed ?? result.error);
        return;
      }

      // เขียนค่าล่าสุดกลับเสมอ ต่อให้บางหน่วยพลาด หน้าจอจะได้ตรงกับ DB
      onUpdated(result.product);
      if (failed) {
        setError(failed);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) seed();
      }}
    >
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`แก้ไข ${product.name}`}
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ไขสินค้า</DialogTitle>
          <DialogDescription>
            เปลี่ยนชื่อ รูป หน่วยหลัก หรือเลือกหน่วยที่ใช้กับสินค้านี้ได้
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-name-${product.id}`}>ชื่อสินค้า</Label>
            <Input
              id={`edit-name-${product.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
            />
          </div>

          <ImageField
            id={`edit-image-${product.id}`}
            value={imageUrl}
            onChange={setImageUrl}
            pendingFile={imageFile}
            onPendingFileChange={setImageFile}
            disabled={isPending}
          />

          <div className="flex flex-col gap-1.5">
            <Label>หน่วยหลัก</Label>
            <p className="text-xs text-muted-foreground">
              เลือกได้เฉพาะหน่วยย่อยที่สุด (×1) — หน่วยที่มีตัวคูณให้ใส่ไว้ที่ &ldquo;หน่วยอื่น&rdquo;
            </p>
            {legacyBaseUnit && (
              <p className="text-xs text-destructive">
                หน่วยหลักตอนนี้คือ {currentBaseUnit.name} (×{currentBaseUnit.qty})
                ซึ่งไม่ใช่ ×1 — เปลี่ยนเป็นหน่วย ×1 เมื่อไหร่จะย้อนกลับมาเลือกอันนี้อีกไม่ได้
              </p>
            )}
            <Combobox
              items={baseOptions}
              value={baseOption}
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
                      ? "ยังไม่มีหน่วย ×1 — สร้างที่การ์ดหน่วยนับก่อน"
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
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label>หน่วยอื่น</Label>
            <p className="text-xs text-muted-foreground">
              หน่วยอื่นที่ใช้ปรับสต็อกสินค้านี้ได้ พิมพ์เพื่อค้นหา — มีผลตอนกดบันทึก
            </p>

            {unitTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">ยังไม่มีหน่วยนับ</p>
            ) : (
              <>
                <Combobox
                  multiple
                  items={extraOptions}
                  value={selectedOptions}
                  onValueChange={handleUnitsChange}
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
                                  aria-label={`เอา ${option.label} ออก`}
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

                <p className="text-xs text-muted-foreground">
                  หน่วยหลักคือ {baseOption?.label ?? "-"} ติดมากับสินค้าเสมอ
                </p>
              </>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              ปิด
            </DialogClose>
            <Button type="submit" disabled={!canSubmit || isPending}>
              บันทึก
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
