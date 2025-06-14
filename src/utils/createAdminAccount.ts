import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp,
  getDoc 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

// Create admin account programmatically
export const createAdminAccount = async () => {
  try {
    console.log('🔄 Creating admin account...');
    
    const adminEmail = 'admin@fixmycity.se';
    const adminPassword = 'admin123456'; // Change this in production!
    
    let user;
    let isNewUser = false;
    
    try {
      // Try to create new user
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      user = userCredential.user;
      isNewUser = true;
      console.log('✅ New admin user created in Firebase Auth');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('ℹ️ Admin email already exists, signing in...');
        // User already exists, try to sign in
        const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        user = userCredential.user;
        console.log('✅ Signed in to existing admin account');
      } else {
        throw error;
      }
    }
    
    // Update display name if new user
    if (isNewUser) {
      await updateProfile(user, {
        displayName: 'Admin User'
      });
    }
    
    // Check if user profile exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists() || isNewUser) {
      // Create or update user profile in Firestore
      await setDoc(userRef, {
        email: adminEmail,
        name: 'Admin User',
        role: 'admin',
        preferred_language: 'sv',
        points_balance: 1000, // Give admin some points for testing
        created_at: serverTimestamp(),
        email_verified: true
      }, { merge: true });
      
      console.log('✅ Admin profile created/updated in Firestore');
    }
    
    console.log('✅ Admin account setup completed successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('👤 User ID:', user.uid);
    
    return {
      success: true,
      email: adminEmail,
      password: adminPassword,
      userId: user.uid,
      isNewUser
    };
    
  } catch (error: any) {
    console.error('❌ Error creating admin account:', error);
    throw error;
  }
};

// Helper function to check if current user is admin
export const checkAdminStatus = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.role === 'admin';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};