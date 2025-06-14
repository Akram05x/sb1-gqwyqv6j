import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment,
  getDoc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Points values for different actions - UPDATED TO NEW SYSTEM
export const POINTS_VALUES = {
  REPORT_SUBMITTED: 1,  // Changed from 10 to 1
  REPORT_RESOLVED: 15,
  REFERRAL_BONUS: 25,
  WEEKLY_BONUS: 5,
  DAILY_LOGIN: 2
} as const;

// Award points for submitting a report
export const awardReportPoints = async (userId: string, issueId: string, isValidSubmission: boolean = true) => {
  try {
    if (!isValidSubmission) {
      console.log(`⚠️ No points awarded for invalid submission: ${issueId}`);
      return false;
    }

    // Add points transaction
    await addDoc(collection(db, 'points'), {
      user_id: userId,
      action_type: 'report_submitted',
      value: POINTS_VALUES.REPORT_SUBMITTED,
      issue_id: issueId,
      created_at: serverTimestamp()
    });

    // Update user's points balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points_balance: increment(POINTS_VALUES.REPORT_SUBMITTED)
    });

    console.log(`✅ Awarded ${POINTS_VALUES.REPORT_SUBMITTED} points to user ${userId} for report ${issueId}`);
    return true;
  } catch (error) {
    console.error('❌ Error awarding report points:', error);
    return false;
  }
};

// Award bonus points when an issue is resolved
export const awardResolutionBonus = async (userId: string, issueId: string) => {
  try {
    // Check if bonus already awarded for this issue
    const pointsRef = collection(db, 'points');
    const existingBonus = query(
      pointsRef,
      where('user_id', '==', userId),
      where('issue_id', '==', issueId),
      where('action_type', '==', 'report_resolved')
    );
    
    const existingSnapshot = await getDocs(existingBonus);
    if (!existingSnapshot.empty) {
      console.log(`⚠️ Resolution bonus already awarded for issue ${issueId}`);
      return false;
    }

    // Add points transaction
    await addDoc(collection(db, 'points'), {
      user_id: userId,
      action_type: 'report_resolved',
      value: POINTS_VALUES.REPORT_RESOLVED,
      issue_id: issueId,
      created_at: serverTimestamp()
    });

    // Update user's points balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points_balance: increment(POINTS_VALUES.REPORT_RESOLVED)
    });

    console.log(`✅ Awarded ${POINTS_VALUES.REPORT_RESOLVED} bonus points to user ${userId} for resolved issue ${issueId}`);
    return true;
  } catch (error) {
    console.error('❌ Error awarding resolution bonus:', error);
    return false;
  }
};

// Deduct points for reward redemption
export const deductPointsForRedemption = async (userId: string, cost: number, rewardId: string) => {
  try {
    // Check if user has enough points
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData.points_balance < cost) {
      throw new Error('Insufficient points');
    }

    // Add negative points transaction
    await addDoc(collection(db, 'points'), {
      user_id: userId,
      action_type: 'reward_redemption',
      value: -cost,
      issue_id: null,
      reward_id: rewardId,
      created_at: serverTimestamp()
    });

    // Update user's points balance
    await updateDoc(userRef, {
      points_balance: increment(-cost)
    });

    console.log(`✅ Deducted ${cost} points from user ${userId} for reward ${rewardId}`);
    return true;
  } catch (error) {
    console.error('❌ Error deducting points for redemption:', error);
    throw error;
  }
};

// Get user's points history with detailed information
export const getUserPointsHistory = async (userId: string, limit: number = 20) => {
  try {
    const pointsRef = collection(db, 'points');
    const q = query(
      pointsRef,
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const pointsHistory = [];
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const pointsItem: any = {
        id: docSnap.id,
        ...data,
        created_at: data.created_at?.toDate() || new Date()
      };

      // If there's an issue_id, fetch the issue title
      if (data.issue_id) {
        try {
          const issueDoc = await getDoc(doc(db, 'issues', data.issue_id));
          if (issueDoc.exists()) {
            pointsItem.issue_title = issueDoc.data()?.title;
          }
        } catch (error) {
          console.error('Error fetching issue:', error);
        }
      }

      // If there's a reward_id, fetch the reward title
      if (data.reward_id) {
        try {
          const rewardDoc = await getDoc(doc(db, 'rewards', data.reward_id));
          if (rewardDoc.exists()) {
            pointsItem.reward_title = rewardDoc.data()?.title;
          }
        } catch (error) {
          console.error('Error fetching reward:', error);
        }
      }

      pointsHistory.push(pointsItem);
    }

    return pointsHistory.slice(0, limit);
  } catch (error) {
    console.error('❌ Error fetching user points history:', error);
    return [];
  }
};

// Calculate total points for a user (for verification)
export const calculateUserTotalPoints = async (userId: string) => {
  try {
    const pointsRef = collection(db, 'points');
    const q = query(pointsRef, where('user_id', '==', userId));
    
    const snapshot = await getDocs(q);
    let total = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      total += data.value || 0;
    });

    return total;
  } catch (error) {
    console.error('❌ Error calculating user total points:', error);
    return 0;
  }
};

// Award referral bonus
export const awardReferralBonus = async (userId: string, referredUserId: string) => {
  try {
    // Check if referral bonus already awarded for this user
    const pointsRef = collection(db, 'points');
    const existingReferral = query(
      pointsRef,
      where('user_id', '==', userId),
      where('action_type', '==', 'referral'),
      where('referred_user_id', '==', referredUserId)
    );
    
    const existingSnapshot = await getDocs(existingReferral);
    if (!existingSnapshot.empty) {
      console.log(`⚠️ Referral bonus already awarded for user ${referredUserId}`);
      return false;
    }

    // Add points transaction
    await addDoc(collection(db, 'points'), {
      user_id: userId,
      action_type: 'referral',
      value: POINTS_VALUES.REFERRAL_BONUS,
      issue_id: null,
      referred_user_id: referredUserId,
      created_at: serverTimestamp()
    });

    // Update user's points balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points_balance: increment(POINTS_VALUES.REFERRAL_BONUS)
    });

    console.log(`✅ Awarded ${POINTS_VALUES.REFERRAL_BONUS} referral bonus to user ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error awarding referral bonus:', error);
    return false;
  }
};

// Award daily login bonus
export const awardDailyLoginBonus = async (userId: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if daily bonus already awarded today
    const pointsRef = collection(db, 'points');
    const todayBonus = query(
      pointsRef,
      where('user_id', '==', userId),
      where('action_type', '==', 'daily_login'),
      where('created_at', '>=', today)
    );
    
    const existingSnapshot = await getDocs(todayBonus);
    if (!existingSnapshot.empty) {
      console.log(`⚠️ Daily login bonus already awarded today for user ${userId}`);
      return false;
    }

    // Add points transaction
    await addDoc(collection(db, 'points'), {
      user_id: userId,
      action_type: 'daily_login',
      value: POINTS_VALUES.DAILY_LOGIN,
      issue_id: null,
      created_at: serverTimestamp()
    });

    // Update user's points balance
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      points_balance: increment(POINTS_VALUES.DAILY_LOGIN)
    });

    console.log(`✅ Awarded ${POINTS_VALUES.DAILY_LOGIN} daily login bonus to user ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ Error awarding daily login bonus:', error);
    return false;
  }
};

// Get user's points statistics
export const getUserPointsStats = async (userId: string) => {
  try {
    const pointsRef = collection(db, 'points');
    const q = query(pointsRef, where('user_id', '==', userId));
    
    const snapshot = await getDocs(q);
    const stats = {
      totalEarned: 0,
      totalSpent: 0,
      reportSubmissions: 0,
      reportResolutions: 0,
      referrals: 0,
      dailyLogins: 0,
      rewardRedemptions: 0
    };
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const value = data.value || 0;
      
      if (value > 0) {
        stats.totalEarned += value;
      } else {
        stats.totalSpent += Math.abs(value);
      }
      
      switch (data.action_type) {
        case 'report_submitted':
          stats.reportSubmissions++;
          break;
        case 'report_resolved':
          stats.reportResolutions++;
          break;
        case 'referral':
          stats.referrals++;
          break;
        case 'daily_login':
          stats.dailyLogins++;
          break;
        case 'reward_redemption':
          stats.rewardRedemptions++;
          break;
      }
    });

    return stats;
  } catch (error) {
    console.error('❌ Error fetching user points stats:', error);
    return null;
  }
};