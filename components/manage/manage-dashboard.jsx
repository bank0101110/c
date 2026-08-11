"use client";

import { useState } from "react";

import { ProductsPanel } from "@/components/manage/products-panel";
import { UnitTypesPanel } from "@/components/manage/unit-types-panel";
import { CategoriesPanel } from "@/components/manage/categories-panel";

export function ManageDashboard({ products, unitTypes, categories, currentUser }) {
  const [productList, setProductList] = useState(products);
  const [unitTypeList, setUnitTypeList] = useState(unitTypes);
  const [categoryList, setCategoryList] = useState(categories);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">จัดการสต็อก</h1>
        <p className="text-sm text-muted-foreground">
          เพิ่มสินค้า ตั้งหน่วยนับ และปรับยอดคงเหลือ
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductsPanel
            products={productList}
            setProducts={setProductList}
            unitTypes={unitTypeList}
            setUnitTypes={setUnitTypeList}
            currentUser={currentUser}
          />
        </div>

        <div className="flex flex-col gap-6">
          <CategoriesPanel categories={categoryList} setCategories={setCategoryList} />
          <UnitTypesPanel unitTypes={unitTypeList} setUnitTypes={setUnitTypeList} />
        </div>
      </div>
    </div>
  );
}
