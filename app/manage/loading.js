import { Skeleton } from "@/components/ui/skeleton";

// หน้าจัดการรอทั้ง session, สินค้า และหน่วยนับ ก่อนจะวาดอะไรได้เลย
// โครงนี้ขึ้นทันทีที่กดเมนู แล้ว <Link> ยัง prefetch มันไว้ล่วงหน้าได้อีก
export default function ManageLoading() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
          <Skeleton className="h-5 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="size-7 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {/* การ์ดสินค้ากับการ์ดหน่วยนับ เรียงเหมือนของจริง */}
          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-lg" />
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
            <Skeleton className="h-5 w-24" />
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
