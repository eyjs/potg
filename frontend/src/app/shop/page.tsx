"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { ProductCard } from "@/modules/shop/components/product-card"
import { ShoppingBag, Ticket, History, Gift, Plus } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/common/components/ui/dialog"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Textarea } from "@/common/components/ui/textarea"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/common/components/auth-guard"
import { toast } from "sonner"

interface Membership {
  role: "MASTER" | "MANAGER" | "MEMBER"
  clanId: string
}

export default function ShopPage() {
  const router = useRouter()
  const { user, isAdmin } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [myCoupons, setMyCoupons] = useState<any[]>([])
  const [membership, setMembership] = useState<Membership | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: 1000,
    stock: 10,
    imageUrl: ""
  })

  useEffect(() => {
    if (user?.clanId) {
      fetchData()
    } else {
      setIsLoading(false)
    }
  }, [user?.clanId])


  const fetchData = async () => {
    if (!user) return
    try {
      setIsLoading(true)
      const [productsRes, couponsRes, membershipRes] = await Promise.all([
        api.get(`/shop/products?clanId=${user.clanId}`),
        api.get('/shop/my-coupons'),
        api.get('/clans/membership/me').catch(() => ({ data: null }))
      ])
      setProducts(productsRes.data)
      setMyCoupons(couponsRes.data)
      setMembership(membershipRes.data)
    } catch (error) {
      console.error("Failed to fetch shop data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const canManage = isAdmin || membership?.role === "MASTER" || membership?.role === "MANAGER"

  const handleCreateProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error("상품명을 입력하세요.")
      return
    }
    if (newProduct.price <= 0) {
      toast.error("가격을 올바르게 입력하세요.")
      return
    }

    try {
      await api.post('/shop/products', {
        ...newProduct,
        category: "ETC",
        clanId: user?.clanId
      })
      toast.success("상품이 등록되었습니다.")
      setIsCreateDialogOpen(false)
      setNewProduct({
        name: "",
        description: "",
        price: 1000,
        stock: 10,
        imageUrl: ""
      })
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || "상품 등록에 실패했습니다.")
    }
  }

  const handlePurchase = async (productId: string) => {
    try {
      await api.post('/shop/purchase', { productId, quantity: 1 })
      toast.success("구매 요청이 완료되었습니다! 클랜마스터 승인 후 쿠폰함에서 확인하실 수 있습니다.")
      fetchData()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || "구매 실패")
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
        상점 데이터 로딩 중...
      </div>
    </div>
  )

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0B0B0B] pb-20 md:pb-0">
        <Header />

        <main className="container px-4 py-6 space-y-8">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary skew-btn flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-wider text-foreground">
                  포인트 <span className="text-primary">상점</span>
                </h1>
                <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">
                  CLAN SHOP & REWARDS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-card border border-border rounded-sm">
                <span className="text-xs text-muted-foreground uppercase font-bold block">내 가용 포인트</span>
                <span className="text-xl font-black italic text-primary">
                  {((user?.totalPoints ?? 0) - (user?.lockedPoints ?? 0)).toLocaleString()}P
                </span>
              </div>
            </div>
          </div>

          {/* 기능 버튼 */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button variant="outline" size="sm" className="flex-1 md:flex-none skew-btn border-border/50 text-xs font-bold gap-2">
              <Ticket className="w-4 h-4" />
              <span>내 쿠폰함 ({myCoupons.length})</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex-1 md:flex-none skew-btn text-xs font-bold gap-2">
              <History className="w-4 h-4" />
              <span>구매 내역</span>
            </Button>
            {canManage && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="flex-1 md:flex-none skew-btn bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold gap-2">
                    <Plus className="w-4 h-4" />
                    <span>상품 등록</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border text-foreground max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">새 상품 등록</DialogTitle>
                    <DialogDescription className="text-muted-foreground">클랜 상점에 새 상품을 등록합니다.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">상품명</Label>
                      <Input
                        id="name"
                        placeholder="상품명을 입력하세요"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        className="bg-muted/30 border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">설명</Label>
                      <Textarea
                        id="description"
                        placeholder="상품 설명"
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                        className="bg-muted/30 border-border min-h-[80px]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">가격 (P)</Label>
                        <Input
                          id="price"
                          type="number"
                          min="1"
                          value={newProduct.price}
                          onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stock">재고</Label>
                        <Input
                          id="stock"
                          type="number"
                          min="0"
                          value={newProduct.stock}
                          onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
                          className="bg-muted/30 border-border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="imageUrl">이미지 URL (선택)</Label>
                      <Input
                        id="imageUrl"
                        placeholder="https://..."
                        value={newProduct.imageUrl}
                        onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                        className="bg-muted/30 border-border"
                      />
                    </div>
                    <Button onClick={handleCreateProduct} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold">
                      등록하기
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* 상품 목록 */}
          {products.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border/30 rounded-lg">
              <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
              <h3 className="text-xl font-bold text-foreground italic uppercase">상품이 없습니다</h3>
              <p className="text-muted-foreground mt-1">곧 새로운 상품이 등록될 예정입니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  description={product.description}
                  price={product.price}
                  stock={product.stock}
                  imageUrl={product.imageUrl}
                  onPurchase={handlePurchase}
                />
              ))}
            </div>
          )}

          {/* Info Banner */}
          <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-black italic uppercase text-lg text-foreground mb-1">포인트 획득 안내</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                투표 참여, 경매 낙찰, 내전 승리 등을 통해 클랜 포인트를 획득할 수 있습니다.<br />
                획득한 포인트는 해당 클랜의 상점에서만 사용 가능하며, 기프티콘 구매 시 클랜마스터의 승인이 필요합니다.
              </p>
            </div>
            <Button variant="outline" className="skew-btn border-primary text-primary hover:bg-primary/10 shrink-0">
              자세히 보기
            </Button>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
