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
admin.initializeApp();

// Create Express application instance
const app = express();

// Configure middleware
app.use(cors({ origin: true })); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Mount API routes
app.use('/api', apiRoutes);

/**
 * Firebase Cloud Function that serves the Express application.
 * This function handles all HTTP requests to the API endpoints.
 * 
 * @type {functions.HttpsFunction}
 */
export const api = functions.https.onRequest(app);