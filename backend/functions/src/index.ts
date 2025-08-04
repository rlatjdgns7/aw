/**
 * @fileoverview Main Firebase Functions entry point for the Fudism application.
 * This file sets up the Express server with middleware and routing for the backend API.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { apiRoutes } from './routes/api';

// Initialize Firebase Admin SDK with default credentials
admin.initializeApp({
  projectId: 'foodism-782cb',
  databaseURL: 'https://foodism-782cb-default-rtdb.firebaseio.com'
});

// Create Express application instance
const app = express();

// Configure CORS with improved settings
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow all origins for development
    // In production, you might want to restrict this
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:19006', // Expo web
      'https://localhost:3000',
      'exp://192.168.1.100:8081', // Expo dev server
      /^exp:\/\/.*/, // Any Expo dev server
      /^https?:\/\/.*\.netlify\.app$/, // Netlify deployments
      /^https?:\/\/.*\.vercel\.app$/, // Vercel deployments
    ];
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      } else {
        return allowedOrigin.test(origin);
      }
    });
    
    callback(null, isAllowed || true); // Allow all for now, restrict in production
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control'
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Add security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Configure body parsers
app.use(express.json({ limit: '10mb' })); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded request bodies

// Add debug route at root level
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Firebase Functions is working',
    timestamp: new Date().toISOString(),
    availableRoutes: ['/api/health', '/api/search/image', '/api/search/text', '/api/home']
  });
});

// Mount API routes at /api prefix for proper organization
app.use('/api', apiRoutes);

/**
 * Firebase Cloud Function that serves the Express application.
 * This function handles all HTTP requests to the API endpoints.
 * 
 * @type {functions.HttpsFunction}
 */
export const api = functions.https.onRequest(app);