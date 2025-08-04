/**
 * 테스트: OCR → 첨가물 검색 파이프라인
 * Firebase 데이터를 사용하여 전체 파이프라인 테스트
 */

import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { searchAdditivesWithFuzzyMatching } from '../utils/additiveSearchUtils';

// 환경변수 로드
dotenv.config();

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'foodism-782cb',
  });
}

/**
 * OCR → 첨가물 검색 파이프라인 테스트
 */
async function testOcrPipeline() {
  console.log('🧪 OCR → 첨가물 검색 파이프라인 테스트 시작...\n');

  // 테스트 케이스: 다양한 OCR 시나리오
  const testCases = [
    {
      name: '일반적인 첨가물 목록',
      text: '안식향산나트륨, 글루탐산나트륨, 구연산, 아스파탐, 카라기난'
    },
    {
      name: '색소가 포함된 목록',
      text: '적색 40호, 황색 5호, 청색 1호, 수크랄로스, 레시틴'
    },
    {
      name: 'OCR 오류가 포함된 텍스트',
      text: '안식향산냐트륨, 글루탐산나트륨, 구연악, 아스파틈'
    },
    {
      name: '공백과 특수문자가 많은 텍스트',
      text: '안식향산나트륨 · 글루탐산나트륨 , 구연산(산도조절제) , 아스파탐'
    },
    {
      name: '한글/영문 혼합 텍스트',
      text: 'Sodium benzoate, 글루탐산나트륨, Citric acid, 아스파탐'
    }
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const testCase of testCases) {
    console.log(`📋 테스트: ${testCase.name}`);
    console.log(`입력 텍스트: "${testCase.text}"`);
    
    try {
      totalTests++;
      const startTime = Date.now();
      
      // 첨가물 검색 실행
      const additives = await searchAdditivesWithFuzzyMatching(testCase.text);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (additives.length > 0) {
        console.log(`✅ 성공: ${additives.length}개 첨가물 발견 (${duration}ms)`);
        
        // 상위 3개 결과만 출력
        const topResults = additives.slice(0, 3);
        topResults.forEach((additive, index) => {
          console.log(`  ${index + 1}. ${additive.name} (위험도: ${additive.hazard_level}, 매칭: ${additive.matchType}, 점수: ${additive.matchScore?.toFixed(2)})`);
        });
        
        passedTests++;
      } else {
        console.log(`⚠️ 경고: 첨가물을 찾지 못했습니다 (${duration}ms)`);
      }
      
    } catch (error) {
      console.error(`❌ 실패: ${error instanceof Error ? error.message : error}`);
    }
    
    console.log(''); // 구분선
  }

  // 결과 요약
  console.log('📊 테스트 결과 요약:');
  console.log(`전체 테스트: ${totalTests}`);
  console.log(`성공: ${passedTests}`);
  console.log(`실패: ${totalTests - passedTests}`);
  console.log(`성공률: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 모든 테스트가 성공했습니다! Firebase 데이터 사용이 정상적으로 작동합니다.');
  } else {
    console.log('\n⚠️ 일부 테스트가 실패했습니다. 로그를 확인하세요.');
  }
}

// 추가 검증: Firebase 연결 상태 확인
async function verifyFirebaseConnection() {
  try {
    console.log('🔗 Firebase 연결 상태 확인...');
    const db = admin.firestore();
    const snapshot = await db.collection('additives').limit(1).get();
    
    if (!snapshot.empty) {
      console.log('✅ Firebase Firestore 연결 정상');
      return true;
    } else {
      console.log('⚠️ Firebase Firestore 연결됨, 하지만 additives 컬렉션이 비어있음');
      return false;
    }
  } catch (error) {
    console.error('❌ Firebase 연결 실패:', error);
    return false;
  }
}

// 스크립트 실행
if (require.main === module) {
  verifyFirebaseConnection()
    .then(connected => {
      if (!connected) {
        console.log('\n⚠️ Firebase 연결에 문제가 있습니다. 테스트를 건너뜁니다.');
        process.exit(1);
      }
      return testOcrPipeline();
    })
    .then(() => {
      console.log('\n✅ 테스트 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 테스트 실패:', error);
      process.exit(1);
    });
}

export { testOcrPipeline };