/**
 * @fileoverview API route definitions for the Fudism application.
 * Configures all HTTP endpoints with authentication and file upload middleware.
 */

import { Router } from 'express';
import { homeController } from '../controllers/homeController';
import { searchController } from '../controllers/searchController';
import { additiveController } from '../controllers/additiveController';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';

// Create Express router instance
const router = Router();

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
 * @middleware authMiddleware - Requires valid Firebase ID token
 * @middleware upload.single('image') - Handles single file upload
 */
router.post('/search/image', authMiddleware, upload.single('image'), searchController.searchByImage);

/**
 * Additive detail endpoint - Returns specific additive information
 * @route GET /api/additive/:id
 * @middleware authMiddleware - Requires valid Firebase ID token
 * @param {string} id - The unique identifier of the additive
 */
router.get('/additive/:id', authMiddleware, additiveController.getAdditive);

/**
 * Exported router with all API routes configured.
 * @type {Router}
 */
export { router as apiRoutes };