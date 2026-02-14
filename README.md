# Tasker - Task Management App

A robust, offline-first task management application built with React Native, Realm, and Firebase.

## 🏗️ Architecture Choice

Tasker follows a **Modular and Layered Architecture** designed for scalability, maintainability, and offline-first reliability.

- **Offline-First Strategy**: The app uses **Realm** as its primary local data store. Users can create, update, and delete tasks without an internet connection. Data is persisted locally and synchronized with **Cloud Firestore** when the device is online.
- **Modular Directory Structure**:
  - `src/api`: External API service definitions.
  - `src/components`: Reusable UI components.
  - `src/config`: Environment configuration using `react-native-config`.
  - `src/constants`: App-wide constants and theme definitions.
  - `src/hooks`: Custom React hooks for shared logic.
  - `src/models`: Data models and Realm schemas.
  - `src/navigation`: Navigation stacks and configurations.
  - `src/screens`: Top-level screen components.
  - `src/services`: Business logic and third-party service integrations (Realm, Notifications).
  - `src/store`: Global state management using Redux Toolkit.
  - `src/types`: TypeScript type definitions.
  - `src/utils`: Helper functions and formatting utilities.
- **State Management**: **Redux Toolkit** is used for global app state (e.g., UI themes, user session), while Realm handles the domain-specific data persistence.

## 📚 Libraries Used

| Library | Purpose | Explanation |
| :--- | :--- | :--- |
| **Realm** (`@realm/react`) | Local Database | Provides high-performance, reactive local storage for offline-first capabilities. |
| **Firebase App/Auth** | Authentication | Handles secure user registration and login using Firebase Authentication. |
| **Cloud Firestore** | Data Sync | Acts as the cloud backend for synchronizing task data across devices. |
| **Redux Toolkit** | State Management | Simplifies global state management and provides a predictable way to update app-wide settings. |
| **React Navigation** | App Routing | Managed complex navigation flows (Auth vs App stacks) with native performance. |
| **Notifee** | Push Notifications | Advanced local and remote notification management for task reminders. |
| **Safe Area Context** | Layout Utilities | Ensures consistent UI rendering across devices with notches and different aspect ratios. |
| **NetInfo** | Network Status | Monitors connectivity to trigger data synchronization and inform the user of offline status. |
| **Vector Icons** | UI Enrichment | Provides a wide range of custom icons for a premium look and feel. |

## 🚀 How to Run the App

### Prerequisites
- Node.js (v20 or higher)
- Android Studio / Xcode (depending on target platform)
- Java Development Kit (JDK) 17+

### Environment Configuration
Create a `.env` file in the root directory:
```env
ENV=development
API_URL=https://your-api-url.com
```

### 1. Installation
```bash
npm install
# For iOS only
cd ios && pod install && cd ..
```

### 2. Running in Development

**For Android:**
```bash
npm run android
```

**For iOS:**
```bash
npm run ios
```

### 3. Building for Production

**Android:**
```bash
npm run build:android
```

## ⚠️ Known Limitations

- **Sync Conflict Resolution**: Currently follows a "last-write-wins" approach. Complex merging of concurrent edits on the same task from multiple devices is not yet implemented.
- **Push Notification Config**: Requires manual setup of `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from the Firebase Console to work correctly.
- **Offline Sync Latency**: Large batches of offline changes may take a few seconds to synchronize once the connection is restored, depending on network speed.
- **Platform Support**: Optimized for the latest versions of Android and iOS; legacy OS versions may experience UI inconsistencies.
