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
import {
  addUnitAction,
  removeUnitAction,
  updateProductAction,
} from "@/app/manage/actions";
import {
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
  const [baseUnitTypeId, setBaseUnitTypeId] = useState(String(product.unitTypeId));
  const [selectedUnitIds, setSelectedUnitIds] = useState(() => unitIdsOf(product));
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();

  const baseId = Number(baseUnitTypeId);

  // หน่วยมีได้เป็นหลักร้อย เลยใช้ combobox ที่พิมพ์ค้นได้ทั้งสองช่อง
  const options = useMemo(() => unitOptions(unitTypes), [unitTypes]);
  const baseOption = options.find((option) => option.id === baseId) ?? null;

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
        imageUrl.trim() || null,
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
            aria-label={`Edit ${product.name}`}
          />
        }
      >
        <Pencil />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit product</DialogTitle>
          <DialogDescription>
            Rename the product, change its base unit, or pick which units it can use.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-name-${product.id}`}>Name</Label>
            <Input
              id={`edit-name-${product.id}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`edit-image-${product.id}`}>Image URL</Label>
            <Input
              id={`edit-image-${product.id}`}
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="https://..."
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Base unit</Label>
            <Combobox
              items={options}
              value={baseOption}
              onValueChange={(option) =>
                setBaseUnitTypeId(option ? String(option.id) : "")
              }
              itemToStringLabel={unitOptionLabel}
              filter={unitOptionFilter}
              isItemEqualToValue={sameUnitOption}
              limit={50}
              autoHighlight
              disabled={isPending}
            >
              <ComboboxInputGroup>
                <ComboboxInput placeholder={`ค้นหา ${unitTypes.length} หน่วย — ชื่อ หรือ "ลัง 20"`} />
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
            <Label>Other units</Label>
            <p className="text-xs text-muted-foreground">
              หน่วยอื่นที่ใช้ตัดสต็อกสินค้านี้ได้ พิมพ์เพื่อค้นหา — มีผลตอนกด Save
            </p>

            {unitTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unit types yet.</p>
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

                <p className="text-xs text-muted-foreground">
                  หน่วยหลักคือ {baseOption?.label ?? "-"} ติดมากับสินค้าเสมอ
                </p>
              </>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Close
            </DialogClose>
            <Button type="submit" disabled={!canSubmit || isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
