# Project Conventions & Architecture Guidelines

이 문서는 `POTG Auction` 프로젝트의 시스템 아키텍처, 코딩 컨벤션, 그리고 AI Agent가 작업을 수행할 때 반드시 준수해야 할 규칙을 정의합니다. 모든 기여자와 AI Agent는 이 가이드를 따라 기존 코드 스타일과 구조를 유지해야 합니다.

## 1. System Architecture (시스템 구조)

이 프로젝트는 Monorepo 형태의 구조를 가지며, Frontend와 Backend가 명확히 분리되어 있습니다.

-   **Root Directory**: `potg/`
-   **Frontend**: `potg/frontend/`
    -   Framework: **Next.js 16 (App Router)**
    -   Language: TypeScript
    -   Styling: Tailwind CSS, Shadcn UI (Radix UI 기반)
-   **Backend**: `potg/backend/`
    -   Framework: **Nest.js**
    -   Language: TypeScript

---

## 2. Frontend Guidelines (Next.js)

### 2.1 Directory Structure & File Naming
-   **File Naming**: 모든 파일명은 **kebab-case**를 사용합니다. (예: `auction-room-card.tsx`, `user-profile.ts`)
-   **Component Naming**: 코드 내부의 컴포넌트 명칭은 **PascalCase**를 사용합니다.
-   **Folder Structure**:
    -   `app/`: Next.js App Router 페이지 및 레이아웃.
    -   `components/ui/`: 버튼, 입력창 등 재사용 가능한 **Atomic UI 컴포넌트** (Shadcn UI 패턴). **이 폴더의 컴포넌트는 비즈니스 로직을 포함하지 않아야 합니다.**
    -   `components/`: 비즈니스 로직이 포함되거나, 특정 기능에 종속된 컴포넌트.
    -   `lib/`: 유틸리티 함수 (`utils.ts` 등) 및 설정.

### 2.2 Component Architecture
-   **Server Components Priority**: 기본적으로 모든 컴포넌트는 Server Component로 작성합니다.
-   **Client Components**: `useState`, `useEffect`, 브라우저 이벤트 핸들링이 필요한 경우에만 파일 최상단에 `'use client'`를 선언하여 Client Component로 전환합니다.
-   **Props Interface**: 모든 컴포넌트는 `interface`를 사용하여 Props 타입을 명시적으로 정의해야 합니다.

### 2.3 Styling (CSS)
-   **Framework**: **Tailwind CSS**를 전적으로 사용합니다.
-   **External CSS**: `globals.css` 외의 별도 CSS 파일(`.css`, `.scss`, `.module.css`) 생성을 **금지**합니다.
-   **Class Management**: 조건부 스타일링 및 클래스 병합 시 반드시 `lib/utils.ts`에 정의된 **`cn` (clsx + tailwind-merge)** 유틸리티 함수를 사용합니다.
    ```tsx
    // Good
    <div className={cn("bg-white p-4", className)}>...</div>
    
    // Bad
    <div className={`bg-white p-4 ${className}`}>...</div>
    ```

---

## 3. TypeScript Rules (Strict Mode)

-   **No `any`**: `any` 타입 사용을 **엄격히 금지**합니다. 데이터 구조를 모를 경우 `unknown`을 사용하고, 타입 가드(Type Guard)를 통해 좁혀서 사용하거나, 적절한 Interface/Type을 정의해야 합니다.
-   **Explicit Types**: 함수의 매개변수와 반환 타입은 가능한 한 명시적으로 작성합니다.
-   **Interfaces over Types**: 객체 정의 시 `type` 별칭보다 `interface` 확장을 선호합니다.

---

## 4. Backend Guidelines (Nest.js)

-   **Architecture**: Controller-Service-Module 패턴을 준수합니다.
-   **DTO**: 데이터 전송 객체(DTO)는 `class-validator`를 사용하여 유효성 검사를 수행해야 합니다.
-   **Configuration**: 환경 변수는 `@nestjs/config`를 통해 관리합니다.

---

## 5. General AI Agent Rules (AI 작업 수칙)

1.  **Context First**: 코드를 수정하기 전에 관련 파일(`package.json`, 주변 컴포넌트, `layout.tsx` 등)을 먼저 읽고 기존 스타일을 파악하십시오.
2.  **Minimize Changes**: 요청받은 기능 외에 불필요한 리팩토링이나 스타일 변경을 하지 마십시오.
3.  **Comments**:
    -   코드 자체로 설명이 되는 경우 주석을 줄이십시오.
    -   복잡한 로직에 대한 설명이 필요할 경우, 주석은 **한국어**로 작성하십시오.
4.  **Verification**: 코드를 생성한 후에는 import 경로가 올바른지, 사용된 라이브러리가 `package.json`에 존재하는지 확인하십시오.

---

## 6. UI/UX Design Patterns (Overwatch Theme Enforcement)

**All AI Agents MUST adhere to the following design system to maintain the 'Overwatch' aesthetic.**

### 6.1 Core Aesthetic
-   **Style**: Futuristic, Angular, High-Contrast.
-   **Fonts**: Primary font is `"Exo 2"`, Secondary is `"Geist"`. Use *italics* for headers (`font-style: italic`) to mimic the game UI.
-   **Shapes**: Prefer **skewed** rectangles over rounded corners for action buttons and headers.

### 6.2 Key CSS Utility Classes (Tailwind)
Use these specific patterns instead of generic styles:

-   **Skewed Buttons**: Use the `.skew-btn` class defined in global CSS or manually apply `skew-x-[-10deg]` to the container and `skew-x-[10deg]` to the content.
    ```tsx
    // Example
    <div className="skew-btn bg-primary text-primary-foreground ...">
      <span>BUTTON TEXT</span>
    </div>
    ```
-   **Borders**: Thin, crisp borders. Use `border` or `border-2`.
-   **Colors**: Use semantic variables only.
    -   Primary Action: `bg-primary` (Orange #f99e1a)
    -   Accent/Highlight: `text-accent` (Cyan #00c3ff) or `text-ow-blue`
    -   Danger/Enemy: `text-destructive` (Red #ff4649) or `text-ow-red`
    -   Backgrounds: `bg-card` (Dark Grey #1a1a1a) or `bg-background` (Deep Black #0b0b0b)

### 6.3 Strict Don'ts
-   ❌ **Do NOT** use rounded-full buttons (unless for avatars).
-   ❌ **Do NOT** use pastel colors. Stick to high-saturation neon (Orange, Cyan) on dark backgrounds.
-   ❌ **Do NOT** use arbitrary values like `w-[350px]`. Use Tailwind sizing (`w-full`, `w-96`, `max-w-md`).
-   ❌ **Do NOT** create new CSS files. All styles must be Tailwind utility classes or defined in `app/globals.css`.

---

*Last Updated: 2026-01-15*