"use client";

import { useState, useTransition } from "react";
import { FolderTree, Package, Ruler } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { deleteProductAction } from "@/app/manage/actions";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ProductsPanel } from "@/components/manage/products-panel";
import { UnitTypesPanel } from "@/components/manage/unit-types-panel";
import { CategoriesPanel } from "@/components/manage/categories-panel";

/**
 * หน้าจัดการแบ่งเป็นแท็บแทนการวางสามการ์ดเรียงกัน
 *
 * เดิมสินค้ากินสองคอลัมน์ ส่วนหมวดหมู่กับหน่วยนับเบียดอยู่คอลัมน์เดียวทางขวา
 * พอจอแคบทุกอย่างซ้อนกันเป็นเสาเดียวยาวมาก ต้องเลื่อนผ่านสินค้าทั้งหมดกว่าจะถึงหน่วยนับ
 * แท็บทำให้แต่ละงานได้พื้นที่เต็มความกว้างเท่ากันและกระโดดหากันได้ในคลิกเดียว
 */
export function ManageDashboard({ products, unitTypes, categories, currentUser }) {
  const [productList, setProductList] = useState(products);
  const [unitTypeList, setUnitTypeList] = useState(unitTypes);
  const [categoryList, setCategoryList] = useState(categories);
  const [deletingIds, setDeletingIds] = useState(() => new Set());
  const [, startDelete] = useTransition();
  const { toast } = useToast();

  // แก้สินค้าจากแท็บไหนก็ตาม ต้องทับ state ก้อนเดียวกัน ทั้งสองแท็บจะได้ตรงกันทันที
  function handleProductUpdated(updated) {
    setProductList((prev) =>
      prev.map((product) => (product.id === updated.id ? updated : product))
    );
  }

  /**
   * ลบสินค้า — อยู่ตรงนี้เพราะลบได้ทั้งจากตารางสินค้าและจากกล่อง "สินค้าในหมวด"
   *
   * ปิดเฉพาะปุ่มของตัวที่กด ไม่ใช่ทั้งตาราง เลยเก็บเป็น Set ของ id
   */
  function handleDeleteProduct(id) {
    if (deletingIds.has(id)) return;
    setDeletingIds((prev) => new Set(prev).add(id));

    startDelete(async () => {
      const result = await deleteProductAction(id);
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "ลบสินค้าไม่สำเร็จ",
          description: result.error,
          duration: 0,
        });
        return;
      }

      const removed = productList.find((product) => product.id === id);
      setProductList((prev) => prev.filter((product) => product.id !== id));
      toast({ variant: "success", title: `ลบ ${removed?.name ?? "สินค้า"} แล้ว` });
    });
  }

  // กล่องจัดการตัวเลือกคืนมาแค่จำนวน ไม่ได้คืนสินค้าทั้งก้อน เลยแก้เฉพาะตัวนับ
  function handleSkuCountChange(productId, skus) {
    setProductList((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, _count: { ...product._count, skus } }
          : product
      )
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-heading text-2xl font-semibold">จัดการสต็อก</h1>

      <Tabs defaultValue="products">
        {/* เลื่อนแนวนอนได้เผื่อจอแคบมาก ชื่อแท็บจะได้ไม่ถูกบีบจนอ่านไม่ออก */}
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="products">
            <Package />
            สินค้า
            <Badge variant="secondary">{productList.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="categories">
            <FolderTree />
            หมวดหมู่
            <Badge variant="secondary">{categoryList.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="units">
            <Ruler />
            หน่วยนับ
            <Badge variant="secondary">{unitTypeList.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-3">
          <ProductsPanel
            products={productList}
            setProducts={setProductList}
            unitTypes={unitTypeList}
            setUnitTypes={setUnitTypeList}
            categories={categoryList}
            currentUser={currentUser}
            onProductUpdated={handleProductUpdated}
            onSkuCountChange={handleSkuCountChange}
            onProductDelete={handleDeleteProduct}
            deletingIds={deletingIds}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-3">
          <CategoriesPanel
            categories={categoryList}
            setCategories={setCategoryList}
            products={productList}
            unitTypes={unitTypeList}
            setUnitTypes={setUnitTypeList}
            currentUser={currentUser}
            onProductUpdated={handleProductUpdated}
            onSkuCountChange={handleSkuCountChange}
            onProductDelete={handleDeleteProduct}
            deletingIds={deletingIds}
          />
        </TabsContent>

        <TabsContent value="units" className="mt-3">
          <UnitTypesPanel unitTypes={unitTypeList} setUnitTypes={setUnitTypeList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
