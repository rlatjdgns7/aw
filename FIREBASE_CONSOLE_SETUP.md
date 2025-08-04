# Firebase Console 설정 가이드

## 1. Firebase Console 접속 및 확인

### Firebase Console 접속
1. https://console.firebase.google.com/ 접속
2. `foodism-782cb` 프로젝트 선택

## 2. Functions 상태 확인

### Functions 탭에서 확인할 것들
1. **Functions** 메뉴 클릭
2. `api` 함수가 배포되어 있는지 확인
3. 함수 상태가 **활성(Active)** 인지 확인
4. 최근 배포 시간 확인

### Functions 로그 확인
1. `api` 함수 클릭
2. **로그** 탭 선택
3. 최근 오류나 404 에러 확인

## 3. Authentication 설정

### 로그인 방법 활성화
1. **Authentication** 메뉴 클릭
2. **Sign-in method** 탭 선택
3. 다음 방법들이 활성화되어 있는지 확인:
   - **Google** ✅
   - **Anonymous** ✅ (임시 사용자용)

## 4. Firestore Database 확인

### 데이터베이스 상태 확인
1. **Firestore Database** 메뉴 클릭
2. 다음 컬렉션들이 존재하는지 확인:
   - `additives` (58개 문서)
   - `recipes` (5개 문서)
   - `scanResults` (작업 결과 저장용)

### Firestore Rules 확인
1. **Rules** 탭 클릭
2. 현재 규칙이 다음과 같은지 확인:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 모든 문서에 대한 읽기/쓰기 허용 (개발용)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ 주의: 프로덕션에서는 보안 규칙을 강화해야 합니다**

## 5. Google Cloud Vision API 활성화

### API 활성화 확인
1. Google Cloud Console (https://console.cloud.google.com/) 접속
2. 프로젝트 `foodism-782cb` 선택
3. **APIs & Services** > **Enabled APIs** 이동
4. 다음 API가 활성화되어 있는지 확인:
   - **Cloud Vision API** ✅
   - **Cloud Functions API** ✅
   - **Firestore API** ✅

### API 활성화하는 방법 (필요시)
1. **APIs & Services** > **Library** 이동
2. "Cloud Vision API" 검색
3. **ENABLE** 버튼 클릭

## 6. 서비스 계정 키 확인

### 서비스 계정 권한 확인
1. Google Cloud Console에서 **IAM & Admin** > **Service Accounts** 이동
2. `foodism-782cb@appspot.gserviceaccount.com` 계정 확인
3. 필요한 권한들:
   - **Cloud Vision API User**
   - **Firebase Admin SDK Administrator Service Agent**
   - **Firestore Service Agent**

## 7. Functions 재배포 (권한이 있는 경우)

### 로컬에서 재배포
```bash
cd backend/functions
npm run build
firebase deploy --only functions --project foodism-782cb
```

### 배포 후 확인할 것
1. Functions Console에서 새 버전 확인
2. 테스트 URL로 접속: 
   - https://us-central1-foodism-782cb.cloudfunctions.net/api/
   - https://us-central1-foodism-782cb.cloudfunctions.net/api/health

## 8. 네트워크 및 보안 설정

### CORS 설정 확인
Functions에서 CORS가 올바르게 설정되어 있는지 확인:
- 모든 origin 허용 (개발용)
- POST 메서드 허용
- Authorization 헤더 허용

### Firebase Hosting (선택사항)
만약 웹 버전도 배포할 예정이라면:
1. **Hosting** 메뉴에서 도메인 설정
2. `firebase.json`에서 rewrite 규칙 설정

## 9. 사용량 및 할당량 확인

### 할당량 확인
1. Google Cloud Console > **APIs & Services** > **Quotas**
2. Cloud Vision API 일일 할당량 확인
3. Functions 실행 시간 및 호출 횟수 확인

### 과금 설정
1. Firebase Console > **Usage and billing**
2. Blaze 플랜(종량제)이 활성화되어 있는지 확인
3. 예상 사용량 및 비용 확인

## 10. 문제 해결

### Functions 404 오류 해결
1. Functions 로그에서 정확한 오류 메시지 확인
2. 라우트 경로가 올바른지 확인:
   - `/api/search/image` ✅
   - `/search/image` ❌

### 권한 오류 해결
만약 "Missing permissions" 오류가 발생하면:
1. 프로젝트 소유자에게 다음 역할 요청:
   - **Cloud Functions Admin**
   - **Service Account User**
2. 또는 프로젝트 소유자가 직접 배포

### Vision API 오류 해결
1. 서비스 계정 키 파일이 올바른 위치에 있는지 확인
2. 환경변수 `GOOGLE_APPLICATION_CREDENTIALS` 설정 확인
3. API 할당량 초과 여부 확인

## 체크리스트

- [ ] Firebase Console에서 `api` 함수가 활성 상태인지 확인
- [ ] Authentication에서 Google/Anonymous 로그인 활성화
- [ ] Firestore에 `additives`, `recipes` 컬렉션 존재 확인
- [ ] Firestore Rules가 읽기/쓰기 허용으로 설정
- [ ] Google Cloud에서 Vision API 활성화 확인
- [ ] 서비스 계정 권한 확인
- [ ] Functions 로그에서 오류 메시지 확인
- [ ] 테스트 URL 접속해서 응답 확인

---

이 설정들을 확인하고 문제가 있으면 알려주세요!