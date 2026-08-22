"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageOff, Link2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { uploadProductImageAction } from "@/app/manage/actions";
import { compressImage } from "@/lib/compress-image";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

// รูปจากกล้องมือถือ 5-15 MB เป็นเรื่องปกติ เลยรับไฟล์ใหญ่ได้ถึง 30 MB แล้วย่อให้เอง
// ก่อนอัปโหลด (compressImage) — ที่ถึงเซิร์ฟเวอร์จริงจะเหลือหลักร้อย KB
//
// เช็คตรงนี้เพื่อบอกผู้ใช้ทันทีที่เลือกไฟล์ ไม่ต้องรอถึงตอนกดบันทึก
// ของจริงเซิร์ฟเวอร์เช็คซ้ำอีกรอบใน lib/supabase-storage.js เพราะฝั่ง client เชื่อไม่ได้
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

// เพดานหลังย่อแล้ว ต้องไม่เกินของฝั่งเซิร์ฟเวอร์ (10 MB) — ไฟล์ที่ย่อไม่ได้จริง ๆ
// (เช่น GIF เคลื่อนไหวไฟล์ใหญ่) จะมาตกตรงนี้ แล้วบอกผู้ใช้ตั้งแต่ตอนเลือก
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const formatMb = (bytes) => Math.round(bytes / 1024 / 1024);

/**
 * อัปโหลดไฟล์ที่ผู้ใช้เลือกค้างไว้ — ให้ฟอร์มเรียกตอนกดบันทึก
 * คืน { ok, url } เหมือน action เดิม
 */
export async function uploadPendingImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  return uploadProductImageAction(formData);
}

// ช่องรูปแบบหลายรูป (หมายเหตุจุดวาง) ใช้กฎเดียวกันเป๊ะ ๆ เลยเปิดของพวกนี้ให้ใช้ร่วม
// แทนที่จะก๊อปเพดานไฟล์กับข้อความ error ไปไว้อีกที่แล้วปรับไม่ตรงกันวันหลัง
export const IMAGE_ACCEPT = ACCEPT;
export const MAX_SOURCE_MB = formatMb(MAX_SOURCE_BYTES);

/** เช็คไฟล์ต้นฉบับก่อนย่อ — คืนข้อความ error หรือ null ถ้าผ่าน */
export function imageSourceError(file) {
  if (!ACCEPT.split(",").includes(file.type)) {
    return "รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF และ AVIF";
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return `ไฟล์ใหญ่เกิน ${formatMb(MAX_SOURCE_BYTES)} MB`;
  }
  return null;
}

/** ย่อให้ลงเพดานของเซิร์ฟเวอร์ — คืน { file } หรือ { error } */
export async function shrinkForUpload(file) {
  const ready = await compressImage(file);
  if (ready.size > MAX_UPLOAD_BYTES) {
    return {
      error: `ย่อรูปแล้วยังใหญ่เกิน ${formatMb(MAX_UPLOAD_BYTES)} MB — ลองถ่ายใหม่หรือใช้รูปอื่น`,
    };
  }
  return { file: ready };
}

function Preview({ url }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
      {failed ? (
        <ImageOff className="size-5 text-muted-foreground" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
    </div>
  );
}

/**
 * ช่องรูปสินค้าที่รับได้ 2 ทาง — อัปโหลดไฟล์ (เก็บที่ Supabase Storage) หรือวางลิงก์เอง
 *
 * ไฟล์ที่เลือกยัง "ไม่" ถูกอัปโหลดทันที แค่พรีวิวจากในเครื่องแล้วส่ง File กลับไปให้ฟอร์ม
 * ถือไว้ผ่าน onPendingFileChange — ฟอร์มค่อยเรียก uploadPendingImage() ตอนกดบันทึก
 * ทำแบบนี้เพราะกดยกเลิกกลางคันจะได้ไม่มีไฟล์ขยะค้างใน bucket
 */
export function ImageField({
  id,
  value,
  onChange,
  pendingFile = null,
  onPendingFileChange,
  disabled,
}) {
  const [mode, setMode] = useState("upload");
  const [error, setError] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  // ห้ามให้กดบันทึกระหว่างย่อรูป ไม่งั้นฟอร์มจะอัปไฟล์ต้นฉบับที่ยังไม่ถูกแทนที่
  const busy = disabled || compressing;

  // พรีวิวจากไฟล์ในเครื่อง ไม่ต้องรอ network
  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile]
  );

  // object URL ค้างในหน่วยความจำจนกว่าจะ revoke เลยผูกอายุไว้กับไฟล์ที่เลือกอยู่
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    // เคลียร์ค่า input ทันที ไม่งั้นเลือกไฟล์เดิมซ้ำจะไม่ยิง onChange อีก
    event.target.value = "";
    if (!file) return;

    const sourceError = imageSourceError(file);
    if (sourceError) {
      setError(sourceError);
      return;
    }

    setError(null);
    // ไฟล์ใหม่มาแทนลิงก์เดิมเสมอ ไม่งั้นจะงงว่าตกลงจะเอารูปไหน
    onChange("");

    // ไฟล์ที่ยังไม่เกินเพดานอยู่แล้ว ส่งให้ฟอร์มถือไว้ก่อนเลย พรีวิวจะได้ขึ้นทันที
    // และถ้าผู้ใช้กดบันทึกระหว่างที่ยังย่อไม่เสร็จ ก็ยังได้รูป (แค่ไฟล์ใหญ่กว่าที่ควร)
    if (file.size <= MAX_UPLOAD_BYTES) onPendingFileChange(file);

    setCompressing(true);
    // รูปจากกล้องต้องย่อก่อน ไม่งั้นชนเพดาน body ของ Server Action และอัปนานมากบนเน็ตมือถือ
    const ready = await shrinkForUpload(file);
    setCompressing(false);

    if (ready.error) {
      onPendingFileChange(null);
      setError(ready.error);
      return;
    }

    onPendingFileChange(ready.file);
  }

  function clearImage() {
    onChange("");
    onPendingFileChange(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>รูปภาพ</Label>

        {/* สองปุ่มสลับโหมด ไม่ใช่ dropdown เพราะมีแค่สองทางเลือก */}
        <div className="flex gap-1">
          <Button
            type="button"
            size="xs"
            variant={mode === "upload" ? "secondary" : "ghost"}
            aria-pressed={mode === "upload"}
            onClick={() => setMode("upload")}
            disabled={busy}
          >
            <Upload />
            อัปโหลด
          </Button>
          <Button
            type="button"
            size="xs"
            variant={mode === "url" ? "secondary" : "ghost"}
            aria-pressed={mode === "url"}
            onClick={() => setMode("url")}
            disabled={busy}
          >
            <Link2 />
            ใส่ลิงก์
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5">
        {previewUrl || value ? (
          // ไฟล์ที่เพิ่งเลือกมาก่อนลิงก์เดิมเสมอ เพราะมันคือสิ่งที่จะถูกบันทึกจริง
          <Preview key={previewUrl ?? value} url={previewUrl ?? value} />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-muted/40">
            <ImageOff className="size-5 text-muted-foreground" />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {mode === "upload" ? (
            <>
              <input
                ref={fileInputRef}
                id={id}
                type="file"
                accept={ACCEPT}
                onChange={handleFile}
                disabled={busy}
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {compressing ? <Spinner /> : <Upload />}
                {compressing
                  ? "กำลังย่อรูป…"
                  : previewUrl || value
                    ? "เปลี่ยนรูป"
                    : "เลือกไฟล์รูป"}
              </Button>
              {/* เหลือไว้แค่ข้อจำกัดของไฟล์ ซึ่งผู้ใช้ต้องรู้ก่อนเลือก ที่เหลือเป็นกลไกหลังบ้าน */}
              <p className="text-xs text-muted-foreground">
                ถ่ายจากมือถือได้เลย ระบบย่อรูปให้อัตโนมัติ — JPG, PNG, WebP, GIF, AVIF ไม่เกิน{" "}
                {formatMb(MAX_SOURCE_BYTES)} MB
              </p>
            </>
          ) : (
            <>
              <Input
                id={id}
                value={value ?? ""}
                onChange={(event) => {
                  // พิมพ์ลิงก์เอง = ทิ้งไฟล์ที่เลือกค้างไว้ ไม่งั้นจะมีสองแหล่งแย่งกัน
                  onPendingFileChange(null);
                  onChange(event.target.value);
                  setError(null);
                }}
                placeholder="https://..."
                disabled={busy}
              />
            </>
          )}

          {(previewUrl || value) && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="self-start"
              disabled={busy}
              onClick={clearImage}
            >
              <Trash2 />
              เอารูปออก
            </Button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
