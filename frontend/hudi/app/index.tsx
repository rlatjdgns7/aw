import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function RootIndex() {
  const router = useRouter();

  useEffect(() => {
    // 앱 시작시 로그인 화면으로 리다이렉트
    router.replace('/login');
  }, [router]);

  return null; // 리다이렉트 중이므로 아무것도 렌더링하지 않음
}