import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User as FirebaseUser, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, User } from '../lib/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        console.log('✅ User authenticated:', firebaseUser.email);
        await createOrUpdateUserProfile(firebaseUser);
        setupUserProfileListener(firebaseUser.uid);
      } else {
        console.log('ℹ️ User signed out');
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const createOrUpdateUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log('📝 Creating new user profile for:', firebaseUser.email);
        // Create new user profile
        const newUser: Omit<User, 'id'> = {
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
          role: 'user',
          preferred_language: 'sv',
          points_balance: 0,
          created_at: new Date(),
          email_verified: firebaseUser.emailVerified
        };

        await setDoc(userRef, {
          ...newUser,
          created_at: serverTimestamp()
        });
        console.log('✅ User profile created successfully');
      } else {
        // Update email verification status if it changed
        const userData = userSnap.data();
        if (userData.email_verified !== firebaseUser.emailVerified) {
          await setDoc(userRef, {
            email_verified: firebaseUser.emailVerified,
            last_login: serverTimestamp()
          }, { merge: true });
          console.log('✅ User profile updated');
        }
      }
    } catch (error) {
      console.error('❌ Error creating/updating user profile:', error);
    }
  };

  const setupUserProfileListener = (userId: string) => {
    const userRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const updatedProfile = {
          id: doc.id,
          email: data.email,
          name: data.name || '',
          role: data.role,
          preferred_language: data.preferred_language,
          points_balance: data.points_balance,
          created_at: data.created_at?.toDate() || new Date(),
          email_verified: data.email_verified
        };
        
        console.log('🔄 User profile updated:', {
          email: updatedProfile.email,
          points_balance: updatedProfile.points_balance
        });
        
        setUserProfile(updatedProfile);
      }
    }, (error) => {
      console.error('❌ Error listening to user profile:', error);
    });

    return unsubscribe;
  };

  const refreshUserProfile = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Manually refreshing user profile...');
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        const refreshedProfile = {
          id: userDoc.id,
          email: data.email,
          name: data.name || '',
          role: data.role,
          preferred_language: data.preferred_language,
          points_balance: data.points_balance,
          created_at: data.created_at?.toDate() || new Date(),
          email_verified: data.email_verified
        };
        
        console.log('✅ Profile refreshed:', {
          email: refreshedProfile.email,
          points_balance: refreshedProfile.points_balance
        });
        
        setUserProfile(refreshedProfile);
      }
    } catch (error) {
      console.error('❌ Error refreshing user profile:', error);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('🔄 Attempting email sign-in for:', email);
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Email sign-in successful:', result.user.email);
    } catch (error: any) {
      console.error('❌ Error signing in with email:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    try {
      console.log('🔄 Attempting email sign-up for:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update the user's display name
      await updateProfile(userCredential.user, {
        displayName: name
      });

      console.log('✅ Email sign-up successful:', userCredential.user.email);
      // The user profile will be created automatically by the onAuthStateChanged listener
    } catch (error: any) {
      console.error('❌ Error signing up with email:', error);
      throw new Error(getAuthErrorMessage(error.code));
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 Signing out...');
      await firebaseSignOut(auth);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      throw error;
    }
  };

  const getAuthErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
        return 'Firebase configuration error. Please check your API key settings.';
      default:
        console.error('Unhandled auth error code:', errorCode);
        return 'An authentication error occurred. Please try again.';
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      loading,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}