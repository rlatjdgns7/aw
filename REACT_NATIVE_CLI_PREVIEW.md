# React Native CLI로 Foodism 앱 미리보기

## 🚀 **빠른 시작 가이드**

### **전제 조건**
- ✅ Node.js 18+ 설치
- ✅ React Native CLI 설치
- ✅ Android Studio (Android 미리보기용)
- ✅ Xcode (iOS 미리보기용, Mac만)

## 📱 **1. 환경 설정**

### **React Native CLI 설치**
```bash
npm install -g react-native-cli
# 또는
npm install -g @react-native-community/cli
```

### **Android 개발 환경 (Windows/Mac/Linux)**
1. **Android Studio** 설치
2. **Android SDK** 설치 (API 33 이상)
3. **Android Virtual Device (AVD)** 생성
4. **환경 변수 설정**:
   ```bash
   # Windows
   set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
   set PATH=%PATH%;%ANDROID_HOME%\tools;%ANDROID_HOME%\platform-tools
   
   # Mac/Linux
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   ```

### **iOS 개발 환경 (Mac만)**
1. **Xcode** 설치 (App Store에서)
2. **iOS Simulator** 설치
3. **Command Line Tools** 설치:
   ```bash
   xcode-select --install
   ```

## 🔧 **2. 프로젝트 설정**

### **의존성 설치**
```bash
cd /mnt/c/Users/kim/Downloads/fudism/frontend-rn
npm install

# iOS 전용 (Mac만)
cd ios && pod install && cd ..
```

### **Metro 번들러 시작**
```bash
npx react-native start
```

## 📱 **3. 앱 실행**

### **Android 에뮬레이터에서 실행**
```bash
# 새 터미널 창에서
npx react-native run-android
```

### **iOS 시뮬레이터에서 실행 (Mac만)**
```bash
# 새 터미널 창에서
npx react-native run-ios
```

### **실제 기기에서 실행**
```bash
# Android 기기 (USB 디버깅 활성화)
npx react-native run-android --device

# iOS 기기 (Mac만, 개발자 계정 필요)
npx react-native run-ios --device
```

## 🎯 **4. 현재 상태 미리보기**

### **✅ 확인 가능한 기능**
- 🎨 **UI 디자인**: 소셜 로그인 화면 레이아웃
- 📱 **반응형 디자인**: 다양한 화면 크기 대응
- 🔘 **버튼 인터랙션**: 터치 반응 및 애니메이션
- 🖼️ **아이콘 및 이모지**: 시각적 요소 표시

### **❌ 현재 작동하지 않는 기능**
- 🔐 **실제 로그인**: Firebase 설정 필요
- 📊 **데이터 연동**: 백엔드 연결 필요
- 📷 **카메라 기능**: 네이티브 권한 설정 필요

## 🔧 **5. 문제 해결**

### **일반적인 오류**

#### **Metro 연결 오류**
```bash
# 캐시 클리어
npx react-native start --reset-cache
```

#### **Android 빌드 오류**
```bash
# 그래들 캐시 클리어
cd android && ./gradlew clean && cd ..
```

#### **iOS 빌드 오류**
```bash
# CocoaPods 재설치
cd ios && pod deintegrate && pod install && cd ..
```

#### **Node 모듈 오류**
```bash
# 의존성 재설치
rm -rf node_modules
npm install
```

### **권한 오류**
```bash
# Android 개발자 옵션 활성화
# 설정 → 휴대전화 정보 → 빌드 번호 7회 탭

# USB 디버깅 활성화
# 설정 → 개발자 옵션 → USB 디버깅 체크
```

## 📋 **6. 개발 도구**

### **디버깅 도구**
```bash
# React Native Debugger
npm install -g react-native-debugger

# Flipper (Facebook의 디버깅 도구)
# https://fbflipper.com/
```

### **개발 메뉴 접근**
- **Android**: `Ctrl + M` (에뮬레이터) 또는 기기 흔들기
- **iOS**: `Cmd + D` (시뮬레이터) 또는 기기 흔들기

## 🎨 **7. 현재 구현된 화면**

### **LoginScreen 미리보기**
- 🥗 **로고**: 음식 이모지와 Foodism 브랜딩
- 🔘 **Google 로그인 버튼**: 흰색 배경, 회색 테두리
- 🍎 **Apple 로그인 버튼**: 검은색 배경 (iOS만)
- 📋 **기능 소개**: 앱의 주요 기능 설명
- 📄 **개인정보 안내**: 이용약관 동의 안내

### **디자인 특징**
- 🎨 **메인 컬러**: 초록색 (#2E8B57)
- 📱 **반응형**: 다양한 화면 크기 지원
- 🔄 **애니메이션**: 부드러운 전환 효과
- 🌟 **모던 UI**: 깔끔한 카드 레이아웃

## 🚀 **8. 다음 단계**

### **완전한 앱 실행을 위한 설정**
1. **Firebase 프로젝트 설정**
2. **Google/Apple 로그인 구성**
3. **google-services.json 파일 추가** (Android)
4. **GoogleService-Info.plist 파일 추가** (iOS)
5. **백엔드 Functions 배포**

### **추가 화면 구현**
- HomeScreen, SearchResultScreen, DetailScreen 등

## 📞 **도움이 필요하다면**

### **공식 문서**
- [React Native CLI 가이드](https://reactnative.dev/docs/environment-setup)
- [Android 개발 설정](https://reactnative.dev/docs/running-on-device)
- [iOS 개발 설정](https://reactnative.dev/docs/running-on-simulator-ios)

### **커뮤니티**
- React Native 공식 Discord
- Stack Overflow의 react-native 태그
- GitHub Issues

현재 상태에서도 **앱의 전체적인 디자인과 사용자 경험**을 확인할 수 있습니다!