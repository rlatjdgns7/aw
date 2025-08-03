import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();


  const handleSocialLogin = (provider: string) => {
    // TODO: 실제 소셜 로그인 구현
    Alert.alert('로그인 성공', `${provider}로 로그인되었습니다.`, [
      {
        text: '확인',
        onPress: () => router.replace('/(tabs)')
      }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>소셜로그인</Text>
          
            <Text style={styles.subtitle}>개인정보가 없으면 해킹도 없어요</Text>
        
        </View>

        <View style={styles.socialLoginContainer}>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Google')}
          >
            <Text style={styles.socialButtonText}>Google로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Apple')}
          >
            <Text style={styles.socialButtonText}>Apple로 로그인</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialLogin('Kakao')}
          >
            <Text style={styles.socialButtonText}>카카오로 로그인</Text>
          </TouchableOpacity>
        </View>

            <View style={styles.botom}>
              
            <TouchableOpacity onPress={() => router.push('/main')}>
                <Text style={styles.subtitle2}>로그인 없이 쓸래요</Text>
            </TouchableOpacity>
            
            </View>


      
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101221',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingTop: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 70,
    marginTop: 40,
  },

  botom: {
    alignItems: 'center',
    marginBottom: 40,
  },


  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E8B57',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
  },

   subtitle2: {
    fontSize: 14,
    color: '#FFF',
    marginTop : 120,
  },
  socialLoginContainer: {
    marginTop: 10,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  socialButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    color: '#2E8B57',
    fontSize: 14,
    fontWeight: '500',
  },
});