import * as admin from 'firebase-admin';
import { seedDatabase } from './seedData';

// Firebase Admin 초기화
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'foodism-782cb',
  });
}

async function initializeDatabase() {
  try {
    console.log('🚀 데이터베이스 초기화 시작...');
    
    // 시드 데이터 추가
    await seedDatabase();
    
    console.log('✅ 데이터베이스 초기화 완료!');
    console.log('📊 65개의 첨가물 데이터와 5개의 레시피가 추가되었습니다.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 데이터베이스 초기화 실패:', error);
    process.exit(1);
  }
}

// 스크립트가 직접 실행된 경우에만 실행
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };