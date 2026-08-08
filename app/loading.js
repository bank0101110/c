import { Skeleton } from "@/components/ui/skeleton";

// หน้าแรกเป็น force-dynamic ทุกครั้งที่เข้าต้องรอ DB ก่อนถึงจะมีอะไรให้ดู
// ไฟล์นี้ทำให้ Next ส่งโครงหน้าไปวาดทันทีระหว่างรอ แทนที่จะค้างหน้าเดิมไว้เฉย ๆ
// และทำให้ <Link> prefetch โครงนี้ไว้ล่วงหน้าได้ด้วย
export default function HomeLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* แถบ navbar — ความสูงต้องตรงกับของจริง (h-14) ไม่งั้นหน้ากระตุกตอนสลับ */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="border-b border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-16 sm:px-6 sm:py-24">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-9 w-full max-w-2xl sm:h-12" />
          <Skeleton className="h-5 w-full max-w-xl" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {/* 12 ใบพอเต็มจอแรกโดยไม่ต้องวาดเกินจำเป็น */}
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
