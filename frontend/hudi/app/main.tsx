import React, { useState, useEffect, useMemo } from 'react';
import { useAdditives } from '../hooks/useAdditives';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ImageAnalysis from '../components/ImageAnalysis';
import { authService } from '../services/authService';

// ──────────────────────────────────────────────────────────────
//  SVG 아이콘들을 대체할 플레이스홀더 컴포넌트 (실사용 시 react‑native‑svg 로 교체)
// ──────────────────────────────────────────────────────────────
const Placeholder = () => <View style={styles.iconPlaceholder} />;
const MenuIcon = Placeholder;
const SearchIcon = Placeholder;

// ──────────────────────────────────────────────────────────────
//  상수
// ──────────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HORIZONTAL_PADDING = 16;            // 양쪽 패딩
const ITEM_MARGIN = 12;                   // 그리드 아이템 간격
const NUM_COLUMNS = 3;                    // 한 줄에 3개
const ITEM_WIDTH =
  (SCREEN_WIDTH - HORIZONTAL_PADDING * 2 - ITEM_MARGIN * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

// ──────────────────────────────────────────────────────────────
//  하위 컴포넌트
// ──────────────────────────────────────────────────────────────
interface ProductItemProps {
  title: string;
}

const ProductItem: React.FC<ProductItemProps> = ({ title }) => (
  <View style={styles.productItem}>
    <View style={styles.productImage} />
    <Text
      style={styles.productTitle}
      numberOfLines={2}
      adjustsFontSizeToFit
      ellipsizeMode="tail"
    >
      {title}
    </Text>
  </View>
);


// ──────────────────────────────────────────────────────────────
//  메인 스크린
// ──────────────────────────────────────────────────────────────
const MainScreen: React.FC = () => {
  const router = useRouter();
  const { shuffledAdditives, loading, error } = useAdditives();
  const [isImageAnalysisVisible, setIsImageAnalysisVisible] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const recommendations = useMemo(
    () => shuffledAdditives.map(additive => ({ title: additive.name })),
    [shuffledAdditives]
  );

  // Firebase 초기화 및 익명 로그인
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Main screen: Starting authentication initialization...');
        
        // Check if already signed in
        const currentUser = authService.getCurrentUser();
        console.log('🔐 Main screen: Current user check:', {
          hasUser: !!currentUser,
          uid: currentUser?.uid,
          isAnonymous: currentUser?.isAnonymous
        });
        
        if (!currentUser) {
          console.log('🔐 Main screen: No user found, starting anonymous sign in...');
          const user = await authService.signInAnonymously();
          console.log('🔐 Main screen: Anonymous authentication completed:', user);
        } else {
          console.log('🔐 Main screen: Already authenticated:', currentUser);
        }
      } catch (error: any) {
        console.error('🔐 Main screen: Authentication error:', {
          code: error.code,
          message: error.message,
          fullError: error
        });
        setAuthError(`인증 오류: ${error.message || '로그인에 실패했습니다.'}`);
        // Continue without authentication for now
      }
    };

    initializeAuth();
  }, []);
  
  // 기존 데이터는 그대로 유지
  const productData = [
    { title: '유기농 우유' },
    { title: '저당 요거트' },
    { title: '건강 시리얼' },
    { title: '무첨가 빵' },
    { title: '자연치즈' },
    { title: '유기농 계란' },
    { title: '무농약 쌀' },
    { title: '천연 올리브오일' },
  ];

  const socialItems = [
    { title: '김치찌개' },
    { title: '된장국' },
    { title: '불고기' },
    { title: '비빔밥' },
    { title: '삼겹살' },
    { title: '떡볶이' },
    { title: '잡채' },
    { title: '갈비탕' },
    { title: '냉면' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
      

        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.appTitle}>푸디즘</Text>
          </View>
          <TouchableOpacity>
            <MenuIcon />
          </TouchableOpacity>
        </View>

        {/* 검색 및 촬영 섹션 */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <SearchIcon />
            <Text style={styles.searchText}>액상과당이 뭐지?</Text>
          </View>
          <TouchableOpacity 
            style={styles.cameraButton}
            onPress={() => setIsImageAnalysisVisible(true)}
          >
            <Text style={styles.cameraButtonText}>성분표 촬영</Text>
          </TouchableOpacity>
        </View>

        {/* 위젯 안내 */}
        <View style={styles.widgetNotice}>
          <Text style={styles.widgetText}>위젯을 설치하면 더 편해요</Text>
        </View>

        {/* 로딩 및 에러 처리 */}
        {loading && (
          <View style={styles.sectionContainer}>
            <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
          </View>
        )}
        
        {error && (
          <View style={styles.sectionContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {authError && (
          <View style={styles.sectionContainer}>
            <View style={styles.authErrorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setAuthError(null);
                  // Retry authentication
                  authService.signInAnonymously().catch((err) => {
                    setAuthError(`재시도 실패: ${err.message}`);
                  });
                }}
              >
                <Text style={styles.retryButtonText}>다시 시도</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 추천 섹션 */}
        {!loading && !error && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>이건 어때요?</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContainer}
          >
            {productData.map((item, index) => (
              <ProductItem key={`prd-${index}`} title={item.title} />
            ))}
          </ScrollView>
        </View>
        )}

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 궁금한 제품 섹션 */}
        {!loading && !error && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>이게 뭐지?</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContainer}
          >
            {recommendations.map((item, index) => (
              <ProductItem key={`rec-${index}`} title={item.title} />
            ))}
          </ScrollView>
        </View>
        )}

        {/* 같이먹어요 섹션 */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>같이먹어요</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContainer}
          >
            {socialItems.map((item, index) => (
              <ProductItem key={`soc-${index}`} title={item.title} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* 이미지 분석 모달 */}
      <Modal
        visible={isImageAnalysisVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setIsImageAnalysisVisible(false)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <ImageAnalysis onResult={(result) => {
            console.log('Analysis result:', result);
            setIsImageAnalysisVisible(false);
            
            // 결과를 results 화면으로 전달 - 쿼리 문자열 방식
            try {
              const encodedText = encodeURIComponent(result.extractedText || '');
              const encodedAdditives = encodeURIComponent(JSON.stringify(result.additives || []));
              router.push(`/results?extractedText=${encodedText}&additives=${encodedAdditives}&status=completed`);
            } catch (error) {
              console.error('Error navigating to results:', error);
              const encodedText = encodeURIComponent(result.extractedText || '');
              router.push(`/results?extractedText=${encodedText}&additives=%5B%5D&status=completed`);
            }
          }} />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────────────────────
//  스타일시트
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 59,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
  },
  statusLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  statusRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  dynamicIsland: {
    width: 125,
    height: 37,
    backgroundColor: '#000',
    borderRadius: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  titleContainer: {
    padding: 8,
    width: ITEM_WIDTH,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#fff',
    textAlign: 'left',
  },
  searchSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 25,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    marginLeft: 4,
    textAlign: 'center',
  },
  cameraButton: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(252,252,252,0.06)',
    borderColor: 'rgba(252,252,252,0.2)',
    borderWidth: 1,
    borderRadius: 25,
    marginTop : 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    width: 96,
  },
  cameraButtonText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  widgetNotice: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  widgetText: {
    fontSize: 10,
    color: '#1eff65',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  horizontalScrollContainer: {
    paddingRight: 16,
  },
  productItem: {
    width: ITEM_WIDTH,
    marginBottom: 20,
    marginRight: 12,
  },
  productImage: {
    width: '100%',
    height: ITEM_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 6,
  },
  productTitle: {
    fontSize: 14,
    lineHeight: 18,
    color: '#fff',
    textAlign: 'center',
  },
  divider: {
    width: '90%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
    marginVertical: 20,
  },
  socialSection: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 20,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
  },
  authErrorContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#ff6b6b',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MainScreen;
