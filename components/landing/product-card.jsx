import { memo } from "react";
import { ArrowUpDown, Layers, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { breakdown, productUnits } from "@/lib/stock";
import { thumbnailUrl } from "@/lib/images";

function ProductCardBase({ product }) {
  const units = productUnits(product);
  const inStock = product.qty > 0;
  const { parts, remainder } = breakdown(product.qty, units);
  // สินค้าที่มีตัวเลือกย่อยจะพาไปหน้าสินค้าแทนการเปิด dialog ป้ายเลยต้องบอกให้ตรง
  const skuCount = product._count?.skus ?? 0;

  return (
    // group ให้ลูก ๆ ขยับตามตอน hover การ์ด — Tailwind ห่อ hover: ไว้ใน @media (hover: hover)
    // อยู่แล้ว เอฟเฟกต์พวกนี้เลยขึ้นเฉพาะเครื่องที่มีเมาส์ ไม่ค้างบนจอสัมผัส
    <Card className="group h-full overflow-hidden py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:ring-foreground/25 dark:hover:ring-white/40">
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl(product.imageUrl)}
            alt={product.name}
            loading="lazy"
            decoding="async"
            // บอกขนาดไว้ กันภาพเด้งตอนโหลดเสร็จ (การ์ดเป็นสี่เหลี่ยมจัตุรัสอยู่แล้ว)
            width={200}
            height={200}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Package className="size-7 text-muted-foreground transition-transform duration-300 group-hover:scale-110" />
        )}

        {skuCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute top-1.5 right-1.5 gap-1 px-1.5 text-[0.65rem]"
          >
            <Layers className="size-3" />
            {skuCount}
          </Badge>
        )}

        {/* บอกว่าการ์ดกดได้ ตอนไม่ hover ซ่อนไว้ไม่ให้บังรูป */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-linear-to-t from-foreground/75 to-transparent pb-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="flex items-center gap-1 text-[0.65rem] font-medium text-background">
            {skuCount > 0 ? (
              <>
                <Layers className="size-3" />
                เลือกตัวเลือก
              </>
            ) : (
              <>
                <ArrowUpDown className="size-3" />
                ปรับสต็อก
              </>
            )}
          </span>
        </div>
      </div>

      <CardContent className="flex flex-col gap-1.5 px-2 pt-2 pb-2">
        <CardTitle className="line-clamp-2 text-xs leading-snug font-medium">
          {product.name}
        </CardTitle>
        <div className="flex flex-wrap gap-1">
          {inStock ? (
            <>
              {parts.map((part) => (
                <Badge key={part.id} variant="secondary">
                  {part.count} {part.name}
                </Badge>
              ))}
              {remainder > 0 && <Badge variant="secondary">+{remainder}</Badge>}
            </>
          ) : (
            <Badge variant="destructive">หมด</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// การ์ดเป็นร้อยใบ และตัวแม่ re-render ทุกครั้งที่พิมพ์ค้นหา
// memo ไว้ ใบที่ข้อมูลไม่เปลี่ยนจะได้ไม่ต้องวาดใหม่
export const ProductCard = memo(ProductCardBase);
