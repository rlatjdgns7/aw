# Firestore Rules 수정 가이드

## 문제점
현재 `scanResults` 규칙이 너무 엄격해서 이미지 처리 기능이 작동하지 않습니다.

## 수정된 규칙 (옵션 1: 개발용 - 간단함)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to additives collection
    match /additives/{document} {
      allow read: if true;
    }
    
    // Allow public read access to recipes collection
    match /recipes/{document} {
      allow read: if true;
    }
    
    // 개발용: scanResults 생성/읽기 허용 (임시)
    match /scanResults/{document} {
      allow read, write, create: if true;
    }
  }
}
```

## 수정된 규칙 (옵션 2: 보안 강화 - 추천)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow public read access to additives collection
    match /additives/{document} {
      allow read: if true;
    }
    
    // Allow public read access to recipes collection
    match /recipes/{document} {
      allow read: if true;
    }
    
    // scanResults - 인증된 사용자 + 익명 사용자 허용
    match /scanResults/{document} {
      // 읽기: 인증된 사용자가 자신의 문서를 읽거나, 익명 사용자 허용
      allow read: if (request.auth != null && request.auth.uid == resource.data.userId) ||
                     resource.data.userId == 'anonymous-user';
      
      // 쓰기: 인증된 사용자가 자신의 문서를 수정하거나, 익명 사용자 허용
      allow write: if (request.auth != null && request.auth.uid == resource.data.userId) ||
                      request.resource.data.userId == 'anonymous-user';
      
      // 생성: 인증된 사용자가 자신을 소유자로 설정하거나, 익명 사용자 허용
      allow create: if (request.auth != null && request.auth.uid == request.resource.data.userId) ||
                       request.resource.data.userId == 'anonymous-user';
    }
  }
}
```

## 적용 방법

1. Firebase Console 접속
2. Firestore Database → Rules 탭
3. 위 규칙 중 하나로 교체
4. **게시** 버튼 클릭

## 추천사항

**개발 단계:** 옵션 1 사용 (모든 것 허용)
**배포 단계:** 옵션 2 사용 (보안 강화)

---

이 규칙 수정 후 이미지 업로드가 정상 작동할 것입니다.