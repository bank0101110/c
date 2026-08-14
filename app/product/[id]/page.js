import { notFound } from "next/navigation";

import { getProduct, getProductMeta } from "@/app/server/product";
import { getCategories } from "@/app/server/category";
import { getCurrentUser } from "@/app/server/session";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ProductDetail } from "@/components/product/product-detail";
import { siteConfig } from "@/lib/site-config";
import { siteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

/**
 * พรีวิวตอนแชร์ลิงก์ (LINE / Facebook / X) — ให้ขึ้นรูปสินค้ากับยอดคงเหลือ ไม่ใช่ URL เปล่า
 *
 * Next สตรีม metadata แยกจากตัวหน้า การดึงข้อมูลตรงนี้เลยไม่ได้หน่วงการแสดงผล
 * ส่วนบอตรีดลิงก์จะถูกปิดสตรีมให้อัตโนมัติ (Next ดูจาก User-Agent) จึงได้แท็กครบใน <head>
 */
export async function generateMetadata({ params }) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) return { title: "ไม่พบสินค้า" };

  const [product, origin] = await Promise.all([getProductMeta(productId), siteOrigin()]);
  if (!product) return { title: "ไม่พบสินค้า" };

  // เนื้อหาที่จะโชว์ใต้ชื่อในพรีวิว เช่น "คงเหลือ 1,240 ชิ้น · 12 ตัวเลือก · ถุงพลาสติก"
  const details = [`คงเหลือ ${product.qty.toLocaleString("th-TH")} ${product.baseUnit.name}`];
  if (product._count.skus > 0) details.push(`${product._count.skus} ตัวเลือก`);
  if (product.category) details.push(product.category.name);
  const description = details.join(" · ");

  const url = `${origin}/product/${productId}`;
  const images = product.imageUrl
    ? [{ url: product.imageUrl, alt: product.name }]
    : undefined;

  return {
    title: product.name,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: "th_TH",
      url,
      title: product.name,
      description,
      images,
    },
    twitter: {
      // การ์ดใหญ่ต้องมีรูปถึงจะสวย ไม่มีรูปใช้การ์ดเล็กแทนไม่งั้นเหลือกรอบว่าง
      card: images ? "summary_large_image" : "summary",
      title: product.name,
      description,
      images,
    },
  };
}

export default async function ProductPage({ params }) {
  // params เป็น Promise ใน Next รุ่นนี้ ต้อง await ก่อนใช้
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) notFound();

  const [product, categories, currentUser] = await Promise.all([
    getProduct(productId),
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
          categories={categories}
          currentUser={currentUser}
        />
      </main>
      <Footer />
    </div>
  );
}
