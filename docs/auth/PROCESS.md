# 인증 시스템 (Authentication & Authorization)

## 1. 개요
JWT 기반 인증 시스템을 사용하며, **모든 사용자는 서비스 이용을 위해 반드시 하나 이상의 클랜(Clan)에 소속되어야 합니다.**
회원가입 직후에는 '클랜 미배정' 상태이며, 별도의 클랜 가입/생성 절차를 거쳐야 정식 사용자가 됩니다.

## 2. 데이터 구조 및 정책

### 사용자 (User)
*   **Login ID**: 고유 식별자. 변경 불가.
*   **Battle Tag**: 게임 내 닉네임. Unique, 변경 가능.
*   **Clan ID**: 소속 클랜 참조. (FK). **가입 직후에는 NULL 가능하나, 서비스 이용 시 필수.**
*   **Status**:
    *   `PENDING_CLAN`: 회원가입 완료, 클랜 미배정 (기능 제한).
    *   `ACTIVE`: 클랜 배정 완료, 정상 이용 가능.

### 토큰 (JWT)
*   **Access Token Payload**:
    ```json
    {
      "sub": 123,               // user_id
      "login_id": "frozen",
      "battle_tag": "FrozenDog#31776",
      "clan_id": 5,             // 미가입 시 null
      "role": "USER",           // 미가입 시 TEMPORARY
      "iat": 1700000000,
      "exp": 1700003600
    }
    ```

## 3. 상세 프로세스

### 3.1 회원가입 및 온보딩 (Onboarding)
1.  **회원가입**: `login_id`, `password`, `battle_tag` 입력.
2.  **생성**: DB에 `clan_id=NULL`, `status=PENDING_CLAN`으로 생성.
3.  **로그인**: 가입한 계정으로 로그인.
4.  **클랜 체크**: 서버는 `clan_id`가 없으면 응답에 `need_clan: true` 플래그 혹은 특정 에러 코드 포함.
5.  **클랜 가입/생성**:
    *   **클랜 생성**: 신규 클랜을 만들고 클랜 마스터가 됨.
    *   **클랜 가입**: 초대 코드 등을 입력하여 기존 클랜에 가입.
6.  **토큰 갱신**: 클랜 배정이 완료되면 서버는 `clan_id`가 포함된 새로운 Access Token을 발급.

### 3.2 로그인 (Login)
*   일반적인 JWT 발급 로직.
*   단, 발급된 토큰의 `clan_id`가 `null`이면 클라이언트는 자동으로 '클랜 가입 페이지'로 라우팅해야 함.

### 3.3 배틀태그 변경
*   Unique 제약 조건을 체크한 후 변경.
*   변경 시 Access Token의 `battle_tag` 정보가 구형이 되므로, **Silent Refresh**를 통해 토큰을 즉시 갱신하거나, 다음 갱신 주기까지 기다림.

## 4. 보안 정책

*   **Clan Guard**: 주요 API(스크림, 경매 등)는 `clan_id`가 없는 사용자의 접근을 원천 차단 (`Guard` 레벨 처리).
*   **Password**: Bcrypt 해싱.

## 5. API 명세 (인증 관련)

| Method | Endpoint | Description | Auth | Note |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/signup` | 회원가입 | X | clan_id=null 로 생성 |
| `POST` | `/auth/login` | 로그인 | X | 토큰 발급 |
| `POST` | `/clans` | 클랜 생성 | O | 생성 후 user.clan_id 업데이트 |
| `POST` | `/clans/join` | 클랜 가입 | O | 가입 후 user.clan_id 업데이트 |
| `GET` | `/users/me` | 내 정보 조회 | O | |