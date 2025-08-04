# Foodism 웹 관리자 패널

브라우저에서 접근 가능한 Foodism 앱의 관리자 패널입니다.

## 🚀 실행 방법

### 1. 의존성 설치
```bash
cd web-admin
npm install
```

### 2. 서버 실행
```bash
npm start
```

또는 개발 모드로 실행 (자동 재시작):
```bash
npm run dev
```

### 3. 브라우저에서 접근
- 메인 URL: http://localhost:3000
- 관리자 패널: http://localhost:3000/admin
- 상태 확인: http://localhost:3000/health

## 📋 사전 요구사항

### Firebase Functions 백엔드가 실행 중이어야 합니다
```bash
cd backend/functions
npm run serve
```

### API URL 설정 확인
`script.js` 파일에서 API_BASE_URL이 올바르게 설정되어 있는지 확인:
```javascript
const API_BASE_URL = 'http://192.168.1.130:5001/fudism-7fae8/us-central1/api';
```

## 🌐 기능

### 첨가물 관리
- ✅ 전체 첨가물 목록 조회
- ✅ 새 첨가물 추가
- ✅ 기존 첨가물 수정
- ✅ 첨가물 삭제
- ✅ 위험도별 컬러 코딩 (낮음: 초록, 보통: 노랑, 높음: 빨강)

### 레시피 관리
- ✅ 전체 레시피 목록 조회
- ✅ 새 레시피 추가
- ✅ 기존 레시피 수정
- ✅ 레시피 삭제

### UI/UX 특징
- 📱 반응형 디자인 (모바일/태블릿/데스크톱 지원)
- 🎨 모던한 디자인과 부드러운 애니메이션
- 📊 직관적인 카드 레이아웃
- 🔔 실시간 알림 시스템
- ⌨️ 키보드 단축키 지원 (ESC로 모달 닫기)

## 🔧 개발자 정보

### 파일 구조
```
web-admin/
├── index.html      # 메인 HTML 파일
├── style.css       # 스타일시트
├── script.js       # JavaScript 로직
├── server.js       # Express 서버
├── package.json    # 의존성 및 스크립트
└── README.md       # 이 파일
```

### API 엔드포인트
- `GET /api/admin/additives` - 첨가물 목록 조회
- `POST /api/admin/additives` - 첨가물 추가
- `PUT /api/admin/additives/:id` - 첨가물 수정
- `DELETE /api/admin/additives/:id` - 첨가물 삭제
- `GET /api/admin/recipes` - 레시피 목록 조회
- `POST /api/admin/recipes` - 레시피 추가
- `PUT /api/admin/recipes/:id` - 레시피 수정
- `DELETE /api/admin/recipes/:id` - 레시피 삭제

### 환경 설정
서버 포트는 환경변수로 설정 가능:
```bash
PORT=8080 npm start
```

## 🐛 문제 해결

### 연결 오류가 발생하는 경우
1. Firebase Functions 백엔드가 실행 중인지 확인
2. `script.js`의 API_BASE_URL이 올바른지 확인
3. CORS 설정이 제대로 되어 있는지 확인
4. 네트워크 연결 상태 확인

### 데이터가 로드되지 않는 경우
1. 브라우저 개발자 도구(F12)에서 네트워크 탭 확인
2. 콘솔에 오류 메시지가 있는지 확인
3. API 서버 로그 확인

### 모바일에서 접근하는 경우
로컬 네트워크의 다른 기기에서 접근하려면:
```bash
# 서버를 모든 인터페이스에서 수신하도록 수정
# server.js에서 app.listen(PORT, '0.0.0.0', ...)
```

## 🔒 보안 고려사항

현재 버전은 개발/테스트 목적으로 제작되었습니다. 운영 환경에서 사용할 때는 다음을 고려해야 합니다:

- 🔐 관리자 인증 시스템 구현
- 🛡️ HTTPS 사용
- 🔒 IP 화이트리스트 설정
- 📝 접근 로그 기록
- 🚫 Rate limiting 구현

## 📞 지원

문제가 발생하거나 새로운 기능이 필요한 경우 개발팀에 문의하세요.

---
**마지막 업데이트**: 2025년 1월  
**버전**: 1.0.0