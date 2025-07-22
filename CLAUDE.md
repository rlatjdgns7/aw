# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foodism is a React Native mobile app for analyzing food additives with a Firebase backend. The project features a single Expo-based frontend and a Firebase Functions backend with Firestore database.

## Architecture

### Frontend Structure
- `frontend/hudi/` - Single Expo-based React Native app with TypeScript
- Uses Expo Router (v5) for file-based navigation
- React 19 with React Native 0.79.5
- Themed components with dark/light mode support

### Backend Structure
- `backend/functions/` - Firebase Functions with Express.js API (Node.js 18)
- Firestore collections: `additives`, `recipes`, `scanResults`
- OCR processing using Tesseract.js for image analysis
- Real-time job tracking for async image processing

## Development Commands

### Backend (Firebase Functions)
```bash
cd backend/functions
npm run build          # Compile TypeScript
npm run serve          # Start local emulator (includes build)
npm run deploy         # Deploy to Firebase
npm run logs           # View function logs
```

### Frontend App
```bash
cd frontend/hudi
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run web            # Run on web
npm run lint           # ESLint with Expo config
npm run reset-project  # Reset project state
```

## Key Technical Details

### Authentication Flow
- Firebase Authentication with Google/Apple social login
- ID token verification in Express middleware at `backend/functions/src/middleware/authMiddleware.ts`
- Protected routes require valid Firebase ID token

### Image Processing Pipeline
1. Client uploads image to `/api/search/image`
2. Server creates job document in `scanResults` collection
3. Client polls job status via Firestore listeners
4. OCR processing runs asynchronously using Tesseract.js
5. Results update in Firestore, triggering client-side navigation

### API Endpoints
- `GET /api/home` - Random recipe and additive for home screen
- `POST /api/search/text` - Text-based additive search
- `POST /api/search/image` - Async image processing with job ID
- `GET /api/additive/:id` - Detailed additive information

### Database Schema
**additives**: `{name, hazard_level, description_short, description_full, aliases[]}`
**recipes**: `{title, youtube_url}`
**scanResults**: `{userId, status, result: {extractedText, additives[]}, createdAt}`

## Configuration Requirements

### Firebase Setup
- Update Firebase configuration in frontend services
- Configure Functions URL: `https://REGION-PROJECTID.cloudfunctions.net/api`
- Deploy Firestore security rules from `backend/firestore.rules`

### Development Flow
1. Start backend emulator: `cd backend/functions && npm run serve`
2. Start frontend app: `cd frontend/hudi && npm start`
3. For production: Deploy functions first, then configure frontend URLs

### Testing Strategy
- Backend: Firebase Functions Test framework (firebase-functions-test)
- Frontend: No testing framework currently configured
- Manual testing through Expo dev server
- Use Firebase emulator suite for local development

## Common Patterns

### Error Handling
- All API responses follow `{success: boolean, data?: any, error?: string}` pattern
- Firebase errors are caught and wrapped in Express error handlers
- Client-side errors display user-friendly messages

### State Management
- No external state library - uses React hooks and Context
- Firestore real-time listeners for live updates
- Local state for UI components, Firestore for persistent data

### Code Organization
- Controllers handle business logic (`backend/functions/src/controllers/`)
- Routes define API endpoints (`backend/functions/src/routes/`)
- Services handle external integrations  
- Frontend components use Expo Router file-based navigation in `frontend/hudi/app/`
- Themed components in `frontend/hudi/components/` with hooks in `frontend/hudi/hooks/`