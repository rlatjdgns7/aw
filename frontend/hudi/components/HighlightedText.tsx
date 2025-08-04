import React from 'react';
import { Text, StyleSheet } from 'react-native';
import type { Additive } from '../services/api';

interface HighlightedTextProps {
  text: string;
  additives: (Additive & { matchType?: string; matchScore?: number; matchedTerm?: string })[];
  style?: any;
}

interface TextSegment {
  text: string;
  isHighlighted: boolean;
  hazardLevel?: string;
  matchedAdditive?: string;
}

const HighlightedText: React.FC<HighlightedTextProps> = ({ text, additives, style }) => {
  const createTextSegments = (): TextSegment[] => {
    if (!text || !additives.length) {
      return [{ text, isHighlighted: false }];
    }

    const segments: TextSegment[] = [];
    let remainingText = text;
    let currentIndex = 0;

    // 매칭된 텍스트와 해저드 레벨을 저장하는 배열
    const matches: Array<{
      start: number;
      end: number;
      term: string;
      hazardLevel: string;
      additiveName: string;
    }> = [];

    // 모든 첨가물에 대해 매칭 위치 찾기
    additives.forEach(additive => {
      const searchTerms = [
        additive.name,
        ...(additive.aliases || []),
        additive.matchedTerm
      ].filter(Boolean);

      searchTerms.forEach(term => {
        if (!term) return;
        
        const normalizedText = text.toLowerCase();
        const normalizedTerm = term.toLowerCase();
        
        let searchIndex = 0;
        while (true) {
          const foundIndex = normalizedText.indexOf(normalizedTerm, searchIndex);
          if (foundIndex === -1) break;

          // 겹치는 매칭이 있는지 확인
          const hasOverlap = matches.some(match => 
            (foundIndex >= match.start && foundIndex < match.end) ||
            (foundIndex + normalizedTerm.length > match.start && foundIndex < match.end)
          );

          if (!hasOverlap) {
            matches.push({
              start: foundIndex,
              end: foundIndex + normalizedTerm.length,
              term: text.substring(foundIndex, foundIndex + normalizedTerm.length),
              hazardLevel: additive.hazard_level,
              additiveName: additive.name
            });
          }

          searchIndex = foundIndex + 1;
        }
      });
    });

    // 시작 위치순으로 정렬
    matches.sort((a, b) => a.start - b.start);

    // 텍스트 분할
    let lastEnd = 0;

    matches.forEach(match => {
      // 매칭 이전의 일반 텍스트
      if (match.start > lastEnd) {
        segments.push({
          text: text.substring(lastEnd, match.start),
          isHighlighted: false
        });
      }

      // 하이라이트된 텍스트
      segments.push({
        text: match.term,
        isHighlighted: true,
        hazardLevel: match.hazardLevel,
        matchedAdditive: match.additiveName
      });

      lastEnd = match.end;
    });

    // 마지막 남은 텍스트
    if (lastEnd < text.length) {
      segments.push({
        text: text.substring(lastEnd),
        isHighlighted: false
      });
    }

    return segments;
  };

  const getHighlightStyle = (hazardLevel?: string) => {
    switch (hazardLevel?.toLowerCase()) {
      case 'high':
      case '높음':
        return styles.highlightHigh;
      case 'medium':
      case '보통':
        return styles.highlightMedium;
      case 'low':
      case '낮음':
        return styles.highlightLow;
      default:
        return styles.highlightDefault;
    }
  };

  const segments = createTextSegments();

  return (
    <Text style={[styles.container, style]}>
      {segments.map((segment, index) => (
        <Text
          key={index}
          style={[
            styles.baseText,
            segment.isHighlighted && getHighlightStyle(segment.hazardLevel)
          ]}
        >
          {segment.text}
        </Text>
      ))}
    </Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flexWrap: 'wrap',
  },
  baseText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  highlightHigh: {
    backgroundColor: 'rgba(255, 71, 87, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 2,
    fontWeight: '600',
    color: '#ff4757',
  },
  highlightMedium: {
    backgroundColor: 'rgba(255, 165, 2, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 2,
    fontWeight: '600',
    color: '#ffa502',
  },
  highlightLow: {
    backgroundColor: 'rgba(46, 213, 115, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 2,
    fontWeight: '600',
    color: '#2ed573',
  },
  highlightDefault: {
    backgroundColor: 'rgba(116, 125, 140, 0.3)',
    borderRadius: 4,
    paddingHorizontal: 2,
    fontWeight: '600',
    color: '#747d8c',
  },
});

export default HighlightedText;