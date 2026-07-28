# Cost Trend 가계부

Firebase Firestore + Authentication과 GitHub Pages로 실행하는 개인 가계부 웹앱입니다. 별도의 서버나 빌드 과정 없이 `index.html`, `styles.css`, `app.js`를 GitHub 저장소에 올리면 됩니다.

## 구현 기능

- 가계부 작성: 날짜, Criteria, Item, 실제 금액, 실제 Bank, 사용처, 메모
- Item 기준 자동 수입/지출 부호 적용
- 기준표 수정 및 보관: Criteria, Item, 월 Amount, 고정/유동, 기본 Bank
- 과거 기록 보존: 가계부 저장 시 기준 정보를 스냅샷으로 함께 저장하므로 기준표 수정·보관 후에도 과거 표시가 유지됨
- 월별 KPI 및 예산 USL 비교
- 월 × Bank, Criteria, Item, 목적 Trend
  - Item Trend의 Criteria 선택이 목적 Trend에 자동 연동
- 월 × Quarter 사용 금액 Trend
  - Q1 1~7일, Q2 8~14일, Q3 15~21일, Q4 22일~말일 기준
  - 월별 최고 사용 Quarter를 강조 표시
  - 선택 종료 월의 실제 지출이 가장 큰 Criteria를 최초 기본값으로 표시
- 유동 지출 SPC
  - 월 사용액이 USL을 초과한 점 표시
  - 6개월 연속 상승(6-point rise) 표시
  - 개인 결제금액 `평균 + 1.96 × 표준편차` 초과 행 표시
  - 선택 Item의 일별 결제 합계를 월별 Min·Avg·Max Trend로 표시
  - 전체 기간 일별 분포의 95% 상한을 초과한 월별 Max 점 강조
  - 단측 Cpk 및 Rolling Cpk Trend
- 월급 수령일 기준 Cash, Stock, Insurance, All 자산 Trend
- 가계부 CSV 내보내기
- 반응형 PC/모바일 화면
- 탭 화면 전환 페이드·슬라이드 모션 및 사용자 모션 축소 설정 지원

## 데이터 구조

```text
users/{uid}/masters/{masterId}
users/{uid}/transactions/{transactionId}
users/{uid}/assets/{assetId}
```

`transactions`에는 `criteriaSnapshot`, `itemSnapshot`, `monthlyAmountSnapshot`, `flowTypeSnapshot`, `bankSnapshot`이 저장됩니다. 따라서 기준표 항목을 보관하거나 금액을 변경해도 과거 가계부의 당시 값은 바뀌지 않습니다.

## Firebase 설정

### 1. Authentication 활성화

Firebase Console → Authentication → Sign-in method → **Email/Password**를 활성화합니다.

### 2. Firestore Database 생성

Firebase Console → Firestore Database에서 데이터베이스를 생성합니다. 위치는 가까운 리전을 선택하면 됩니다.

### 3. Firestore Rules 배포

Firebase Console → Firestore Database → Rules에서 기존 내용을 이 프로젝트의 `firestore.rules` 내용으로 교체하고 게시합니다.

현재 제공하신 아래 규칙은 모든 접근을 차단하므로 앱이 저장할 수 없습니다.

```text
allow read, write: if false;
```

제공된 새 규칙은 로그인한 사용자가 자기 UID 아래의 데이터만 읽고 쓰도록 제한합니다.

### 4. 승인된 도메인

Firebase Console → Authentication → Settings → Authorized domains에 GitHub Pages 도메인을 추가합니다.

예시:

```text
사용자명.github.io
```

로컬 개발 시 `localhost` 또는 `127.0.0.1`도 승인된 도메인에 있어야 합니다.

## GitHub Pages 배포

1. 새 GitHub 저장소를 만듭니다.
2. 이 폴더 안의 파일을 저장소 루트에 업로드합니다.
3. GitHub 저장소 → Settings → Pages로 이동합니다.
4. Source를 `Deploy from a branch`로 선택합니다.
5. Branch를 `main`, 폴더를 `/root`로 선택하고 저장합니다.
6. 생성된 GitHub Pages 주소로 접속합니다.

## 로컬 실행

ES Module과 Firebase CDN을 사용하므로 파일을 더블클릭하지 말고 로컬 서버로 실행해야 합니다.

Visual Studio Code의 Live Server를 사용하거나 터미널에서 다음을 실행합니다.

```bash
python -m http.server 5500
```

그다음 브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:5500
```

## 처음 로그인

1. 이메일과 6자 이상의 비밀번호를 입력합니다.
2. **첫 계정 만들기**를 누릅니다.
3. 제공된 기본 Criteria/Item 표가 자동 등록됩니다.
4. 기존 계정은 **로그인**을 누릅니다.

기존 계정인데 기준표가 비어 있다면 `기준표 → 기본표 다시 추가`를 누릅니다.

## 계산 기준

- 기준표 Amount가 양수이면 수입, 음수이면 지출/저축으로 저장합니다.
- 가계부 입력창에는 항상 양수 금액을 입력합니다.
- 월 USL은 기준표의 월 Amount 절댓값입니다.
- 개인 결제 이상 상한은 같은 Item의 결제 데이터가 5건 이상일 때 `평균 + 1.96 × 표준편차`로 계산합니다.
- 일별 Min·Avg·Max는 같은 날짜의 같은 Item 결제액을 먼저 합산한 뒤 월별로 계산합니다.
- 일별 Max 이상점은 선택 기간의 일별 합계가 5일 이상일 때 `일별 평균 + 1.96 × 일별 표준편차`를 초과한 월별 Max입니다.
- Cpk는 유동 Item의 월 합계에 대해 `(USL - 월평균) / (3 × 월 표준편차)`로 계산하는 단측 Cpk입니다.
- Rolling Cpk는 선택 기간의 시작 월부터 해당 월까지 누적된 월 합계로 계산합니다.
- 6-point rise는 6개월 월 합계가 연속으로 증가할 때 마지막 점을 표시합니다.

## 파일 구성

```text
index.html       화면 구조
styles.css       UI 및 반응형 스타일
app.js           Firebase, 원장, KPI, Trend, SPC 로직
firestore.rules  사용자별 데이터 격리 규칙
README.md        설정 및 배포 방법
```

## 참고

웹 프로젝트에서는 Java가 아니라 **JavaScript**를 사용합니다. 현재 구성은 HTML + CSS + JavaScript이며 Visual Studio Code에서 바로 수정할 수 있습니다.
