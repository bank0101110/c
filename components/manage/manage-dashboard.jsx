"use client";

import { useState } from "react";

import { ProductsPanel } from "@/components/manage/products-panel";
import { UnitTypesPanel } from "@/components/manage/unit-types-panel";

export function ManageDashboard({ products, unitTypes, users }) {
  const [productList, setProductList] = useState(products);
  const [unitTypeList, setUnitTypeList] = useState(unitTypes);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Manage inventory</h1>
        <p className="text-sm text-muted-foreground">
          Create products, track units, and adjust stock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ProductsPanel
            products={productList}
            setProducts={setProductList}
            unitTypes={unitTypeList}
            setUnitTypes={setUnitTypeList}
            users={users}
          />
        </div>

        <div className="flex flex-col gap-6">
          <UnitTypesPanel unitTypes={unitTypeList} setUnitTypes={setUnitTypeList} />
        </div>
      </div>
    </div>
  );
}
