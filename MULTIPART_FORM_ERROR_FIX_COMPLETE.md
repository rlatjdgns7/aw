# Multipart Form Data 오류 완전 해결 가이드

## 현재 상황
- ✅ API 경로 문제 해결됨 (404 → 200)
- ❌ "Unexpected end of form" 오류 발생
- 원인: React Native에서 이미지 데이터를 잘못된 형식으로 전송

## 해결 방법

### 1. frontend/hudi/services/api.ts 완전 수정

현재 `imageAPI.processImage` 함수를 다음과 같이 **완전 교체**하세요:

```typescript
// Image processing API functions
export const imageAPI = {
  // Process image with unified endpoint (OCR + additive search)
  processImage: async (imageUri: string, timeoutMs: number = 30000) => {
    // Initialize API connection if not done yet
    await initializeApiConnection();
    
    let timeoutCleanup: (() => void) | null = null;
    
    try {
      console.log('[ImageAPI] Processing image:', imageUri);
      
      // React Native에서 올바른 FormData 생성
      const formData = new FormData();
      
      // React Native 전용 이미지 형식
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);

      console.log('[ImageAPI] FormData created successfully');

      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      
      // Authorization 헤더만 추가 (Content-Type은 FormData가 자동 설정)
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      console.log('[ImageAPI] Headers prepared:', Object.keys(headers));

      // Create timeout signal for image processing with cleanup
      const { signal: timeoutSignal, cleanup } = createTimeoutSignal(timeoutMs);
      timeoutCleanup = cleanup;

      console.log('[ImageAPI] Sending request to:', `${API_BASE_URL}${API_PREFIX}/search/image`);

      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/search/image`, {
        method: 'POST',
        headers, // Content-Type을 수동으로 설정하지 않음!
        body: formData,
        signal: timeoutSignal,
      });

      console.log('[ImageAPI] Response status:', response.status);

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP ${response.status}`;
        try {
          const errorBody = await response.text();
          console.error(`[ImageAPI] Error response body:`, errorBody);
          errorDetails += ` - ${errorBody}`;
        } catch (parseError) {
          console.error(`[ImageAPI] Could not parse error response:`, parseError);
        }
        throw new Error(errorDetails);
      }

      const result = await response.json();
      console.log('[ImageAPI] Success result:', result);
      
      // Cleanup timeout on success
      if (timeoutCleanup) {
        timeoutCleanup();
      }
      
      return result;
    } catch (error) {
      // Cleanup timeout on error
      if (timeoutCleanup) {
        timeoutCleanup();
      }
      
      console.error('[ImageAPI] Error:', error);
      
      if (error.name === 'AbortError') {
        console.error('Image processing timed out after', timeoutMs, 'ms');
        throw new Error(`Image processing timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  },
};
```

### 2. 이미지를 사용하는 컴포넌트 수정

이미지 업로드를 하는 컴포넌트(예: ImageAnalysis.tsx)에서:

#### Before (잘못된 방법)
```typescript
const handleImageUpload = async (imageFile: File) => {
  const result = await imageAPI.processImage(imageFile);
}
```

#### After (올바른 방법)
```typescript
const handleImageUpload = async (imageUri: string) => {
  try {
    console.log('Starting image upload:', imageUri);
    const result = await imageAPI.processImage(imageUri);
    console.log('Upload successful:', result);
    
    if (result.success && result.data?.jobId) {
      // jobId를 사용해서 결과 추적
      console.log('Job ID received:', result.data.jobId);
    }
  } catch (error) {
    console.error('Image upload failed:', error);
  }
}
```

### 3. Expo ImagePicker 올바른 사용법

```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImageFromGallery = async () => {
  try {
    // 권한 요청
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('갤러리 접근 권한이 필요합니다.');
      return;
    }

    // 이미지 선택
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8, // 품질 조정으로 파일 크기 최적화
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      console.log('Image selected:', imageUri);
      
      // 이미지 URI를 직접 전달
      await handleImageUpload(imageUri);
    }
  } catch (error) {
    console.error('Image picker error:', error);
  }
};

const takePhoto = async () => {
  try {
    // 카메라 권한 요청
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('카메라 접근 권한이 필요합니다.');
      return;
    }

    // 사진 촬영
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      console.log('Photo taken:', imageUri);
      
      // 이미지 URI를 직접 전달
      await handleImageUpload(imageUri);
    }
  } catch (error) {
    console.error('Camera error:', error);
  }
};
```

### 4. 백엔드에서 디버깅 로그 추가

백엔드에서 요청을 제대로 받는지 확인하기 위해 `searchController.ts`에 로그 추가:

```typescript
async searchByImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    console.log('=== Image Search Request ===');
    console.log('Method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('File present:', !!req.file);
    
    if (req.file) {
      console.log('File details:', {
        fieldname: req.file.fieldname,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });
    }

    if (!req.file) {
      console.error('❌ No file received');
      res.status(400).json({ 
        success: false, 
        error: 'Image file is required' 
      });
      return;
    }

    console.log('✅ File received successfully, processing...');
    
    // 기존 로직 계속...
    const userId = req.user?.uid || 'anonymous-user';
    const jobId = uuidv4();
    
    console.log('Creating job:', jobId, 'for user:', userId);
    
    // ... 나머지 코드
  } catch (error) {
    console.error('❌ searchByImage error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
```

## 주요 수정 포인트

1. **파라미터 변경**: `File | FormData` → `string` (imageUri)
2. **FormData 형식**: React Native 호환 형식 사용
3. **Content-Type 제거**: FormData가 자동으로 boundary 설정
4. **디버깅 로그**: 각 단계별 상세 로그 추가

## 테스트 순서

1. ✅ **프론트엔드 코드 수정**
2. ✅ **앱 재시작** (Hot reload로는 안 됨)
3. ✅ **이미지 선택/촬영**
4. ✅ **콘솔 로그 확인**
5. ✅ **Firebase Functions 로그 확인**

## 예상 결과

성공 시 로그:
```
[ImageAPI] Processing image: file:///.../image.jpg
[ImageAPI] FormData created successfully
[ImageAPI] Headers prepared: ['Authorization']
[ImageAPI] Sending request to: https://us-central1-foodism-782cb.cloudfunctions.net/api/api/search/image
[ImageAPI] Response status: 200
[ImageAPI] Success result: {success: true, data: {jobId: "uuid-..."}}
```

이렇게 수정하면 "Unexpected end of form" 오류가 완전히 해결될 것입니다!