import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import HighlightedText from '../components/HighlightedText';
import type { Additive } from '../services/api';
import { db } from '../services/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { authService } from '../services/authService';

// 위험도별 색상 매핑
const getHazardColor = (hazardLevel?: string): string => {
  switch (hazardLevel?.toLowerCase()) {
    case 'high':
    case '높음':
      return '#ff4757';
    case 'medium':
    case '보통':
      return '#ffa502';
    case 'low':
    case '낮음':
      return '#2ed573';
    default:
      return '#747d8c';
  }
};

// 위험도별 배경색
const getHazardBackgroundColor = (hazardLevel?: string): string => {
  switch (hazardLevel?.toLowerCase()) {
    case 'high':
    case '높음':
      return 'rgba(255, 71, 87, 0.1)';
    case 'medium':
    case '보통':
      return 'rgba(255, 165, 2, 0.1)';
    case 'low':
    case '낮음':
      return 'rgba(46, 213, 115, 0.1)';
    default:
      return 'rgba(116, 125, 140, 0.1)';
  }
};

// 개별 첨가물 컴포넌트
interface AdditiveItemProps {
  additive: Additive & { matchType?: string; matchScore?: number; matchedTerm?: string };
  onPress: () => void;
}

const AdditiveItem: React.FC<AdditiveItemProps> = React.memo(({ additive, onPress }) => {
  const hazardColor = getHazardColor(additive.hazard_level);
  const hazardBgColor = getHazardBackgroundColor(additive.hazard_level);

  // 매칭 타입에 따른 표시 텍스트
  const getMatchTypeText = (matchType?: string) => {
    switch (matchType) {
      case 'exact': return '정확 매칭';
      case 'normalized_exact': return '정규화 매칭';
      case 'partial': return '부분 매칭';
      case 'reverse_partial': return '역방향 매칭';
      case 'fuzzy': return '유사 매칭';
      default: return '매칭';
    }
  };

  // 매칭 신뢰도 색상
  const getMatchScoreColor = (score?: number) => {
    if (!score) return '#747d8c';
    if (score >= 0.8) return '#2ed573'; // 높은 신뢰도 - 초록
    if (score >= 0.6) return '#ffa502'; // 중간 신뢰도 - 주황
    return '#ff4757'; // 낮은 신뢰도 - 빨강
  };

  return (
    <TouchableOpacity
      style={[styles.additiveItem, { backgroundColor: hazardBgColor }]}
      onPress={onPress}
    >
      <View style={styles.additiveHeader}>
        <Text style={styles.additiveName}>{additive.name}</Text>
        <View style={styles.badgeContainer}>
          {additive.matchType && (
            <View
              style={[
                styles.matchBadge,
                { backgroundColor: getMatchScoreColor(additive.matchScore) },
              ]}
            >
              <Text style={styles.matchText}>
                {getMatchTypeText(additive.matchType)}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.hazardBadge,
              { backgroundColor: hazardColor },
            ]}
          >
            <Text style={styles.hazardText}>
              {additive.hazard_level || '정보없음'}
            </Text>
          </View>
        </View>
      </View>
      
      {additive.matchedTerm && (
        <Text style={styles.matchedTermText}>
          매칭된 텍스트: "{additive.matchedTerm}"
        </Text>
      )}
      
      {additive.description_short && (
        <Text style={styles.additiveDescription} numberOfLines={2}>
          {additive.description_short}
        </Text>
      )}
      
      <Text style={styles.moreInfoText}>자세히 보기 →</Text>
    </TouchableOpacity>
  );
});

// 정렬 타입 정의
type SortType = 'none' | 'hazard' | 'name';

const ResultsScreen: React.FC = () => {
  const router = useRouter();
  const { 
    extractedText, 
    additives, 
    jobId,
    status = 'completed' 
  } = useLocalSearchParams<{ 
    extractedText?: string, 
    additives?: string, 
    jobId?: string,
    status?: string 
  }>();

  // Parse additives from URL params with error handling
  const originalAdditives: (Additive & { matchType?: string; matchScore?: number; matchedTerm?: string })[] = (() => {
    try {
      console.log('🔍 ResultsScreen - Raw params received:', { extractedText, additives, status });
      
      // URL 디코딩 후 JSON 파싱
      let parsed = [];
      if (additives && typeof additives === 'string') {
        try {
          const decodedAdditives = decodeURIComponent(additives);
          parsed = JSON.parse(decodedAdditives);
        } catch (decodeError) {
          console.warn('🔍 ResultsScreen - Decode failed, trying direct parse:', decodeError);
          parsed = JSON.parse(additives);
        }
      }
      
      console.log('🔍 ResultsScreen - Parsed additives:', parsed);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('❌ ResultsScreen - Error parsing additives:', error);
      console.log('🔍 ResultsScreen - Raw additives string:', additives);
      return [];
    }
  })();
  
  // Decode extracted text
  const decodedExtractedText = extractedText ? decodeURIComponent(extractedText) : '';
  console.log('🔍 ResultsScreen - Extracted text length:', decodedExtractedText.length);

  // Firestore 리스너를 위한 추가 상태
  const [firestoreData, setFirestoreData] = useState<{
    extractedText?: string;
    additives?: (Additive & { matchType?: string; matchScore?: number; matchedTerm?: string })[];
    status?: string;
  }>({});

  // 정렬 상태 관리
  const [currentSort, setCurrentSort] = useState<SortType>('none');
  const [sortedAdditives, setSortedAdditives] = useState<(Additive & { matchType?: string; matchScore?: number; matchedTerm?: string })[]>(originalAdditives);

  // Current status and data state
  const currentStatus = firestoreData.status || status;
  const currentExtractedText = firestoreData.extractedText || decodedExtractedText || '';
  const isLoading = currentStatus === 'processing';
  const error = currentStatus === 'failed' ? '이미지 분석에 실패했습니다.' : null;

  // 위험도별 그룹화 헬퍼 함수
  const isHighRisk = (level: string | undefined) => {
    if (!level) return false;
    return level.toLowerCase() === 'high' || level === '높음';
  };

  const isMediumRisk = (level: string | undefined) => {
    if (!level) return false;
    return level.toLowerCase() === 'medium' || level === '보통';
  };

  const isLowRisk = (level: string | undefined) => {
    if (!level) return false;
    return level.toLowerCase() === 'low' || level === '낮음';
  };

  // 메모이제이션으로 그룹화 최적화
  const groupedAdditives = useMemo(() => ({
    high: sortedAdditives.filter(a => isHighRisk(a.hazard_level)),
    medium: sortedAdditives.filter(a => isMediumRisk(a.hazard_level)),
    low: sortedAdditives.filter(a => isLowRisk(a.hazard_level)),
    unknown: sortedAdditives.filter(a => 
      !isHighRisk(a.hazard_level) && 
      !isMediumRisk(a.hazard_level) && 
      !isLowRisk(a.hazard_level)
    )
  }), [sortedAdditives]);

  // 위험도 정렬 우선순위
  const getHazardPriority = (hazardLevel?: string): number => {
    switch (hazardLevel?.toLowerCase()) {
      case 'high':
      case '높음':
        return 3;
      case 'medium':
      case '보통':
        return 2;
      case 'low':
      case '낮음':
        return 1;
      default:
        return 0;
    }
  };

  // 정렬 함수
  const sortAdditives = (sortType: SortType) => {
    let sorted = [...originalAdditives];
    
    switch (sortType) {
      case 'hazard':
        sorted.sort((a, b) => {
          const priorityA = getHazardPriority(a.hazard_level);
          const priorityB = getHazardPriority(b.hazard_level);
          return priorityB - priorityA; // 높은 위험도부터
        });
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
        break;
      case 'none':
      default:
        sorted = [...originalAdditives];
        break;
    }
    
    setSortedAdditives(sorted);
    setCurrentSort(sortType);
  };

  // Firestore 리스너 설정
  useEffect(() => {
    if (jobId && (status === 'processing' || currentStatus === 'processing')) {
      console.log('🔍 ResultsScreen - Setting up Firestore listener for job:', jobId);
      
      // 인증 상태 변화를 감지하고 인증 완료 후 Firestore 접근
      const unsubscribeAuth = authService.onAuthStateChange((user) => {
        console.log('🔍 ResultsScreen - Auth state changed:', {
          hasUser: !!user,
          uid: user?.uid,
          isAnonymous: user?.isAnonymous,
          jobId: jobId
        });
        
        if (user) {
          // ✅ 사용자가 인증되었으므로 이제 Firestore에 접근 가능
          console.log('🔍 ResultsScreen - User authenticated, setting up Firestore listener');
          setupFirestoreListener(user, jobId);
        } else {
          // ❌ 아직 인증되지 않음
          console.log('🔍 ResultsScreen - User not authenticated yet, waiting...');
        }
      });
      
      // 이미 인증된 상태라면 즉시 Firestore 리스너 설정
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        console.log('🔍 ResultsScreen - User already authenticated, setting up Firestore listener immediately');
        setupFirestoreListener(currentUser, jobId);
      }
      
      return () => {
        console.log('🔍 ResultsScreen - Cleaning up auth listener');
        unsubscribeAuth();
      };
    }
  }, [jobId, status]);

  // Firestore 리스너 설정 함수
  const setupFirestoreListener = (user: any, jobId: string) => {
    console.log('🔍 ResultsScreen - User info:', {
      uid: user.uid,
      isAnonymous: user.isAnonymous,
      email: user.email,
      displayName: user.displayName
    });
    console.log('🔍 ResultsScreen - About to listen to document:', `scanResults/${jobId}`);
    
    const docRef = doc(db, 'scanResults', jobId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      console.log('🔍 ResultsScreen - Firestore snapshot received:', {
        exists: docSnap.exists(),
        id: docSnap.id,
        metadata: docSnap.metadata
      });
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔍 ResultsScreen - Document data:', {
          userId: data.userId,
          status: data.status,
          hasResult: !!data.result,
          currentUserUid: user.uid,
          userMatch: data.userId === user.uid
        });
        console.log('🔍 ResultsScreen - Full document data:', data);
        
        setFirestoreData({
          extractedText: data.result?.extractedText,
          additives: data.result?.additives || [],
          status: data.status
        });
        
        if (data.status === 'completed' && data.result?.additives) {
          setSortedAdditives(data.result.additives);
        }
      } else {
        console.warn('🔍 ResultsScreen - Document does not exist for job:', jobId);
      }
    }, (error) => {
      console.error('🔍 ResultsScreen - Firestore listener error:', error);
      
      // 구체적인 에러 메시지 제공
      let errorTitle = '연결 오류';
      let errorMessage = '실시간 업데이트 연결에 문제가 발생했습니다.';
      
      if (error.code === 'permission-denied') {
        errorTitle = '권한 오류';
        errorMessage = '데이터 접근 권한이 없습니다. 로그인 상태를 확인하고 다시 시도해주세요.';
      } else if (error.code === 'unavailable') {
        errorTitle = '서버 연결 오류';
        errorMessage = 'Firebase 서버에 연결할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
      } else if (error.code === 'unauthenticated') {
        errorTitle = '인증 오류';
        errorMessage = '사용자 인증이 만료되었습니다. 앱을 다시 시작해주세요.';
      }
      
      Alert.alert(
        errorTitle,
        errorMessage,
        [
          { text: '뒤로가기', onPress: () => router.back() },
          { text: '다시시도', onPress: () => router.back() }
        ]
      );
    });

    return unsubscribe;
  };

  // 초기 데이터 설정 - 메모이제이션으로 최적화
  useEffect(() => {
    console.log('🔍 ResultsScreen - Setting sorted additives:', originalAdditives);
    console.log('🔍 ResultsScreen - Original additives length:', originalAdditives.length);
    console.log('🔍 ResultsScreen - Firestore additives length:', firestoreData.additives?.length);
    
    // 우선순위: Firestore 데이터 > URL 파라미터 데이터
    if (firestoreData.additives && firestoreData.additives.length > 0) {
      setSortedAdditives(firestoreData.additives);
      console.log('🔍 ResultsScreen - Using Firestore additives');
    } else if (originalAdditives.length > 0) {
      setSortedAdditives(originalAdditives);
      console.log('🔍 ResultsScreen - Using original additives');
    } else {
      setSortedAdditives([]);
      console.log('🔍 ResultsScreen - No additives available');
    }
  }, [originalAdditives.length, firestoreData.additives?.length]); // 길이로 의존성 최적화

  const handleAdditivePress = useCallback((additive: Additive) => {
    Alert.alert(
      additive.name,
      additive.description_full || additive.description_short || '상세 정보가 없습니다.',
      [{ text: '확인' }]
    );
  }, []);

  const handleRetry = useCallback(() => {
    router.back();
  }, [router]);

  const renderContent = () => {
    if (isLoading || currentStatus === 'processing') {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1eff65" />
          <Text style={styles.loadingText}>
            이미지를 분석하고 있습니다...
          </Text>
          <Text style={styles.loadingSubText}>
            OCR 텍스트 추출 및 첨가물 매칭 중
          </Text>
          <Text style={styles.loadingSubText}>
            잠시만 기다려주세요 (약 10-30초 소요)
          </Text>
        </View>
      );
    }

    if (error || currentStatus === 'failed') {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>분석 실패</Text>
          <Text style={styles.errorText}>
            {error || '이미지 분석 중 오류가 발생했습니다.'}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>다시 촬영하기</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentStatus === 'completed') {
      return (
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {/* 추출된 텍스트 섹션 */}
          {currentExtractedText && (
            <View style={styles.textSection}>
              <Text style={styles.sectionTitle}>추출된 텍스트</Text>
              <View style={styles.textContainer}>
                <HighlightedText
                  text={currentExtractedText}
                  additives={sortedAdditives}
                  style={styles.extractedText}
                />
              </View>
            </View>
          )}

          {/* 발견된 첨가물 섹션 */}
          <View style={styles.additivesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                발견된 첨가물 ({sortedAdditives.length}개)
              </Text>
              
              {/* 정렬 버튼들 */}
              {sortedAdditives.length > 1 && (
                <View style={styles.sortButtons}>
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      currentSort === 'none' && styles.sortButtonActive,
                    ]}
                    onPress={() => sortAdditives('none')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        currentSort === 'none' && styles.sortButtonTextActive,
                      ]}
                    >
                      기본
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      currentSort === 'hazard' && styles.sortButtonActive,
                    ]}
                    onPress={() => sortAdditives('hazard')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        currentSort === 'hazard' && styles.sortButtonTextActive,
                      ]}
                    >
                      위험도순
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.sortButton,
                      currentSort === 'name' && styles.sortButtonActive,
                    ]}
                    onPress={() => sortAdditives('name')}
                  >
                    <Text
                      style={[
                        styles.sortButtonText,
                        currentSort === 'name' && styles.sortButtonTextActive,
                      ]}
                    >
                      이름순
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {sortedAdditives.length === 0 ? (
              <View style={styles.noAdditivesContainer}>
                <Text style={styles.noAdditivesText}>
                  {currentStatus === 'completed' 
                    ? "알려진 첨가물을 찾지 못했습니다." 
                    : "첨가물을 분석하고 있습니다..."}
                </Text>
                <Text style={styles.noAdditivesSubText}>
                  {currentStatus === 'completed' 
                    ? "성분표가 선명하게 찍혔는지 확인해보세요." 
                    : "잠시만 기다려주세요."}
                </Text>
                {currentStatus === 'completed' && (
                  <TouchableOpacity 
                    style={styles.retryButton} 
                    onPress={handleRetry}
                  >
                    <Text style={styles.retryButtonText}>다시 촬영하기</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.additivesList}>
                {/* 높은 위험도 그룹 */}
                {groupedAdditives.high.length > 0 && (
                  <View style={styles.hazardGroup}>
                    <View style={styles.hazardGroupHeader}>
                      <Text style={[styles.hazardGroupTitle, { color: '#ff4757' }]}>
                        🚨 높은 위험도 ({groupedAdditives.high.length}개)
                      </Text>
                    </View>
                    {groupedAdditives.high.map((additive, index) => (
                      <AdditiveItem
                        key={`high-${additive.id}-${index}`}
                        additive={additive}
                        onPress={() => handleAdditivePress(additive)}
                      />
                    ))}
                  </View>
                )}

                {/* 중간 위험도 그룹 */}
                {groupedAdditives.medium.length > 0 && (
                  <View style={styles.hazardGroup}>
                    <View style={styles.hazardGroupHeader}>
                      <Text style={[styles.hazardGroupTitle, { color: '#ffa502' }]}>
                        ⚠️ 중간 위험도 ({groupedAdditives.medium.length}개)
                      </Text>
                    </View>
                    {groupedAdditives.medium.map((additive, index) => (
                      <AdditiveItem
                        key={`medium-${additive.id}-${index}`}
                        additive={additive}
                        onPress={() => handleAdditivePress(additive)}
                      />
                    ))}
                  </View>
                )}

                {/* 낮은 위험도 그룹 */}
                {groupedAdditives.low.length > 0 && (
                  <View style={styles.hazardGroup}>
                    <View style={styles.hazardGroupHeader}>
                      <Text style={[styles.hazardGroupTitle, { color: '#2ed573' }]}>
                        ✅ 낮은 위험도 ({groupedAdditives.low.length}개)
                      </Text>
                    </View>
                    {groupedAdditives.low.map((additive, index) => (
                      <AdditiveItem
                        key={`low-${additive.id}-${index}`}
                        additive={additive}
                        onPress={() => handleAdditivePress(additive)}
                      />
                    ))}
                  </View>
                )}

                {/* 알 수 없는 위험도 그룹 */}
                {groupedAdditives.unknown.length > 0 && (
                  <View style={styles.hazardGroup}>
                    <View style={styles.hazardGroupHeader}>
                      <Text style={[styles.hazardGroupTitle, { color: '#747d8c' }]}>
                        ❓ 정보 없음 ({groupedAdditives.unknown.length}개)
                      </Text>
                    </View>
                    {groupedAdditives.unknown.map((additive, index) => (
                      <AdditiveItem
                        key={`unknown-${additive.id}-${index}`}
                        additive={additive}
                        onPress={() => handleAdditivePress(additive)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 하단 여백 */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>분석 결과</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 60, // backButton과 동일한 크기로 중앙 정렬
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    color: '#ff4757',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1eff65',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  textSection: {
    marginTop: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  textContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  extractedText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  additivesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sortButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sortButtonActive: {
    backgroundColor: '#1eff65',
    borderColor: '#1eff65',
  },
  sortButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sortButtonTextActive: {
    color: '#000',
  },
  noAdditivesContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  noAdditivesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  noAdditivesSubText: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  additivesList: {
    gap: 16,
  },
  hazardGroup: {
    marginBottom: 20,
  },
  hazardGroupHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  hazardGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  additiveItem: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  additiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  additiveName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
    justifyContent:'center',
    alignItems:'center',
  },
  matchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  matchText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  hazardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hazardText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  matchedTermText: {
    color: '#1eff65',
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 6,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  additiveDescription: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
    marginBottom: 8,
  },
  moreInfoText: {
    color: '#1eff65',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default ResultsScreen;