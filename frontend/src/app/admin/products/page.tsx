'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { shopApi, type Product } from '@/modules/admin/api/shop'
import { DataTable, type ColumnDef } from '@/modules/admin/components/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/common/components/ui/dialog'
import { Button } from '@/common/components/ui/button'
import { Input } from '@/common/components/ui/input'
import { Label } from '@/common/components/ui/label'
import { cn } from '@/lib/utils'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'

const createProductSchema = z.object({
  name: z.string().min(1, '상품명을 입력하세요').max(100),
  price: z.number({ invalid_type_error: '가격을 입력하세요' }).int().min(1, '1 이상이어야 합니다'),
  stock: z.number({ invalid_type_error: '재고를 입력하세요' }).int().min(0, '0 이상이어야 합니다'),
  imageUrl: z.string().url('올바른 URL 형식이어야 합니다').optional().or(z.literal('')),
})

type CreateProductFormValues = z.infer<typeof createProductSchema>

const editStockSchema = z.object({
  stock: z.number({ invalid_type_error: '재고를 입력하세요' }).int().min(0),
})
const editPriceSchema = z.object({
  price: z.number({ invalid_type_error: '가격을 입력하세요' }).int().min(1),
})

type EditStockValues = z.infer<typeof editStockSchema>
type EditPriceValues = z.infer<typeof editPriceSchema>

type InlineEdit = { productId: string; field: 'stock' | 'price' } | null

export default function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [inlineEdit, setInlineEdit] = useState<InlineEdit>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: () => shopApi.listProducts(),
  })

  const createForm = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: { name: '', price: 100, stock: 0, imageUrl: '' },
  })

  const stockForm = useForm<EditStockValues>({
    resolver: zodResolver(editStockSchema),
  })

  const priceForm = useForm<EditPriceValues>({
    resolver: zodResolver(editPriceSchema),
  })

  const handleCreate = createForm.handleSubmit(async (values) => {
    try {
      await shopApi.createProduct({
        name: values.name,
        price: values.price,
        stock: values.stock,
        imageUrl: values.imageUrl || undefined,
      })
      toast.success('상품이 등록되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      setCreateOpen(false)
      createForm.reset()
    } catch {
      toast.error('상품 등록에 실패했습니다.')
    }
  })

  const openInlineEdit = (product: Product, field: 'stock' | 'price') => {
    setInlineEdit({ productId: product.id, field })
    if (field === 'stock') {
      stockForm.reset({ stock: product.stock })
    } else {
      priceForm.reset({ price: product.price })
    }
  }

  const handleInlineSave = async (product: Product) => {
    if (!inlineEdit) return
    try {
      if (inlineEdit.field === 'stock') {
        const values = await stockForm.handleSubmit(async (v) => {
          await shopApi.updateProduct(product.id, { stock: v.stock })
          toast.success('재고가 수정되었습니다.')
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
          setInlineEdit(null)
        })()
        await values
      } else {
        const values = await priceForm.handleSubmit(async (v) => {
          await shopApi.updateProduct(product.id, { price: v.price })
          toast.success('가격이 수정되었습니다.')
          queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
          setInlineEdit(null)
        })()
        await values
      }
    } catch {
      toast.error('수정에 실패했습니다.')
    }
  }

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id)
    try {
      await shopApi.updateProduct(product.id, { isActive: !product.isActive })
      toast.success(product.isActive ? '비활성화되었습니다.' : '활성화되었습니다.')
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    } catch {
      toast.error('상태 변경에 실패했습니다.')
    } finally {
      setTogglingId(null)
    }
  }

  const columns: ColumnDef<Product>[] = [
    {
      key: 'id',
      header: 'ID',
      render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>,
    },
    {
      key: 'name',
      header: '상품명',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      key: 'price',
      header: '가격',
      render: (r) => {
        const isEditing = inlineEdit?.productId === r.id && inlineEdit.field === 'price'
        if (isEditing) {
          return (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                className="h-7 w-24 text-sm"
                {...priceForm.register('price', { valueAsNumber: true })}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSave(r)
                  if (e.key === 'Escape') setInlineEdit(null)
                }}
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleInlineSave(r)}>저장</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setInlineEdit(null)}>취소</Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1">
            <span className="tabular-nums text-primary font-bold">{r.price.toLocaleString()}P</span>
            <button
              onClick={() => openInlineEdit(r, 'price')}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm p-0.5"
              aria-label="가격 편집"
            >
              <Pencil className="size-3" />
            </button>
          </div>
        )
      },
    },
    {
      key: 'stock',
      header: '재고',
      render: (r) => {
        const isEditing = inlineEdit?.productId === r.id && inlineEdit.field === 'stock'
        if (isEditing) {
          return (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                className="h-7 w-20 text-sm"
                {...stockForm.register('stock', { valueAsNumber: true })}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSave(r)
                  if (e.key === 'Escape') setInlineEdit(null)
                }}
              />
              <Button size="sm" className="h-7 px-2 text-xs" onClick={() => handleInlineSave(r)}>저장</Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setInlineEdit(null)}>취소</Button>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1">
            <span className={cn('tabular-nums', r.stock === 0 ? 'text-[var(--ow-red)]' : 'text-foreground')}>
              {r.stock}
            </span>
            <button
              onClick={() => openInlineEdit(r, 'stock')}
              className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm p-0.5"
              aria-label="재고 편집"
            >
              <Pencil className="size-3" />
            </button>
          </div>
        )
      },
    },
    {
      key: 'isActive',
      header: '상태',
      render: (r) => (
        <button
          onClick={() => handleToggleActive(r)}
          disabled={togglingId === r.id}
          className={cn(
            'flex items-center gap-1 text-xs font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            r.isActive ? 'text-[var(--ow-blue)]' : 'text-muted-foreground',
          )}
          aria-label={r.isActive ? '비활성화' : '활성화'}
          aria-pressed={r.isActive}
        >
          {r.isActive ? (
            <ToggleRight className="size-4" />
          ) : (
            <ToggleLeft className="size-4" />
          )}
          {r.isActive ? '활성' : '비활성'}
        </button>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {new Date(r.createdAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black italic uppercase text-foreground">
          상품 관리
        </h1>
        <Button
          onClick={() => setCreateOpen(true)}
          className="skew-x-[-8deg]"
          aria-label="상품 등록"
        >
          <span className="skew-x-[8deg] flex items-center gap-2">
            <Plus className="size-4" />
            상품 등록
          </span>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={products}
        loading={isLoading}
        emptyMessage="등록된 상품이 없습니다."
      />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">상품 등록</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">상품명</Label>
              <Input
                id="product-name"
                {...createForm.register('name')}
                placeholder="상품명을 입력하세요"
                aria-invalid={!!createForm.formState.errors.name}
              />
              {createForm.formState.errors.name && (
                <p className="text-destructive text-xs">{createForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="product-price">가격 (P)</Label>
                <Input
                  id="product-price"
                  type="number"
                  min={1}
                  {...createForm.register('price', { valueAsNumber: true })}
                  aria-invalid={!!createForm.formState.errors.price}
                />
                {createForm.formState.errors.price && (
                  <p className="text-destructive text-xs">{createForm.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-stock">재고</Label>
                <Input
                  id="product-stock"
                  type="number"
                  min={0}
                  {...createForm.register('stock', { valueAsNumber: true })}
                  aria-invalid={!!createForm.formState.errors.stock}
                />
                {createForm.formState.errors.stock && (
                  <p className="text-destructive text-xs">{createForm.formState.errors.stock.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-image">이미지 URL (선택)</Label>
              <Input
                id="product-image"
                {...createForm.register('imageUrl')}
                placeholder="https://..."
                aria-invalid={!!createForm.formState.errors.imageUrl}
              />
              {createForm.formState.errors.imageUrl && (
                <p className="text-destructive text-xs">{createForm.formState.errors.imageUrl.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} type="button">
                취소
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? '등록 중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
