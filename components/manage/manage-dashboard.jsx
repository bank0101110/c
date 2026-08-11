"use client";

import { useState } from "react";
import { FolderTree, Package, Ruler } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-3">
          <CategoriesPanel categories={categoryList} setCategories={setCategoryList} />
        </TabsContent>

        <TabsContent value="units" className="mt-3">
          <UnitTypesPanel unitTypes={unitTypeList} setUnitTypes={setUnitTypeList} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
