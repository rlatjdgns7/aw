import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { authService } from '../services/authService';

// ──────────────────────────────────────────────────────────────
// 1️⃣  Types & Constants
// ──────────────────────────────────────────────────────────────

/** 사용 가능한 소셜 로그인 제공자 */
type SocialProvider = 'Apple' | 'Google' | 'Kakao';

interface SocialButtonProps {
  provider: SocialProvider;
  label: string;
  outline?: boolean; // 테두리만 있고 배경이 투명한 버튼 여부
  kakao?: boolean;   // 카카오 전용 스타일 여부
  onPress: () => void;
}

// ──────────────────────────────────────────────────────────────
// 2️⃣  Placeholder 아이콘 (실제 배포 시 react‑native‑svg 교체)
// ──────────────────────────────────────────────────────────────
const PlaceholderIcon: React.FC<{ color?: string }> = ({ color = '#000' }) => (
  <View style={[styles.iconBox, { backgroundColor: color }]} />
);

// ──────────────────────────────────────────────────────────────
// 3️⃣  공통 소셜 버튼 컴포넌트
// ──────────────────────────────────────────────────────────────
const SocialButton: React.FC<SocialButtonProps & { loading?: boolean }> = ({
  provider,
  label,
  outline,
  kakao,
  onPress,
  loading = false,
}) => {
  const backgroundColor = outline ? '#FFFFFF' : kakao ? '#FEE500' : '#FFFFFF';
  const borderColor = outline ? '#000000' : kakao ? '#FEE500' : '#747775';
  const iconColor = provider === 'Google' ? '#4285F4' : '#333333';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={loading}
      style={[
        styles.socialBtn, 
        { backgroundColor, borderColor, borderWidth: outline ? 1 : kakao ? 0 : 1 },
        loading && styles.buttonDisabled
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} style={{ marginRight: 12 }} />
      ) : (
        <PlaceholderIcon color={iconColor} />
      )}
      <Text style={[styles.socialLabel, loading && styles.labelDisabled]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ──────────────────────────────────────────────────────────────
// 4️⃣  메인 로그인 스크린
// ──────────────────────────────────────────────────────────────
const LoginScreen: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState<SocialProvider | null>(null);

  const handleSocialLogin = async (provider: SocialProvider) => {
    setLoading(provider);
    
    try {
      switch (provider) {
        case 'Google':
          await authService.signInWithGoogle();
          break;
        case 'Apple':
          // Apple Sign-In implementation would go here
          Alert.alert('알림', 'Apple 로그인은 곧 지원될 예정입니다.');
          setLoading(null);
          return;
        case 'Kakao':
          // Kakao Sign-In implementation would go here
          Alert.alert('알림', 'Kakao 로그인은 곧 지원될 예정입니다.');
          setLoading(null);
          return;
        default:
          throw new Error('지원하지 않는 로그인 방식입니다.');
      }

      Alert.alert('로그인 성공', `${provider}로 로그인되었습니다.`, [
        { text: '확인', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('로그인 실패', '로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(null);
    }
  };

  const handleSkipLogin = async () => {
    setLoading('Apple'); // Use any provider as loading indicator
    
    try {
      await authService.signInAnonymously();
      router.push('/main');
    } catch (error) {
      console.error('Anonymous login error:', error);
      Alert.alert('오류', '익명 로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#0A1128', '#000510']} style={styles.container}>
        {/* 타이틀 */}
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.subtitle}>푸디즘은 개인정보를 모으지 않습니다</Text>

        {/* 소셜 로그인 버튼 */}
        <View style={styles.buttonsWrapper}>
          <SocialButton
            provider="Apple"
            label="애플 아이디로 시작하기"
            outline
            loading={loading === 'Apple'}
            onPress={() => handleSocialLogin('Apple')}
          />
          <SocialButton
            provider="Google"
            label="구글 아이디로 시작하기"
            outline
            loading={loading === 'Google'}
            onPress={() => handleSocialLogin('Google')}
          />
          <SocialButton
            provider="Kakao"
            label="카카오 아이디로 시작하기"
            kakao
            loading={loading === 'Kakao'}
            onPress={() => handleSocialLogin('Kakao')}
          />
        </View>

        {/* 로그인 건너뛰기 */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSkipLogin}
          disabled={!!loading}
          style={[styles.skipWrapper, loading && styles.buttonDisabled]}
        >
          <LinearGradient colors={['#00FF7F', '#00E0FF']} start={[0, 0]} end={[1, 0]} style={styles.skipGradient}>
            {loading ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.skipText}>로그인 안하고 쓸래요</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
};

// ──────────────────────────────────────────────────────────────
// 5️⃣  스타일
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // LinearGradient 로 덮이지만 깜빡임 방지
  },
  container: {
    flex: 1,
    marginTop:143,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 7,
  },
  buttonsWrapper: {
    width: '100%',
    marginTop: 32,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  socialLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#1F1F1F',
  },
  iconBox: {
    width: 18,
    height: 18,
    borderRadius: 2,
    marginRight: 12,
  },
  skipWrapper: {
    marginTop: 24,
  },
  skipGradient: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  labelDisabled: {
    opacity: 0.7,
  },
});

export default LoginScreen;
