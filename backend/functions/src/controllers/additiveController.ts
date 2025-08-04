/**
 * @fileoverview Controller for handling additive-related operations.
 * Provides endpoints for retrieving food additive information from Firestore.
 */

import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Firestore database instance - initialized when needed
const getDb = () => admin.firestore();

/**
 * Controller object containing methods for additive operations.
 */
export const additiveController = {
  /**
   * Retrieves a specific additive by its ID from the database.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * GET /api/additive/123
   * Response: { additive: { id: "123", name: "Vitamin C", hazard_level: "low", ... } }
   */
  async getAdditive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate required parameters
      if (!id) {
        res.status(400).json({ 
          success: false, 
          error: 'Additive ID is required' 
        });
        return;
      }

      // Fetch additive document from Firestore
      const db = getDb();
      const additiveDoc = await db.collection('additives').doc(id).get();

      // Check if document exists
      if (!additiveDoc.exists) {
        res.status(404).json({ 
          success: false, 
          error: 'Additive not found' 
        });
        return;
      }

      // Prepare response data
      const additive = {
        id: additiveDoc.id,
        ...additiveDoc.data()
      };

      res.json({ 
        success: true, 
        data: { additive } 
      });
    } catch (error) {
      console.error('Error fetching additive:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
      });
    }
  }
};