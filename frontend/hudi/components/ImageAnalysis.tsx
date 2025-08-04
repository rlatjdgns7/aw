import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { imageAPI, healthCheck, ApiError } from '../services/api';
import { authService } from '../services/authService';

interface AnalysisResult {
  extractedText: string;
  additives: {
    id: string;
    name: string;
    hazard_level: string;
    description_short?: string;
    description_full?: string;
    aliases?: string[];
    matchType?: string;
    matchScore?: number;
    matchedTerm?: string;
  }[];
  summary: string;
}

interface ImageAnalysisProps {
  onResult?: (result: AnalysisResult) => void;
}

const ImageAnalysis: React.FC<ImageAnalysisProps> = ({ onResult }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setIsAuthenticated(!!user);
    });

    return unsubscribe;
  }, []);

  // 이미지 피커 권한 요청
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '갤러리에 접근하기 위해서는 권한이 필요합니다.');
        return false;
      }
    }
    return true;
  };

  // 결과 요약 생성
  const generateSummary = (additives: {name: string, hazard_level: string}[]): string => {
    if (additives.length === 0) {
      return '분석 결과 특별히 주의할 첨가물이 발견되지 않았습니다.';
    }

    const high = additives.filter(a => a.hazard_level === 'high').length;
    const medium = additives.filter(a => a.hazard_level === 'medium').length;
    const low = additives.filter(a => a.hazard_level === 'low').length;

    return `총 ${additives.length}개의 첨가물이 발견되었습니다. 고위험: ${high}개, 중위험: ${medium}개, 저위험: ${low}개`;
  };

  // 갤러리에서 이미지 선택
  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImageFile(result.assets[0] as ImageAsset);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  // 카메라로 사진 촬영
  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImageFile(result.assets[0] as ImageAsset);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('오류', '카메라를 사용하는 중 오류가 발생했습니다.');
    }
  };

  // 파일에서 이미지 선택
  const pickImageFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        await processImageFile(result.assets[0] as ImageAsset);
      }
    } catch (error) {
      console.error('File picker error:', error);
      Alert.alert('오류', '파일을 선택하는 중 오류가 발생했습니다.');
    }
  };

  // 서버 상태 확인
  const checkServerHealth = async (): Promise<boolean> => {
    try {
      console.log('[ImageAnalysis] Checking server health...');
      const healthResult = await healthCheck(5000);
      
      if (healthResult.success) {
        console.log('[ImageAnalysis] Server is healthy:', healthResult.workingUrl);
        return true;
      } else {
        console.error('[ImageAnalysis] Server health check failed:', healthResult.errors);
        if (healthResult.errors && healthResult.errors.length > 0) {
          const errorDetails = healthResult.errors.map(e => `${e.url}: ${e.error}`).join('\n');
          Alert.alert(
            '서버 연결 실패', 
            `서버에 연결할 수 없습니다:\n\n${errorDetails}\n\n개발 서버가 실행 중인지 확인하세요.`
          );
        }
        return false;
      }
    } catch (error) {
      console.error('[ImageAnalysis] Health check error:', error);
      Alert.alert(
        '연결 확인 실패', 
        '서버 상태를 확인할 수 없습니다. 네트워크 연결을 확인하세요.'
      );
      return false;
    }
  };

  // 이미지 파일 처리 - ImagePicker와 DocumentPicker 호환 타입
  interface ImageAsset {
    uri: string;
    mimeType?: string;
    name?: string;
    width?: number;
    height?: number;
    fileSize?: number;
    type?: string; // DocumentPicker에서 사용
  }
  
  const processImageFile = async (asset: ImageAsset) => {
    setIsLoading(true);
    setAnalysisResult(null);

    try {
      // Ensure user is authenticated (auto login if needed)
      console.log('[ImageAnalysis] Ensuring authentication...');
      await authService.ensureAuthenticated();
      
      console.log('[ImageAnalysis] Processing image with real OCR API...');

      console.log('Processing image:', asset.uri);
      const result = await imageAPI.processImage(asset.uri, 120000);

      if (result.success && result.data) {
        if (result.data.jobId) {
          // 비동기 처리 - jobId를 받았으므로 Firestore 리스너로 결과 대기
          console.log('🔍 ImageAnalysis - Job ID received:', result.data.jobId);
          
          // ResultsScreen으로 이동하면서 처리 중 상태 전달 - 쿼리 문자열 방식
          const jobId = result.data.jobId;
          router.push(`/results?jobId=${encodeURIComponent(jobId)}&status=processing`);
        } else {
          // 동기 처리 - 즉시 결과 받음
          const analysisResult: AnalysisResult = {
            extractedText: result.data.extractedText,
            additives: result.data.additives,
            summary: generateSummary(result.data.additives)
          };
          
          console.log('🔍 ImageAnalysis - Analysis result received:', analysisResult);
          console.log('🔍 ImageAnalysis - Additives count:', analysisResult.additives.length);
          
          // ResultsScreen으로 이동 - 쿼리 문자열 방식으로 안전하게 전달
          try {
            const encodedText = encodeURIComponent(analysisResult.extractedText || '');
            const encodedAdditives = encodeURIComponent(JSON.stringify(analysisResult.additives || []));
            router.push(`/results?extractedText=${encodedText}&additives=${encodedAdditives}&status=completed`);
          } catch (jsonError) {
            console.error('JSON stringify error:', jsonError);
            // JSON 직렬화 실패 시 기본값으로 처리
            const encodedText = encodeURIComponent(analysisResult.extractedText || '');
            router.push(`/results?extractedText=${encodedText}&additives=%5B%5D&status=completed`);
          }
          
          // 기존 로직도 유지 (onResult 콜백 및 로컬 상태 설정)
          setAnalysisResult(analysisResult);
          onResult?.(analysisResult);
        }
      } else {
        throw new ApiError(result.error || '이미지 처리에 실패했습니다.', undefined, 'PROCESS_ERROR', false);
      }
    } catch (error: any) {
      console.error('Image processing error:', error);
      
      let errorMessage = '이미지 분석 중 오류가 발생했습니다.';
      let showRetry = false;
      
      if (error instanceof ApiError) {
        errorMessage = error.message;
        showRetry = error.isRetryable;
      } else if (error && error.message) {
        if (error.message.includes('timeout')) {
          errorMessage = '이미지 처리 시간이 너무 오래 걸려 중단되었습니다. 더 작은 이미지를 시도하거나 다시 시도해주세요.';
          showRetry = true;
        } else if (error.message.includes('Network Error') || error.message.includes('network')) {
          errorMessage = '네트워크 연결 상태를 확인해주세요. 인터넷 연결이 불안정할 수 있습니다.';
          showRetry = true;
        } else if (error.message.includes('413') || error.message.includes('too large')) {
          errorMessage = '이미지 파일이 너무 큽니다. 더 작은 이미지를 선택해주세요.';
          showRetry = false;
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage = '인증이 필요합니다. 앱을 다시 시작해주세요.';
          showRetry = false;
        } else if (error.message.includes('500') || error.message.includes('server')) {
          errorMessage = '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
          showRetry = true;
        } else {
          errorMessage = error.message;
          showRetry = true;
        }
      }
      
      if (showRetry) {
        Alert.alert(
          '분석 실패', 
          errorMessage, 
          [
            { text: '취소', style: 'cancel' },
            { 
              text: '다시 시도', 
              onPress: () => processImageFile(asset) 
            }
          ]
        );
      } else {
        Alert.alert('분석 실패', errorMessage);
      }
      
      setAnalysisResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.mainComponent}>
      <View style={[styles.view, styles.viewFrameFlexBox]}>
        {/* 상단 헤더 바 */}
        <View style={styles.headerBar} />
        
        <View style={[styles.frameParent, styles.frameFlexBox]}>
          {/* 제목 섹션 */}
          <View style={[styles.frameGroup, styles.frameFlexBox1]}>
            <View style={styles.frameFlexBox}>
              <View style={[styles.wrapper, styles.wrapperFlexBox]}>
                <Text style={[styles.text, styles.textClr]}>식품첨가물 분석</Text>
              </View>
            </View>
            <Text style={[styles.text1, styles.textClr]}>어떤 방식을 사용하시겠어요?</Text>
          </View>

          {/* 버튼 컨테이너 */}
          <View style={[styles.frameContainer, styles.frameFlexBox1]}>
            <View style={[styles.frameView, styles.wrapperFlexBox]}>
              <View style={[styles.parent, styles.frameFlexBox1]}>
                {/* 카메라 버튼 */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.view1Layout]}
                  onPress={takePhoto}
                  disabled={isLoading}
                >
                  <View style={[styles.frameParent1, styles.viewFrameFlexBox]}>
                    <Image 
                      source={require('../assets/images/camera-icon.png')} 
                      style={styles.buttonIcon}
                    />
                    <View style={styles.frameWrapper1}>
                      <View style={[styles.container, styles.text2Position]}>
                        <Text style={[styles.text2, styles.text2Position]}>카메라로 분석하기</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* 갤러리 버튼 */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.view1Layout]}
                  onPress={pickImageFromGallery}
                  disabled={isLoading}
                >
                  <View style={[styles.frameParent1, styles.viewFrameFlexBox]}>
                    <Image 
                      source={require('../assets/images/gallay.png')} 
                      style={styles.buttonIcon}
                    />
                    <View style={styles.frameWrapper1}>
                      <View style={[styles.container, styles.text2Position]}>
                        <Text style={[styles.text2, styles.text2Position]}>사진첩에서 찾기</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* 로딩 상태 */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>이미지를 분석하고 있습니다...</Text>
              </View>
            )}
          </View>
        </View>

        {/* 하단 바 */}
        <View style={[styles.frameChild1, styles.viewFrameFlexBox]} />
      </View>

      {/* 분석 결과 */}
      {analysisResult && (
        <View style={styles.resultOverlay}>
          <ScrollView style={styles.resultContainer}>
            <Text style={styles.resultTitle}>분석 결과</Text>
            
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>{analysisResult.summary}</Text>
            </View>

            {analysisResult.additives.length > 0 && (
              <View style={styles.additivesContainer}>
                <Text style={styles.sectionTitle}>발견된 첨가물</Text>
                {analysisResult.additives.map((additive, index) => (
                  <View
                    key={index}
                    style={[
                      styles.additiveItem,
                      additive.hazard_level === 'high' ? styles.highRisk :
                      additive.hazard_level === 'medium' ? styles.mediumRisk : styles.lowRisk
                    ]}
                  >
                    <Text style={styles.additiveName}>{additive.name}</Text>
                    <Text style={styles.additiveLevel}>
                      위험도: {additive.hazard_level === 'high' ? '높음' : 
                              additive.hazard_level === 'medium' ? '보통' : '낮음'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.extractedTextContainer}>
              <Text style={styles.sectionTitle}>추출된 텍스트</Text>
              <Text style={styles.extractedText}>{analysisResult.extractedText}</Text>
            </View>

            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setAnalysisResult(null)}
            >
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // 첫 번째 코드의 스타일 구조 유지
  mainComponent: {
    flex: 1,
    backgroundColor: '#000', // 배경색을 검은색으로 설정
  },
  viewFrameFlexBox: {
    alignItems: "center",
    justifyContent: "center"
  },
  frameFlexBox: {
    minWidth: 254,
    alignSelf: "stretch",
    alignItems: "center"
  },
  frameFlexBox1: {
    alignSelf: "stretch",
    alignItems: "center"
  },
  wrapperFlexBox: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  textClr: {
    color: "#fff",
    textAlign: "center"
  },
  view1Layout: {
    height: 40,
    flexDirection: "row"
  },
  text2Position: {
    left: "50%",
    marginLeft: -50,
    position: "absolute",
    width: 100
  },
  headerBar: {
    width: 353,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 15,
  },
  text: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Inter-Bold",
    textAlign: "center"
  },
  wrapper: {
    width: 300,
    minWidth: 300,
    maxWidth: 300,
    flexDirection: "row",
    height: 40
  },
  text1: {
    width: 234,
    fontSize: 16,
    fontWeight: "300",
    fontFamily: "Inter-Light",
    display: "flex",
    height: 20,
    textAlign: "center",
    justifyContent: "center",
    alignItems: "center"
  },
  frameGroup: {
    gap: 8
  },
  frameChild: {
    width: 24,
    height: 24,
    overflow: "hidden"
  },
  buttonIcon: {
    width: 24,
    height: 24,
    alignSelf: 'center',
  },
  text2: {
    top: 0,
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: "600",
    fontFamily: "Roboto-Bold",
    color: "#1f1f1f",
    textAlign: "center"
  },
  container: {
    marginTop: -7,
    top: "50%",
    height: 14
  },
  frameWrapper1: {
    height: 18,
    width: 100
  },
  frameParent1: {
    gap: 4,
    flexDirection: "row",
    justifyContent: "center",
    flex: 1
  },
  actionButton: {
    borderRadius: 16,
    backgroundColor: "#fff",
    borderStyle: "solid",
    borderColor: "#000",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 200,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%"
  },
  parent: {
    gap: 24,
    justifyContent: "center"
  },
  frameView: {
    maxWidth: 240,
    width: "100%"
  },
  frameContainer: {
    paddingTop: 16,
    minWidth: 194,
    gap: 8,
    justifyContent: "center"
  },
  frameChild1: {
    width: 28,
    height: 30,
    backgroundColor: '#333',
    borderRadius: 15,
    justifyContent: "center"
  },
  frameParent: {
    paddingTop: 80,
    gap: 16
  },
  view: {
    height: 932,
    paddingHorizontal: 32,
    paddingVertical: 100,
    gap: 8,
    justifyContent: "center",
    overflow: "hidden",
    width: "100%",
    flex: 1
  },
  
  // 로딩 상태 스타일
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },

  // 결과 표시를 위한 오버레이
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // 기존 결과 스타일들 (흰색 배경으로 수정)
  resultContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#e8f4fd',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
    textAlign: 'center',
  },
  additivesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  additiveItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  highRisk: {
    backgroundColor: '#ffebee',
    borderLeftColor: '#f44336',
  },
  mediumRisk: {
    backgroundColor: '#fff3e0',
    borderLeftColor: '#ff9800',
  },
  lowRisk: {
    backgroundColor: '#e8f5e8',
    borderLeftColor: '#4caf50',
  },
  additiveName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  additiveLevel: {
    fontSize: 14,
    color: '#666',
  },
  extractedTextContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  extractedText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ImageAnalysis;