# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foodism is a React Native mobile app for analyzing food additives with a Firebase backend. The project consists of multiple frontend implementations and a unified Firebase Functions backend with Firestore database.

## Architecture

### Frontend Structure
The project uses a single React Native Expo application:
- `frontend/hudi/` - Main Expo-based React Native app with router navigation

### Backend Structure
- `backend/functions/` - Firebase Functions with Express.js API
- Firestore collections: `additives`, `recipes`, `scanResults`
- OCR processing using Tesseract.js for image analysis
- Real-time job tracking for async image processing

## Development Commands

### Backend (Firebase Functions)
```bash
cd backend/functions
npm run build          # Compile TypeScript
npm run serve          # Start local emulator
npm run deploy         # Deploy to Firebase
npm run logs           # View function logs
firebase emulators:start --only functions  # Local development
```

### Frontend App

**frontend/hudi/ (Main App)**
```bash
cd frontend/hudi
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run on web
npm run lint          # ESLint with Expo config
```

### Root Level Commands
```bash
npm run start:frontend    # Start frontend dev server
npm run start:backend     # Start backend emulator
npm run build:backend     # Build backend functions
npm run deploy:backend    # Deploy backend to Firebase
```

## Key Technical Details

### Authentication Flow
- Firebase Authentication with Google/Apple social login
- ID token verification in Express middleware at `backend/functions/src/middleware/authMiddleware.ts`
- Protected routes require valid Firebase ID token

### Image Processing Pipeline
1. Client uploads image to `/api/search/image`
2. Server creates job document in `scanResults` collection
3. Client polls job status via Firestore listeners
4. OCR processing runs asynchronously using Tesseract.js
5. Results update in Firestore, triggering client-side navigation

### API Endpoints
- `GET /api/home` - Random recipe and additive for home screen
- `POST /api/search/text` - Text-based additive search
- `POST /api/search/image` - Async image processing with job ID
- `GET /api/additive/:id` - Detailed additive information

### Database Schema
**additives**: `{name, hazard_level, description_short, description_full, aliases[]}`
**recipes**: `{title, youtube_url}`
**scanResults**: `{userId, status, result: {extractedText, additives[]}, createdAt}`

## Configuration Requirements

### Firebase Setup
- Update `services/firebaseConfig.ts` in frontend with Firebase config
- Update `services/api.ts` with Functions URL: `https://REGION-PROJECTID.cloudfunctions.net/api`
- Deploy Firestore security rules from `backend/firestore.rules`

### Development Flow
1. Start backend emulator: `npm run start:backend` or `cd backend/functions && npm run serve`
2. Start frontend app: `npm run start:frontend` or `cd frontend/hudi && npm start`
3. For production: Deploy functions first, then configure frontend URLs

### Testing Strategy
- Backend: Firebase Functions Test framework
- Frontend: Jest with React Native Testing Library
- Manual testing through Expo dev server
- Use Firebase emulator suite for local development

## Common Patterns

### Error Handling
- All API responses follow `{success: boolean, data?: any, error?: string}` pattern
- Firebase errors are caught and wrapped in Express error handlers
- Client-side errors display user-friendly messages

### State Management
- No external state library - uses React hooks and Context
- Firestore real-time listeners for live updates
- Local state for UI components, Firestore for persistent data

### Code Organization
- Controllers handle business logic (`backend/functions/src/controllers/`)
- Routes define API endpoints (`backend/functions/src/routes/`)
- Services handle external integrations (`src/services/`)
- Components are organized by feature in the frontend (`frontend/hudi/components/`)

-- (UI/UX, 상태 관리) --->
    V
[프론트엔드: React]
    |
    |  <--- (REST API 요청: /api/search, /api/analyze-image) --->
    V
[백엔드: Node.js / Express.js]
    |
    |--- 1. (텍스트 검색 시) ---> [Firebase Firestore] (첨가물 정보 조회)
    |
    |--- 2. (이미지 분석 시) ---> [외부 OCR API] (이미지에서 텍스트 추출)
                                    |
                                    V
                                  (추출된 텍스트 반환)
                                    |
                                    V
                                  [Firebase Firestore] (추출된 텍스트와 DB 대조/분석)


                                  
(만들어야할 것)
로그인페이지,메인메뉴,식품첨가물 목록페이지                           
넌 wsl이라 윈도우 접근 안되니까 괜히 권한 따려고 pakage.json같은거 건들지마


리액트 네이티브에서 Google Vision API를 사용하는 최선의 방안은 Firebase Cloud Functions를 활용한 서버리스 아키텍처를 구축하는 것입니다.

## 왜 이 방법이 최선인가요?
클라이언트(앱)가 직접 Vision API를 호출하는 방식은 보안, 속도, 사용자 경험 측면에서 여러 단점이 있습니다. Cloud Functions를 중간에 두면 이 모든 문제를 해결할 수 있습니다.

⚡ 압도적인 속도: 이미지 업로드 후 모든 과정(Vision API 호출, 데이터베이스 처리)이 구글의 빠른 내부망에서 처리됩니다. 사용자는 앱에서 지루하게 기다릴 필요가 없습니다.

🔒 강력한 보안: Google Vision API 키를 서버(Cloud Functions)에 안전하게 숨길 수 있습니다. 앱 코드에 API 키가 노출될 위험이 사라집니다.

👍 최고의 사용자 경험: 앱은 이미지 업로드만 하고 즉시 다른 작업을 할 수 있습니다. OCR 처리가 끝나면 결과만 받아 화면을 갱신해주면 되므로 앱이 훨씬 빠르고 쾌적하게 느껴집니다.

⚙️ 안정성과 확장성: 사용자의 네트워크 상태나 앱 종료와 상관없이 서버에서 안정적으로 작업이 완료됩니다. 사용자가 많아져도 유연하게 확장할 수 있습니다.

## 추천 아키텍처 흐름
(클라이언트) 사용자가 사진을 찍고, 앱에서 이미지 크기를 최적화(리사이징)합니다.

(클라이언트) 최적화된 이미지를 Firebase Storage에 업로드합니다.

(서버) 이미지가 Storage에 업로드되면 Cloud Function이 자동으로 실행됩니다.

(서버) Cloud Function이 Storage의 이미지를 가져와 Google Vision API로 전송합니다.

(서버) Vision API에서 텍스트 인식 결과를 받아, 그 결과로 Firebase 데이터베이스를 쿼리하고 필요한 작업을 수행합니다.

(서버) 최종 결과를 Firebase 데이터베이스의 특정 경로에 저장합니다.

(클라이언트) 앱은 데이터베이스의 결과 경로를 실시간으로 감시(onSnapshot)하고 있다가, 데이터가 들어오면 화면을 즉시 업데이트합니다.

## 결론
이 방식은 보안, 속도, 사용자 경험 모든 면에서 클라이언트가 모든 것을 직접 처리하는 방식보다 월등합니다. 리액트 네이티브와 구글 클라우드 서비스를 연동할 때 가장 표준적이고 강력한 전문가 수준의 아키텍처입니다.







텍스트를 분석하고 비교 대조한뒤 정보를 보여주는 서비스인데 그럼 비교 대조할 정보는 어디다가 넣을까?


비교·대조할 정보는 Firebase의 Firestore 데이터베이스에 저장하는 것이 가장 좋습니다.

## 왜 Firestore를 추천하나요?
Firestore는 텍스트 데이터를 저장, 검색, 관리하는 데 매우 효율적이며, 앞서 논의한 Cloud Functions와의 연동성이 완벽하기 때문입니다.

🔍 강력한 쿼리 기능: Firestore는 복잡한 조건으로 데이터를 검색하고 필터링하는 데 최적화되어 있습니다. OCR로 추출한 텍스트와 데이터베이스의 정보를 비교하는 작업에 매우 유리합니다.

⚡ 실시간 업데이트: Firestore는 데이터가 변경되면 앱에 실시간으로 알려주는 기능을 기본으로 제공합니다. Cloud Functions가 비교 작업을 끝내고 결과를 저장하면, 앱은 별도의 요청 없이 즉시 화면을 업데이트할 수 있습니다.

⚙️ 유연한 데이터 구조: 정해진 틀 없이 유연하게 데이터를 저장할 수 있어, 앞으로 서비스가 확장되더라도 쉽게 대응할 수 있습니다.

🔗 완벽한 생태계 연동: Firebase Storage, Cloud Functions, Firestore는 하나의 생태계 안에서 매끄럽게 연동됩니다. 개발과 유지보수가 매우 편리합니다.

## 데이터베이스 설계 예시
예를 들어, "상품 정보"를 비교하는 서비스를 만든다고 가정해 보겠습니다. Firestore에 다음과 같은 구조로 데이터를 저장할 수 있습니다.

컬렉션(Collection): products

문서(Document): 각 상품의 고유 ID (예: product_123)

필드(Fields):

productName: "맛있는 초콜릿" (OCR로 추출한 텍스트와 비교할 필드)

price: 2500

description: "달콤하고 부드러운 밀크 초콜릿입니다."

keywords: ["초콜릿", "디저트", "간식"] (검색 효율을 높이기 위한 키워드)

이런 구조로 데이터를 저장해두면, Cloud Functions가 OCR로 "맛있는 초콜릿"이라는 텍스트를 얻었을 때 products 컬렉션에서 productName 필드가 일치하는 문서를 빠르게 찾아 비교 작업을 수행할 수 있습니다.