"use client"

import { useState, useEffect } from "react"
import { Header } from "@/common/layouts/header"
import { ProductCard } from "@/modules/shop/components/product-card"
import { ShoppingBag, Ticket, History, Gift } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs"
import api from "@/lib/api"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

import { useRouter } from "next/navigation"

export default function ShopPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [myCoupons, setMyCoupons] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("all")

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login")
      } else if (user.clanId) {
        fetchData()
      } else {
        setIsLoading(false)
      }
    }
  }, [user, authLoading, router])

  const fetchData = async () => {
    if (!user) return
    try {
      setIsLoading(true)
      const [productsRes, couponsRes] = await Promise.all([
        api.get(`/shop/products?clanId=${user.clanId}`),
        api.get('/shop/my-coupons')
      ])
      setProducts(productsRes.data)
      setMyCoupons(couponsRes.data)
    } catch (error) {
      console.error("Failed to fetch shop data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePurchase = async (productId: string) => {
    if (!confirm("이 상품을 구매하시겠습니까?")) return
    try {
      await api.post('/shop/purchase', { productId, quantity: 1 })
      alert("구매 요청이 완료되었습니다! 클랜마스터 승인 후 쿠폰함에서 확인하실 수 있습니다.")
      fetchData()
    } catch (error: any) {
      alert(error.response?.data?.message || "구매 실패")
    }
  }

  const categories = ["all", "VOUCHER", "GOODS", "GAME_ITEM", "ETC"]

  const filteredProducts = activeTab === "all" 
    ? products 
    : products.filter(p => p.category === activeTab)

  if (isLoading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 py-20 text-center font-bold italic uppercase animate-pulse text-primary">
        상점 데이터 로딩 중...
      </div>
    </div>
  )

  return (
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
              <span className="text-xl font-black italic text-primary">0P</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6 overflow-x-auto pb-2">
            <TabsList className="bg-muted/50 p-1 h-auto">
              {categories.map(cat => (
                <TabsTrigger 
                  key={cat} 
                  value={cat}
                  className="px-6 py-2 uppercase font-black italic text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {cat === 'all' ? '전체' : cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="skew-btn border-border/50 text-xs font-bold gap-2">
                <Ticket className="w-4 h-4" />
                <span>내 쿠폰함 ({myCoupons.length})</span>
              </Button>
              <Button variant="ghost" size="sm" className="skew-btn text-xs font-bold gap-2">
                <History className="w-4 h-4" />
                <span>구매 내역</span>
              </Button>
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {filteredProducts.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-border/30 rounded-lg">
                <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-20" />
                <h3 className="text-xl font-bold text-foreground italic uppercase">상품이 없습니다</h3>
                <p className="text-muted-foreground mt-1">곧 새로운 상품이 등록될 예정입니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    description={product.description}
                    price={product.price}
                    stock={product.stock}
                    category={product.category}
                    imageUrl={product.imageUrl}
                    onPurchase={handlePurchase}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

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
  )
}
