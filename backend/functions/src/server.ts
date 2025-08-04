/**
 * @fileoverview Standalone Express server for local development without Firebase emulator.
 * This allows testing the API without requiring Java or Firebase CLI.
 */

import dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { apiRoutes } from './routes/api';

// Initialize Firebase Admin SDK with default credentials
// For local development, make sure GOOGLE_APPLICATION_CREDENTIALS is set
try {
  admin.initializeApp({
    projectId: 'foodism-782cb'
  });
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Firebase Admin SDK initialization failed:', error);
  console.log('Note: For local development, set GOOGLE_APPLICATION_CREDENTIALS environment variable');
}

// Create Express application instance
const app = express();
const PORT = parseInt(process.env.PORT || '5002', 10);

// Configure middleware with better CORS and connection handling
app.use(cors({ 
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200 // For legacy browser support
}));

// Connection management
app.use((req, res, next) => {
  // Set keep-alive headers
  res.set({
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=5, max=1000'
  });
  next();
});

app.use(express.json({ limit: '50mb' })); // Parse JSON request bodies with size limit
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Parse URL-encoded request bodies

// Mount API routes
app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Foodism API Server is running',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/health',
      'GET /api/home',
      'POST /api/search/text',
      'POST /api/search/image',
      'POST /api/image/process',
      'GET /api/additive/:id'
    ]
  });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📛 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server with proper error handling
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Foodism API server is running on port ${PORT}`);
  console.log(`📍 Local URLs:`);
  console.log(`   - http://localhost:${PORT}`);
  console.log(`   - http://127.0.0.1:${PORT}`);
  console.log(`   - http://10.0.2.2:${PORT} (Android emulator)`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
}).on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

// Keep alive interval to prevent process from sleeping
setInterval(() => {
  console.log(`💓 Server heartbeat - ${new Date().toISOString()} - Uptime: ${Math.floor(process.uptime())}s`);
}, 30000); // Every 30 seconds

export { app, server };