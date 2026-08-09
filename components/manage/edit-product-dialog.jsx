"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
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
import { saveProductAction } from "@/app/manage/actions";
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

/**
 * สินค้าหน้าตาที่ "น่าจะ" ได้หลังบันทึก เอาไปทับตารางทันทีโดยไม่รอ server
 * ของจริงจาก server มาถึงเมื่อไหร่ค่อยทับซ้ำอีกที พลาดก็ย้อนกลับเป็นตัวเดิม
 *
 * ต้องประกอบ baseUnit/unitType ให้ครบ เพราะตารางกับ dialog ปรับสต็อกอ่านจากตรงนี้
 */
function optimisticProduct(product, unitTypes, { name, imageUrl, baseUnitTypeId, unitIds }) {
  const byUnitTypeId = new Map(unitTypes.map((unitType) => [unitType.id, unitType]));
  const saved = new Map(
    product.ProductUnitType.map((entry) => [entry.unitTypeId, entry])
  );

  return {
    ...product,
    name,
    imageUrl,
    unitTypeId: baseUnitTypeId,
    baseUnit: byUnitTypeId.get(baseUnitTypeId) ?? product.baseUnit,
    ProductUnitType: unitIds
      .filter((unitTypeId) => byUnitTypeId.has(unitTypeId))
      .map(
        (unitTypeId) =>
          saved.get(unitTypeId) ?? {
            // id จริงยังไม่รู้จนกว่า server จะตอบ ใช้ค่าลบกันชนกับของจริงไว้ก่อน
            // (ไม่มีที่ไหนเอา id ของแถวนี้ไปแสดงหรือไปอ้างต่อ)
            id: -unitTypeId,
            ProductId: product.id,
            unitTypeId,
            unitType: byUnitTypeId.get(unitTypeId),
          }
      ),
  };
}

export function EditProductDialog({ product, unitTypes, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "");
  // ไฟล์ที่เลือกไว้แต่ยังไม่ได้อัปโหลด รออัปตอนกดบันทึก
  const [imageFile, setImageFile] = useState(null);
  const [baseUnitTypeId, setBaseUnitTypeId] = useState(String(product.unitTypeId));
  const [selectedUnitIds, setSelectedUnitIds] = useState(() => unitIdsOf(product));
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

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

  const canSubmit = Boolean(name.trim()) && Boolean(baseUnitTypeId);

  // เปิดทีไรก็ดึงค่าล่าสุดของสินค้ามาใส่ใหม่ กันค่าค้างจากรอบก่อน
  function seed() {
    setName(product.name);
    setImageUrl(product.imageUrl ?? "");
    setImageFile(null);
    setBaseUnitTypeId(String(product.unitTypeId));
    setSelectedUnitIds(unitIdsOf(product));
  }

  // แค่เลือกไว้เฉย ๆ ยังไม่ยิง server รอกด Save ทีเดียว
  function handleUnitsChange(nextOptions) {
    setSelectedUnitIds(new Set(nextOptions.map((option) => option.id)));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    // ส่งชุดหน่วยเสริมที่ต้องการไปทั้งชุด ให้ server หาส่วนต่างเอง
    // หน่วยหลักไม่ต้องมีแถวซ้ำใน ProductUnitType เลยตัดออกตรงนี้
    const unitIds = [...selectedUnitIds].filter((unitTypeId) => unitTypeId !== baseId);

    // เก็บค่าไว้ก่อนปิด dialog เพราะ state จะถูก seed ใหม่ตอนเปิดครั้งหน้า
    const productName = name.trim();
    const pendingImage = imageFile;
    const typedImageUrl = imageUrl.trim() || null;

    // ปิดทันทีไม่รอ server แล้วไปรายงานผลที่ toast
    setOpen(false);

    const fail = (description) => {
      // ย้อนแถวกลับเป็นของเดิม ไม่ปล่อยให้หน้าจอโชว์ค่าที่บันทึกไม่ติด
      onUpdated(product);
      toast({
        variant: "destructive",
        title: `บันทึก ${productName} ไม่สำเร็จ`,
        description,
        duration: 0,
      });
    };

    // ไม่มีรูปรออัปโหลด = รู้ผลลัพธ์ครบแล้ว ทับตารางได้เลยไม่ต้องรอ server
    // (ถ้ามีรูปรออยู่ URL จริงยังไม่เกิด รอให้อัปเสร็จก่อนค่อยทับทีเดียว)
    if (!pendingImage) {
      onUpdated(
        optimisticProduct(product, unitTypes, {
          name: productName,
          imageUrl: typedImageUrl,
          baseUnitTypeId: baseId,
          unitIds,
        })
      );
    }

    startTransition(async () => {
      // อัปโหลดรูปก่อน ถ้าพลาดจะได้ยังไม่มีอะไรถูกแก้เลย
      let finalImageUrl = typedImageUrl;
      if (pendingImage) {
        const uploaded = await uploadPendingImage(pendingImage);
        if (!uploaded.ok) {
          fail(uploaded.error);
          return;
        }
        finalImageUrl = uploaded.url;
      }

      // ชื่อ รูป หน่วยหลัก และหน่วยเสริมทั้งชุด จบใน action เดียว/ทรานแซกชันเดียว
      const result = await saveProductAction(
        product.id,
        productName,
        finalImageUrl,
        baseId,
        unitIds
      );

      if (!result.ok) {
        fail(result.error);
        return;
      }

      onUpdated(result.product);
      toast({ variant: "success", title: `บันทึก ${productName} แล้ว` });
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
              </>
            )}
          </div>

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
