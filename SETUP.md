# Foodism Setup Guide

## Prerequisites
- Node.js 18+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Expo CLI installed (`npm install -g @expo/cli`)
- Firebase project created

## Step-by-Step Setup

### 1. Firebase Project Setup

1. Create a new Firebase project at https://console.firebase.google.com/
2. Enable Authentication with Email/Password
3. Create Firestore database in production mode
4. Note your project configuration details

### 2. Backend Setup

```bash
cd backend
firebase login
firebase init

# Select:
# - Functions (JavaScript/TypeScript)
# - Firestore
# - Use existing project (select your project)
# - TypeScript for Functions
# - Install dependencies: Yes

cd functions
npm install
npm run build
firebase deploy --only functions
```

### 3. Database Setup

Add sample data to your Firestore collections:

**additives collection:**
```javascript
// Document ID: additive1
{
  name: "Sodium Benzoate",
  hazard_level: "medium",
  description_short: "Common preservative used to prevent bacterial growth",
  description_full: "Sodium benzoate is widely used as a food preservative. While generally recognized as safe, some studies suggest potential links to hyperactivity in children when combined with certain food dyes.",
  aliases: ["E211", "benzoate of soda"]
}

// Document ID: additive2
{
  name: "Aspartame",
  hazard_level: "high",
  description_short: "Artificial sweetener found in diet products",
  description_full: "Aspartame is an artificial sweetener used in many diet foods and beverages. Some studies have raised concerns about potential health effects with long-term consumption.",
  aliases: ["E951", "NutraSweet", "Equal"]
}
```

**recipes collection:**
```javascript
// Document ID: recipe1
{
  title: "Healthy Homemade Energy Bars",
  youtube_url: "https://youtube.com/watch?v=example1"
}

// Document ID: recipe2
{
  title: "Natural Fruit Smoothie Bowl",
  youtube_url: "https://youtube.com/watch?v=example2"
}
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Update Firebase configuration
# Edit src/services/firebase.ts with your Firebase config

# Update API URL
# Edit src/services/api.ts with your Functions URL
# Format: https://REGION-PROJECTID.cloudfunctions.net/api

# Start development server
npm start
```

### 5. Firebase Configuration

Update `frontend/src/services/firebase.ts`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

Update `frontend/src/services/api.ts`:

```javascript
const API_BASE_URL = 'https://us-central1-your-project-id.cloudfunctions.net/api';
```

### 6. Security Rules

Update Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /additives/{document} {
      allow read: if true;
    }
    
    match /recipes/{document} {
      allow read: if true;
    }
    
    match /scanResults/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

### 7. Testing

1. Create a test account through the app
2. Test text search with sample ingredients
3. Test image upload functionality
4. Verify real-time processing updates
5. Check additive detail views

## Troubleshooting

### Common Issues

**Functions deployment fails:**
- Ensure you're in the correct directory (`backend/functions`)
- Check Node.js version (18+ required)
- Verify Firebase CLI is logged in

**Frontend can't connect to API:**
- Check API_BASE_URL in `api.ts`
- Ensure Functions are deployed
- Verify CORS configuration

**Authentication errors:**
- Verify Firebase config in `firebase.ts`
- Check Authentication is enabled in Firebase console
- Ensure proper error handling

**Image processing fails:**
- OCR requires good image quality
- Large images may timeout
- Check Functions logs in Firebase console

## Production Considerations

1. **Rate Limiting**: Add rate limiting to API endpoints
2. **Image Storage**: Consider using Firebase Storage for uploaded images
3. **Caching**: Implement caching for frequently accessed additives
4. **Monitoring**: Set up Firebase Analytics and Crashlytics
5. **Performance**: Optimize Firestore queries and indexes

## Support

For issues:
1. Check Firebase console logs
2. Verify configuration files
3. Test with sample data
4. Review network requests in development tools