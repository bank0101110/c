import { getProducts } from "@/app/server/product";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { ProductCatalog } from "@/components/landing/product-catalog";
import { Footer } from "@/components/landing/footer";
import { SearchProvider } from "@/components/landing/search-context";

export const dynamic = "force-dynamic";

export default async function Home() {
  const products = await getProducts();

  return (
    <SearchProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <Navbar />
        <main className="flex flex-1 flex-col">
          <Hero />
          <ProductCatalog products={products} />
        </main>
        <Footer />
      </div>
    </SearchProvider>
  );
}
