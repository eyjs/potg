# Notion 자동 동기화 설정 가이드

## 📋 개요

이 프로젝트는 GitHub Actions를 통해 커밋 시 자동으로 Notion WBS를 업데이트합니다.

## 🔧 GitHub Secrets 설정 (필수!)

GitHub Repository → Settings → Secrets and variables → Actions에서 다음 시크릿을 추가하세요:

### 1. NOTION_TOKEN
Notion Integration Token입니다.

**발급 방법:**
1. https://www.notion.so/my-integrations 접속
2. "New integration" 클릭
3. Name: `POTG Sync` (원하는 이름)
4. Associated workspace: 본인 워크스페이스 선택
5. "Submit" 클릭
6. "Internal Integration Token" 복사

**권한 설정:**
- Content Capabilities: Read, Update, Insert 모두 체크
- User Capabilities: Read user information

### 2. NOTION_WBS_DB_ID
WBS 데이터베이스 ID입니다.

```
803ab748-ce1f-4185-9d78-c76dc4103c22
```

또는 Notion에서 WBS DB 열고 URL에서 추출:
`https://www.notion.so/[워크스페이스]/[DB_ID]?v=...`

### 3. NOTION_DEVNOTE_DB_ID
개발노트 데이터베이스 ID입니다.

```
942f6547-e56e-40c3-80db-ee3f0c8e00e5
```

## 🔗 Notion Integration 연결

**중요: Integration을 DB에 연결해야 API가 작동합니다!**

각 Notion DB 페이지에서:
1. 우측 상단 `...` 메뉴 클릭
2. "Connections" 또는 "연결" 선택
3. 생성한 Integration (`POTG Sync`) 추가

연결해야 할 DB:
- 📝 WBS DB
- 📦 개발노트 DB
- 📋 프로젝트 DB (선택)

## 📝 커밋 메시지 규칙

```bash
# 진행 중 표시
git commit -m "[WBS-007] 환경변수 설정 작업 중"

# 완료 표시 (다음 중 하나 사용)
git commit -m "[WBS-007] 완료: 환경변수 설정"
git commit -m "[WBS-007][완료] SMTP 설정 완료"
git commit -m "[WBS-007][done] Environment setup"

# 여러 WBS 동시 처리
git commit -m "[WBS-007][WBS-008] 완료: 환경변수 및 마이그레이션"
```

## 🔄 자동화 플로우

```
Push to main/develop
       │
       ▼
GitHub Actions 트리거
       │
       ├─── 커밋 메시지에서 [WBS-XXX] 파싱
       │           │
       │           ▼
       │    Notion WBS DB 업데이트
       │    - 상태: 진행중/완료
       │    - 완료일: 자동 기록
       │    - 커밋링크: 자동 연결
       │
       └─── handoff.md 변경 감지
                   │
                   ▼
            개발노트 DB 자동 생성/업데이트
```

## 🧪 로컬 테스트

로컬에서 스크립트를 테스트하려면:

```bash
# 환경변수 설정
export NOTION_TOKEN="your_token"
export NOTION_WBS_DB_ID="803ab748-ce1f-4185-9d78-c76dc4103c22"
export NOTION_DEVNOTE_DB_ID="942f6547-e56e-40c3-80db-ee3f0c8e00e5"
export COMMIT_MESSAGE="[WBS-007] 완료: 테스트"
export COMMIT_URL="https://github.com/eyjs/potg/commit/abc123"

# 의존성 설치
npm install @notionhq/client

# 실행
node scripts/notion-sync.js
```

## ❓ 트러블슈팅

### "Could not find database with ID"
→ Integration이 해당 DB에 연결되지 않았습니다. Notion에서 연결하세요.

### "Invalid request URL"
→ DB ID 형식이 잘못되었습니다. 하이픈 포함 32자 UUID인지 확인하세요.

### "401 Unauthorized"
→ NOTION_TOKEN이 잘못되었거나 만료되었습니다. 새로 발급하세요.

## 📊 Notion DB ID 정리

| DB | ID |
|----|-----|
| WBS DB | `803ab748-ce1f-4185-9d78-c76dc4103c22` |
| 개발노트 DB | `942f6547-e56e-40c3-80db-ee3f0c8e00e5` |
| 프로젝트 DB | `3b2dc1e7-2978-401f-be3e-794a398e227d` |
| 회의록 DB | `f8d2d415-d122-461f-9167-94e7440adf04` |
