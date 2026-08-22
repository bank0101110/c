"use client";

import { useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  MapPin,
  Maximize2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { uploadPendingImage } from "@/components/manage/image-field";
import { NoteImagesField } from "@/components/product/note-images-field";
import { saveProductNoteAction } from "@/app/manage/actions";
import { thumbnailUrl } from "@/lib/images";

const NOTE_MAX_LENGTH = 500;

// ต้องตรงกับ NOTE_MAX_IMAGES ฝั่ง server — ที่นี่กันไว้ให้ผู้ใช้เห็นตั้งแต่ตอนเลือก
// ส่วนของจริงตัดสินที่ saveProductNoteAction
const NOTE_MAX_IMAGES = 5;

const formatWhen = (value) =>
  new Date(value).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * รูปจุดวางแบบเต็มจอ — กดที่รูปย่อแล้วค่อยโหลดต้นฉบับ ไม่ต้องแบกไฟล์ใหญ่มาตั้งแต่เปิดหน้า
 *
 * มีหลายรูปก็ยังโชว์รูปย่อใบเดียวติดป้ายจำนวนที่เหลือ ไม่ได้เรียงรูปย่อทุกใบออกมา
 * เพราะกล่องหมายเหตุอยู่กลางหน้าสินค้า ปล่อยให้มันสูงขึ้นเรื่อย ๆ ตามจำนวนรูปไม่ได้
 */
function PhotoDialog({ urls, alt }) {
  const [failed, setFailed] = useState(false);
  const [at, setAt] = useState(0);

  const total = urls.length;
  const current = urls[Math.min(at, total - 1)];

  const step = (delta) => setAt((prev) => (prev + delta + total) % total);

  return (
    <Dialog onOpenChange={(open) => open && setAt(0)}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={total > 1 ? `ดูรูปจุดวางทั้ง ${total} รูป` : "ดูรูปจุดวางแบบเต็ม"}
            className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-24"
          />
        }
      >
        {failed ? (
          <ImageOff className="mx-auto size-5 text-muted-foreground" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl(urls[0])}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        )}

        {total > 1 && (
          <span className="absolute top-1 left-1 rounded-md bg-background/85 px-1.5 py-0.5 text-[0.65rem] font-medium text-foreground">
            +{total - 1}
          </span>
        )}

        <span className="absolute right-1 bottom-1 rounded-md bg-background/80 p-1 text-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <Maximize2 className="size-3" />
        </span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>รูปจุดวางสินค้า</DialogTitle>
          <DialogDescription>
            {alt}
            {total > 1 ? ` — รูปที่ ${at + 1} จาก ${total}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={alt}
            className="max-h-[70vh] w-full rounded-xl object-contain"
          />

          {total > 1 && (
            <>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="รูปก่อนหน้า"
                onClick={() => step(-1)}
                className="absolute top-1/2 left-2 -translate-y-1/2"
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="รูปถัดไป"
                onClick={() => step(1)}
                className="absolute top-1/2 right-2 -translate-y-1/2"
              >
                <ChevronRight />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * หมายเหตุประจำสินค้า — ของอยู่โกดังไหน วางตรงไหน ย้ายไปแล้วหรือยัง
 *
 * แยกจากหมายเหตุของแต่ละรายการตัดสต็อกในประวัติ (อันนั้นเป็นบันทึกของเหตุการณ์ที่ผ่านไปแล้ว
 * แก้ไม่ได้) อันนี้คือสถานะปัจจุบันที่ต้องแก้ทับได้เรื่อย ๆ ใครล็อกอินแล้วก็แก้ได้
 * เพราะคนที่ย้ายของจริงมักไม่ใช่เจ้าของสินค้า
 */
export function NoteCard({ product, currentUser, onSaved }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const note = product.note ?? "";
  const noteImages = product.noteImageUrls ?? [];
  const hasNote = Boolean(note || noteImages.length > 0);
  const editor = product.noteUpdatedBy;

  /** เปิดฟอร์มทีไรต้องเริ่มจากค่าปัจจุบันเสมอ ไม่ใช่ค่าที่ค้างจากรอบก่อน */
  function openEditor(next) {
    setOpen(next);
    if (!next) return;
    setText(note);
    setImages(noteImages.map((url) => ({ key: url, url })));
  }

  function save({ clear = false } = {}) {
    const nextText = clear ? "" : text.trim();
    const pending = clear ? [] : images;

    startTransition(async () => {
      // อัปทีละไฟล์ ไม่ยิงพร้อมกัน — เน็ตมือถือช้าอยู่แล้ว ยิงขนานกันหลายรูปมีแต่จะแย่ง
      // แบนด์วิดท์กันเอง และพังทีก็ไม่รู้ว่ารูปไหน
      const urls = [];
      for (const item of pending) {
        if (!item.file) {
          if (item.url) urls.push(item.url);
          continue;
        }

        const uploaded = await uploadPendingImage(item.file);
        if (!uploaded.ok) {
          toast({
            variant: "destructive",
            title: "อัปโหลดรูปไม่สำเร็จ",
            description: uploaded.error,
            duration: 0,
          });
          return;
        }
        urls.push(uploaded.url);
      }

      const result = await saveProductNoteAction(product.id, nextText, urls);
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "บันทึกหมายเหตุไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        return;
      }

      onSaved(result.product);
      setOpen(false);
      toast({
        variant: "success",
        title: clear ? "ลบหมายเหตุแล้ว" : "บันทึกหมายเหตุแล้ว",
      });
    });
  }

  // ยังไม่มีหมายเหตุและคนดูก็แก้ไม่ได้ (ยังไม่ล็อกอิน) — ไม่ต้องมีกล่องว่างเกะกะ
  if (!hasNote && !currentUser) return null;

  return (
    <div className="mt-6 rounded-xl border border-border bg-muted/30 p-3">
      <div className="flex items-start gap-3">
        {noteImages.length > 0 && (
          <PhotoDialog urls={noteImages} alt={`จุดวางของ ${product.name}`} />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MapPin className="size-3.5" />
            หมายเหตุ / ที่เก็บของ
          </div>

          {note ? (
            // ขึ้นบรรทัดใหม่ที่ผู้ใช้พิมพ์ต้องคงไว้ คนมักเขียนเป็นข้อ ๆ
            <p className="text-sm break-words whitespace-pre-wrap">{note}</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {noteImages.length > 0
                ? "มีแต่รูปจุดวาง"
                : "ยังไม่มีหมายเหตุ — เพิ่มไว้บอกว่าของอยู่ตรงไหน"}
            </p>
          )}

          {product.noteUpdatedAt && (
            <p className="text-[0.7rem] text-muted-foreground">
              แก้ล่าสุด {formatWhen(product.noteUpdatedAt)}
              {editor ? ` โดย ${editor.name || editor.email}` : ""}
            </p>
          )}
        </div>

        {currentUser && (
          <Dialog open={open} onOpenChange={openEditor}>
            <DialogTrigger
              render={<Button variant="outline" size="sm" className="h-8 shrink-0" />}
            >
              {hasNote ? <Pencil /> : <Plus />}
              {hasNote ? "แก้" : "เพิ่ม"}
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>หมายเหตุ — {product.name}</DialogTitle>
                <DialogDescription>
                  ย้ายโกดัง เปลี่ยนจุดวาง หรืออะไรที่คนมาหยิบของต้องรู้ — ทุกคนที่เปิดหน้านี้จะเห็น
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="product-note">ข้อความ</Label>
                  <Textarea
                    id="product-note"
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    maxLength={NOTE_MAX_LENGTH}
                    rows={4}
                    placeholder="เช่น ย้ายไปโกดัง 2 ชั้นล่าง แถวซ้ายสุด ติดประตูหลัง"
                    disabled={isPending}
                  />
                  <p className="text-[0.7rem] text-muted-foreground">
                    {text.length}/{NOTE_MAX_LENGTH}
                  </p>
                </div>

                <NoteImagesField
                  id="product-note-image"
                  items={images}
                  onChange={setImages}
                  max={NOTE_MAX_IMAGES}
                  disabled={isPending}
                />
              </div>

              <DialogFooter>
                {hasNote && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="mr-auto text-destructive"
                    onClick={() => save({ clear: true })}
                    disabled={isPending}
                  >
                    <Trash2 />
                    ลบหมายเหตุ
                  </Button>
                )}
                <DialogClose render={<Button type="button" variant="outline" />}>
                  ยกเลิก
                </DialogClose>
                <Button type="button" onClick={() => save()} disabled={isPending}>
                  บันทึก
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
