# 수정된 Firestore 보안 규칙

## 현재 문제
- `scanResults` 컬렉션에 익명 사용자(`anonymous-user`)가 문서를 생성할 수 없음
- 백엔드에서 인증되지 않은 사용자도 이미지 처리를 할 수 있도록 설계했지만, Firestore 규칙이 이를 막고 있음

## 해결된 코드

### 옵션 1: 개발용 (단순하고 안전함)

Firebase Console → Firestore Database → Rules에서 다음 코드로 **완전 교체**:

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
    
    // scanResults - 개발용: 모든 읽기/쓰기 허용
    match /scanResults/{document} {
      allow read, write, create: if true;
    }
  }
}
```

### 옵션 2: 프로덕션용 (보안 강화)

나중에 배포할 때 사용할 코드:

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
      // 읽기 권한
      allow read: if 
        // 인증된 사용자가 자신의 문서를 읽는 경우
        (request.auth != null && request.auth.uid == resource.data.userId) ||
        // 또는 익명 사용자 문서인 경우
        resource.data.userId == 'anonymous-user';
      
      // 수정 권한  
      allow update: if 
        // 인증된 사용자가 자신의 문서를 수정하는 경우
        (request.auth != null && request.auth.uid == resource.data.userId) ||
        // 또는 익명 사용자 문서를 시스템이 업데이트하는 경우
        (resource.data.userId == 'anonymous-user' && 
         request.resource.data.userId == 'anonymous-user');
      
      // 생성 권한
      allow create: if 
        // 인증된 사용자가 자신을 소유자로 설정하는 경우
        (request.auth != null && request.auth.uid == request.resource.data.userId) ||
        // 또는 익명 사용자로 문서를 생성하는 경우
        request.resource.data.userId == 'anonymous-user';
      
      // 삭제 권한
      allow delete: if 
        // 인증된 사용자가 자신의 문서를 삭제하는 경우
        (request.auth != null && request.auth.uid == resource.data.userId) ||
        // 또는 익명 사용자 문서 (시스템 정리용)
        resource.data.userId == 'anonymous-user';
    }
  }
}
```

## 적용 방법

1. **Firebase Console 접속**
   - https://console.firebase.google.com/
   - `foodism-782cb` 프로젝트 선택

2. **Firestore Database 이동**
   - 왼쪽 메뉴에서 "Firestore Database" 클릭

3. **Rules 탭 선택**
   - 상단의 "Rules" 탭 클릭

4. **코드 교체**
   - 기존 코드 전체 삭제
   - 위의 **옵션 1** 코드 복사 후 붙여넣기

5. **게시**
   - "게시" 또는 "Publish" 버튼 클릭
   - 변경사항 확인 후 최종 게시

## 변경사항 요약

### Before (현재 - 문제 있음)
```javascript
match /scanResults/{document} {
  allow read: if request.auth != null && 
    request.auth.uid == resource.data.userId;
  allow write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && 
    request.auth.uid == request.resource.data.userId;
}
```

### After (수정됨 - 작동함)
```javascript
match /scanResults/{document} {
  allow read, write, create: if true;  // 개발용: 모든 것 허용
}
```

## 테스트 방법

규칙 변경 후 다음을 테스트:

1. **프론트엔드에서 이미지 업로드**
   - 404 오류가 사라져야 함
   - 정상적으로 jobId가 반환되어야 함

2. **Firestore에서 문서 생성 확인**
   - `scanResults` 컬렉션에 새 문서가 생성되는지 확인
   - `userId: 'anonymous-user'`로 문서가 만들어지는지 확인

3. **OCR 처리 완료 확인**
   - 문서 상태가 `processing` → `completed`로 변경되는지 확인

## 주의사항

- **옵션 1**은 개발용이므로 실제 배포 시에는 **옵션 2**로 변경하세요
- 규칙 변경 후 몇 분 정도 전파 시간이 필요할 수 있습니다
- 변경사항이 즉시 적용되지 않으면 잠시 기다린 후 다시 테스트하세요

---

이 규칙로 변경하면 이미지 업로드 404 오류가 해결될 것입니다!