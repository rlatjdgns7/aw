# Foodism - Food Additive Analysis App

An advanced MVP React Native application with Firebase backend for analyzing food additives and providing health risk assessments.

## 🚀 Features

- **Social Login**: Google and Apple authentication for seamless access
- **Text Search**: Search for additives by typing ingredient names
- **Image Analysis**: OCR-powered ingredient label scanning with async processing
- **Risk Assessment**: Color-coded health risk levels (low, medium, high)
- **Detailed Information**: Comprehensive additive details with safety recommendations
- **Real-time Updates**: Live progress tracking for image processing jobs
- **Web Admin Panel**: Browser-based content management system for easy data updates

## 🏗️ Architecture

### Backend (Firebase Functions)
- **Express.js API** with organized routes, controllers, and middleware
- **Firestore Database** with optimized collections and indexing
- **Authentication Middleware** for secure API access
- **Async OCR Processing** using Tesseract.js
- **Real-time Job Tracking** via Firestore listeners

### Frontend (React Native + Expo)
- **React Navigation** with Auth and Main stacks
- **Real-time UI Updates** using Firestore listeners
- **Image Processing Flow** with dedicated ProcessingScreen
- **Responsive Design** with color-coded risk indicators

## 📱 Screens

1. **Authentication Stack**
   - LoginScreen: Social login with Google and Apple

2. **Main Stack**
   - HomeScreen: Featured content and search options
   - SearchResultScreen: Risk-assessed results list
   - DetailScreen: Comprehensive additive information
   - ProcessingScreen: Async image analysis progress

## 🗄️ Database Schema

### Collections

**additives**
```javascript
{
  name: string,
  hazard_level: 'low' | 'medium' | 'high',
  description_short: string,
  description_full: string,
  aliases: string[]
}
```

**recipes**
```javascript
{
  title: string,
  youtube_url: string
}
```

**scanResults**
```javascript
{
  userId: string,
  status: 'processing' | 'completed' | 'failed',
  result: {
    extractedText: string,
    additives: Additive[]
  },
  createdAt: timestamp
}
```

## 🔧 Setup Instructions

### Backend Setup

1. **Initialize Firebase Project**
   ```bash
   cd backend
   npm install -g firebase-tools
   firebase login
   firebase init
   ```

2. **Install Dependencies**
   ```bash
   cd functions
   npm install
   ```

3. **Deploy Functions**
   ```bash
   npm run deploy
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure Firebase**
   - Update `src/services/firebase.ts` with your Firebase config
   - Update `src/services/api.ts` with your Functions URL

3. **Start Development Server**
   ```bash
   npm start
   ```

### Web Admin Panel Setup

1. **Navigate to Web Admin Directory**
   ```bash
   cd web-admin
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Web Server**
   ```bash
   npm start
   # or use the convenient script
   ./start-admin.sh
   ```

4. **Access Admin Panel**
   - Main URL: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin
   - Health Check: http://localhost:3000/health

**Features:**
- ✅ Additive management (add, edit, delete)
- ✅ Recipe management (add, edit, delete)
- ✅ Responsive web design
- ✅ Real-time data updates
- ✅ Intuitive user interface

## 🔒 Security Features

- **Firebase Authentication** with ID token verification
- **Firestore Security Rules** for user data protection
- **API Authentication Middleware** for all protected endpoints
- **Input Validation** and error handling

## 🎨 UI/UX Features

- **Color-coded Risk Levels**: Visual indicators for additive safety
- **Async Processing Feedback**: Real-time progress updates
- **Responsive Design**: Optimized for mobile devices
- **Intuitive Navigation**: Clear user flow and interactions

## 📋 API Endpoints

### Public Endpoints
- `GET /api/home` - Fetch random recipe and additive
- `POST /api/search/text` - Search additives by text input
- `POST /api/search/image` - Async image processing with job tracking
- `GET /api/additive/:id` - Fetch detailed additive information

### Admin Endpoints
- `GET /api/admin/additives` - Get all additives
- `POST /api/admin/additives` - Create new additive
- `PUT /api/admin/additives/:id` - Update additive
- `DELETE /api/admin/additives/:id` - Delete additive
- `GET /api/admin/recipes` - Get all recipes
- `POST /api/admin/recipes` - Create new recipe
- `PUT /api/admin/recipes/:id` - Update recipe
- `DELETE /api/admin/recipes/:id` - Delete recipe

## 🔄 Async Image Processing Flow

1. User uploads image
2. Server creates processing job in Firestore
3. Client navigates to ProcessingScreen
4. Real-time listener monitors job status
5. OCR processing runs in background
6. Results update in Firestore
7. Client automatically navigates to results

## 🚦 Getting Started

1. Set up Firebase project with Authentication and Firestore
2. Deploy backend functions
3. Configure frontend with Firebase credentials
4. Populate database with sample additives and recipes
5. Test authentication and search functionality

## 📝 Notes

- Replace Firebase configuration placeholders with actual project credentials
- Add sample data to Firestore collections for testing
- Configure proper security rules for production deployment
- Consider adding rate limiting for production API usage