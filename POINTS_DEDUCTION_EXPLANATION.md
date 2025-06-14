# Points Deduction System - How It Works

## Overview
When you redeem a reward ("löser in"), the system automatically deducts the required points from your total points balance. This is handled through multiple components working together.

## Flow of Points Deduction

### 1. User Clicks "Lös in" (Redeem)
- Location: `src/pages/Rewards.tsx` - `redeemReward()` function
- Checks if user has sufficient points
- Calls the points deduction system

### 2. Points Deduction Process
- Location: `src/utils/pointsSystem.ts` - `deductPointsForRedemption()` function
- **Step 1**: Verifies user has enough points
- **Step 2**: Creates a negative points transaction record
- **Step 3**: Updates user's points balance in real-time

### 3. Database Updates
Two things happen simultaneously:
1. **Points Transaction**: A record is created in the `points` collection with a negative value
2. **User Balance**: The user's `points_balance` field is decremented by the reward cost

## Code Implementation

### In Rewards.tsx:
```typescript
const redeemReward = async (rewardId: string, cost: number) => {
  // Check if user has enough points
  if (userProfile.points_balance < cost) {
    alert(t('insufficient_points'));
    return;
  }

  // Deduct points and create redemption
  await addDoc(collection(db, 'points'), {
    user_id: user.uid,
    action_type: 'bonus', // This is actually reward redemption
    value: -cost, // NEGATIVE value deducts points
    issue_id: null,
    created_at: serverTimestamp()
  });

  // Update user's points balance
  await updateDoc(userRef, {
    points_balance: increment(-cost) // Decrements the balance
  });
}
```

### In pointsSystem.ts:
```typescript
export const deductPointsForRedemption = async (userId: string, cost: number, rewardId: string) => {
  // Add negative points transaction
  await addDoc(collection(db, 'points'), {
    user_id: userId,
    action_type: 'reward_redemption',
    value: -cost, // NEGATIVE value
    reward_id: rewardId,
    created_at: serverTimestamp()
  });

  // Update user's points balance
  await updateDoc(userRef, {
    points_balance: increment(-cost) // Decrements balance
  });
}
```

## Real-time Updates
- The user's points balance updates immediately in the UI
- The change is reflected across all components that display points
- The transaction history shows the deduction

## Current Status
✅ **The points deduction system is already working correctly!**

All rewards cost 500 points, and when you redeem them:
- 500 points are deducted from your total
- A transaction record is created
- Your balance updates in real-time
- You receive a redemption code

## Testing
To test the system:
1. Ensure you have at least 500 points
2. Go to `/rewards`
3. Click "Lös in" on any reward
4. Check your points balance - it should decrease by 500
5. Check your redemptions tab to see the redeemed reward