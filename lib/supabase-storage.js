// อัปโหลดรูปสินค้าขึ้น Supabase Storage
//
// ยิง REST API ตรง ๆ ไม่ได้ลง @supabase/supabase-js เพราะใช้แค่ upload ครั้งเดียว
// ไม่คุ้มกับการเพิ่ม dependency
//
// รันฝั่งเซิร์ฟเวอร์เท่านั้น เรียกผ่าน Server Action ที่เช็ค requireUser() มาก่อนแล้ว
// ต้องใช้ service role key ไม่ใช่ anon key เพราะต้องข้าม RLS ของ storage.objects
// ห้ามเอา key นี้ไปโผล่ฝั่ง client เด็ดขาด
// (ชื่อ env ไม่ขึ้นต้นด้วย NEXT_PUBLIC_ อยู่แล้ว Next จึงไม่ bundle ไปฝั่ง browser)
//
// bucket ต้องตั้งเป็น Public ไม่งั้น URL ที่คืนไปจะโหลดรูปไม่ขึ้น

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// map ชนิดไฟล์ -> นามสกุล เพื่อไม่ต้องเชื่อชื่อไฟล์ที่ผู้ใช้ส่งมา
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function getConfig() {
  // ตัด / ท้าย URL ทิ้ง ไม่งั้นต่อ path แล้วได้ // ซึ่ง Supabase ตอบ 404
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images";

  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey, bucket };
}

/** URL สาธารณะของ object — ใช้ได้เมื่อ bucket ตั้งเป็น Public เท่านั้น */
function publicImageUrl(config, objectName) {
  return `${config.url}/storage/v1/object/public/${config.bucket}/${objectName}`;
}

/** อัปโหลดรูปสินค้าแล้วคืน URL ที่เอาไปเก็บใน Product.imageUrl ได้เลย */
export async function uploadProductImage(file) {
  const config = getConfig();
  if (!config) {
    return {
      ok: false,
      error:
        "ยังไม่ได้ตั้งค่า Supabase Storage — ต้องมี SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env (ระหว่างนี้ใช้โหมด “ใส่ลิงก์” ไปก่อนได้)",
    };
  }

  // FormData ที่ไม่ได้แนบไฟล์จะได้ string ว่างกลับมา ไม่ใช่ File
  if (!file || typeof file.arrayBuffer !== "function" || !file.size) {
    return { ok: false, error: "ไม่พบไฟล์ที่อัปโหลด" };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `ไฟล์ใหญ่เกิน ${MAX_IMAGE_BYTES / 1024 / 1024} MB` };
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return { ok: false, error: "รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF และ AVIF" };
  }

  // ชื่อไฟล์สุ่มใหม่เสมอ กันชื่อซ้ำและกันอักขระแปลก ๆ ที่ผู้ใช้ตั้งมา
  const objectName = `${crypto.randomUUID()}.${extension}`;

  const response = await fetch(
    `${config.url}/storage/v1/object/${config.bucket}/${objectName}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.serviceRoleKey}`,
        apikey: config.serviceRoleKey,
        "content-type": file.type,
        // กันเขียนทับของเดิมถ้าบังเอิญ UUID ชนกัน อยากรู้ดีกว่าเงียบ ๆ แล้วรูปหาย
        "x-upsert": "false",
        "cache-control": "31536000",
      },
      body: file,
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("supabase storage upload failed", response.status, detail);

    // Storage ตอบ HTTP 400 แทบทุกเคส แล้วซ่อนสถานะจริงไว้ใน body เป็น statusCode/code
    // ดูแค่ response.status จึงแยกสาเหตุไม่ออก ต้องแกะ body ด้วย
    const payload = (() => {
      try {
        return JSON.parse(detail);
      } catch {
        return {};
      }
    })();
    const status = Number(payload.statusCode) || response.status;
    const code = payload.code ?? "";

    if (status === 404 || code === "NoSuchBucket") {
      return {
        ok: false,
        error: `ไม่พบ bucket “${config.bucket}” ใน Supabase — สร้างก่อนแล้วตั้งเป็น Public`,
      };
    }
    if (status === 401 || status === 403 || code === "AccessDenied") {
      // anon key จะติด RLS ของ storage.objects ตรงนี้เสมอ อาการเหมือนคีย์ผิดทุกอย่าง
      return {
        ok: false,
        error: "Supabase ปฏิเสธการเขียน (ติด RLS) — ต้องใช้ service_role key ไม่ใช่ anon key",
      };
    }
    if (status === 409 || code === "Duplicate") {
      return { ok: false, error: "มีไฟล์ชื่อนี้อยู่แล้ว ลองอัปโหลดใหม่อีกครั้ง" };
    }
    if (status === 413 || code === "EntityTooLarge") {
      return { ok: false, error: "ไฟล์ใหญ่เกินลิมิตที่ตั้งไว้ที่ bucket" };
    }
    return { ok: false, error: "อัปโหลดรูปขึ้น Supabase Storage ไม่สำเร็จ" };
  }

  return { ok: true, url: publicImageUrl(config, objectName) };
}
