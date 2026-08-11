import { getProducts } from "@/app/server/product";
import { getCategories } from "@/app/server/category";
import { getCurrentUser } from "@/app/server/session";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProductCatalog } from "@/components/landing/product-catalog";
import { Footer } from "@/components/landing/footer";
import { SearchProvider } from "@/components/landing/search-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  // หน้าแรกดูสต็อกได้โดยไม่ต้องล็อกอิน แต่จะตัดสต็อกต้องล็อกอินก่อน
  const [products, categories, currentUser] = await Promise.all([
    getProducts(),
    getCategories(),
    getCurrentUser(),
  ]);

  return (
    <SearchProvider products={products}>
      <div className="flex min-h-full flex-1 flex-col">
        <Navbar currentUser={currentUser} showSearch />
        <main className="flex flex-1 flex-col">
          <Hero />
          <ProductCatalog
            products={products}
            categories={categories}
            currentUser={currentUser}
          />
        </main>
        <Footer />
      </div>
    </SearchProvider>
  );
}
