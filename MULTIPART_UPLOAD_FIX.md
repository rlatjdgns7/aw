# Multipart Form Data 업로드 오류 해결

## 오류 분석
```
Error: Unexpected end of form
busboy/lib/types/multipart.js(Multipart._final)
```

이 오류는 프론트엔드에서 이미지를 **잘못된 형식**으로 전송하고 있음을 의미합니다.

## 문제점 및 해결방법

### 1. React Native에서 FormData 올바른 사용법

#### 현재 프론트엔드 코드 (문제 있음)
```typescript
// frontend/hudi/services/api.ts - 현재 코드
export const imageAPI = {
  processImage: async (imageFile: File | FormData, timeoutMs: number = 30000) => {
    let formData: FormData;
    
    if (imageFile instanceof FormData) {
      formData = imageFile;
    } else {
      formData = new FormData();
      formData.append('image', imageFile); // ❌ React Native에서 File 객체 사용 불가
    }
    // ...
  }
}
```

#### 수정된 코드 (React Native 호환)
```typescript
// frontend/hudi/services/api.ts - 수정된 코드
export const imageAPI = {
  processImage: async (imageUri: string, timeoutMs: number = 30000) => {
    // Initialize API connection if not done yet
    await initializeApiConnection();
    
    let timeoutCleanup: (() => void) | null = null;
    
    try {
      // React Native에서 올바른 FormData 생성
      const formData = new FormData();
      
      // React Native에서 이미지 파일 올바른 형식
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg', // 또는 실제 이미지 타입
        name: 'image.jpg',
      } as any);

      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // ❌ Content-Type을 수동으로 설정하지 말 것 - FormData가 자동 설정
      // headers['Content-Type'] = 'multipart/form-data'; // 이 라인 제거!

      // Create timeout signal for image processing with cleanup
      const { signal: timeoutSignal, cleanup } = createTimeoutSignal(timeoutMs);
      timeoutCleanup = cleanup;

      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/search/image`, {
        method: 'POST',
        headers, // Content-Type 제외
        body: formData,
        signal: timeoutSignal,
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP ${response.status}`;
        try {
          const errorBody = await response.text();
          console.error(`[API] Error response body:`, errorBody);
          errorDetails += ` - ${errorBody}`;
        } catch (parseError) {
          console.error(`[API] Could not parse error response:`, parseError);
        }
        throw new Error(errorDetails);
      }

      const result = await response.json();
      
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
      
      if (error.name === 'AbortError') {
        console.error('Image processing timed out after', timeoutMs, 'ms');
        throw new Error(`Image processing timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  },
};
```

### 2. 호출하는 컴포넌트에서도 수정 필요

#### ImageAnalysis.tsx 수정 예시
```typescript
// 이전 (잘못된 방법)
const handleImageUpload = async (imageFile: File) => {
  const result = await imageAPI.processImage(imageFile);
}

// 수정된 방법
const handleImageUpload = async (imageUri: string) => {
  try {
    console.log('Uploading image:', imageUri);
    const result = await imageAPI.processImage(imageUri);
    console.log('Upload result:', result);
    // 결과 처리...
  } catch (error) {
    console.error('Image upload failed:', error);
  }
}
```

### 3. Expo ImagePicker 사용 시 올바른 형식

```typescript
import * as ImagePicker from 'expo-image-picker';

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const imageUri = result.assets[0].uri;
    // imageUri를 직접 사용
    await handleImageUpload(imageUri);
  }
};
```

### 4. 백엔드에서 디버깅 로그 추가

#### searchController.ts에 로그 추가
```typescript
async searchByImage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    console.log('=== Image upload request ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('File info:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');
    
    if (!req.file) {
      console.error('❌ No file in request');
      res.status(400).json({ 
        success: false, 
        error: 'Image file is required' 
      });
      return;
    }

    console.log('✅ File received successfully');
    
    // 나머지 로직...
  } catch (error) {
    console.error('❌ Error in searchByImage:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}
```

## 수정해야 할 파일들

### 1. frontend/hudi/services/api.ts
- `processImage` 함수의 파라미터를 `imageUri: string`으로 변경
- FormData 생성 방식을 React Native 호환으로 수정
- Content-Type 헤더 제거

### 2. frontend/hudi/components/ImageAnalysis.tsx (또는 관련 컴포넌트)
- 이미지 업로드 함수 호출 시 URI 전달하도록 수정

### 3. backend/functions/src/controllers/searchController.ts
- 디버깅 로그 추가하여 요청 내용 확인

## 테스트 방법

1. **프론트엔드 수정 후 재시작**
2. **이미지 업로드 시도**
3. **백엔드 로그 확인** (Firebase Console → Functions → api → 로그)
4. **성공적으로 파일이 수신되는지 확인**

## 주의사항

- React Native에서는 `File` 객체 대신 `uri` 문자열 사용
- FormData에 `Content-Type` 헤더를 수동으로 설정하면 안 됨
- 이미지 타입은 `image/jpeg`, `image/png` 등으로 명시

---

이 수정사항들을 적용하면 "Unexpected end of form" 오류가 해결될 것입니다!