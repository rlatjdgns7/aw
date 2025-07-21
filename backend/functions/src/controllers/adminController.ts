/**
 * @fileoverview Admin controller for managing food additives.
 * Provides CRUD operations and bulk import functionality for administrators.
 */

import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

// Firestore database instance
const db = admin.firestore();

/**
 * Controller object containing administrative methods for additive management.
 */
export const adminController = {
  /**
   * Adds a new food additive to the database.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * POST /api/admin/additive
   * Body: { name: "Vitamin C", hazard_level: "low", description_short: "...", description_full: "...", aliases: ["ascorbic acid"] }
   */
  async addAdditive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { name, hazard_level, description_short, description_full, aliases } = req.body;

      if (!name || !hazard_level || !description_short || !description_full) {
        res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
        return;
      }

      if (!['low', 'medium', 'high'].includes(hazard_level)) {
        res.status(400).json({ error: '잘못된 위험도 레벨입니다.' });
        return;
      }

      const additiveData = {
        name,
        hazard_level,
        description_short,
        description_full,
        aliases: aliases || [],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('additives').add(additiveData);
      
      res.json({ 
        success: true, 
        id: docRef.id,
        message: '첨가물이 성공적으로 추가되었습니다.'
      });
    } catch (error) {
      console.error('첨가물 추가 오류:', error);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  },

  /**
   * Updates an existing food additive in the database.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and additive ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * PUT /api/admin/additive/123
   * Body: { name: "Updated Vitamin C", hazard_level: "medium" }
   */
  async updateAdditive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      delete updateData.id;
      updateData.updated_at = admin.firestore.FieldValue.serverTimestamp();

      await db.collection('additives').doc(id).update(updateData);
      
      res.json({ 
        success: true,
        message: '첨가물이 성공적으로 수정되었습니다.'
      });
    } catch (error) {
      console.error('첨가물 수정 오류:', error);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  },

  /**
   * Deletes a food additive from the database.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and additive ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * DELETE /api/admin/additive/123
   */
  async deleteAdditive(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      await db.collection('additives').doc(id).delete();
      
      res.json({ 
        success: true,
        message: '첨가물이 성공적으로 삭제되었습니다.'
      });
    } catch (error) {
      console.error('첨가물 삭제 오류:', error);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  },

  /**
   * Retrieves all food additives from the database for administrative purposes.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * GET /api/admin/additives
   * Response: { additives: [{ id: "123", name: "Vitamin C", ... }, ...] }
   */
  async getAllAdditives(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const snapshot = await db.collection('additives').orderBy('name').get();
      
      const additives = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json({ additives });
    } catch (error) {
      console.error('첨가물 목록 조회 오류:', error);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  },

  /**
   * Imports multiple food additives in bulk from an array.
   * Useful for importing data from CSV, JSON, or other sources.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and additives array in body
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   * 
   * @example
   * POST /api/admin/bulk-import
   * Body: { additives: [{ name: "Additive 1", hazard_level: "low", ... }, ...] }
   */
  async bulkImport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { additives } = req.body;
      
      if (!Array.isArray(additives)) {
        res.status(400).json({ error: '첨가물 배열이 필요합니다.' });
        return;
      }

      const batch = db.batch();
      let count = 0;

      for (const additive of additives) {
        if (!additive.name || !additive.hazard_level) {
          continue;
        }

        const docRef = db.collection('additives').doc();
        batch.set(docRef, {
          ...additive,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        count++;
      }

      await batch.commit();
      
      res.json({ 
        success: true,
        imported: count,
        message: `${count}개의 첨가물이 성공적으로 가져왔습니다.`
      });
    } catch (error) {
      console.error('벌크 가져오기 오류:', error);
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
};