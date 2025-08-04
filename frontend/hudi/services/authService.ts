import { auth } from './firebaseConfig';
import { 
  signInAnonymously as firebaseSignInAnonymously,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  User,
  onAuthStateChanged
} from 'firebase/auth';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

// Configure web browser for auth
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_OAUTH_CONFIG = {
  clientId: '682246281596-7v3h9p8q2k4n6m8r5t1w3e9y0u2i4o6p.apps.googleusercontent.com',
  redirectUri: AuthSession.makeRedirectUri({}), // useProxy 옵션 제거
  scopes: ['openid', 'profile', 'email'],
  additionalParameters: {},
};

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

class AuthService {
  private currentUser: User | null = null;
  private authStateListeners: ((user: AuthUser | null) => void)[] = [];

  constructor() {
    // Listen to auth state changes
    onAuthStateChanged(auth, (user) => {
      console.log('🔐 AuthService - Auth state changed:', {
        hasUser: !!user,
        uid: user?.uid,
        isAnonymous: user?.isAnonymous,
        email: user?.email,
        timestamp: new Date().toISOString()
      });
      
      this.currentUser = user;
      const authUser = user ? this.mapFirebaseUserToAuthUser(user) : null;
      this.authStateListeners.forEach(listener => listener(authUser));
    });

    // Auto-initialize authentication
    this.initializeAuth();
  }

  // Initialize authentication - auto sign in anonymously if not authenticated
  private async initializeAuth(): Promise<void> {
    try {
      // Wait a bit for auth state to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!this.currentUser) {
        console.log('🔐 AuthService - No user found, auto signing in anonymously...');
        await this.signInAnonymously();
      } else {
        console.log('🔐 AuthService - User already authenticated:', {
          uid: this.currentUser.uid,
          isAnonymous: this.currentUser.isAnonymous
        });
      }
    } catch (error) {
      console.error('🔐 AuthService - Auto authentication failed:', error);
      // Don't throw error - let the app continue
    }
  }

  // Force initialize authentication (public method)
  async ensureAuthenticated(): Promise<AuthUser> {
    if (this.currentUser) {
      return this.mapFirebaseUserToAuthUser(this.currentUser);
    }
    
    console.log('🔐 AuthService - Ensuring authentication...');
    return await this.signInAnonymously();
  }

  private mapFirebaseUserToAuthUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      isAnonymous: user.isAnonymous,
    };
  }

  // Sign in with Google using Expo AuthSession
  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const request = new AuthSession.AuthRequest(GOOGLE_OAUTH_CONFIG);
      const result = await request.promptAsync({
        authorizationEndpoint: 'https://accounts.google.com/oauth/authorize',
      });

      if (result.type === 'success') {
        const { id_token } = result.params;
        if (id_token) {
          const credential = GoogleAuthProvider.credential(id_token);
          const firebaseResult = await signInWithCredential(auth, credential);
          console.log('Signed in with Google:', firebaseResult.user.uid);
          return this.mapFirebaseUserToAuthUser(firebaseResult.user);
        }
      }
      
      throw new Error('Google sign-in was cancelled or failed');
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  // Sign in anonymously
  async signInAnonymously(): Promise<AuthUser> {
    console.log('🔐 AuthService - Starting anonymous sign in...');
    
    try {
      const result = await firebaseSignInAnonymously(auth);
      console.log('🔐 AuthService - Anonymous sign in successful:', {
        uid: result.user.uid,
        isAnonymous: result.user.isAnonymous,
        providerId: result.user.providerId,
        metadata: {
          creationTime: result.user.metadata.creationTime,
          lastSignInTime: result.user.metadata.lastSignInTime
        }
      });
      return this.mapFirebaseUserToAuthUser(result.user);
    } catch (error: any) {
      console.error('🔐 AuthService - Anonymous sign-in error:', {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      // Provide specific error messages
      if (error.code === 'auth/configuration-not-found') {
        throw new Error('Firebase 익명 인증이 활성화되지 않았습니다. Firebase Console에서 Authentication > Sign-in method > Anonymous를 활성화하세요.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('익명 인증이 허용되지 않습니다. Firebase Console에서 설정을 확인하세요.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('너무 많은 요청이 발생했습니다. 잠시 후 다시 시도하세요.');
      }
      
      throw new Error(`인증 오류: ${error.message}`);
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }

  // Get current user
  getCurrentUser(): AuthUser | null {
    return this.currentUser ? this.mapFirebaseUserToAuthUser(this.currentUser) : null;
  }

  // Get ID token for API calls with automatic refresh
  async getIdToken(forceRefresh: boolean = false): Promise<string | null> {
    console.log('🔐 AuthService - Getting ID token:', {
      hasUser: !!this.currentUser,
      isAnonymous: this.currentUser?.isAnonymous,
      forceRefresh
    });

    try {
      if (this.currentUser) {
        // Force refresh token if it's about to expire or if explicitly requested
        const token = await this.currentUser.getIdToken(forceRefresh);
        console.log('🔐 AuthService - ID token obtained:', {
          tokenLength: token.length,
          tokenPrefix: token.substring(0, 20) + '...'
        });
        return token;
      }
      console.log('🔐 AuthService - No current user, returning null');
      return null;
    } catch (error: any) {
      console.error('🔐 AuthService - Error getting ID token:', {
        code: error.code,
        message: error.message
      });
      
      // If token is expired, try to refresh it once
      if (error.code === 'auth/id-token-expired' && !forceRefresh) {
        console.log('🔐 AuthService - Token expired, attempting to refresh...');
        return await this.getIdToken(true);
      }
      
      return null;
    }
  }

  // Get fresh ID token (forces refresh)
  async getFreshIdToken(): Promise<string | null> {
    return await this.getIdToken(true);
  }

  // Add auth state listener
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  // Check if user is authenticated (including anonymous users)
  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  // Check if user is fully authenticated (non-anonymous)
  isFullyAuthenticated(): boolean {
    return !!this.currentUser && !this.currentUser.isAnonymous;
  }
}

// Export singleton instance
export const authService = new AuthService();