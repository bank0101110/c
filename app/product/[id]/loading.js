import { Skeleton } from "@/components/ui/skeleton";

/**
 * โครงหน้าสินค้าระหว่างรอข้อมูล
 *
 * กดการ์ดจากหน้าแรกแล้ว Next จะสลับมาหน้านี้ทันที ไม่ต้องค้างอยู่หน้าเดิมจนกว่าเซิร์ฟเวอร์
 * จะตอบ — ผู้ใช้เห็นว่า "กดติดแล้ว" ตั้งแต่มิลลิวินาทีแรก แล้วเนื้อหาจริงค่อยมาแทนที่
 *
 * วางให้ตรงกับโครงจริงของ ProductDetail (รูป + หัวเรื่อง + การ์ดตัวเลือก) เพื่อไม่ให้
 * หน้ากระโดดตอนของจริงมาถึง
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-32 sm:px-6">
      <Skeleton className="mt-4 h-8 w-24 rounded-lg" />

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
        <Skeleton className="aspect-square w-full shrink-0 rounded-2xl sm:size-44" />

        <div className="flex flex-1 flex-col gap-2.5">
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-6 w-3/4 rounded-lg" />
          <Skeleton className="h-8 w-40 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
      </div>

      <Skeleton className="mt-6 h-20 w-full rounded-xl" />

      <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {/* หกใบพอให้เต็มหน้าจอแรก ที่เหลือถึงจะโหลดเสร็จก็อยู่ใต้ fold อยู่ดี */}
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
