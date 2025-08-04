import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { initializeApp, getApps } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { firebaseConfig } from './firebaseConfig';

// Custom Error class for API errors
export class ApiError extends Error {
  constructor(
    message: string, 
    public statusCode?: number, 
    public code?: string, 
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Express server uses simple /api path
const EXPRESS_API_PATH = '/api'; // <-- 이 상수로 통일!

// Initialize Firebase Storage
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const storage = getStorage(app);

// Get all possible API URLs for development
const getApiUrls = () => {
  // Use deployed Firebase Functions as primary - function name is 'api'
  return [
    'https://us-central1-foodism-782cb.cloudfunctions.net/api',  // Deployed Firebase Functions (function name: api)
  ];
  
  // Development environment - use local Express server (commented out)
  /*
  const isAndroidEmulator = true; // Force Android emulator URLs
  
  // Get dynamic host from Expo if available
  let dynamicHost = '';
  try {
    // Extract host from Expo config if available (Constants.manifest is deprecated)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      dynamicHost = `http://${hostUri.split(':')[0]}:5001`;
      console.log('[API] Dynamic host detected:', dynamicHost);
    }
  } catch (error) {
    console.warn('Could not get dynamic host from Expo:', error);
  }
  
if (isAndroidEmulator) {
        return [
            `http://10.0.2.2:5002${EXPRESS_API_PATH}`, // Android emulator to host machine
            `http://172.27.189.18:5002${EXPRESS_API_PATH}`, // WSL IP address
            `http://localhost:5002${EXPRESS_API_PATH}`, // Alternative localhost
            `http://127.0.0.1:5002${EXPRESS_API_PATH}`, // IPv4 localhost
        ].filter(Boolean);
  } else {
    // Real device or iOS - prioritize actual PC IP for real devices
    // 🔧 IMPORTANT: Replace with your actual PC's local IP address!
    // To find your IP:
    // - Windows: Run 'ipconfig' in Command Prompt, look for 'IPv4 Address'
    // - macOS/Linux: Run 'ifconfig' or 'ip addr show', look for your WiFi interface
    // - Make sure iOS device and PC are on the same WiFi network
    const YOUR_ACTUAL_PC_LOCAL_IP = '172.20.10.6'; // <-- UPDATE THIS IP!
    const actualPcIpUrl = `http://${YOUR_ACTUAL_PC_LOCAL_IP}:5002${EXPRESS_API_PATH}`;
    
    // Log IP information for debugging
    console.log('[API] Using hardcoded PC IP:', YOUR_ACTUAL_PC_LOCAL_IP);
    console.log('[API] Constructed URL:', actualPcIpUrl);
    if (dynamicHost) {
      console.log('[API] Dynamic host detected:', dynamicHost);
    } else {
      console.warn('[API] No dynamic host detected - make sure Expo dev server is running');
    }
    
    return [
      actualPcIpUrl, // Development PC's actual IP as highest priority
      ...(dynamicHost ? [`${dynamicHost.replace('5001', '5002')}${EXPRESS_API_PATH}`] : []), // Dynamic host Express
      `http://172.27.189.18:5002${EXPRESS_API_PATH}`, // Alternative localhost
      `http://localhost:5002${EXPRESS_API_PATH}` // Standalone Express server
    ].filter(Boolean);
  }
  */
};

// Global variables for API configuration
let API_BASE_URL = getApiUrls()[0];
let API_PREFIX = '';
let isInitialized = false;

console.log('Initial API URL:', API_BASE_URL);

// Initialize API connection by testing all URLs
const initializeApiConnection = async (): Promise<void> => {
  if (isInitialized) return;
  
  // Use deployed Firebase Functions - function name is 'api', routes start with /api
  const urls = getApiUrls();
  API_BASE_URL = urls[0];
  API_PREFIX = '/api'; // Routes in deployed function start with /api
  
  console.log('[API] Using deployed Firebase Functions:', API_BASE_URL);
  console.log('[API] API prefix:', API_PREFIX);
  console.log('[API] Full URL example:', `${API_BASE_URL}${API_PREFIX}/search/image`);
  isInitialized = true;
};

// Type definitions
export interface Additive {
  id: string;
  name: string;
  hazard_level: 'low' | 'medium' | 'high';
  description_short: string;
  description_full: string;
  aliases: string[];
}

import { authService } from './authService';

// Enhanced timeout utility function with proper cleanup
const createTimeoutSignal = (timeoutMs: number): { signal: AbortSignal; cleanup: () => void } => {
  const controller = new AbortController();
  
  // Store timeout ID for cleanup
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  // Return both signal and cleanup function
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
    }
  };
};

// Get Auth token from Firebase
const getAuthToken = async (): Promise<string | null> => {
  try {
    console.log('[AUTH] Getting real Firebase ID token...');
    const token = await authService.getIdToken();
    
    if (token) {
      console.log('[AUTH] Successfully obtained Firebase ID token:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('[AUTH] No Firebase ID token available');
      return null;
    }
  } catch (error) {
    console.error('[AUTH] Error getting Firebase ID token:', error);
    return null;
  }
};

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
};

// API call wrapper with authentication, timeout, and retry logic
export const apiCall = async (
  endpoint: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 30000,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
) => {
  // Initialize API connection if not done yet
  await initializeApiConnection();
  
  let lastError: Error | null = null;
  const startTime = Date.now();
  
  console.log(`[API] Starting request to ${endpoint} with ${retryConfig.maxRetries + 1} max attempts`);
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    let timeoutCleanup: (() => void) | null = null;
    
    try {
      const token = await getAuthToken();
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
      };

      // Add authorization header if token exists
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      // Create timeout signal with cleanup
      const { signal: timeoutSignal, cleanup } = createTimeoutSignal(timeoutMs);
      timeoutCleanup = cleanup;
      
      // Combine user signal with timeout signal if provided
      let signal = timeoutSignal;
      if (options.signal) {
        const controller = new AbortController();
        const userSignal = options.signal;
        
        const abortHandler = () => controller.abort();
        timeoutSignal.addEventListener('abort', abortHandler);
        userSignal.addEventListener('abort', abortHandler);
        
        signal = controller.signal;
      }

      const response = await fetch(`${API_BASE_URL}${API_PREFIX}${endpoint}`, {
        ...options,
        headers,
        signal,
      });

      // Check for specific status codes that shouldn't be retried
      if (response.status === 401) {
        // Unauthorized - try to refresh token and retry once
        if (attempt === 0) {
          console.log('401 error, attempting to refresh token...');
          await authService.getFreshIdToken();
          continue; // Retry with fresh token
        }
      }

      if (response.status >= 400 && response.status < 500 && response.status !== 408) {
        // Client errors (except timeout) shouldn't be retried
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const duration = Date.now() - startTime;
      console.log(`[API] Success: ${endpoint} in ${duration}ms (attempt ${attempt + 1})`);
      
      // Cleanup timeout before returning
      if (timeoutCleanup) {
        timeoutCleanup();
      }
      
      return await response.json();
      
    } catch (error) {
      // Cleanup timeout on error
      if (timeoutCleanup) {
        timeoutCleanup();
      }
      lastError = error as Error;
      const duration = Date.now() - startTime;
      
      // Don't retry on certain errors
      if (error.name === 'AbortError') {
        console.error(`[API] Request aborted: ${endpoint} after ${duration}ms`);
        throw new Error(`Request aborted`);
      }
      
      // Don't retry on user-initiated aborts
      if (options.signal?.aborted) {
        throw error;
      }
      
      // Log retry attempt with more details
      console.error(`[API] Attempt ${attempt + 1}/${retryConfig.maxRetries + 1} failed for ${endpoint}:`, {
        error: error.message,
        duration: `${duration}ms`,
        url: `${API_BASE_URL}${API_PREFIX}${endpoint}`
      });
      
      if (attempt < retryConfig.maxRetries) {
        const delay = retryConfig.baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`[API] Retrying in ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[API] All retries exhausted for ${endpoint}`);
      }
    }
  }
  
  // If we get here, all retries failed
  if (lastError?.name === 'AbortError') {
    throw new Error(`Request timed out after ${timeoutMs}ms`);
  }
  
  throw lastError || new Error('API call failed after retries');
};

// Image processing API functions
export const imageAPI = {
  // Process image with Firebase Storage (ULTRA FAST method)
  processImage: async (imageUri: string, timeoutMs: number = 30000) => {
    await initializeApiConnection();
    
    let timeoutCleanup: (() => void) | null = null;
    
    try {
      console.log('[ImageAPI] 🚀 FAST Processing with Storage upload:', imageUri);
      
      // Step 1: Firebase Storage에 이미지 직접 업로드 (바이너리 - 33% 빠름)
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      // 고유한 파일명 생성
      const fileName = `temp-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const storageRef = ref(storage, fileName);
      
      console.log('[ImageAPI] ⬆️ Uploading to Storage...');
      const uploadResult = await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log('[ImageAPI] ✅ Storage upload complete! URL:', downloadURL);

      // Step 2: 작은 JSON 요청만 Functions에 전송 (95% 작은 요청)
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const { signal: timeoutSignal, cleanup } = createTimeoutSignal(timeoutMs);
      timeoutCleanup = cleanup;

      console.log('[ImageAPI] 📤 Sending TINY request to Functions...');

      // 매우 작은 JSON 요청 (Storage URL만)
      const requestBody = {
        storageUrl: downloadURL,
        mimeType: 'image/jpeg'
      };

      const apiResponse = await fetch(`${API_BASE_URL}${API_PREFIX}/search/image`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: timeoutSignal,
      });

      console.log('[ImageAPI] Response status:', apiResponse.status);

      if (!apiResponse.ok) {
        // Try to get error details from response
        let errorDetails = `HTTP ${apiResponse.status}`;
        try {
          const errorBody = await apiResponse.text();
          console.error(`[ImageAPI] Error response body:`, errorBody);
          errorDetails += ` - ${errorBody}`;
        } catch (parseError) {
          console.error(`[ImageAPI] Could not parse error response:`, parseError);
        }
        throw new Error(errorDetails);
      }

      const result = await apiResponse.json();
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

// Health check function with multiple URL fallback and better error reporting
export const healthCheck = async (timeoutMs: number = 5000) => {
  const urls = getApiUrls();
  console.log(`[HealthCheck] Will try ${urls.length} URLs with ${timeoutMs}ms timeout each`);
  
  const connectionErrors = [];
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    let timeoutCleanup: (() => void) | null = null;
    
    try {
      // 이전 답변에서 제안했듯이, getApiUrls에서 반환하는 모든 URL이
      // 이미 '/api'까지 포함하고, API_PREFIX가 ''이라고 가정합니다.
      // 따라서 health endpoint는 단순히 '/health'만 붙이면 됩니다.
      const healthUrl = `${url}/health`; // <-- 여기를 이렇게 단순화합니다!
      console.log(`[HealthCheck] Attempt ${i + 1}/${urls.length}: ${healthUrl}`);
      
      const { signal: timeoutSignal, cleanup } = createTimeoutSignal(timeoutMs);
      timeoutCleanup = cleanup;
      const startTime = Date.now();
      
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: timeoutSignal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`[HealthCheck] Response time: ${responseTime}ms, Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[HealthCheck] SUCCESS with URL ${i + 1}: ${url}`);
        console.log('[HealthCheck] Server response:', data);
        
        // Cleanup timeout on success
        if (timeoutCleanup) {
          timeoutCleanup();
        }
        
        return { success: true, workingUrl: url, responseTime, data };
      } else {
        const errorInfo = `Status ${response.status}`;
        console.error(`[HealthCheck] URL ${i + 1} returned ${errorInfo}`);
        connectionErrors.push({ url, error: errorInfo });
        
        // Cleanup timeout on non-ok response
        if (timeoutCleanup) {
          timeoutCleanup();
        }
      }
    } catch (error) {
      // Cleanup timeout on error
      if (timeoutCleanup) {
        timeoutCleanup();
      }
      let errorInfo = '';
      if (error.name === 'AbortError') {
        errorInfo = `Timeout after ${timeoutMs}ms`;
        console.error(`[HealthCheck] URL ${i + 1} timed out after ${timeoutMs}ms`);
      } else if (error.message.includes('Network request failed')) {
        errorInfo = 'Network request failed - server may be offline';
        console.error(`[HealthCheck] URL ${i + 1} network error: Server appears to be offline`);
      } else {
        errorInfo = error.message || 'Unknown error';
        console.error(`[HealthCheck] URL ${i + 1} unexpected error:`, error);
      }
      
      connectionErrors.push({ url, error: errorInfo });
      
      // Continue to next URL unless this is the last one
      if (i < urls.length - 1) {
        console.log(`[HealthCheck] Trying next URL...`);
        continue;
      }
    }
  }
  
  console.error(`[HealthCheck] All ${urls.length} URLs failed`);
  return { 
    success: false, 
    errors: connectionErrors,
    troubleshooting: [
      '1. Make sure the backend server is running on port 5002',
      '2. Check if firewall is blocking the connection',
      '3. Verify network connectivity',
      '4. Try running: npm run dev in backend/functions directory'
    ]
  };
};

// Legacy OCR API functions (for backward compatibility)
export const ocrAPI = {
  // Process image with OCR (legacy - use imageAPI.processImage instead)
  processImage: async (imageBase64: string, userId?: string) => {
    return await apiCall('/ocr/process', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        userId: userId || 'anonymous'
      }),
    }, 120000); // 2 minutes timeout for OCR processing
  },

  // Get OCR processing result (legacy)
  getResult: async (jobId: string) => {
    return await apiCall(`/ocr/result/${jobId}`, {}, 10000); // 10 seconds timeout for result fetching
  },
};

// Authentication functions are now handled by authService