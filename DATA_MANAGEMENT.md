# 식품첨가물 데이터 관리 가이드

## 📊 **현재 데이터 저장 구조**

### **Firestore 위치**
```
프로젝트 > Firestore Database > additives 컬렉션
```

### **데이터 스키마**
```javascript
{
  name: "첨가물명",
  hazard_level: "low" | "medium" | "high",
  description_short: "간단한 설명",
  description_full: "상세한 설명",
  aliases: ["별명1", "별명2", "E넘버"],
  created_at: timestamp,
  updated_at: timestamp
}
```

## 🔧 **데이터 관리 방법**

### **1. Firebase Console (수동 관리)**
```
Firebase Console > Firestore > additives 컬렉션 > 문서 추가
```

### **2. 시드 데이터 스크립트 사용**
```bash
# 백엔드 폴더에서
cd backend/functions
npm run build

# Firebase Functions 환경에서 실행
firebase functions:shell
> seedDatabase()
```

### **3. Admin API 사용 (권장)**
다음 API 엔드포인트들이 구현되어 있습니다:

```javascript
// 새 첨가물 추가
POST /api/admin/additive
{
  "name": "첨가물명",
  "hazard_level": "medium",
  "description_short": "간단 설명",
  "description_full": "상세 설명",
  "aliases": ["별명1", "별명2"]
}

// 첨가물 수정
PUT /api/admin/additive/:id

// 첨가물 삭제
DELETE /api/admin/additive/:id

// 모든 첨가물 조회
GET /api/admin/additives

// 벌크 가져오기
POST /api/admin/bulk-import
{
  "additives": [
    { /* 첨가물 데이터 */ },
    { /* 첨가물 데이터 */ }
  ]
}
```

## 📋 **데이터 소스 추천**

### **한국 공식 소스**
1. **식품의약품안전처(MFDS)**
   - 식품첨가물 데이터베이스
   - https://www.foodsafetykorea.go.kr/

2. **한국식품안전관리인증원(HACCP)**
   - 식품첨가물 안전성 평가 자료

### **국제 소스**
1. **FDA (미국식품의약국)**
   - GRAS 목록 (Generally Recognized as Safe)

2. **EFSA (유럽식품안전청)**
   - 식품첨가물 안전성 평가

3. **WHO/FAO**
   - JECFA 평가 자료

## 🏗️ **데이터 구축 전략**

### **1단계: 기본 첨가물 (50-100개)**
주요 가공식품에서 자주 사용되는 첨가물:
- 보존료: 안식향산나트륨, 소브산칼륨
- 감미료: 아스파탐, 사카린나트륨
- 착색료: 적색40호, 황색5호
- 산화방지제: BHA, BHT
- 조미료: MSG, 구연산

### **2단계: 확장 (100-500개)**
- E번호 체계 기반 첨가물
- 지역별 특화 첨가물
- 천연 첨가물

### **3단계: 전문화 (500+개)**
- 산업별 특수 첨가물
- 신규 승인 첨가물
- 국가별 차이 반영

## 💾 **데이터 관리 도구**

### **Excel/CSV 템플릿**
```csv
name,hazard_level,description_short,description_full,aliases
안식향산나트륨,medium,보존료,상세설명,"E211,Sodium Benzoate"
```

### **자동 가져오기 스크립트**
```javascript
// CSV 파일을 읽어서 Firestore에 일괄 업로드
const csvData = readCSV('additives.csv');
await bulkImportAdditives(csvData);
```

## 🔄 **데이터 업데이트 프로세스**

### **정기 업데이트**
1. 분기별 새로운 연구 결과 반영
2. 규제 변경사항 업데이트
3. 사용자 피드백 반영

### **품질 관리**
1. 데이터 검증 프로세스
2. 중복 데이터 제거
3. 번역 품질 관리

## 🎯 **데이터 우선순위**

### **High Priority (즉시 추가)**
- 한국에서 자주 사용되는 첨가물 50개
- 위험도 High인 주요 첨가물
- 아이들 식품에 자주 사용되는 첨가물

### **Medium Priority (2주 내)**
- E번호 체계의 주요 첨가물
- 국제적으로 논란이 있는 첨가물
- 대체제 정보가 있는 첨가물

### **Low Priority (1개월 내)**
- 산업용 특수 첨가물
- 희귀 첨가물
- 승인 대기 중인 첨가물

## 📊 **현재 구현된 샘플 데이터**

이미 다음 10개의 한국 주요 첨가물이 샘플로 준비되어 있습니다:

1. 안식향산나트륨 (medium)
2. 아스파탐 (high)
3. 글루탄산나트륨/MSG (medium)
4. 구연산 (low)
5. 적색40호 (high)
6. 카라기난 (medium)
7. BHA (high)
8. 아질산나트륨 (high)
9. 과당포도당액 (medium)
10. 레시틴 (low)

이 데이터들은 `seedData.ts` 스크립트를 실행하여 데이터베이스에 추가할 수 있습니다.