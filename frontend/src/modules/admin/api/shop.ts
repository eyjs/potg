import api from '@/lib/api'

export interface Product {
  id: string
  name: string
  price: number
  stock: number
  imageUrl?: string
  isActive: boolean
  clanId?: string
  createdAt: string
}

export interface CreateProductDto {
  name: string
  price: number
  stock: number
  imageUrl?: string
  clanId?: string
}

export interface UpdateProductDto {
  name?: string
  price?: number
  stock?: number
  imageUrl?: string
  isActive?: boolean
}

export type OrderStatus = 'PENDING' | 'DELIVERED' | 'CANCELLED'

export interface Order {
  id: string
  userId: string
  productId: string
  productName: string
  quantity: number
  totalPrice: number
  status: OrderStatus
  adminNote?: string
  createdAt: string
  username?: string
}

export const shopApi = {
  // Products
  listProducts: (clanId?: string): Promise<Product[]> =>
    api.get('/shop/products', { params: { clanId } }).then((r) => r.data),

  createProduct: (dto: CreateProductDto): Promise<Product> =>
    api.post('/admin/products', dto).then((r) => r.data),

  updateProduct: (id: string, dto: UpdateProductDto): Promise<Product> =>
    api.patch(`/admin/products/${id}`, dto).then((r) => r.data),

  deleteProduct: (id: string): Promise<void> =>
    api.delete(`/admin/products/${id}`).then((r) => r.data),

  // Orders
  listOrders: (): Promise<Order[]> =>
    api.get('/shop/orders').then((r) => r.data),

  deliverOrder: (id: string, adminNote?: string): Promise<Order> =>
    api.patch(`/shop/orders/${id}/deliver`, { adminNote }).then((r) => r.data),

  cancelOrder: (id: string, adminNote?: string): Promise<Order> =>
    api.patch(`/shop/orders/${id}/cancel`, { adminNote }).then((r) => r.data),
}
