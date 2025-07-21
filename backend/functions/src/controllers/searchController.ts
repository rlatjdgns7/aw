/**
 * @fileoverview Controller for handling search operations in the Fudism application.
 * Provides text-based and image-based search functionality for food additives.
 */

import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { v4 as uuidv4 } from 'uuid';
import Tesseract from 'tesseract.js';

// Firestore database instance
const db = admin.firestore();

/**
 * Controller object containing methods for search operations.
 */
export const searchController = {
  /**
   * Searches for food additives based on text input.
   * Searches both additive names and aliases using partial matching.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and text in body
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * POST /api/search/text
   * Body: { text: "vitamin c, citric acid" }
   * Response: { additives: [{ id: "123", name: "Vitamin C", ... }, ...] }
   */
  async searchByText(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { text } = req.body;

      if (!text) {
        res.status(400).json({ error: 'Text is required' });
        return;
      }

      // Parse comma-separated ingredients and normalize for search
      const ingredients = text.split(',').map((ingredient: string) => ingredient.trim().toLowerCase());
      const foundAdditives: any[] = [];

      // Search for each ingredient in both names and aliases
      for (const ingredient of ingredients) {
        // Search by partial name match using range query
        const additiveQuery = await db.collection('additives')
          .where('name', '>=', ingredient)
          .where('name', '<=', ingredient + '\uf8ff')
          .get();

        // Search in aliases array for exact matches
        const aliasQuery = await db.collection('additives')
          .where('aliases', 'array-contains', ingredient)
          .get();

        const additiveResults = additiveQuery.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const aliasResults = aliasQuery.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Combine results from name and alias searches
        const combinedResults = [...additiveResults, ...aliasResults];
        // Remove duplicates by comparing IDs
        const uniqueResults = combinedResults.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );

        foundAdditives.push(...uniqueResults);
      }

      // Remove duplicates across all ingredients searched
      const uniqueAdditives = foundAdditives.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );

      res.json({ additives: uniqueAdditives });
    } catch (error) {
      console.error('Error searching by text:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Initiates OCR-based search for food additives from an uploaded image.
   * Processes the image asynchronously and returns a job ID for tracking.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and image file
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation is initiated
   * 
   * @example
   * POST /api/search/image (with multipart/form-data image file)
   * Response: { jobId: "uuid-string" }
   */
  async searchByImage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Image file is required' });
        return;
      }

      const userId = req.user!.uid;
      const jobId = uuidv4();

      // Create a scan result document to track processing status
      const scanResultRef = db.collection('scanResults').doc(jobId);
      await scanResultRef.set({
        userId,
        status: 'processing',
        result: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Return job ID immediately for client polling
      res.json({ jobId });

      // Process image asynchronously in the background
      processImageInBackground(req.file.buffer, jobId, userId);
    } catch (error) {
      console.error('Error initiating image search:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

/**
 * Processes an image in the background using OCR to extract text and search for additives.
 * Updates the scan result document with the processing status and results.
 * 
 * @param {Buffer} imageBuffer - The image data as a buffer
 * @param {string} jobId - Unique identifier for the processing job
 * @param {string} userId - ID of the user who initiated the search
 * @returns {Promise<void>} Promise that resolves when processing completes
 * 
 * @private
 */
async function processImageInBackground(imageBuffer: Buffer, jobId: string, userId: string): Promise<void> {
  try {
    // Use Tesseract.js for OCR to extract text from image
    const result = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: m => console.log(m)
    });

    const extractedText = result.data.text;
    // Parse extracted text into individual ingredients
    const ingredients = extractedText.split(/[,\n]/).map(ingredient => ingredient.trim().toLowerCase()).filter(Boolean);
    const foundAdditives: any[] = [];

    for (const ingredient of ingredients) {
      const additiveQuery = await db.collection('additives')
        .where('name', '>=', ingredient)
        .where('name', '<=', ingredient + '\uf8ff')
        .get();

      const aliasQuery = await db.collection('additives')
        .where('aliases', 'array-contains', ingredient)
        .get();

      const additiveResults = additiveQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const aliasResults = aliasQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const combinedResults = [...additiveResults, ...aliasResults];
      const uniqueResults = combinedResults.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );

      foundAdditives.push(...uniqueResults);
    }

    // Remove duplicates from final results
    const uniqueAdditives = foundAdditives.filter((item, index, self) => 
      index === self.findIndex(t => t.id === item.id)
    );

    // Update scan result with successful completion
    await db.collection('scanResults').doc(jobId).update({
      status: 'completed',
      result: {
        extractedText,
        additives: uniqueAdditives
      }
    });
  } catch (error) {
    console.error('Error processing image:', error);
    // Update scan result with failure status
    await db.collection('scanResults').doc(jobId).update({
      status: 'failed',
      result: { error: 'Failed to process image' }
    });
  }
}