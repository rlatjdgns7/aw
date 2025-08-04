/**
 * @fileoverview Utility functions for searching food additives.
 * Shared between imageController and searchController for consistency.
 */

import { additiveData } from '../scripts/seedData';
import * as admin from 'firebase-admin';

// Firestore database instance
const getDb = () => admin.firestore();

// 메모리 캐시 - 서버 시작시 한 번만 로드
let additivesCache: any[] | null = null;
let cacheLoadPromise: Promise<any[]> | null = null;

/**
 * OCR 오류 보정 함수
 * 일반적인 OCR 오류 패턴을 보정합니다.
 * 
 * @param {string} text - 보정할 텍스트
 * @returns {string} 보정된 텍스트
 */
function correctOCRErrors(text: string): string {
  const corrections: { [key: string]: string } = {
    // 한글 OCR 오류 패턴
    'ㅇ': 'o',
    'ㅁ': 'm',
    'ㄴ': 'n',
    'ㄹ': 'r',
    'ㅅ': 's',
    'ㅌ': 't',
    'ㅍ': 'p',
    'ㅎ': 'h',
    // 숫자/영문 혼동
    '1': 'l',
    'l': '1',
    '0': 'o',
    'o': '0',
    '5': 's',
    's': '5',
    // 특수문자 정리
    '·': '',
    '•': '',
    '－': '-',
    '—': '-',
    // 공백 정리
    '\u00A0': ' ', // non-breaking space
    '\u2009': ' ', // thin space
    '\u200B': '',  // zero-width space
  };

  let corrected = text;
  Object.entries(corrections).forEach(([wrong, correct]) => {
    corrected = corrected.replace(new RegExp(wrong, 'g'), correct);
  });

  return corrected;
}

/**
 * 텍스트 정규화 함수
 * 검색을 위해 텍스트를 정규화합니다.
 * 
 * @param {string} text - 정규화할 텍스트
 * @returns {string} 정규화된 텍스트
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()[\]{}\"']/g, '') // 괄호, 따옴표 제거
    .replace(/[\s\-_·•]/g, '')    // 공백, 하이픈, 언더스코어, 중점 제거
    .replace(/[^\w가-힣]/g, '');  // 알파벳, 숫자, 한글만 유지
}

/**
 * Calculates string similarity using enhanced Jaccard similarity.
 * Returns a value between 0 (no similarity) and 1 (identical).
 * 
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateStringSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // OCR 오류 보정 후 정규화
  const normalized1 = normalizeText(correctOCRErrors(s1));
  const normalized2 = normalizeText(correctOCRErrors(s2));
  
  if (normalized1 === normalized2) return 1;

  // Enhanced Jaccard similarity for Korean/English text
  const set1 = new Set(normalized1.split(''));
  const set2 = new Set(normalized2.split(''));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  const jaccardSimilarity = intersection.size / union.size;

  // 추가적으로 substring 매칭 보너스 적용
  const substringBonus = Math.max(
    normalized1.includes(normalized2) ? 0.2 : 0,
    normalized2.includes(normalized1) ? 0.2 : 0
  );

  return Math.min(1, jaccardSimilarity + substringBonus);
}

/**
 * 캐시된 첨가물 데이터 로딩 - 최대 성능을 위한 메모리 캐싱
 */
async function getCachedAdditives(): Promise<any[]> {
  // 이미 캐시된 데이터가 있으면 즉시 반환
  if (additivesCache) {
    return additivesCache;
  }

  // 이미 로딩 중이면 해당 Promise 반환
  if (cacheLoadPromise) {
    return cacheLoadPromise;
  }

  // 새로운 로딩 Promise 생성
  cacheLoadPromise = (async () => {
    try {
      const db = getDb();
      const additivesSnapshot = await db.collection('additives').get();
      
      if (!additivesSnapshot.empty) {
        additivesCache = additivesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else {
        additivesCache = additiveData.map(additive => ({
          ...additive,
          id: additive.id
        }));
      }
    } catch (error) {
      // Firestore 실패시 즉시 seedData 사용
      additivesCache = additiveData.map(additive => ({
        ...additive,
        id: additive.id
      }));
    }
    
    cacheLoadPromise = null; // 완료되면 Promise 정리
    return additivesCache;
  })();

  return cacheLoadPromise;
}

/**
 * Enhanced additive search function with aggressive caching for 7-second target.
 * Uses memory cache to eliminate database calls during processing.
 * 
 * @param {string} text - The text to search for additives in
 * @returns {Promise<any[]>} Array of found additives with match information
 */
export async function searchAdditivesWithFuzzyMatching(text: string): Promise<any[]> {
  try {
    // 캐시된 데이터를 즉시 로드 (DB 호출 없음)
    const allAdditives = await getCachedAdditives();
    
    // 키워드 추출을 더 제한적으로 (성능 우선)
    const keywords = normalizeAndExtractKeywords(text).slice(0, 8); // 8개로 더 제한

    const foundAdditives: any[] = [];

    // 더 빠른 검색 (키워드 6개로 제한)
    for (const keyword of keywords.slice(0, 6)) {
      const matches = findAdditiveMatches(keyword, allAdditives);
      foundAdditives.push(...matches);
      
      // 조기 종료: 10개 이상 찾으면 충분
      if (foundAdditives.length >= 10) break;
    }

    // 중복 제거 및 정렬 (상위 8개만)
    const uniqueAdditives = removeDuplicatesAndSort(foundAdditives).slice(0, 8);
    
    return uniqueAdditives;
  } catch (error) {
    console.error('Error in enhanced additive search:', error);
    return [];
  }
}

/**
 * Normalizes text and extracts searchable keywords with OCR error correction.
 * 
 * @param {string} text - Raw input text
 * @returns {string[]} Array of normalized keywords
 */
function normalizeAndExtractKeywords(text: string): string[] {
  // OCR 오류 보정 먼저 적용
  const correctedText = correctOCRErrors(text);
  
  // Remove special characters and normalize spacing - 더 강화된 전처리
  const normalized = correctedText
    .toLowerCase()
    .replace(/[()[\]{}\"']/g, ' ')        // Remove brackets and quotes
    .replace(/\s+/g, ' ')                 // Replace multiple spaces with single space
    .replace(/[^\w가-힣\s,;:·•\-]/g, ' ')  // Remove other special characters but keep delimiters
    .trim();

  // Enhanced splitting with more delimiters
  const delimiters = /[,\n;:·•\-\/\|\s()[\]{}]+/;
  const rawKeywords = normalized
    .split(delimiters)
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 1)
    .filter(keyword => !isCommonWord(keyword));

  // 연속된 한글 단어 추출 (첨가물 이름은 보통 한글)
  const koreanWords = text.match(/[가-힣]{2,}/g) || [];
  
  // 숫자가 포함된 첨가물명 처리 (예: "황색5호", "적색40호")
  const numberedAdditives: string[] = [];
  [...rawKeywords, ...koreanWords].forEach(keyword => {
    // 한글+숫자+한글 패턴 (예: 황색5호)
    const match1 = keyword.match(/([가-힣]+)(\d+)([가-힣]*)/); 
    if (match1) {
      numberedAdditives.push(keyword); // 전체: 황색5호
      if (match1[1].length > 1) numberedAdditives.push(match1[1]); // 앞부분: 황색
      if (match1[3].length > 0) numberedAdditives.push(`${match1[2]}${match1[3]}`); // 뒷부분: 5호
    }
  });
  
  // 공백으로 분리된 복합어 처리 (예: "구아 검" -> "구아검")
  const spacelessWords: string[] = [];
  rawKeywords.forEach(word => {
    if (word.includes(' ')) {
      spacelessWords.push(word.replace(/\s+/g, ''));
    }
  });
  
  // 모든 키워드 결합
  const allKeywords = [
    ...rawKeywords,
    ...koreanWords.filter(word => word.length > 1 && !isCommonWord(word)),
    ...numberedAdditives,
    ...spacelessWords
  ];
  
  // 중복 제거 및 최종 필터링 (성능을 위해 상위 15개만)
  const uniqueKeywords = [...new Set(allKeywords)]
    .filter(keyword => keyword.length > 1)
    .sort((a, b) => b.length - a.length) // 긴 키워드를 먼저 시도
    .slice(0, 15); // 성능 최적화를 위해 상위 15개만
  
  return uniqueKeywords;
}

/**
 * Checks if a word is a common non-additive word that should be filtered out.
 * 
 * @param {string} word - Word to check
 * @returns {boolean} True if word should be filtered out
 */
function isCommonWord(word: string): boolean {
  // 첨가물 관련 중요 키워드는 제외하지 않도록 주의
  const importantAdditiveKeywords = [
    '산도조절제', '향미증진제', '구아검', '잔탄검', '전분', '변성전분', 
    '글루텐', '인산', '포도당', '정백당', '토코페롤', '비타민', '이스트'
  ];
  
  // 중요한 첨가물 키워드라면 필터링하지 않음
  if (importantAdditiveKeywords.some(keyword => 
    word.toLowerCase().includes(keyword.toLowerCase()) || 
    keyword.toLowerCase().includes(word.toLowerCase())
  )) {
    return false;
  }

  const commonWords = [
    // English common words  
    'and', 'or', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'contains', 'includes', 'less', 'than', 'more', 'each', 'per', 'total',
    
    // Korean common words - 첨가물과 무관한 단어들만
    '그리고', '또는', '및', '등', '포함', '함량', '이하', '기타', '각종',
    '사용', '제품', '식품', '국산', '중국산', '미국산', '호주산', '말레이시아산',
    '면류', '스프류', '블럭', '분말', '추출물', '시즈닝', '베이스', '양념',
    '일까지', '케이', '함은', '원료명'
  ];
  
  return commonWords.includes(word.toLowerCase());
}

/**
 * Finds all possible matches for a keyword against the additive database.
 * Uses exact, partial, normalized, and fuzzy matching strategies.
 * 
 * @param {string} keyword - Keyword to search for
 * @param {any[]} additives - All additives from database
 * @returns {any[]} Array of matched additives with match information
 */
function findAdditiveMatches(keyword: string, additives: any[]): any[] {
  const matches: any[] = [];
  const normalizedKeyword = normalizeText(correctOCRErrors(keyword));

  for (const additive of additives) {
    const additiveName = (additive.name as string).toLowerCase();
    const aliases = (additive.aliases as string[]).map(alias => alias.toLowerCase());
    const allSearchTerms = [additiveName, ...aliases];
    
    let bestMatch: any = null;
    let bestScore = 0;

    for (const searchTerm of allSearchTerms) {
      const normalizedSearchTerm = normalizeText(correctOCRErrors(searchTerm));
      
      // Strategy 1: Exact match (highest priority)
      if (searchTerm === keyword.toLowerCase()) {
        bestMatch = {
          matchType: 'exact',
          matchScore: 1.0,
          matchedTerm: keyword
        };
        break;
      }

      // Strategy 2: Normalized exact match
      if (normalizedSearchTerm === normalizedKeyword && normalizedKeyword.length > 2) {
        if (bestScore < 0.95) {
          bestMatch = {
            matchType: 'normalized_exact',
            matchScore: 0.95,
            matchedTerm: keyword
          };
          bestScore = 0.95;
        }
        continue;
      }

      // Strategy 3: Partial match (contains) - 더 관대한 부분 매칭
      const isPartialMatch = searchTerm.includes(keyword.toLowerCase()) || 
                            normalizedSearchTerm.includes(normalizedKeyword) ||
                            keyword.toLowerCase().includes(searchTerm) ||
                            normalizedKeyword.includes(normalizedSearchTerm);
      
      if (isPartialMatch) {
        const longerLength = Math.max(searchTerm.length, keyword.length, normalizedSearchTerm.length, normalizedKeyword.length);
        const shorterLength = Math.min(searchTerm.length, keyword.length, normalizedSearchTerm.length, normalizedKeyword.length);
        const score = Math.min(0.9, (shorterLength / longerLength) * 0.85); // 더 높은 점수
        
        if (score > bestScore) {
          bestMatch = {
            matchType: 'partial',
            matchScore: score,
            matchedTerm: keyword,
            matchDetails: `"${keyword}" matches "${searchTerm}"`
          };
          bestScore = score;
        }
        continue;
      }

      // Strategy 4: Fuzzy matching using string similarity - 더 낮은 임계값
      const similarity = calculateStringSimilarity(keyword, searchTerm);
      const threshold = keyword.length > 4 ? 0.3 : 0.5; // 더 낮은 임계값으로 관대하게
      
      if (similarity >= threshold && similarity * 0.7 > bestScore) {
        bestMatch = {
          matchType: 'fuzzy',
          matchScore: similarity * 0.7,
          matchedTerm: keyword,
          matchDetails: `"${keyword}" ~= "${searchTerm}" (similarity: ${similarity.toFixed(3)})`
        };
        bestScore = similarity * 0.7;
      }
    }

    // Add the best match if found - 더 낮은 임계값으로 관대하게
    if (bestMatch && bestScore > 0.2) { // 임계값을 0.3에서 0.2로 낮춤
      matches.push({
        ...additive,
        ...bestMatch
      });
    }
  }

  return matches;
}

/**
 * Removes duplicate additives and sorts by match quality and hazard level.
 * 
 * @param {any[]} additives - Array of matched additives
 * @returns {any[]} Deduplicated and sorted array
 */
function removeDuplicatesAndSort(additives: any[]): any[] {
  // Remove duplicates by ID, keeping the match with highest score
  const uniqueMap = new Map();
  
  for (const additive of additives) {
    const existing = uniqueMap.get(additive.id);
    if (!existing || additive.matchScore > existing.matchScore) {
      uniqueMap.set(additive.id, additive);
    }
  }

  const uniqueAdditives = Array.from(uniqueMap.values());

  // Sort by match score (descending) and then by hazard level (high first)
  const hazardOrder = { 'high': 0, 'medium': 1, 'low': 2 };
  
  uniqueAdditives.sort((a, b) => {
    // Primary sort: match score (higher is better)
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    
    // Secondary sort: hazard level (high priority)
    const aHazardOrder = hazardOrder[a.hazard_level as keyof typeof hazardOrder] ?? 3;
    const bHazardOrder = hazardOrder[b.hazard_level as keyof typeof hazardOrder] ?? 3;
    
    return aHazardOrder - bHazardOrder;
  });

  return uniqueAdditives;
}

