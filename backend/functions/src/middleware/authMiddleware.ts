/**
 * @fileoverview Authentication middleware for Firebase ID token verification.
 * Provides JWT token validation for protected API routes.
 */

import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

/**
 * Extended Express Request interface that includes the authenticated user.
 * 
 * @interface AuthenticatedRequest
 * @extends {Request}
 */
export interface AuthenticatedRequest extends Request {
  /** Decoded Firebase ID token containing user information */
  user?: admin.auth.DecodedIdToken;
}

/**
 * Authentication middleware that validates Firebase ID tokens.
 * Extracts and verifies the Bearer token from the Authorization header.
 * 
 * @param {AuthenticatedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>} Promise that resolves when authentication is complete
 * 
 * @example
 * // Usage in routes
 * router.get('/protected', authMiddleware, (req, res) => {
 *   const userId = req.user.uid; // Access authenticated user ID
 * });
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('🔐 AuthMiddleware - Request details:', {
      method: req.method,
      url: req.url,
      headers: {
        authorization: req.headers.authorization ? 'Bearer ' + req.headers.authorization.substring(7, 27) + '...' : 'No auth header',
        origin: req.headers.origin,
        'user-agent': req.headers['user-agent']?.substring(0, 50),
        'content-type': req.headers['content-type']
      }
    });
    
    // Extract Authorization header (case-insensitive, handle string array)
    const authHeaderRaw = req.headers.authorization || req.headers.Authorization;
    const authHeader = Array.isArray(authHeaderRaw) ? authHeaderRaw[0] : authHeaderRaw;
    
    // Check if Bearer token is present
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      console.error('🔐 AuthMiddleware - No Bearer token found', {
        hasAuthHeader: !!authHeader,
        authHeaderType: typeof authHeader,
        authHeaderValue: authHeader && typeof authHeader === 'string' ? authHeader.substring(0, 20) + '...' : 'null'
      });
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized: No token provided',
        code: 'NO_TOKEN'
      });
      return;
    }

    // Extract token from Bearer header (handle multiple spaces)
    const token = authHeader.replace(/^Bearer\s+/, '').trim();
    
    // Validate token format
    if (!token || token.length < 10) {
      console.error('🔐 AuthMiddleware - Invalid token format', {
        tokenExists: !!token,
        tokenLength: token?.length || 0
      });
      res.status(401).json({ 
        success: false,
        error: 'Unauthorized: Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
      return;
    }

    console.log('🔐 AuthMiddleware - Verifying Firebase ID token:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      tokenSuffix: '...' + token.substring(token.length - 10)
    });

    // Verify Firebase ID token with improved error handling
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token, true); // checkRevoked = true
    } catch (verifyError: any) {
      console.error('🔐 AuthMiddleware - Token verification failed:', {
        errorCode: verifyError?.code,
        errorMessage: verifyError?.message,
        tokenPreview: token.substring(0, 50) + '...'
      });
      
      // Handle specific Firebase Auth errors
      if (verifyError?.code === 'auth/id-token-expired') {
        res.status(401).json({ 
          success: false,
          error: 'Token expired', 
          code: 'TOKEN_EXPIRED' 
        });
        return;
      } else if (verifyError?.code === 'auth/id-token-revoked') {
        res.status(401).json({ 
          success: false,
          error: 'Token revoked', 
          code: 'TOKEN_REVOKED' 
        });
        return;
      } else if (verifyError?.code === 'auth/invalid-id-token') {
        res.status(401).json({ 
          success: false,
          error: 'Invalid token', 
          code: 'INVALID_TOKEN' 
        });
        return;
      } else {
        // Generic token verification error
        res.status(401).json({ 
          success: false,
          error: 'Token verification failed', 
          code: 'VERIFICATION_FAILED',
          details: verifyError?.code 
        });
        return;
      }
    }

    console.log('🔐 AuthMiddleware - Token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      provider: decodedToken.firebase?.sign_in_provider,
      isAnonymous: decodedToken.firebase?.sign_in_provider === 'anonymous',
      iat: new Date(decodedToken.iat * 1000).toISOString(),
      exp: new Date(decodedToken.exp * 1000).toISOString()
    });
    
    // Attach user information to request object
    req.user = decodedToken;
    
    // Continue to next middleware/handler
    next();
  } catch (error: any) {
    console.error('🔐 AuthMiddleware - Unexpected authentication error:', {
      errorType: error?.constructor?.name || 'Unknown',
      errorCode: error?.code || 'No code', 
      errorMessage: error?.message || 'No message',
      stack: error?.stack?.substring(0, 300) || 'No stack'
    });
    
    // Handle unexpected errors (network, Firebase config, etc.)
    if (error?.code === 'auth/project-not-found') {
      res.status(500).json({ 
        success: false,
        error: 'Server configuration error', 
        code: 'PROJECT_CONFIG_ERROR' 
      });
    } else if (error?.message?.includes('network')) {
      res.status(503).json({ 
        success: false,
        error: 'Authentication service unavailable', 
        code: 'AUTH_SERVICE_UNAVAILABLE' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Internal authentication error', 
        code: 'INTERNAL_AUTH_ERROR',
        details: error?.code || 'Unknown error'
      });
    }
  }
};