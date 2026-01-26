"use client"

import { ShoppingCart, Package } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/common/components/ui/card"
import { cn } from "@/lib/utils"

interface ProductCardProps {
  id: string
  name: string
  description?: string
  price: number
  stock: number
  imageUrl?: string
  onPurchase: (id: string) => void
}

export function ProductCard({
  id,
  name,
  description,
  price,
  stock,
  imageUrl,
  onPurchase,
}: ProductCardProps) {
  const isOutOfStock = stock <= 0

  return (
    <Card className={cn(
      "bg-card border-border/50 overflow-hidden transition-all hover:border-primary/50 flex flex-col",
      isOutOfStock && "opacity-70"
    )}>
      {/* Product Image Placeholder */}
      <div className="aspect-video bg-muted relative flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="object-cover w-full h-full" />
        ) : (
          <Package className="w-12 h-12 text-muted-foreground opacity-20" />
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-black italic uppercase tracking-tighter text-2xl -rotate-12">SOLD OUT</span>
          </div>
        )}
      </div>

      <CardHeader className="p-4 pb-2">
        <h3 className="font-bold text-lg text-foreground line-clamp-1 italic uppercase tracking-tight">{name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2rem]">{description}</p>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-1">
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">가격</span>
            <span className="text-xl font-black italic text-primary">{price.toLocaleString()}P</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">재고</span>
            <p className={cn("font-bold italic", isOutOfStock ? "text-destructive" : "text-foreground")}>
              {stock}개
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full skew-btn font-bold uppercase tracking-wide gap-2 h-12"
          disabled={isOutOfStock}
          onClick={() => onPurchase(id)}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>구매하기</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
