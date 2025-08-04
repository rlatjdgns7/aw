# 이미지 처리 API 오류 해결 가이드

## 문제 상황
```
HTTP 404 - Cannot POST /search/image
```

프론트엔드에서 이미지를 업로드하여 성분표 분석을 시도할 때 발생하는 오류입니다.

## 원인 분석

### 1. API 엔드포인트 불일치
- **프론트엔드 요청**: `POST /search/image`
- **실제 백엔드 라우트**: `POST /api/search/image`

### 2. 서버 상태 문제
- Firebase Functions 에뮬레이터가 실행되지 않았을 가능성
- 잘못된 API URL 설정

## 해결 방법

### 1단계: 백엔드 서버 확인 및 시작

#### 1.1 현재 실행 중인 프로세스 확인
```bash
# Firebase 에뮬레이터 프로세스 확인
ps aux | grep firebase

# 실행 중인 포트 확인
netstat -tulpn | grep :5001
```

#### 1.2 백엔드 서버 시작
```bash
# 방법 1: 루트 디렉토리에서
npm run start:backend

# 방법 2: 백엔드 디렉토리에서 직접
cd backend/functions
npm run serve

# 방법 3: Firebase CLI 직접 사용
firebase emulators:start --only functions
```

#### 1.3 서버 실행 확인
브라우저에서 접속하여 확인:
```
http://localhost:5001/fudism-c30db/us-central1/api/
```

정상 응답 예시:
```json
{"message": "Foodism API is running!", "timestamp": "2024-..."}
```

### 2단계: 프론트엔드 API URL 설정 확인

#### 2.1 API 설정 파일 확인
파일 위치: `frontend/hudi/services/api.ts`

올바른 설정:
```typescript
// 로컬 개발 환경
const API_BASE_URL = 'http://localhost:5001/fudism-c30db/us-central1/api';

// 또는 프로덕션 환경
const API_BASE_URL = 'https://us-central1-fudism-c30db.cloudfunctions.net/api';
```

#### 2.2 이미지 업로드 함수 확인
```typescript
export const uploadImageForAnalysis = async (imageUri: string) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'ingredient-image.jpg',
  } as any);

  const response = await fetch(`${API_BASE_URL}/search/image`, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.json();
};
```

### 3단계: 백엔드 라우트 확인

#### 3.1 라우트 파일 확인
파일 위치: `backend/functions/src/routes/api.ts`

필요한 라우트가 정의되어 있는지 확인:
```typescript
router.post('/search/image', searchController.searchByImage);
```

#### 3.2 컨트롤러 함수 확인
파일 위치: `backend/functions/src/controllers/searchController.ts`

`searchByImage` 함수가 구현되어 있는지 확인.

### 4단계: 환경 변수 설정

#### 4.1 Firebase 설정 확인
파일 위치: `backend/functions/.env`
```
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
```

#### 4.2 프론트엔드 환경 변수 확인
파일 위치: `frontend/hudi/.env`
```
EXPO_PUBLIC_API_URL=http://localhost:5001/fudism-c30db/us-central1/api
```

### 5단계: 테스트 및 검증

#### 5.1 API 엔드포인트 직접 테스트
```bash
# curl로 API 테스트
curl -X POST http://localhost:5001/fudism-c30db/us-central1/api/search/image \
  -F "image=@/path/to/test-image.jpg"
```

#### 5.2 프론트엔드에서 API URL 로그 확인
개발자 도구에서 네트워크 탭을 확인하여 실제 요청되는 URL 점검.

## 체크리스트

- [ ] 백엔드 서버(Firebase Functions) 실행 확인
- [ ] API 베이스 URL 올바르게 설정
- [ ] `/api/search/image` 라우트 존재 확인
- [ ] 이미지 업로드 함수의 URL 경로 확인
- [ ] 환경 변수 올바르게 설정
- [ ] 네트워크 연결 및 포트 접근 가능 확인

## 자주 발생하는 문제

### 문제 1: Firebase 에뮬레이터가 시작되지 않음
**해결**: 
```bash
firebase login
firebase use fudism-c30db
cd backend/functions && npm install
```

### 문제 2: 포트 충돌
**해결**: 
```bash
# 5001 포트 사용 중인 프로세스 종료
lsof -ti:5001 | xargs kill -9
```

### 문제 3: CORS 오류
**해결**: 백엔드에서 CORS 미들웨어 설정 확인
```typescript
app.use(cors({
  origin: ['http://localhost:8081', 'exp://'],
  credentials: true
}));
```

## 완료 후 확인사항

1. 이미지 업로드 시 정상적으로 job ID 반환
2. Firestore의 `scanResults` 컬렉션에 작업 생성 확인
3. OCR 처리 완료 후 결과 업데이트 확인
4. 프론트엔드에서 실시간 상태 업데이트 수신 확인

---

## 추가 지원

문제가 지속될 경우:
1. 서버 로그 확인: `firebase functions:log`
2. 브라우저 개발자 도구 네트워크 탭 점검
3. Firebase Console에서 Functions 상태 확인