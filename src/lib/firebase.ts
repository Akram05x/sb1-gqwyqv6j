import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;

// Types for Firestore documents
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  preferred_language: 'sv' | 'so' | 'ar' | 'es' | 'en';
  points_balance: number;
  created_at: Date;
  last_login?: Date;
  email_verified?: boolean;
}

export interface Issue {
  id: string;
  user_id: string | null; // null for anonymous reports
  type: 'pothole' | 'streetlight' | 'graffiti' | 'garbage' | 'other';
  title: string;
  description: string;
  image_url: string | null;
  location_lat: number;
  location_lng: number;
  location_address: string | null;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved';
  created_at: Date;
  updated_at: Date;
}

export interface PointsTransaction {
  id: string;
  user_id: string;
  action_type: 'report_submitted' | 'report_resolved' | 'bonus' | 'referral';
  value: number; // positive for earning, negative for spending
  issue_id: string | null; // reference to related issue if applicable
  created_at: Date;
}

export interface Reward {
  id: string;
  title: Record<string, string>; // multilingual titles
  description: Record<string, string>; // multilingual descriptions
  cost: number; // points required
  icon_name: string; // lucide icon name
  available: boolean;
  inventory_count?: number; // optional inventory tracking
  created_at: Date;
}

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  redemption_code: string; // unique code for verification
  redeemed_at: Date;
  used: boolean; // whether the reward has been used/claimed
}

// Firestore collection names (for consistency)
export const COLLECTIONS = {
  USERS: 'users',
  ISSUES: 'issues', 
  POINTS: 'points',
  REWARDS: 'rewards',
  REDEMPTIONS: 'redemptions'
} as const;

// Issue types with display order
export const ISSUE_TYPES = [
  'pothole',
  'streetlight', 
  'graffiti',
  'garbage',
  'other'
] as const;

// Issue statuses with workflow order
export const ISSUE_STATUSES = [
  'new',
  'acknowledged',
  'in_progress', 
  'resolved'
] as const;

// Supported languages
export const SUPPORTED_LANGUAGES = [
  'sv', // Swedish (default)
  'so', // Somali
  'ar', // Arabic
  'es', // Spanish
  'en'  // English
] as const;

// Points configuration - UPDATED TO NEW SYSTEM
export const POINTS_CONFIG = {
  REPORT_SUBMITTED: 1,  // Changed from 10 to 1
  REPORT_RESOLVED: 15,
  REFERRAL_BONUS: 25,
  WEEKLY_BONUS: 5
} as const;