# 소셜 로그인 설정 가이드

## 🔐 **변경 사항**

이제 Foodism은 **소셜 로그인만** 지원합니다:
- ✅ **Google 로그인** (모든 플랫폼)
- ✅ **Apple 로그인** (iOS만)
- ❌ 이메일/비밀번호 로그인 (제거됨)

## 🚀 **Firebase 콘솔 설정**

### **1. Authentication 설정**

1. Firebase Console → Authentication → Sign-in method
2. 다음 제공업체 활성화:
   - **Google**: 사용 설정 후 프로젝트 지원 이메일 설정
   - **Apple**: 사용 설정 후 Apple Developer 정보 입력

### **2. Google 로그인 설정**

#### **웹 클라이언트 ID 발급**
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. APIs & Services → Credentials
3. Create Credentials → OAuth 2.0 Client IDs
4. Application type: Web application
5. Authorized redirect URIs 추가:
   ```
   https://auth.expo.io/@your-username/your-app-slug
   ```

#### **Android 설정**
1. Application type: Android
2. Package name: `com.foodism.app`
3. SHA-1 certificate fingerprint 추가 (Expo 제공)

#### **iOS 설정**
1. Application type: iOS
2. Bundle ID: `com.foodism.app`

### **3. Apple 로그인 설정**

#### **Apple Developer Console**
1. [Apple Developer](https://developer.apple.com/) 로그인
2. Certificates, Identifiers & Profiles
3. Services → Sign In with Apple 활성화

#### **Firebase에 Apple 설정**
1. Firebase Console → Authentication → Sign-in method
2. Apple 제공업체에서:
   - Services ID 입력
   - Apple 팀 ID 입력
   - 키 ID 및 개인 키 파일 업로드

## 📱 **앱 설정 업데이트**

### **Google 클라이언트 ID 설정**
`frontend/src/services/socialAuth.ts` 파일에서:

```typescript
const request = new AuthSession.AuthRequest({
  clientId: 'YOUR_GOOGLE_CLIENT_ID.googleusercontent.com', // 여기에 실제 클라이언트 ID 입력
  // ...
});
```

### **Firebase 설정 업데이트**
`frontend/src/services/firebase.ts` 파일에서 실제 Firebase 설정 입력:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-actual-app-id"
};
```

## 🛠️ **개발 환경 설정**

### **필요한 패키지 설치**
```bash
cd frontend
npm install
```

새로 추가된 패키지:
- `expo-auth-session`: OAuth 인증
- `expo-crypto`: 암호화 지원
- `expo-web-browser`: 브라우저 세션
- `expo-apple-authentication`: Apple 로그인

### **Expo 개발자 계정 설정**
```bash
npm install -g @expo/cli
expo login
```

## 📋 **테스트 가이드**

### **Google 로그인 테스트**
1. Google 계정으로 로그인 시도
2. 권한 승인 확인
3. 사용자 정보 정상 로드 확인

### **Apple 로그인 테스트 (iOS만)**
1. iOS 기기 또는 시뮬레이터에서 테스트
2. Face ID/Touch ID 인증 확인
3. Apple ID 연동 확인

## 🚨 **주의사항**

### **보안 설정**
- 프로덕션에서는 nonce 사용 필수
- 클라이언트 ID는 환경변수로 관리
- 리다이렉트 URI 정확히 설정

### **플랫폼별 제약사항**
- **Apple 로그인**: iOS에서만 사용 가능
- **Google 로그인**: 모든 플랫폼 지원
- **웹**: Firebase Auth 팝업 방식 사용

## 🔧 **문제 해결**

### **Google 로그인 실패**
```
❌ Error: CLIENT_ID_NOT_FOUND
```
→ Google 클라이언트 ID가 올바른지 확인

### **Apple 로그인 실패**
```
❌ Error: Apple Sign In is not available
```
→ iOS 기기에서 테스트 (Android는 지원 안 함)

### **리다이렉트 오류**
```
❌ Error: redirect_uri_mismatch
```
→ Google Console에서 리다이렉트 URI 확인

## 🎯 **완료 체크리스트**

- [ ] Firebase Console에서 Google/Apple 로그인 활성화
- [ ] Google Cloud Console에서 OAuth 클라이언트 ID 생성
- [ ] Apple Developer Console에서 Sign In with Apple 설정
- [ ] 앱에서 클라이언트 ID 및 Firebase 설정 업데이트
- [ ] Google 로그인 테스트 완료
- [ ] Apple 로그인 테스트 완료 (iOS)
- [ ] 사용자 인증 흐름 검증

## 📚 **추가 리소스**

- [Firebase Authentication 문서](https://firebase.google.com/docs/auth)
- [Expo AuthSession 가이드](https://docs.expo.dev/guides/authentication/)
- [Google OAuth 설정](https://developers.google.com/identity/protocols/oauth2)
- [Apple Sign In 가이드](https://developer.apple.com/sign-in-with-apple/)