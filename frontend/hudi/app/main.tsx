import { StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function MainScreen() {
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title" style={styles.title}>Foodism</ThemedText>
        <ThemedText style={styles.subtitle}>식품 첨가물 분석 서비스</ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">오늘의 추천</ThemedText>
          <ThemedView style={styles.card}>
            <ThemedText type="defaultSemiBold">건강한 레시피</ThemedText>
            <ThemedText>신선한 재료로 만드는 건강 요리</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">첨가물 검색</ThemedText>
          <ThemedView style={styles.searchContainer}>
            <ThemedText>텍스트 검색 또는 이미지 스캔으로</ThemedText>
            <ThemedText>식품 첨가물을 확인해보세요</ThemedText>
          </ThemedView>
        </ThemedView>

        <ThemedView style={styles.section}>
          <ThemedText type="subtitle">주요 기능</ThemedText>
          <ThemedView style={styles.featureContainer}>
            <ThemedView style={styles.feature}>
              <ThemedText type="defaultSemiBold">📱 이미지 스캔</ThemedText>
              <ThemedText>제품 라벨을 촬영하여 첨가물 분석</ThemedText>
            </ThemedView>
            <ThemedView style={styles.feature}>
              <ThemedText type="defaultSemiBold">🔍 텍스트 검색</ThemedText>
              <ThemedText>첨가물명으로 직접 검색</ThemedText>
            </ThemedView>
            <ThemedView style={styles.feature}>
              <ThemedText type="defaultSemiBold">📊 위험도 분석</ThemedText>
              <ThemedText>건강에 미치는 영향도 확인</ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchContainer: {
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  featureContainer: {
    marginTop: 12,
    gap: 16,
  },
  feature: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
});