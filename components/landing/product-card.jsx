import { Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";

export function ProductCard({ product }) {
  const totalStock = product.ProductQtyType.reduce(
    (sum, entry) => sum + entry.qty,
    0
  );
  const inStock = totalStock > 0;

  return (
    <Card className="overflow-hidden py-0">
      <div className="flex aspect-square items-center justify-center bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="size-10 text-muted-foreground" />
        )}
      </div>

      <CardContent className="flex flex-col gap-2 px-3 pt-3">
        <CardTitle className="line-clamp-2 text-sm font-medium">
          {product.name}
        </CardTitle>
        <div className="flex flex-wrap gap-1">
          {product.ProductQtyType.map((entry) => (
            <Badge key={entry.id} variant="secondary">
              {entry.qty} {entry.qtyType.name}
            </Badge>
          ))}
        </div>
      </CardContent>

      <CardFooter className="px-3 pb-3">
        <Badge variant={inStock ? "default" : "destructive"}>
          {inStock ? "In stock" : "Out of stock"}
        </Badge>
      </CardFooter>
    </Card>
  );
}
