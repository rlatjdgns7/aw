# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foodism is a React Native mobile app for analyzing food additives with a Firebase backend. The project consists of multiple frontend implementations and a unified Firebase Functions backend with Firestore database.

## Architecture

### Multi-Frontend Structure
The project contains three separate React Native applications:
- `expo-app/` - Primary Expo-based app (simplest implementation)
- `frontend-rn/` - React Native CLI version with full Firebase integration
- `my-app/` - Secondary Expo app with router-based navigation

### Backend Structure
- `backend/functions/` - Firebase Functions with Express.js API
- Firestore collections: `additives`, `recipes`, `scanResults`
- OCR processing using Tesseract.js for image analysis
- Real-time job tracking for async image processing

## Development Commands

### Backend (Firebase Functions)
```bash
cd backend/functions
npm run build          # Compile TypeScript
npm run serve          # Start local emulator
npm run deploy         # Deploy to Firebase
npm run logs           # View function logs
firebase emulators:start --only functions  # Local development
```

### Frontend Apps

**expo-app/ (Primary)**
```bash
cd expo-app
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios           # Run on iOS
npm run web           # Run on web
npm run clean         # Clear cache
npm run lint          # ESLint
npm test              # Jest tests
```

**frontend-rn/ (CLI)**
```bash
cd frontend-rn
npm start             # Start Metro bundler
npm run android       # Run on Android
npm run ios          # Run on iOS
npm run lint         # ESLint
npm test             # Jest tests
npm run clean        # Clean build
```

**my-app/ (Secondary)**
```bash
cd my-app
npm start            # Start Expo dev server
npm run android      # Run on Android
npm run ios         # Run on iOS
npm run web         # Run on web
npm run lint        # ESLint with Expo config
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
- Update `src/services/firebase.ts` in each frontend with Firebase config
- Update `src/services/api.ts` with Functions URL: `https://REGION-PROJECTID.cloudfunctions.net/api`
- Deploy Firestore security rules from `backend/firestore.rules`

### Development Flow
1. Start backend emulator: `cd backend/functions && npm run serve`
2. Choose frontend app and run: `cd [app-directory] && npm start`
3. For production: Deploy functions first, then configure frontend URLs

### Testing Strategy
- Backend: Firebase Functions Test framework
- Frontend: Jest with React Native Testing Library
- Manual testing through Expo/Metro dev servers
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
- Services handle external integrations (`src/services/`)
- Components are organized by feature in each frontend