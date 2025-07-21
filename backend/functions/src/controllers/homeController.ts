/**
 * @fileoverview Controller for handling home page data requests.
 * Provides random samples of additives and recipes for the main dashboard.
 */

import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Firestore database instance
const db = admin.firestore();

/**
 * Controller object containing methods for home page operations.
 */
export const homeController = {
  /**
   * Retrieves random samples of additives and recipes for the home page.
   * Fetches up to 10 additives and 10 recipes, then returns one random item from each collection.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * GET /api/home
   * Response: {
   *   randomAdditive: { id: "123", name: "Vitamin C", hazard_level: "low", ... },
   *   randomRecipe: { id: "456", title: "Healthy Smoothie", youtube_url: "...", ... }
   * }
   */
  async getHome(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Fetch sample data from both collections in parallel
      const [additivesSnapshot, recipesSnapshot] = await Promise.all([
        db.collection('additives').limit(10).get(),
        db.collection('recipes').limit(10).get()
      ]);

      // Transform Firestore documents to plain objects
      const additives = additivesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const recipes = recipesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Select random items from each collection
      const randomAdditive = additives[Math.floor(Math.random() * additives.length)];
      const randomRecipe = recipes[Math.floor(Math.random() * recipes.length)];

      res.json({
        randomAdditive,
        randomRecipe
      });
    } catch (error) {
      console.error('Error fetching home data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};