# 소개팅 시스템 엣지 케이스 시뮬레이션 (Blind Date Edge Cases)

이 문서는 소개팅 시스템 운영 시 발생할 수 있는 엣지 케이스와 결함을 시뮬레이션합니다.

---

## ✅ 정상 케이스

### 시나리오: 매물 등록 → 요청 → 승인

```
시간 T0: 사용자A가 매물 등록 (지인B, 28세 남성)
→ BlindDateListing (status: PRIVATE)

시간 T1: 매물 공개
→ Listing.status = OPEN

시간 T2: 사용자C가 요청 전송
→ BlindDateRequest (status: PENDING)

시간 T3: 사용자D가 요청 전송
→ BlindDateRequest (status: PENDING)

시간 T4: 사용자A가 사용자C의 요청 승인
→ Request(C).status = APPROVED
→ Request(D).status = REJECTED (자동)
→ Listing.status = MATCHED
→ BlindDateMatch 생성
→ 사용자A에게 포인트 지급 (예: 750P)
→ PointLog 기록

결과:
✅ 매칭 성공
✅ 포인트 지급 완료
✅ 나머지 요청 자동 거절
```

---

## ❌ 엣지 케이스 및 결함

### 1. 동시 승인 시도 (Race Condition)

```
시간 T1: 사용자A가 매물 등록 (status: OPEN)
시간 T2: 사용자B, C가 각각 요청 전송 (2개의 PENDING)
시간 T3: 사용자A가 사용자B의 요청 승인 (동시)
시간 T3: 사용자A가 사용자C의 요청 승인 (동시)
시간 T4: 두 승인 요청이 거의 동시에 서버 도착

결과:
❌ 두 요청 모두 승인되면 안 됨
❌ 나중 요청이 덮어쓰기 가능
```

**해결책:**
```typescript
async function approveRequest(requestId: string) {
  await db.transaction(async (trx) => {
    // Row Lock으로 동시성 제어
    const listing = await trx("blind_date_listings")
      .where({ id: listingId })
      .forUpdate()  // Row Lock
      .first();

    // 상태 재확인
    if (listing.status !== "OPEN") {
      throw new Error("이미 매칭된 매물입니다.");
    }

    // 승인 처리...
  });
}
```

---

### 2. 본인 매물에 본인이 요청

```
시간 T1: 사용자A가 매물 등록 (registerId: A)
시간 T2: 사용자A가 해당 매물에 요청 시도

결과:
❌ 본인이 등록한 매물에는 요청 불가
```

**해결책:**
```typescript
async function createRequest(listingId: string, userId: string) {
  const listing = await findListing(listingId);

  // 본인 확인
  if (listing.registerId === userId) {
    throw new Error("본인이 등록한 매물에는 요청할 수 없습니다.");
  }

  // 요청 생성...
}
```

---

### 3. 중복 요청 방지

```
시간 T1: 사용자A가 매물X에 요청 (status: PENDING)
시간 T2: 사용자A가 동일 매물X에 다시 요청 시도

결과:
❌ 이미 대기 중인 요청이 있으면 중복 불가
```

**해결책:**
```typescript
async function createRequest(listingId: string, userId: string) {
  // 중복 요청 체크
  const existingRequest = await findRequest({
    listingId,
    requesterId: userId,
    status: "PENDING"
  });

  if (existingRequest) {
    throw new Error("이미 요청한 매물입니다.");
  }

  // 요청 생성...
}
```

---

### 4. MATCHED 상태에서 추가 요청 시도

```
시간 T1: 매물X가 이미 매칭됨 (status: MATCHED)
시간 T2: 사용자B가 매물X에 요청 시도

결과:
❌ MATCHED 상태 매물은 요청 불가
```

**해결책:**
```typescript
async function createRequest(listingId: string, userId: string) {
  const listing = await findListing(listingId);

  // 상태 체크
  if (listing.status !== "OPEN") {
    throw new Error("현재 요청할 수 없는 매물입니다.");
  }

  // 요청 생성...
}
```

---

### 5. 매물 삭제 시 PENDING 요청 처리

```
시간 T1: 매물X 공개 (status: OPEN)
시간 T2: 사용자A, B, C가 요청 (3개의 PENDING)
시간 T3: 등록자가 매물 삭제 시도

결과:
❌ PENDING 요청이 있으면 삭제 불가
⚠️ 옵션: 모든 요청 거절 후 삭제
```

**해결책:**
```typescript
async function deleteListing(listingId: string) {
  const listing = await findListing(listingId);

  // OPEN 상태에서 PENDING 요청 체크
  if (listing.status === "OPEN") {
    const pendingRequests = await findRequests({
      listingId,
      status: "PENDING"
    });

    if (pendingRequests.length > 0) {
      throw new Error(
        "대기 중인 요청이 있어 삭제할 수 없습니다. 먼저 모든 요청을 처리해주세요."
      );
    }
  }

  // MATCHED 상태는 삭제 불가 (기록 보존)
  if (listing.status === "MATCHED") {
    throw new Error("매칭된 매물은 삭제할 수 없습니다.");
  }

  // 삭제 진행...
}
```

---

### 6. 클랜 탈퇴 시 OPEN 매물/PENDING 요청 처리

```
시간 T1: 사용자A가 OPEN 매물 보유
시간 T2: 사용자A가 클랜 탈퇴 시도

결과:
❌ OPEN 매물이 있으면 탈퇴 불가
```

**해결책:**
```typescript
async function leaveClan(userId: string, clanId: string) {
  // OPEN 상태 매물 체크
  const openListings = await findListings({
    registerId: userId,
    clanId,
    status: "OPEN"
  });

  if (openListings.length > 0) {
    throw new Error(
      "공개 중인 소개팅 매물이 있어 탈퇴할 수 없습니다. 먼저 매물을 마감해주세요."
    );
  }

  // PENDING 요청 체크
  const pendingRequests = await findRequests({
    requesterId: userId,
    clanId,
    status: "PENDING"
  });

  if (pendingRequests.length > 0) {
    throw new Error(
      "대기 중인 소개팅 요청이 있어 탈퇴할 수 없습니다. 먼저 요청을 취소해주세요."
    );
  }

  // 탈퇴 진행...
}
```

---

### 7. 매물 수정 중 요청 승인 시도

```
시간 T1: 등록자A가 매물 수정 중 (사진 변경)
시간 T2: 요청자B가 기존 정보 확인 후 요청
시간 T3: 등록자A가 수정 완료 (사진 변경됨)
시간 T4: 등록자A가 요청자B의 요청 승인

결과:
⚠️ 요청자B는 변경 전 정보 확인 후 요청
⚠️ 승인 시 변경된 정보로 매칭
```

**해결책:**
```typescript
// OPEN 상태 매물 수정 시 경고 표시
async function updateListing(listingId: string, updates: Partial<Listing>) {
  const listing = await findListing(listingId);

  if (listing.status === "OPEN") {
    const pendingRequests = await findRequests({
      listingId,
      status: "PENDING"
    });

    if (pendingRequests.length > 0) {
      // 경고 반환 (강제 차단은 아님)
      return {
        warning: "대기 중인 요청이 있습니다. 수정 시 요청자가 볼 수 있습니다.",
        pendingCount: pendingRequests.length
      };
    }
  }

  // 수정 진행...
}
```

---

### 8. 포인트 계산 오류

```
시간 T1: 매칭 성공
시간 T2: 포인트 계산 함수 에러 (예: 나이 필드 null)
시간 T3: 포인트 지급 실패

결과:
❌ 매칭은 성공했지만 포인트 미지급
```

**해결책:**
```typescript
function calculateBlindDatePoints(listing: BlindDateListing): number {
  let basePoints = 500;

  try {
    // 안전한 계산 (null 체크)
    if (listing.age && listing.age >= 35) {
      basePoints += 200;
    }

    if (listing.education && listing.education.includes("대졸")) {
      basePoints += 100;
    }

    // ...
  } catch (error) {
    console.error("포인트 계산 오류:", error);
    // 최소 기본 포인트 반환
    return 500;
  }

  return basePoints;
}

// 트랜잭션 내에서 계산
await db.transaction(async (trx) => {
  const points = calculateBlindDatePoints(listing);

  if (points < 100) {
    throw new Error("포인트 계산 오류: 최소값 미달");
  }

  // 포인트 지급...
});
```

---

### 9. 승인 후 요청자가 요청 취소 시도

```
시간 T1: 등록자A가 요청 승인 (status: APPROVED)
시간 T2: 요청자B가 요청 취소 시도

결과:
❌ APPROVED 상태에서는 취소 불가
```

**해결책:**
```typescript
async function cancelRequest(requestId: string, userId: string) {
  const request = await findRequest(requestId);

  // 권한 체크
  if (request.requesterId !== userId) {
    throw new Error("권한이 없습니다.");
  }

  // 상태 체크
  if (request.status !== "PENDING") {
    throw new Error("이미 처리된 요청은 취소할 수 없습니다.");
  }

  // 취소 진행...
}
```

---

### 10. 매칭 후 포인트 롤백 시도

```
시간 T1: 매칭 성공, 포인트 지급 (750P)
시간 T2: 관리자가 매칭 취소 시도 (포인트 회수 필요)

결과:
⚠️ 수동 포인트 회수 필요
⚠️ BlindDateMatch 기록은 유지
```

**해결책:**
```typescript
// 매칭 취소 기능 (관리자 전용)
async function cancelMatch(matchId: string, adminId: string) {
  await db.transaction(async (trx) => {
    const match = await trx.blindDateMatch.findUnique({ id: matchId });
    const listing = await trx.blindDateListing.findUnique({ id: match.listingId });

    // 포인트 회수
    await trx.clanMember
      .where({ userId: match.registerId, clanId: match.clanId })
      .decrement("totalPoints", match.pointsAwarded);

    // 포인트 로그 (마이너스)
    await trx.pointLog.create({
      userId: match.registerId,
      clanId: match.clanId,
      amount: -match.pointsAwarded,
      reason: `소개팅 매칭 취소: ${listing.name} (관리자: ${adminId})`
    });

    // 매물 상태 복구
    await trx.blindDateListing
      .where({ id: listing.id })
      .update({
        status: "CLOSED",
        matchedRequestId: null
      });

    // 요청 상태 복구
    await trx.blindDateRequest
      .where({ id: match.requestId })
      .update({ status: "CANCELLED" });

    // 매칭 기록 삭제 (또는 soft delete)
    await trx.blindDateMatch.delete({ id: matchId });
  });
}
```

---

### 11. 사진 업로드 실패

```
시간 T1: 사용자A가 매물 작성 (사진 5장 업로드 시도)
시간 T2: 3장 업로드 성공, 2장 실패 (네트워크 오류)

결과:
⚠️ 부분 성공
⚠️ 사용자에게 재업로드 안내
```

**해결책:**
```typescript
async function uploadPhotos(files: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];
  const failedFiles: string[] = [];

  for (const file of files) {
    try {
      const url = await uploadToS3(file);
      uploadedUrls.push(url);
    } catch (error) {
      failedFiles.push(file.name);
    }
  }

  if (failedFiles.length > 0) {
    return {
      success: uploadedUrls,
      failed: failedFiles,
      warning: `${failedFiles.length}개 파일 업로드 실패`
    };
  }

  return { success: uploadedUrls };
}
```

---

### 12. 요청자 정보 스냅샷 누락

```
시간 T1: 요청 생성 시 requesterInfo 스냅샷 실패
시간 T2: User 정보 변경
시간 T3: 등록자가 요청 확인 시 정보 없음

결과:
❌ 요청자 정보 표시 불가
```

**해결책:**
```typescript
async function createRequest(listingId: string, userId: string) {
  const user = await findUser(userId);

  // 필수 정보 체크
  if (!user.battleTag || !user.age) {
    throw new Error("프로필 정보가 부족합니다. 먼저 프로필을 완성해주세요.");
  }

  // 스냅샷 생성 (필수)
  const requesterInfo = {
    battleTag: user.battleTag,
    age: user.age,
    job: user.job || "미기재",
    location: user.location || "미기재",
    // ... 기타 정보
  };

  // Validation
  if (!requesterInfo.battleTag) {
    throw new Error("스냅샷 생성 실패: battleTag 누락");
  }

  // 요청 생성...
}
```

---

## 📋 결함 요약

| # | 결함 | 심각도 | 해결 상태 |
|---|------|--------|-----------|
| 1 | 동시 승인 시도 (Race Condition) | **높음** | ✅ Row Lock |
| 2 | 본인 매물에 본인이 요청 | 중간 | ✅ 필수 |
| 3 | 중복 요청 방지 | 중간 | ✅ 필수 |
| 4 | MATCHED 상태 추가 요청 | 중간 | ✅ 필수 |
| 5 | PENDING 요청 있을 때 삭제 | 중간 | ✅ 필수 |
| 6 | 클랜 탈퇴 시 매물/요청 처리 | **높음** | ✅ 필수 |
| 7 | 매물 수정 중 요청 승인 | 낮음 | ✅ 경고 |
| 8 | 포인트 계산 오류 | **높음** | ✅ 필수 |
| 9 | 승인 후 요청 취소 시도 | 중간 | ✅ 필수 |
| 10 | 매칭 후 포인트 롤백 | 중간 | ⚠️ 관리자 기능 |
| 11 | 사진 업로드 실패 | 낮음 | ✅ 부분 성공 처리 |
| 12 | 요청자 정보 스냅샷 누락 | **높음** | ✅ 필수 |

---

## 🎯 시스템 개선 효과

### 해결된 주요 문제
✅ 동시 승인 방지 → Row Lock으로 트랜잭션 제어
✅ 본인 요청 방지 → registerId 체크
✅ 중복 요청 방지 → PENDING 요청 존재 확인
✅ 상태 기반 요청 제어 → OPEN 상태만 요청 가능
✅ 포인트 안전 지급 → 계산 오류 처리 + 트랜잭션

### 주의할 점
⚠️ Race Condition 방지 (Row Lock, 트랜잭션)
⚠️ 상태 전이 검증 (OPEN → MATCHED만 허용)
⚠️ 포인트 계산 안전성 (null 체크, 최소값 보장)
⚠️ 클랜 탈퇴 시 참조 무결성 유지

---

## 관련 문서

- **프로세스:** [PROCESS.md](./PROCESS.md)
- **플로우차트:** [FLOW.mmd](./FLOW.mmd)
- **ERD:** [docs/common/ERD.mmd](../common/ERD.mmd)
