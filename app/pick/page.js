import { getCategories } from "@/app/server/category";
import { requireUser } from "@/app/server/session";
import { Navbar } from "@/components/landing/navbar";
import { QuickPick } from "@/components/pick/quick-pick";

export const dynamic = "force-dynamic";

export const metadata = { title: "เบิกของ" };

/**
 * หน้าเบิกเร็ว — ค้นหาของข้ามทุกสินค้าแล้วใส่ตะกร้ารัว ๆ
 *
 * ต้องล็อกอินก่อน เพราะเป็นเครื่องมือหลังร้าน (และปลายทางคือการตัดสต็อกซึ่งต้องรู้ว่าใครทำ)
 */
export default async function PickPage() {
  // เช็คสิทธิ์ให้จบก่อนค่อยดึงข้อมูล ไม่งั้น Next เริ่มสตรีมหน้าไปแล้วค่อยเด้ง
  // ผลคือได้ 200 พร้อมคำสั่ง redirect ฝังในสตรีมแทน 307 ตรง ๆ (หมวดมาจากแคชอยู่แล้ว ไม่ได้ช้าขึ้น)
  const user = await requireUser("/pick");
  const categories = await getCategories();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar currentUser={user} />
      <main className="flex flex-1 flex-col">
        <QuickPick categories={categories} />
      </main>
    </div>
  );
}
