# Foodism 앱 미리보기 가이드

## 📱 **방법 1: Expo Go 앱 (추천)**

### **1단계: Expo Go 설치**
- **iPhone**: App Store에서 "Expo Go" 검색 후 설치
- **Android**: Google Play Store에서 "Expo Go" 검색 후 설치

### **2단계: 개발 서버 시작**
```bash
# 프로젝트 폴더로 이동
cd /mnt/c/Users/kim/Downloads/fudism/frontend

# 패키지 설치
npm install

# 개발 서버 시작
npm start
```

### **3단계: QR 코드로 앱 실행**
1. 터미널에 QR 코드가 표시됩니다
2. 스마트폰의 Expo Go 앱에서 QR 코드 스캔
3. 앱이 자동으로 로드되고 실행됩니다

---

## 🖥️ **방법 2: 웹 브라우저에서 미리보기**

### **웹에서 실행**
```bash
cd frontend
npm start
# 터미널에서 'w' 키 누르기 (웹 모드)
```

브라우저에서 `http://localhost:19006`으로 접속하면 웹 버전을 볼 수 있습니다.

---

## 📱 **방법 3: iOS 시뮬레이터 (Mac만)**

### **필요 프로그램**
- Xcode (Mac App Store에서 설치)
- iOS Simulator

### **실행 방법**
```bash
cd frontend
npm start
# 터미널에서 'i' 키 누르기 (iOS 시뮬레이터)
```

---

## 🤖 **방법 4: Android 에뮬레이터**

### **필요 프로그램**
- Android Studio
- Android Virtual Device (AVD)

### **실행 방법**
```bash
cd frontend
npm start
# 터미널에서 'a' 키 누르기 (Android 에뮬레이터)
```

---

## 🚨 **현재 상태에서 작동하는 기능**

### ✅ **작동하는 기능**
- 📱 UI/UX 디자인 확인
- 🔍 화면 전환 및 네비게이션
- 🎨 색상, 레이아웃, 애니메이션
- 📋 텍스트 입력 폼 (동작 안 함)

### ❌ **작동하지 않는 기능**
- 🔐 소셜 로그인 (Firebase 설정 필요)
- 🗄️ 데이터베이스 연결 (Firebase 설정 필요)
- 📷 이미지 업로드 (백엔드 배포 필요)
- 🔍 검색 기능 (API 연결 필요)

---

## ⚡ **빠른 미리보기 단계**

### **최소 설정으로 UI만 보기**

1. **Node.js 설치 확인**
   ```bash
   node --version  # v18 이상 필요
   npm --version
   ```

2. **Expo CLI 설치**
   ```bash
   npm install -g @expo/cli
   ```

3. **앱 실행**
   ```bash
   cd /mnt/c/Users/kim/Downloads/fudism/frontend
   npm install
   npm start
   ```

4. **스마트폰에서 확인**
   - Expo Go 앱 설치
   - QR 코드 스캔
   - 앱 실행!

---

## 🔧 **문제 해결**

### **포트 오류**
```bash
# 다른 포트 사용
npx expo start --port 19001
```

### **캐시 문제**
```bash
# 캐시 클리어 후 재시작
npx expo start --clear
```

### **네트워크 문제**
```bash
# 터널 모드 사용
npx expo start --tunnel
```

---

## 📋 **미리보기 체크리스트**

### **UI/UX 확인사항**
- [ ] 로그인 화면 디자인
- [ ] 소셜 로그인 버튼 레이아웃
- [ ] 홈 화면 구성
- [ ] 검색 결과 화면
- [ ] 상세 정보 화면
- [ ] 이미지 처리 대기 화면
- [ ] 색상 테마 (초록색 계열)
- [ ] 반응형 디자인
- [ ] 아이콘 및 이모지 표시

### **기능 플로우 확인**
- [ ] 화면 간 네비게이션
- [ ] 뒤로가기 버튼
- [ ] 모달 팝업 (텍스트 검색)
- [ ] 리스트 스크롤
- [ ] 터치 반응성

---

## 🎯 **완전한 앱 실행을 위한 다음 단계**

1. **Firebase 프로젝트 생성 및 설정**
2. **Google/Apple 로그인 구성**
3. **백엔드 Functions 배포**
4. **샘플 데이터 추가**
5. **실제 기능 테스트**

현재는 **UI/UX 미리보기**만 가능하며, 실제 기능 사용을 위해서는 Firebase 설정이 필요합니다!