# 클랜 상점 시스템 엣지 케이스 시뮬레이션 (Clan Shop Edge Cases)

이 문서는 클랜 상점 시스템 운영 시 발생할 수 있는 엣지 케이스와 결함을 시뮬레이션합니다.

---

## ✅ 정상 케이스

### 시나리오: 상품 등록 → 구매 요청 → 승인

```
시간 T0: 클랜마스터가 상품 등록 (치킨 기프티콘, 10,000P, 재고 5개)
→ ShopProduct (status: ACTIVE, stock: 5)

시간 T1: 회원A가 구매 요청 (수량 1)
→ ShopPurchase (status: PENDING, totalPrice: 10,000P)

시간 T2: 회원B가 구매 요청 (수량 2)
→ ShopPurchase (status: PENDING, totalPrice: 20,000P)

시간 T3: 클랜마스터가 회원A의 구매 승인
→ Purchase(A).status = APPROVED
→ ClanMember(A).totalPoints -= 10,000
→ Product.stock = 4
→ Product.totalSold = 1
→ PointLog 기록

시간 T4: 클랜마스터가 회원B의 구매 승인
→ Purchase(B).status = APPROVED
→ ClanMember(B).totalPoints -= 20,000
→ Product.stock = 2
→ Product.totalSold = 3
→ PointLog 기록

결과:
✅ 구매 승인 성공
✅ 포인트 차감 완료
✅ 재고 관리 정상
```

---

## ❌ 엣지 케이스 및 결함

### 1. 동시 구매 승인 시 재고 부족 (Race Condition)

```
시간 T1: 상품X 재고 1개 남음 (stock: 1)
시간 T2: 회원A, B가 각각 수량 1로 구매 요청 (2개의 PENDING)
시간 T3: 클랜마스터가 회원A의 구매 승인 (동시)
시간 T3: 클랜마스터가 회원B의 구매 승인 (동시)
시간 T4: 두 승인 요청이 거의 동시에 서버 도착

결과:
❌ 재고가 1개인데 2명 모두 승인되면 안 됨
❌ 나중 승인이 stock = -1로 만들 수 있음
```

**해결책:**
```typescript
async function approvePurchase(purchaseId: string) {
  await db.transaction(async (trx) => {
    // Row Lock으로 동시성 제어
    const product = await trx("shop_products")
      .where({ id: productId })
      .forUpdate()  // Row Lock
      .first();

    // 재고 재확인
    if (product.stock < purchase.quantity) {
      throw new Error(
        `재고가 부족합니다. (남은 재고: ${product.stock}개, 요청: ${purchase.quantity}개)`
      );
    }

    // 승인 처리...
  });
}
```

---

### 2. 승인 중 구매자 포인트 부족

```
시간 T1: 회원A가 치킨 기프티콘 구매 요청 (10,000P, 보유 포인트: 15,000P)
시간 T2: 회원A가 다른 곳에서 8,000P 사용 (베팅)
시간 T3: 클랜마스터가 구매 승인 시도

결과:
❌ 구매 요청 시점: 15,000P (충분)
❌ 승인 시점: 7,000P (부족)
⚠️ 승인 시점에 재확인 필요
```

**해결책:**
```typescript
async function approvePurchase(purchaseId: string) {
  await db.transaction(async (trx) => {
    const buyer = await trx.clanMember.findFirst({
      where: { userId: purchase.userId, clanId: purchase.clanId }
    });

    // 승인 시점에 가용 포인트 재확인
    const availablePoints = buyer.totalPoints - buyer.lockedPoints;

    if (availablePoints < purchase.totalPrice) {
      throw new Error(
        `구매자의 포인트가 부족합니다. (보유: ${availablePoints}P, 필요: ${purchase.totalPrice}P)`
      );
    }

    // 승인 처리...
  });
}
```

---

### 3. 재고 0일 때 구매 요청 시도

```
시간 T1: 상품X 재고 0 (status: OUT_OF_STOCK)
시간 T2: 회원A가 구매 요청 시도

결과:
❌ OUT_OF_STOCK 상태에서는 구매 불가
```

**해결책:**
```typescript
async function createPurchase(productId: string, userId: string) {
  const product = await findProduct(productId);

  // 상태 체크
  if (product.status !== "ACTIVE") {
    throw new Error("현재 구매할 수 없는 상품입니다.");
  }

  // 재고 확인
  if (product.stock < quantity) {
    throw new Error(`재고가 부족합니다. (남은 재고: ${product.stock}개)`);
  }

  // 구매 요청 생성...
}
```

---

### 4. 상품 삭제 시 PENDING 구매 처리

```
시간 T1: 상품X에 회원A, B, C의 구매 요청 (3개의 PENDING)
시간 T2: 클랜마스터가 상품X 삭제 시도

결과:
❌ PENDING 구매가 있으면 삭제 불가
⚠️ 옵션: 모든 구매 거절 후 삭제
```

**해결책:**
```typescript
async function deleteProduct(productId: string) {
  const pendingPurchases = await findPurchases({
    productId,
    status: "PENDING"
  });

  if (pendingPurchases.length > 0) {
    throw new Error(
      "대기 중인 구매 요청이 있어 삭제할 수 없습니다. 먼저 모든 요청을 처리해주세요."
    );
  }

  // 삭제 진행...
}
```

---

### 5. 클랜 탈퇴 시 PENDING 구매 처리

```
시간 T1: 회원A가 PENDING 구매 보유
시간 T2: 회원A가 클랜 탈퇴 시도

결과:
❌ PENDING 구매가 있으면 탈퇴 불가
```

**해결책:**
```typescript
async function leaveClan(userId: string, clanId: string) {
  const pendingPurchases = await findPurchases({
    userId,
    clanId,
    status: "PENDING"
  });

  if (pendingPurchases.length > 0) {
    throw new Error(
      "대기 중인 구매 요청이 있어 탈퇴할 수 없습니다. 먼저 요청을 취소해주세요."
    );
  }

  // 탈퇴 진행...
}
```

---

### 6. 승인 후 구매 취소 시도

```
시간 T1: 클랜마스터가 구매 승인 (status: APPROVED, 포인트 차감 완료)
시간 T2: 회원A가 구매 취소 시도

결과:
❌ APPROVED 상태에서는 취소 불가
⚠️ 관리자에게 환불 요청 필요
```

**해결책:**
```typescript
async function cancelPurchase(purchaseId: string, userId: string) {
  const purchase = await findPurchase(purchaseId);

  // 권한 체크
  if (purchase.userId !== userId) {
    throw new Error("권한이 없습니다.");
  }

  // 상태 체크
  if (purchase.status !== "PENDING") {
    throw new Error(
      "이미 처리된 구매는 취소할 수 없습니다. 관리자에게 문의하세요."
    );
  }

  // 취소 진행...
}
```

---

### 7. 재고 추가 시 OUT_OF_STOCK → ACTIVE 전환

```
시간 T1: 상품X 재고 0 (status: OUT_OF_STOCK)
시간 T2: 클랜마스터가 재고 5개 추가

결과:
✅ stock = 5
✅ status = ACTIVE (자동 전환)
```

**해결책:**
```typescript
async function updateProduct(productId: string, updates: Partial<Product>) {
  const product = await findProduct(productId);

  // 재고 증가 시 OUT_OF_STOCK → ACTIVE
  if (updates.stock && updates.stock > 0 && product.status === "OUT_OF_STOCK") {
    updates.status = "ACTIVE";
  }

  await db.shopProduct.update({
    where: { id: productId },
    data: updates
  });
}
```

---

### 8. 대량 구매 시 재고 부족

```
시간 T1: 상품X 재고 3개
시간 T2: 회원A가 수량 5로 구매 요청 시도

결과:
❌ 재고가 3개인데 5개 요청
⚠️ 구매 요청 단계에서 차단
```

**해결책:**
```typescript
async function createPurchase(productId: string, userId: string, quantity: number) {
  const product = await findProduct(productId);

  if (product.stock < quantity) {
    throw new Error(
      `재고가 부족합니다. (남은 재고: ${product.stock}개, 요청: ${quantity}개)`
    );
  }

  // 구매 요청 생성...
}
```

---

### 9. 포인트 차감 실패 시 롤백

```
시간 T1: 구매 승인 처리 중
시간 T2: 포인트 차감 성공
시간 T3: 재고 차감 실패 (에러)

결과:
❌ 포인트만 차감되고 재고는 그대로
⚠️ 트랜잭션 롤백 필요
```

**해결책:**
```typescript
async function approvePurchase(purchaseId: string) {
  await db.transaction(async (trx) => {
    try {
      // 1. 포인트 차감
      await trx.clanMember.update({...});

      // 2. 재고 차감
      await trx.shopProduct.update({...});

      // 3. 구매 승인
      await trx.shopPurchase.update({...});

      // 모두 성공 시 커밋
    } catch (error) {
      // 하나라도 실패 시 자동 롤백
      throw error;
    }
  });
}
```

---

### 10. 승인 후 환불 요청

```
시간 T1: 구매 승인 완료 (포인트 차감)
시간 T2: 회원A가 환불 요청 (관리자에게 문의)
시간 T3: 클랜마스터가 환불 처리

결과:
⚠️ 수동 환불 필요
```

**해결책:**
```typescript
// 환불 기능 (관리자 전용)
async function refundPurchase(purchaseId: string, adminId: string) {
  await db.transaction(async (trx) => {
    const purchase = await trx.shopPurchase.findUnique({ id: purchaseId });

    // 상태 체크
    if (purchase.status !== "APPROVED") {
      throw new Error("승인된 구매만 환불할 수 있습니다.");
    }

    // 포인트 환불
    await trx.clanMember
      .where({ userId: purchase.userId, clanId: purchase.clanId })
      .increment("totalPoints", purchase.totalPrice);

    // 재고 복구
    await trx.shopProduct
      .where({ id: purchase.productId })
      .increment("stock", purchase.quantity);

    // 판매량 감소
    await trx.shopProduct
      .where({ id: purchase.productId })
      .decrement("totalSold", purchase.quantity);

    // OUT_OF_STOCK였으면 ACTIVE로 복구
    const product = await trx.shopProduct.findUnique({ id: purchase.productId });
    if (product.status === "OUT_OF_STOCK" && product.stock > 0) {
      await trx.shopProduct.update({
        where: { id: purchase.productId },
        data: { status: "ACTIVE" }
      });
    }

    // 포인트 로그
    await trx.pointLog.create({
      userId: purchase.userId,
      clanId: purchase.clanId,
      amount: purchase.totalPrice,
      reason: `구매 환불: ${product.name} (관리자: ${adminId})`
    });

    // 구매 취소 (soft delete)
    await trx.shopPurchase.update({
      where: { id: purchaseId },
      data: { status: "CANCELLED", adminNote: "환불 처리" }
    });
  });
}
```

---

### 11. 상품 가격 변경 중 구매 요청

```
시간 T1: 상품X 가격 10,000P
시간 T2: 회원A가 구매 요청 (totalPrice: 10,000P)
시간 T3: 클랜마스터가 가격 15,000P로 변경
시간 T4: 클랜마스터가 회원A의 구매 승인

결과:
⚠️ 구매 요청 시점: 10,000P
⚠️ 승인 시점: 상품 가격 15,000P
✅ totalPrice는 요청 시점 가격 (10,000P) 유지
```

**처리:**
- ShopPurchase.totalPrice는 요청 시점에 고정
- 승인 시 totalPrice 사용 (상품 현재 가격 무시)
- 가격 변경은 새 구매부터 적용

---

### 12. INACTIVE 상품에 구매 요청 시도

```
시간 T1: 상품X 활성 (status: ACTIVE)
시간 T2: 회원A가 구매 요청 시도
시간 T3: 요청 전 클랜마스터가 비활성화 (status: INACTIVE)

결과:
❌ INACTIVE 상태에서는 구매 불가
```

**해결책:**
```typescript
async function createPurchase(productId: string, userId: string) {
  const product = await findProduct(productId);

  if (product.status !== "ACTIVE") {
    throw new Error("현재 구매할 수 없는 상품입니다.");
  }

  // 구매 요청 생성...
}
```

---

## 📋 결함 요약

| # | 결함 | 심각도 | 해결 상태 |
|---|------|--------|-----------|
| 1 | 동시 승인 시 재고 부족 (Race Condition) | **높음** | ✅ Row Lock |
| 2 | 승인 중 포인트 부족 | **높음** | ✅ 재확인 |
| 3 | OUT_OF_STOCK 상태 구매 시도 | 중간 | ✅ 필수 |
| 4 | PENDING 구매 있을 때 상품 삭제 | 중간 | ✅ 필수 |
| 5 | PENDING 구매 있을 때 클랜 탈퇴 | **높음** | ✅ 필수 |
| 6 | APPROVED 후 구매 취소 시도 | 중간 | ✅ 차단 |
| 7 | 재고 추가 시 상태 전환 | 낮음 | ✅ 자동 |
| 8 | 대량 구매 시 재고 부족 | 중간 | ✅ 필수 |
| 9 | 포인트 차감 실패 시 롤백 | **높음** | ✅ 트랜잭션 |
| 10 | 승인 후 환불 요청 | 중간 | ⚠️ 관리자 기능 |
| 11 | 가격 변경 중 구매 요청 | 낮음 | ✅ totalPrice 고정 |
| 12 | INACTIVE 상품 구매 시도 | 중간 | ✅ 필수 |

---

## 🎯 시스템 개선 효과

### 해결된 주요 문제
✅ 동시 승인 방지 → Row Lock으로 트랜잭션 제어
✅ 재고 관리 → 자동 OUT_OF_STOCK 전환 및 복구
✅ 포인트 안전성 → 승인 시점 재확인 + 트랜잭션
✅ 상태 기반 제어 → ACTIVE 상태만 구매 가능
✅ 환불 시스템 → 관리자 수동 환불 지원

### 주의할 점
⚠️ Race Condition 방지 (Row Lock, 트랜잭션)
⚠️ 승인 시점 재확인 (재고, 포인트)
⚠️ 상태 전이 검증 (ACTIVE만 구매 가능)
⚠️ 참조 무결성 유지 (PENDING 구매 있으면 삭제/탈퇴 불가)

---

## 관련 문서

- **프로세스:** [PROCESS.md](./PROCESS.md)
- **플로우차트:** [FLOW.mmd](./FLOW.mmd)
- **관리자 플로우:** [ADMIN_FLOW.mmd](./ADMIN_FLOW.mmd)
- **ERD:** [docs/common/ERD.mmd](../common/ERD.mmd)
