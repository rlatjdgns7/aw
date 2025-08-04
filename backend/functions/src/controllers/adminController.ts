/**
 * @fileoverview Admin controller for managing food additives.
 * Provides CRUD operations and bulk import functionality for administrators.
 */

import { Response } from 'express';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Firestore database instance - initialized when needed
const getDb = () => admin.firestore();
const getStorage = () => admin.storage().bucket();

// Helper function to upload image to Firebase Storage
async function uploadImageToStorage(file: Express.Multer.File, folder: string): Promise<string> {
  if (!file) {
    throw new Error('No file provided');
  }

  const bucket = getStorage();
  const fileName = `${folder}/${uuidv4()}_${file.originalname}`;
  const fileUpload = bucket.file(fileName);

  const stream = fileUpload.createWriteStream({
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    stream.on('error', (error) => {
      console.error('Upload error:', error);
      reject(error);
    });

    stream.on('finish', async () => {
      try {
        // Make the file publicly accessible
        await fileUpload.makePublic();
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        resolve(publicUrl);
      } catch (error) {
        console.error('Error making file public:', error);
        reject(error);
      }
    });

    stream.end(file.buffer);
  });
}

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
  async addAdditive(req: any, res: Response): Promise<void> {
    try {
      const { name, hazard_level, description_short, description_full, aliases } = req.body;

      if (!name || !hazard_level || !description_short || !description_full) {
        res.status(400).json({ 
          success: false, 
          error: '필수 필드가 누락되었습니다.' 
        });
        return;
      }

      if (!['low', 'medium', 'high'].includes(hazard_level)) {
        res.status(400).json({ 
          success: false, 
          error: '잘못된 위험도 레벨입니다.' 
        });
        return;
      }

      let imageUrl = '';
      
      // Handle image upload if present
      if (req.file) {
        try {
          console.log('🖼️ 이미지 업로드 시작:', req.file.originalname);
          imageUrl = await uploadImageToStorage(req.file, 'additives');
          console.log('✅ 이미지 업로드 완료:', imageUrl);
        } catch (uploadError) {
          console.error('❌ 이미지 업로드 실패:', uploadError);
          // Continue without image if upload fails
        }
      }

      const additiveData = {
        name,
        hazard_level,
        description_short,
        description_full,
        aliases: aliases || [],
        image_url: imageUrl,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const db = getDb();
      const docRef = await db.collection('additives').add(additiveData);
      
      res.json({ 
        success: true, 
        data: {
          id: docRef.id,
          message: '첨가물이 성공적으로 추가되었습니다.',
          image_url: imageUrl
        }
      });
    } catch (error) {
      console.error('첨가물 추가 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      });
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
  async updateAdditive(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      delete updateData.id;
      
      // Handle image upload if present
      if (req.file) {
        try {
          console.log('🖼️ 첨가물 이미지 업데이트 시작:', req.file.originalname);
          const imageUrl = await uploadImageToStorage(req.file, 'additives');
          updateData.image_url = imageUrl;
          console.log('✅ 첨가물 이미지 업데이트 완료:', imageUrl);
        } catch (uploadError) {
          console.error('❌ 첨가물 이미지 업로드 실패:', uploadError);
          // Continue without updating image if upload fails
        }
      }
      
      updateData.updated_at = admin.firestore.FieldValue.serverTimestamp();

      const db = getDb();
      await db.collection('additives').doc(id).update(updateData);
      
      res.json({ 
        success: true,
        data: {
          message: '첨가물이 성공적으로 수정되었습니다.',
          image_url: updateData.image_url || null
        }
      });
    } catch (error) {
      console.error('첨가물 수정 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      });
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
  async deleteAdditive(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const db = getDb();
      await db.collection('additives').doc(id).delete();
      
      res.json({ 
        success: true,
        data: {
          message: '첨가물이 성공적으로 삭제되었습니다.'
        }
      });
    } catch (error) {
      console.error('첨가물 삭제 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      });
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
  async getAllAdditives(req: any, res: Response): Promise<void> {
    try {
      console.log('🔍 첨가물 목록 조회 요청 받음');
      const db = getDb();
      
      // Check if collection exists and has documents
      const snapshot = await db.collection('additives').orderBy('name').get();
      console.log(`📊 첨가물 컬렉션에서 ${snapshot.size}개 문서 발견`);
      
      if (snapshot.empty) {
        console.log('⚠️ 첨가물 컬렉션이 비어있음');
        res.json({ 
          success: true,
          data: []
        });
        return;
      }
      
      const additives = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ ${additives.length}개의 첨가물 데이터 반환`);
      res.json({ 
        success: true,
        data: additives
      });
    } catch (error: any) {
      console.error('❌ 첨가물 목록 조회 오류:', error);
      console.error('오류 상세:', error.message);
      res.status(500).json({ 
        success: false, 
        error: `서버 오류가 발생했습니다: ${error.message}` 
      });
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
  async bulkImport(req: any, res: Response): Promise<void> {
    try {
      const { additives } = req.body;
      
      if (!Array.isArray(additives)) {
        res.status(400).json({ 
          success: false, 
          error: '첨가물 배열이 필요합니다.' 
        });
        return;
      }

      const db = getDb();
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
        data: {
          imported: count,
          message: `${count}개의 첨가물이 성공적으로 가져왔습니다.`
        }
      });
    } catch (error) {
      console.error('벌크 가져오기 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      });
    }
  },

  // Recipe Management Methods

  /**
   * Adds a new recipe to the database.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   */
  async addRecipe(req: any, res: Response): Promise<void> {
    try {
      const { title, youtube_url } = req.body;

      if (!title || !youtube_url) {
        res.status(400).json({ 
          success: false, 
          error: '제목과 유튜브 URL이 필요합니다.' 
        });
        return;
      }

      let imageUrl = '';
      
      // Handle image upload if present
      if (req.file) {
        try {
          console.log('🖼️ 레시피 이미지 업로드 시작:', req.file.originalname);
          imageUrl = await uploadImageToStorage(req.file, 'recipes');
          console.log('✅ 레시피 이미지 업로드 완료:', imageUrl);
        } catch (uploadError) {
          console.error('❌ 레시피 이미지 업로드 실패:', uploadError);
          // Continue without image if upload fails
        }
      }

      const recipeData = {
        title,
        youtube_url,
        image_url: imageUrl,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };

      const db = getDb();
      const docRef = await db.collection('recipes').add(recipeData);
      
      res.json({ 
        success: true, 
        data: {
          id: docRef.id,
          message: '레시피가 성공적으로 추가되었습니다.',
          image_url: imageUrl
        }
      });
    } catch (error) {
      console.error('레시피 추가 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * Updates an existing recipe in the database.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and recipe ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   */
  async updateRecipe(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };
      
      delete updateData.id;
      
      // Handle image upload if present
      if (req.file) {
        try {
          console.log('🖼️ 레시피 이미지 업데이트 시작:', req.file.originalname);
          const imageUrl = await uploadImageToStorage(req.file, 'recipes');
          updateData.image_url = imageUrl;
          console.log('✅ 레시피 이미지 업데이트 완료:', imageUrl);
        } catch (uploadError) {
          console.error('❌ 레시피 이미지 업로드 실패:', uploadError);
          // Continue without updating image if upload fails
        }
      }
      
      updateData.updated_at = admin.firestore.FieldValue.serverTimestamp();

      const db = getDb();
      await db.collection('recipes').doc(id).update(updateData);
      
      res.json({ 
        success: true,
        data: {
          message: '레시피가 성공적으로 수정되었습니다.',
          image_url: updateData.image_url || null
        }
      });
    } catch (error) {
      console.error('레시피 수정 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * Deletes a recipe from the database.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication and recipe ID in params
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   */
  async deleteRecipe(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const db = getDb();
      await db.collection('recipes').doc(id).delete();
      
      res.json({ 
        success: true,
        data: {
          message: '레시피가 성공적으로 삭제되었습니다.'
        }
      });
    } catch (error) {
      console.error('레시피 삭제 오류:', error);
      res.status(500).json({ 
        success: false, 
        error: '서버 오류가 발생했습니다.' 
      });
    }
  },

  /**
   * Retrieves all recipes from the database for administrative purposes.
   * 
   * @param {AuthenticatedRequest} req - Express request object with authentication
   * @param {Response} res - Express response object
   * @returns {Promise<void>} Promise that resolves when the operation completes
   */
  async getAllRecipes(req: any, res: Response): Promise<void> {
    try {
      console.log('🔍 레시피 목록 조회 요청 받음');
      const db = getDb();
      
      const snapshot = await db.collection('recipes').orderBy('title').get();
      console.log(`📊 레시피 컬렉션에서 ${snapshot.size}개 문서 발견`);
      
      if (snapshot.empty) {
        console.log('⚠️ 레시피 컬렉션이 비어있음');
        res.json({ 
          success: true,
          data: []
        });
        return;
      }
      
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ ${recipes.length}개의 레시피 데이터 반환`);
      res.json({ 
        success: true,
        data: recipes
      });
    } catch (error: any) {
      console.error('❌ 레시피 목록 조회 오류:', error);
      console.error('오류 상세:', error.message);
      res.status(500).json({ 
        success: false, 
        error: `서버 오류가 발생했습니다: ${error.message}` 
      });
    }
  }
};