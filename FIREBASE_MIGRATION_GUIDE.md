# Firebase 데이터베이스 마이그레이션 및 Web Admin 구축 가이드

## 목표
현재 로컬 seedData.ts에서 하드코딩된 데이터를 Firebase Firestore로 이전하고, web-admin 인터페이스를 통해 데이터를 관리할 수 있는 구조로 변경

## 현재 구조 분석

### 기존 구조
```
📁 backend/functions/src/
  ├── scripts/seedData.ts (하드코딩된 첨가물 데이터)
  ├── controllers/
  │   ├── searchController.ts (seedData import 사용)
  │   └── additiveController.ts (seedData import 사용)
  └── utils/additiveSearchUtils.ts (seedData import 사용)
```

### 문제점
- 데이터가 코드에 하드코딩되어 수정 시 재배포 필요
- 관리자가 데이터를 실시간으로 관리할 수 없음
- 확장성 부족

## 마이그레이션 단계별 가이드

### 1단계: Firebase 데이터베이스 스키마 설계

#### Firestore 컬렉션 구조
```
🔥 Firestore Collections:
├── additives/
│   ├── {additiveId}
│   │   ├── name: string
│   │   ├── hazard_level: 'low' | 'medium' | 'high'
│   │   ├── description_short: string
│   │   ├── description_full: string
│   │   ├── aliases: string[]
│   │   ├── created_at: timestamp
│   │   ├── updated_at: timestamp
│   │   └── active: boolean
│   └── ...
├── recipes/
│   ├── {recipeId}
│   │   ├── title: string
│   │   ├── youtube_url: string
│   │   ├── created_at: timestamp
│   │   ├── updated_at: timestamp
│   │   └── active: boolean
│   └── ...
└── scanResults/ (기존 유지)
    └── ...
```

#### Firestore Security Rules 업데이트
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 인증된 사용자만 읽기 가능
    match /additives/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.admin == true; // 관리자만 쓰기
    }
    
    match /recipes/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                      request.auth.token.admin == true; // 관리자만 쓰기
    }
    
    match /scanResults/{document} {
      allow read, write: if request.auth != null && 
                            request.auth.uid == resource.data.userId;
    }
  }
}
```

### 2단계: 데이터 마이그레이션 스크립트 작성

#### seedData를 Firebase로 이전하는 스크립트 생성
```typescript
// backend/functions/src/scripts/migrateToFirebase.ts
import * as admin from 'firebase-admin';
import { additiveData, recipeData } from './seedData';

export async function migrateDataToFirebase() {
  const db = admin.firestore();
  
  console.log('🚀 Starting data migration to Firebase...');
  
  try {
    // 1. 첨가물 데이터 마이그레이션
    const additiveBatch = db.batch();
    
    for (const additive of additiveData) {
      const docRef = db.collection('additives').doc(additive.id);
      const data = {
        ...additive,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        active: true
      };
      delete data.id; // ID는 문서 ID로 사용
      additiveBatch.set(docRef, data);
    }
    
    await additiveBatch.commit();
    console.log(`✅ ${additiveData.length}개 첨가물 데이터 마이그레이션 완료`);
    
    // 2. 레시피 데이터 마이그레이션
    const recipeBatch = db.batch();
    
    for (const recipe of recipeData) {
      const docRef = db.collection('recipes').doc(recipe.id);
      const data = {
        ...recipe,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        active: true
      };
      delete data.id; // ID는 문서 ID로 사용
      recipeBatch.set(docRef, data);
    }
    
    await recipeBatch.commit();
    console.log(`✅ ${recipeData.length}개 레시피 데이터 마이그레이션 완료`);
    
    console.log('🎉 모든 데이터 마이그레이션 완료!');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  }
}
```

#### 마이그레이션 실행 엔드포인트 추가
```typescript
// backend/functions/src/routes/api.ts에 추가
import { migrateDataToFirebase } from '../scripts/migrateToFirebase';

/**
 * 데이터 마이그레이션 엔드포인트 (개발용)
 * @route POST /api/admin/migrate
 */
router.post('/admin/migrate', async (req, res) => {
  try {
    await migrateDataToFirebase();
    res.json({ 
      success: true, 
      message: 'Data migration completed successfully' 
    });
  } catch (error) {
    console.error('Migration failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Migration failed' 
    });
  }
});
```

### 3단계: 백엔드 API 수정

#### additiveSearchUtils.ts를 Firebase 기반으로 수정
```typescript
// backend/functions/src/utils/additiveSearchUtils.ts
import * as admin from 'firebase-admin';

const getDb = () => admin.firestore();

export async function searchAdditivesWithFuzzyMatching(searchText: string) {
  const db = getDb();
  
  try {
    // Firestore에서 활성화된 첨가물만 조회
    const additivesSnapshot = await db
      .collection('additives')
      .where('active', '==', true)
      .get();
    
    const additives = additivesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 기존 검색 로직 유지 (additives 배열 사용)
    const foundAdditives = [];
    const searchTerms = searchText
      .toLowerCase()
      .split(/[,;:\s]+/)
      .filter(term => term.length > 1);
    
    for (const additive of additives) {
      for (const term of searchTerms) {
        // 정확한 매칭
        if (additive.name.toLowerCase().includes(term) ||
            additive.aliases?.some(alias => alias.toLowerCase().includes(term))) {
          foundAdditives.push({
            ...additive,
            matchType: 'exact'
          });
          break;
        }
      }
    }
    
    return foundAdditives;
  } catch (error) {
    console.error('Firestore search error:', error);
    return [];
  }
}
```

#### homeController.ts 수정
```typescript
// backend/functions/src/controllers/homeController.ts
export const homeController = {
  async getHome(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const db = admin.firestore();
      
      // Firebase에서 랜덤 데이터 조회
      const [additivesSnapshot, recipesSnapshot] = await Promise.all([
        db.collection('additives').where('active', '==', true).limit(10).get(),
        db.collection('recipes').where('active', '==', true).limit(5).get()
      ]);
      
      const additives = additivesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const recipes = recipesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 랜덤 선택
      const randomAdditive = additives[Math.floor(Math.random() * additives.length)];
      const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];
      
      res.json({
        success: true,
        data: {
          featured_additive: randomAdditive,
          featured_recipe: randomRecipe
        }
      });
    } catch (error) {
      console.error('Error fetching home data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
};
```

### 4단계: Web Admin 인터페이스 구축

#### web-admin 디렉토리 구조
```
📁 web-admin/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── AdditiveList.tsx
│   │   ├── AdditiveForm.tsx
│   │   ├── RecipeList.tsx
│   │   ├── RecipeForm.tsx
│   │   └── Dashboard.tsx
│   ├── services/
│   │   ├── firebase.ts
│   │   └── api.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useAdditives.ts
│   │   └── useRecipes.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── index.tsx
├── package.json
└── README.md
```

#### Firebase 설정
```typescript
// web-admin/src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Firebase 프로젝트 설정
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

#### 첨가물 관리 컴포넌트
```typescript
// web-admin/src/components/AdditiveList.tsx
import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { db } from '../services/firebase';

interface Additive {
  id: string;
  name: string;
  hazard_level: 'low' | 'medium' | 'high';
  description_short: string;
  description_full: string;
  aliases: string[];
  active: boolean;
  created_at: any;
  updated_at: any;
}

export const AdditiveList: React.FC = () => {
  const [additives, setAdditives] = useState<Additive[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'additives'),
      orderBy('name')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const additivesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Additive[];
      
      setAdditives(additivesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'additives', id), {
        active: !currentStatus,
        updated_at: new Date()
      });
    } catch (error) {
      console.error('Error updating additive:', error);
    }
  };

  const deleteAdditive = async (id: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'additives', id));
      } catch (error) {
        console.error('Error deleting additive:', error);
      }
    }
  };

  if (loading) return <div>로딩중...</div>;

  return (
    <div className="additive-list">
      <h2>첨가물 관리</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>위험도</th>
              <th>설명</th>
              <th>별명</th>
              <th>상태</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {additives.map(additive => (
              <tr key={additive.id}>
                <td>{additive.name}</td>
                <td>
                  <span className={`hazard-${additive.hazard_level}`}>
                    {additive.hazard_level}
                  </span>
                </td>
                <td>{additive.description_short}</td>
                <td>{additive.aliases?.join(', ')}</td>
                <td>
                  <button
                    onClick={() => toggleActive(additive.id, additive.active)}
                    className={additive.active ? 'active' : 'inactive'}
                  >
                    {additive.active ? '활성' : '비활성'}
                  </button>
                </td>
                <td>
                  <button onClick={() => deleteAdditive(additive.id)}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

#### 첨가물 추가/수정 폼
```typescript
// web-admin/src/components/AdditiveForm.tsx
import React, { useState } from 'react';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AdditiveFormProps {
  editingAdditive?: any;
  onSave: () => void;
  onCancel: () => void;
}

export const AdditiveForm: React.FC<AdditiveFormProps> = ({
  editingAdditive,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: editingAdditive?.name || '',
    hazard_level: editingAdditive?.hazard_level || 'low',
    description_short: editingAdditive?.description_short || '',
    description_full: editingAdditive?.description_full || '',
    aliases: editingAdditive?.aliases?.join(', ') || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        aliases: formData.aliases.split(',').map(s => s.trim()).filter(s => s),
        updated_at: new Date()
      };

      if (editingAdditive) {
        await updateDoc(doc(db, 'additives', editingAdditive.id), data);
      } else {
        await addDoc(collection(db, 'additives'), {
          ...data,
          created_at: new Date(),
          active: true
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving additive:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="additive-form">
      <h3>{editingAdditive ? '첨가물 수정' : '새 첨가물 추가'}</h3>
      
      <div className="form-group">
        <label>이름:</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>위험도:</label>
        <select
          value={formData.hazard_level}
          onChange={(e) => setFormData({...formData, hazard_level: e.target.value as any})}
        >
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>
      </div>

      <div className="form-group">
        <label>간단 설명:</label>
        <input
          type="text"
          value={formData.description_short}
          onChange={(e) => setFormData({...formData, description_short: e.target.value})}
          required
        />
      </div>

      <div className="form-group">
        <label>상세 설명:</label>
        <textarea
          value={formData.description_full}
          onChange={(e) => setFormData({...formData, description_full: e.target.value})}
          rows={4}
          required
        />
      </div>

      <div className="form-group">
        <label>별명 (쉼표로 구분):</label>
        <input
          type="text"
          value={formData.aliases}
          onChange={(e) => setFormData({...formData, aliases: e.target.value})}
          placeholder="예: MSG, 미원, 조미료"
        />
      </div>

      <div className="form-actions">
        <button type="submit">저장</button>
        <button type="button" onClick={onCancel}>취소</button>
      </div>
    </form>
  );
};
```

### 5단계: 프론트엔드 앱 수정

#### Firebase SDK 설정 업데이트
```typescript
// frontend/hudi/services/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // 동일한 Firebase 프로젝트 설정
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 6단계: 배포 및 설정

#### package.json 설정 (web-admin)
```json
{
  "name": "fudism-web-admin",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "firebase": "^10.7.0",
    "react-router-dom": "^6.8.0",
    "@types/react": "^18.0.27",
    "@types/react-dom": "^18.0.10",
    "typescript": "^4.9.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "deploy": "npm run build && firebase deploy --only hosting"
  }
}
```

#### Firebase Hosting 설정
```json
// firebase.json
{
  "hosting": [
    {
      "target": "admin",
      "public": "web-admin/build",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [
        {
          "source": "**",
          "destination": "/index.html"
        }
      ]
    }
  ]
}
```

## 실행 순서

### 1. 데이터 마이그레이션
```bash
# 1. 백엔드 빌드 및 배포
cd backend/functions
npm run build
npm run deploy

# 2. 마이그레이션 실행
curl -X POST https://your-region-your-project.cloudfunctions.net/api/admin/migrate
```

### 2. Web Admin 구축
```bash
# 1. web-admin 디렉토리 생성 및 설정
mkdir web-admin
cd web-admin
npx create-react-app . --template typescript

# 2. 필요한 패키지 설치
npm install firebase react-router-dom

# 3. 컴포넌트 개발 (위의 예시 코드들)

# 4. 빌드 및 배포
npm run build
firebase deploy --only hosting
```

### 3. 모바일 앱 업데이트
```bash
cd frontend/hudi
# Firebase SDK 업데이트 및 설정 수정
npm install firebase@latest
# 코드 수정 후 테스트
npm start
```

## 예상 이점

1. **실시간 데이터 관리**: Web admin을 통해 즉시 데이터 수정 가능
2. **확장성**: 새로운 첨가물/레시피를 코드 수정 없이 추가
3. **협업**: 비개발자도 데이터 관리 가능
4. **백업**: Firebase 자동 백업 기능 활용
5. **실시간 동기화**: 모든 클라이언트에 실시간 반영

## 주의사항

1. **보안**: Admin 권한 설정 필수
2. **비용**: Firebase 사용량 모니터링 필요
3. **마이그레이션**: 기존 데이터 백업 후 진행
4. **테스트**: 스테이징 환경에서 충분한 테스트 필요

이 가이드를 따라 단계별로 진행하면 현재의 하드코딩된 구조를 Firebase 기반의 관리 가능한 시스템으로 성공적으로 전환할 수 있습니다.