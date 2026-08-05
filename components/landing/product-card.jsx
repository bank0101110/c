import { Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { breakdown, productUnits } from "@/lib/stock";

export function ProductCard({ product }) {
  const units = productUnits(product);
  const inStock = product.qty > 0;
  const { parts, remainder } = breakdown(product.qty, units);

  return (
    <Card className="h-full overflow-hidden py-0 transition-shadow hover:shadow-md">
      <div className="flex aspect-square items-center justify-center bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="size-7 text-muted-foreground" />
        )}
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
