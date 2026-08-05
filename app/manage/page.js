import { getProducts } from "@/app/server/product";
import { getQtyTypes } from "@/app/server/qtyType";
import { getUsers } from "@/app/server/user";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ManageDashboard } from "@/components/manage/manage-dashboard";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const [products, qtyTypes, users] = await Promise.all([
    getProducts(),
    getQtyTypes(),
    getUsers(),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <ManageDashboard products={products} qtyTypes={qtyTypes} users={users} />
      </main>
      <Footer />
    </div>
  );
}
