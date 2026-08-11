"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

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
import { useToast } from "@/components/ui/toast";
import { ImageField, uploadPendingImage } from "@/components/manage/image-field";
import { saveProductAction } from "@/app/manage/actions";

/**
 * แก้ไขสินค้า — เหลือแค่ชื่อกับรูป
 *
 * หน่วยนับย้ายไปอยู่ที่ระดับตัวเลือกย่อย (SKU) ทั้งหมดแล้ว เพราะแต่ละตัวเลือกนับคนละหน่วยกันได้
 * (ถุง 6x9 กับ 12x20 คนละขนาด) แก้หน่วยได้ที่ปุ่มจัดการตัวเลือกในตารางสินค้า
 *
 * ยังต้องส่ง unitTypeId เดิมกลับไปให้ action เพราะคอลัมน์นั้นเป็น NOT NULL อยู่
 * แต่ผู้ใช้ไม่ได้เห็นและไม่ได้แก้มันแล้ว
 */
export function EditProductDialog({ product, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(product.name);
  const [imageUrl, setImageUrl] = useState(product.imageUrl ?? "");
  const [imageFile, setImageFile] = useState(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const canSubmit = Boolean(name.trim());

  // เปิดทีไรก็ดึงค่าล่าสุดมาใส่ใหม่ กันค่าค้างจากรอบก่อน
  function seed() {
    setName(product.name);
    setImageUrl(product.imageUrl ?? "");
    setImageFile(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    const productName = name.trim();
    const pendingImage = imageFile;
    const typedImageUrl = imageUrl.trim() || null;

    // ปิดทันทีไม่รอ server แล้วไปรายงานผลที่ toast
    setOpen(false);

    startTransition(async () => {
      let finalImageUrl = typedImageUrl;
      if (pendingImage) {
        const uploaded = await uploadPendingImage(pendingImage);
        if (!uploaded.ok) {
          toast({
            variant: "destructive",
            title: `บันทึก ${productName} ไม่สำเร็จ`,
            description: uploaded.error,
            duration: 0,
          });
          return;
        }
        finalImageUrl = uploaded.url;
      }

      // หน่วยเสริมระดับสินค้าไม่มีให้แก้แล้ว ส่ง [] ไปเพื่อล้างของเก่าที่ค้างอยู่
      const result = await saveProductAction(
        product.id,
        productName,
        finalImageUrl,
        product.unitTypeId,
        []
      );

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: `บันทึก ${productName} ไม่สำเร็จ`,
          description: result.error,
          duration: 0,
        });
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
          <Button variant="ghost" size="icon-sm" aria-label={`แก้ไข ${product.name}`} />
        }
      >
        <Pencil />
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>แก้ไขสินค้า</DialogTitle>
          <DialogDescription>
            หน่วยนับอยู่ที่ตัวเลือกย่อย แก้ได้ที่ปุ่มจัดการตัวเลือก
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
