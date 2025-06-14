import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc,
  increment,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { deductPointsForRedemption } from './pointsSystem';

// Generate unique redemption code
export const generateRedemptionCode = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `FMC-${timestamp}-${randomStr}`;
};

// Redeem a reward
export const redeemReward = async (userId: string, rewardId: string) => {
  try {
    // Get reward details
    const rewardRef = doc(db, 'rewards', rewardId);
    const rewardDoc = await getDoc(rewardRef);
    
    if (!rewardDoc.exists()) {
      throw new Error('Reward not found');
    }

    const rewardData = rewardDoc.data();
    
    if (!rewardData.available) {
      throw new Error('Reward is not available');
    }

    // Check inventory if applicable
    if (rewardData.inventory_count !== undefined && rewardData.inventory_count <= 0) {
      throw new Error('Reward is out of stock');
    }

    // Deduct points from user
    await deductPointsForRedemption(userId, rewardData.cost, rewardId);

    // Generate redemption code
    const redemptionCode = generateRedemptionCode();

    // Create redemption record
    const redemptionRef = await addDoc(collection(db, 'redemptions'), {
      user_id: userId,
      reward_id: rewardId,
      redemption_code: redemptionCode,
      redeemed_at: serverTimestamp(),
      used: false
    });

    // Update inventory if applicable
    if (rewardData.inventory_count !== undefined) {
      await updateDoc(rewardRef, {
        inventory_count: increment(-1)
      });
    }

    console.log(`✅ Reward ${rewardId} redeemed by user ${userId} with code ${redemptionCode}`);
    
    return {
      redemptionId: redemptionRef.id,
      redemptionCode,
      success: true
    };
  } catch (error) {
    console.error('❌ Error redeeming reward:', error);
    throw error;
  }
};

// Mark redemption as used
export const markRedemptionAsUsed = async (redemptionId: string) => {
  try {
    const redemptionRef = doc(db, 'redemptions', redemptionId);
    await updateDoc(redemptionRef, {
      used: true
    });

    console.log(`✅ Redemption ${redemptionId} marked as used`);
    return true;
  } catch (error) {
    console.error('❌ Error marking redemption as used:', error);
    return false;
  }
};

// Get user's redemptions
export const getUserRedemptions = async (userId: string) => {
  try {
    const redemptionsRef = collection(db, 'redemptions');
    const q = query(redemptionsRef, where('user_id', '==', userId));
    
    const snapshot = await getDocs(q);
    const redemptions = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      
      // Get associated reward data
      const rewardDoc = await getDoc(doc(db, 'rewards', data.reward_id));
      const rewardData = rewardDoc.exists() ? rewardDoc.data() : null;
      
      redemptions.push({
        id: docSnap.id,
        ...data,
        redeemed_at: data.redeemed_at?.toDate() || new Date(),
        reward: rewardData ? {
          id: rewardDoc.id,
          ...rewardData,
          created_at: rewardData.created_at?.toDate() || new Date()
        } : null
      });
    }

    // Sort by redemption date (most recent first)
    redemptions.sort((a, b) => b.redeemed_at.getTime() - a.redeemed_at.getTime());
    
    return redemptions;
  } catch (error) {
    console.error('❌ Error fetching user redemptions:', error);
    return [];
  }
};

// Validate redemption code
export const validateRedemptionCode = async (redemptionCode: string) => {
  try {
    const redemptionsRef = collection(db, 'redemptions');
    const q = query(redemptionsRef, where('redemption_code', '==', redemptionCode));
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { valid: false, message: 'Invalid redemption code' };
    }

    const redemptionDoc = snapshot.docs[0];
    const redemptionData = redemptionDoc.data();
    
    if (redemptionData.used) {
      return { valid: false, message: 'Redemption code already used' };
    }

    // Get reward details
    const rewardDoc = await getDoc(doc(db, 'rewards', redemptionData.reward_id));
    const rewardData = rewardDoc.exists() ? rewardDoc.data() : null;

    return {
      valid: true,
      redemption: {
        id: redemptionDoc.id,
        ...redemptionData,
        redeemed_at: redemptionData.redeemed_at?.toDate() || new Date()
      },
      reward: rewardData ? {
        id: rewardDoc.id,
        ...rewardData
      } : null
    };
  } catch (error) {
    console.error('❌ Error validating redemption code:', error);
    return { valid: false, message: 'Error validating code' };
  }
};

// Get available rewards
export const getAvailableRewards = async () => {
  try {
    const rewardsRef = collection(db, 'rewards');
    const q = query(rewardsRef, where('available', '==', true));
    
    const snapshot = await getDocs(q);
    const rewards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created_at: doc.data().created_at?.toDate() || new Date()
    }));

    // Filter out rewards that are out of stock
    const availableRewards = rewards.filter(reward => {
      if (reward.inventory_count === undefined) return true;
      return reward.inventory_count > 0;
    });

    return availableRewards;
  } catch (error) {
    console.error('❌ Error fetching available rewards:', error);
    return [];
  }
};