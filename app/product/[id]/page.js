import { notFound } from "next/navigation";

import { getProduct } from "@/app/server/product";
import { getUnitTypes } from "@/app/server/unitType";
import { getCategories } from "@/app/server/category";
import { getCurrentUser } from "@/app/server/session";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ProductDetail } from "@/components/product/product-detail";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProduct(Number(id));
  return { title: product ? `${product.name} — เช็คสต็อก` : "ไม่พบสินค้า" };
}

export default async function ProductPage({ params }) {
  // params เป็น Promise ใน Next รุ่นนี้ ต้อง await ก่อนใช้
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const [product, unitTypes, categories, currentUser] = await Promise.all([
    getProduct(productId),
    getUnitTypes(),
    getCategories(),
    getCurrentUser(),
  ]);

  if (!product) notFound();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <ProductDetail
          product={product}
          unitTypes={unitTypes}
          categories={categories}
          currentUser={currentUser}
        />
      </main>
      <Footer />
    </div>
  );
}
