import { Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { breakdown, productUnits } from "@/lib/stock";

export function ProductCard({ product }) {
  const units = productUnits(product);
  const smallestUnit = units.at(-1);
  const inStock = product.qty > 0;
  const { parts, remainder } = breakdown(product.qty, units);

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
            <Badge variant="secondary">0 {smallestUnit?.name}</Badge>
          )}
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
