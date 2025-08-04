/**
 * @fileoverview API route definitions for the Fudism application.
 * Configures all HTTP endpoints with authentication and file upload middleware.
 */

import { Router } from 'express';
import { homeController } from '../controllers/homeController';
import { searchController } from '../controllers/searchController';
import { additiveController } from '../controllers/additiveController';
import { imageController } from '../controllers/imageController';
import { adminController } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import * as admin from 'firebase-admin';

// Create Express router instance
const router = Router();

/**
 * Health check endpoint - Simple endpoint to verify server is running
 * @route GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Configure multer for file uploads (stores files in memory)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Home endpoint - Returns random samples of additives and recipes
 * @route GET /api/home
 * @middleware authMiddleware - Requires valid Firebase ID token
 */
router.get('/home', authMiddleware, homeController.getHome);

/**
 * Text search endpoint - Searches additives by text input
 * @route POST /api/search/text
 * @middleware authMiddleware - Requires valid Firebase ID token
 */
router.post('/search/text', authMiddleware, searchController.searchByText);

/**
 * Image search endpoint - Searches additives using OCR on uploaded image
 * @route POST /api/search/image
 * @middleware upload.single('image') - Handles single file upload
 * Note: Authentication removed for easier testing and demo usage
 */
router.post('/search/image', upload.single('image'), searchController.searchByImage);

/**
 * Additive detail endpoint - Returns specific additive information
 * @route GET /api/additive/:id
 * @middleware authMiddleware - Requires valid Firebase ID token
 * @param {string} id - The unique identifier of the additive
 */
router.get('/additive/:id', authMiddleware, additiveController.getAdditive);


/**
 * Unified image processing endpoint - Processes image with OCR and returns additive search results
 * @route POST /api/image/process
 * @middleware authMiddleware - Requires valid Firebase ID token
 * @middleware upload.single('image') - Handles single file upload
 * @description Combines OCR processing and additive search in one operation
 */
router.post('/image/process', authMiddleware, upload.single('image'), imageController.processImage);

// Admin routes - For managing additives and recipes
// Note: In production, these should have additional admin authentication
// Development: Authentication middleware temporarily disabled for testing

/**
 * Database test endpoint
 * @route GET /api/test/database - Test Firestore connection and list additives data
 */
router.get('/test/database', async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('additives').limit(5).get();
    
    if (snapshot.empty) {
      res.json({
        success: true,
        message: 'Connected to Firestore but additives collection is empty',
        count: 0,
        data: []
      });
    } else {
      const data = snapshot.docs.map((doc: admin.firestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json({
        success: true,
        message: `Connected to Firestore successfully`,
        count: snapshot.size,
        total: 'Use /api/admin/additives for full count',
        data: data
      });
    }
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect to database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Admin additives endpoints
 * @route GET /api/admin/additives - Get all additives
 * @route POST /api/admin/additives - Create new additive (with optional image)
 * @route PUT /api/admin/additives/:id - Update additive
 * @route DELETE /api/admin/additives/:id - Delete additive
 */
router.get('/admin/additives', adminController.getAllAdditives);
router.post('/admin/additives', upload.single('image'), adminController.addAdditive);
router.put('/admin/additives/:id', upload.single('image'), adminController.updateAdditive);
router.delete('/admin/additives/:id', adminController.deleteAdditive);

/**
 * Admin recipes endpoints
 * @route GET /api/admin/recipes - Get all recipes
 * @route POST /api/admin/recipes - Create new recipe (with optional image)
 * @route PUT /api/admin/recipes/:id - Update recipe
 * @route DELETE /api/admin/recipes/:id - Delete recipe
 */
router.get('/admin/recipes', adminController.getAllRecipes);
router.post('/admin/recipes', upload.single('image'), adminController.addRecipe);
router.put('/admin/recipes/:id', upload.single('image'), adminController.updateRecipe);
router.delete('/admin/recipes/:id', adminController.deleteRecipe);

/**
 * Bulk import endpoint
 * @route POST /api/admin/bulk-import - Import multiple additives
 */
router.post('/admin/bulk-import', adminController.bulkImport);

/**
 * Exported router with all API routes configured.
 * @type {Router}
 */
export { router as apiRoutes };

