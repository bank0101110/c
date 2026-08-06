import { getProducts } from "@/app/server/product";
import { getUnitTypes } from "@/app/server/unitType";
import { requireUser } from "@/app/server/session";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ManageDashboard } from "@/components/manage/manage-dashboard";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  // proxy.js เช็คแค่ว่ามี cookie การเช็คจริงอยู่ตรงนี้ — cookie หมดอายุ/ปลอมจะโดนเด้งที่นี่
  const currentUser = await requireUser("/manage");
  const [products, unitTypes] = await Promise.all([getProducts(), getUnitTypes()]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar currentUser={currentUser} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <ManageDashboard
          products={products}
          unitTypes={unitTypes}
          currentUser={currentUser}
        />
      </main>
      <Footer />
    </div>
  );
}
