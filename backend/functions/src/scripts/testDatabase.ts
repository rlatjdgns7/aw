/**
 * 로컬 데이터베이스 연결 테스트 스크립트
 * Firebase Firestore의 additives 컬렉션 연결 확인
 */

import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

// 환경변수 로드
dotenv.config();

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'foodism-782cb',
  });
}

async function testDatabaseConnection() {
  try {
    console.log('🔍 Firestore 연결 테스트 시작...');
    
    const db = admin.firestore();
    
    // additives 컬렉션에서 첫 5개 문서 가져오기
    const snapshot = await db.collection('additives').limit(5).get();
    
    if (snapshot.empty) {
      console.log('⚠️ additives 컬렉션이 비어있습니다.');
      
      // 컬렉션 목록 확인
      console.log('📋 사용 가능한 컬렉션 확인 중...');
      const collections = await db.listCollections();
      const collectionNames = collections.map(col => col.id);
      console.log('사용 가능한 컬렉션들:', collectionNames);
      
    } else {
      console.log(`✅ additives 컬렉션에서 ${snapshot.size}개 문서 발견`);
      
      // 각 문서의 구조 확인
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`\n📄 문서 ${index + 1} (ID: ${doc.id}):`);
        console.log('  - 이름:', data.name || '없음');
        console.log('  - 위험도:', data.hazard_level || '없음');
        console.log('  - 설명:', data.description_short?.substring(0, 50) || '없음');
        console.log('  - 별명:', data.aliases || '없음');
        console.log('  - 기타 필드들:', Object.keys(data).filter(key => 
          !['name', 'hazard_level', 'description_short', 'aliases'].includes(key)
        ));
      });
    }
    
    console.log('\n🎯 OCR 테스트를 위한 샘플 텍스트로 검색 테스트...');
    const testText = "안식향산나트륨, 글루탐산나트륨, 구연산";
    await testAdditiveSearch(testText);
    
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        console.log('💡 권한 문제일 가능성이 높습니다. Firebase Console에서 인증 설정을 확인하세요.');
      } else if (error.message.includes('not found')) {
        console.log('💡 프로젝트 ID나 컬렉션 이름을 확인하세요.');
      }
    }
  }
}

async function testAdditiveSearch(text: string) {
  try {
    console.log(`\n🔎 검색 테스트: "${text}"`);
    
    const db = admin.firestore();
    const snapshot = await db.collection('additives').get();
    
    if (snapshot.empty) {
      console.log('⚠️ 검색할 데이터가 없습니다.');
      return;
    }
    
    const additives = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 총 ${additives.length}개 첨가물 데이터로 검색 시뮬레이션`);
    
    // 간단한 텍스트 매칭 테스트
    const keywords = text.split(/[,\s]+/).filter(word => word.length > 0);
    const matches: any[] = [];
    
    keywords.forEach(keyword => {
      const found = additives.filter((additive: any) => {
        const name = additive.name?.toLowerCase() || '';
        const aliases = additive.aliases || [];
        
        return name.includes(keyword.toLowerCase()) ||
               aliases.some((alias: string) => alias.toLowerCase().includes(keyword.toLowerCase()));
      });
      
      matches.push(...found);
    });
    
    // 중복 제거
    const uniqueMatches = matches.filter((item, index, arr) => 
      arr.findIndex(t => t.id === item.id) === index
    );
    
    console.log(`🎯 매칭 결과: ${uniqueMatches.length}개 첨가물 발견`);
    uniqueMatches.forEach(match => {
      console.log(`  - ${match.name} (위험도: ${match.hazard_level})`);
    });
    
  } catch (error) {
    console.error('❌ 검색 테스트 실패:', error);
  }
}

// 스크립트 실행
if (require.main === module) {
  testDatabaseConnection()
    .then(() => {
      console.log('\n✅ 테스트 완료!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 테스트 실패:', error);
      process.exit(1);
    });
}

export { testDatabaseConnection };