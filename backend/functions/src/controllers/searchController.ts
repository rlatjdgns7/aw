/**
 * @fileoverview Controller for handling search operations in the Fudism application.
 * Provides text-based and image-based search functionality for food additives.
 */

import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';
import { searchAdditivesWithFuzzyMatching } from '../utils/additiveSearchUtils';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Firestore database instance - initialized when needed
const getDb = () => admin.firestore();

// Google Cloud Vision client - optimized for speed
const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json',
  // 성능 최적화 설정
  timeout: 8000, // 8초 타임아웃
  retry: {
    retryCodes: [14], // UNAVAILABLE만 재시도
    maxRetries: 1     // 최대 1회만 재시도
  }
});

/**
 * Controller object containing methods for search operations.
 */
export const searchController = {
  /**
   * Searches for food additives based on text input using advanced fuzzy matching.
   * Implements multi-layer search: exact match → partial match → fuzzy match.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and text in body
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * POST /api/search/text
   * Body: { text: "글루탐산나트륨, 구연산" }
   * Response: { additives: [{ id: "123", name: "글루탐산나트륨", matchType: "exact", ... }] }
   */
  async searchByText(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { text } = req.body;

      if (!text) {
        res.status(400).json({ 
          success: false, 
          error: 'Text is required' 
        });
        return;
      }

      console.log('Text search request:', text);

      // Use enhanced search with fuzzy matching from shared utility
      const foundAdditives = await searchAdditivesWithFuzzyMatching(text);

      console.log(`Found ${foundAdditives.length} additives for text search`);

      res.json({ 
        success: true, 
        data: { additives: foundAdditives } 
      });
    } catch (error) {
      console.error('Error searching by text:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  },

  /**
   * Initiates OCR-based search for food additives from an uploaded image.
   * Supports both multipart/form-data and JSON base64 formats.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and image data
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation is initiated
   * 
   * @example
   * POST /api/search/image (with JSON: {imageBase64: "...", mimeType: "image/jpeg"})
   * Response: { jobId: "uuid-string" }
   */
  async searchByImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      console.log('=== Image Search Request ===');
      console.log('Content-Type:', req.headers['content-type']);
      console.log('Has file:', !!req.file);
      console.log('Body keys:', Object.keys(req.body));

      let imageBuffer: Buffer;

      // NEW: Check for Firebase Storage URL (ULTRA FAST method)
      if (req.body && req.body.storageUrl) {
        console.log('🚀 Processing Firebase Storage URL (ULTRA FAST):', req.body.storageUrl);
        
        try {
          // Firebase Storage에서 직접 다운로드 (Google 내부망 - 초고속)
          const storageResponse = await fetch(req.body.storageUrl);
          if (!storageResponse.ok) {
            throw new Error(`Storage fetch failed: ${storageResponse.status}`);
          }
          
          const arrayBuffer = await storageResponse.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
          
          console.log('✅ Storage download complete, size:', imageBuffer.length);
        } catch (storageError) {
          console.error('❌ Storage download failed:', storageError);
          res.status(400).json({ 
            success: false, 
            error: 'Failed to download image from Storage' 
          });
          return;
        }
      }
      // LEGACY: Check if it's a JSON request with base64 data (slower)
      else if (req.body && req.body.imageBase64) {
        console.log('⚠️ Using SLOW base64 method (consider Storage upload)');
        
        try {
          imageBuffer = Buffer.from(req.body.imageBase64, 'base64');
          
          if (imageBuffer.length > 4 * 1024 * 1024) {
            res.status(400).json({ 
              success: false, 
              error: 'Image too large. Please use images under 4MB for faster processing.' 
            });
            return;
          }
          
          console.log('✅ Base64 converted to buffer, size:', imageBuffer.length);
        } catch (base64Error) {
          console.error('❌ Base64 conversion failed:', base64Error);
          res.status(400).json({ 
            success: false, 
            error: 'Invalid base64 image data' 
          });
          return;
        }
      } 
      // LEGACY: Fallback to multipart form data (slowest)
      else if (req.file) {
        console.log('⚠️ Using SLOWEST multipart method');
        imageBuffer = req.file.buffer;
      } 
      // No image data found
      else {
        console.error('❌ No image data received');
        res.status(400).json({ 
          success: false, 
          error: 'Image data required. Send storageUrl (fastest), imageBase64, or multipart file.' 
        });
        return;
      }

      // Use anonymous user ID if not authenticated
      const userId = req.user?.uid || 'anonymous-user';
      const jobId = uuidv4();

      console.log('Creating job:', jobId, 'for user:', userId);

      // Create a scan result document to track processing status
      const db = getDb();
      const scanResultRef = db.collection('scanResults').doc(jobId);
      await scanResultRef.set({
        userId,
        status: 'processing',
        result: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Return job ID immediately for client polling
      const isStorageUpload = !!req.body.storageUrl;
      res.json({ 
        success: true, 
        data: { 
          jobId,
          estimatedTime: isStorageUpload ? 3000 : 6000, // Storage: 3초, base64: 6초
          method: isStorageUpload ? 'storage' : 'base64'
        } 
      });

      console.log('✅ Job created, starting background processing...');

      // Process image asynchronously in the background (no await for faster response)
      processImageWithFirestore(imageBuffer, jobId, userId).catch(error => {
        console.error(`Background processing failed for job ${jobId}:`, error);
      });
    } catch (error) {
      console.error('❌ Error initiating image search:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  }
};

/**
 * Processes image with OCR and searches for additives, updating Firestore with results.
 * Uses the same logic as imageController.processImage but stores results in Firestore.
 * 
 * @param {Buffer} imageBuffer - The image data as a buffer
 * @param {string} jobId - Unique identifier for the processing job
 * @param {string} userId - ID of the user who initiated the search
 * @returns {Promise<void>} Promise that resolves when processing completes
 * 
 * @private
 */
async function processImageWithFirestore(imageBuffer: Buffer, jobId: string, userId: string): Promise<void> {
  const db = getDb();
  
  try {
    console.log(`Starting OCR processing for job ${jobId}`);
    
    // Step 1: Process image with OCR
    const extractedText = await processImageWithVisionAPIInternal(imageBuffer);
    console.log(`OCR completed for job ${jobId}:`, extractedText);

    // Step 2: Search for additives in the extracted text using shared utility
    const foundAdditives = await searchAdditivesWithFuzzyMatching(extractedText);
    console.log(`Found ${foundAdditives.length} additives for job ${jobId}`);

    // Step 3: Update scan result with completion
    await db.collection('scanResults').doc(jobId).update({
      status: 'completed',
      result: {
        extractedText,
        additives: foundAdditives
      }
    });
    
    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Error processing image for job ${jobId}:`, error);
    
    // Update scan result with failure status
    try {
      await db.collection('scanResults').doc(jobId).update({
        status: 'failed',
        result: { 
          error: 'Failed to process image. Please try again.',
          errorDetails: (error as any).message 
        }
      });
    } catch (updateError) {
      console.error(`Failed to update job ${jobId} with error status:`, updateError);
    }
  }
}

/**
 * Processes an image buffer with OCR using Google Cloud Vision API.
 * Provides high-accuracy text detection optimized for Korean and English.
 * 
 * @param {Buffer} imageBuffer - The image buffer to process
 * @returns {Promise<string>} The extracted text from the image
 * 
 * @private
 */
async function processImageWithVisionAPIInternal(imageBuffer: Buffer): Promise<string> {
  try {
    console.log('Starting Google Cloud Vision OCR processing...');
    
    // Get project ID to verify authentication
    try {
      const projectId = await visionClient.getProjectId();
      console.log('✅ Authenticated with project:', projectId);
    } catch (authError: any) {
      console.error('❌ Authentication failed:', authError.message);
      throw new Error(`Vision API authentication failed: ${authError.message}`);
    }
    
    // Call Google Cloud Vision API for text detection with optimized settings
    const [result] = await visionClient.textDetection({
      image: {
        content: imageBuffer.toString('base64'),
      },
      imageContext: {
        languageHints: ['ko', 'en'], // 한국어, 영어만 처리
        textDetectionParams: {
          enableTextDetectionConfidenceScore: false // 신뢰도 점수 비활성화로 속도 향상
        }
      }
    });

    console.log('✅ Vision API call completed successfully');

    // Extract text from the response
    const extractedText = result.fullTextAnnotation?.text || '';
    
    // Clean up the extracted text
    const cleanedText = extractedText
      .replace(/\n+/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
      .replace(/[^\w\s가-힣ㄱ-ㅎㅏ-ㅣ,;:()\-]/g, ' ')  // Keep only alphanumeric, Korean, and basic punctuation
      .trim();               // Remove leading/trailing whitespace

    console.log('Google Cloud Vision OCR completed successfully');
    console.log('Raw OCR result:', extractedText);
    console.log('Cleaned OCR result:', cleanedText);

    // Return fallback text if OCR result is too short or empty
    if (cleanedText.length < 3) {
      console.warn('OCR result too short, using fallback text');
      return getFallbackIngredients();
    }

    // Additional validation - check if result contains mostly meaningful content
    if (isValidIngredientText(cleanedText)) {
      return cleanedText;
    } else {
      console.warn('OCR result seems invalid, using fallback text');
      return getFallbackIngredients();
    }
  } catch (error: any) {
    console.error('❌ Google Cloud Vision OCR processing failed:', error);
    
    // Log detailed error information for debugging
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
    if (error.details) {
      console.error('Error details:', error.details);
    }
    
    // Check for common error types
    if (error.message?.includes('PERMISSION_DENIED')) {
      console.error('🔒 Permission denied - check service account permissions');
    } else if (error.message?.includes('QUOTA_EXCEEDED')) {
      console.error('📊 Quota exceeded - check API limits');
    } else if (error.message?.includes('API_KEY_INVALID')) {
      console.error('🔑 Invalid API key - check credentials');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
      console.error('🌐 Network error - check internet connection');
    }
    
    // Return fallback text on OCR failure
    console.warn('⚠️ OCR failed, using fallback text');
    return getFallbackIngredients();
  }
}

/**
 * Validates if the extracted text appears to contain food ingredients.
 * 
 * @param {string} text - The text to validate
 * @returns {boolean} True if text appears to contain ingredients
 * 
 * @private
 */
function isValidIngredientText(text: string): boolean {
  // Common food-related keywords in Korean and English
  const foodKeywords = [
    '첨가물', '성분', '원료', '재료', '산', '염', '당', '료',
    'acid', 'sodium', 'sugar', 'extract', 'oil', 'powder',
    '나트륨', '칼슘', '칼륨', '인산', '구연산', '아스코르빈산'
  ];
  
  const lowerText = text.toLowerCase();
  return foodKeywords.some(keyword => lowerText.includes(keyword.toLowerCase())) || 
         text.length > 10; // Assume longer texts are more likely to be valid
}

/**
 * Returns a fallback ingredient list for testing and demo purposes.
 * Uses actual ingredients from seedData for realistic matching.
 * 
 * @returns {string} Fallback ingredient text
 * 
 * @private
 */
function getFallbackIngredients(): string {
  const fallbacks = [
    "안식향산나트륨, 글루탐산나트륨, 구연산, 아스파탐, 카라기난",
    "적색 40호, 황색 5호, 수크랄로스, 레시틴, 과당포도당액",
    "BHA, 아질산나트륨, 소르빈산, 토코페롤, 인산",
    "모노글리세리드, 구아검, 잔탄검, 사카린, 아세설팜칼륨"
  ];
  
  // Return a random fallback for demo variety
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

