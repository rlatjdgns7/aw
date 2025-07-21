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
    // Extract Authorization header
    const authHeader = req.headers.authorization;
    
    // Check if Bearer token is present
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    // Extract token from Bearer header
    const token = authHeader.split('Bearer ')[1];
    
    // Validate token format
    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Invalid token format' });
      return;
    }

    // Verify Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach user information to request object
    req.user = decodedToken;
    
    // Continue to next middleware/handler
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};