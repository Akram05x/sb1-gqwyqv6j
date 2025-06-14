import React, { useState, useEffect } from 'react';
import { Award, Gift, Star, ShoppingBag, Coffee, Leaf, Building, Train, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { db, Reward, Redemption } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface RedemptionWithReward extends Redemption {
  reward: Reward;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  'shopping-bag': ShoppingBag,
  'coffee': Coffee,
  'leaf': Leaf,
  'building': Building,
  'train': Train,
  'gift': Gift
};

export function Rewards() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const { t, language } = useLanguage();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionWithReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'redeemed'>('available');

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        const rewardsRef = collection(db, 'rewards');
        const rewardsQuery = query(rewardsRef, where('available', '==', true));
        const snapshot = await getDocs(rewardsQuery);
        
        const rewardsData: Reward[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          rewardsData.push({
            id: doc.id,
            title: data.title,
            description: data.description,
            cost: data.cost,
            icon_name: data.icon_name,
            available: data.available,
            inventory_count: data.inventory_count,
            created_at: data.created_at?.toDate() || new Date()
          });
        });
        
        // Sort by cost (cheapest first)
        rewardsData.sort((a, b) => a.cost - b.cost);
        setRewards(rewardsData);
      } catch (error) {
        console.error('Error fetching rewards:', error);
        // Set empty array on error to prevent infinite loading
        setRewards([]);
      }
    };

    fetchRewards();
  }, []);

  useEffect(() => {
    if (user) {
      // Fetch user redemptions - simplified query to avoid index requirement
      const redemptionsRef = collection(db, 'redemptions');
      const redemptionsQuery = query(
        redemptionsRef,
        where('user_id', '==', user.uid)
      );

      const unsubscribeRedemptions = onSnapshot(redemptionsQuery, async (snapshot) => {
        const redemptionsData: RedemptionWithReward[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // Find the associated reward from our rewards state
          const reward = rewards.find(r => r.id === data.reward_id);
          
          if (reward) {
            redemptionsData.push({
              id: docSnap.id,
              user_id: data.user_id,
              reward_id: data.reward_id,
              redemption_code: data.redemption_code,
              redeemed_at: data.redeemed_at?.toDate() || new Date(),
              used: data.used,
              reward: reward
            });
          }
        }
        
        // Sort by redeemed_at in memory instead of in query
        redemptionsData.sort((a, b) => b.redeemed_at.getTime() - a.redeemed_at.getTime());
        
        setRedemptions(redemptionsData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching redemptions:', error);
        setRedemptions([]);
        setLoading(false);
      });

      return () => {
        unsubscribeRedemptions();
      };
    } else {
      setLoading(false);
    }
  }, [user, rewards]);

  const redeemReward = async (rewardId: string, cost: number) => {
    if (!user || !userProfile) {
      alert('Du måste vara inloggad för att lösa in belöningar');
      return;
    }

    // CRITICAL: Double-check points balance before proceeding
    if (userProfile.points_balance < cost) {
      alert(`❌ Du har inte tillräckligt med poäng!\n\nDu behöver: ${cost} poäng\nDu har: ${userProfile.points_balance} poäng\nDu behöver ${cost - userProfile.points_balance} poäng till.`);
      return;
    }

    setRedeeming(rewardId);

    try {
      console.log(`🎁 STARTING REDEMPTION`);
      console.log(`💰 User current balance: ${userProfile.points_balance} points`);
      console.log(`💸 Reward cost: ${cost} points`);
      console.log(`🧮 Balance after redemption should be: ${userProfile.points_balance - cost} points`);

      // Verify reward exists and is available
      const rewardRef = doc(db, 'rewards', rewardId);
      const rewardDoc = await getDoc(rewardRef);
      
      if (!rewardDoc.exists()) {
        throw new Error('Belöningen finns inte längre');
      }

      const rewardData = rewardDoc.data();
      if (!rewardData.available) {
        throw new Error('Belöningen är inte tillgänglig');
      }

      // Check inventory if applicable
      if (rewardData.inventory_count !== undefined && rewardData.inventory_count <= 0) {
        throw new Error('Belöningen är slut i lager');
      }

      const redemptionCode = `FMC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // STEP 1: Create negative points transaction (THIS DEDUCTS THE POINTS)
      console.log(`💸 DEDUCTING ${cost} points from user ${user.uid}`);
      
      await addDoc(collection(db, 'points'), {
        user_id: user.uid,
        action_type: 'reward_redemption',
        value: -cost, // ⚠️ NEGATIVE VALUE = DEDUCTION
        issue_id: null,
        reward_id: rewardId,
        created_at: serverTimestamp()
      });

      console.log(`✅ Points transaction created with value: -${cost}`);

      // STEP 2: Update user's points balance (DECREMENT)
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        points_balance: increment(-cost) // ⚠️ NEGATIVE INCREMENT = SUBTRACTION
      });

      console.log(`✅ User balance decremented by ${cost} points`);

      // STEP 3: Create redemption record
      await addDoc(collection(db, 'redemptions'), {
        user_id: user.uid,
        reward_id: rewardId,
        redemption_code: redemptionCode,
        redeemed_at: serverTimestamp(),
        used: false
      });

      console.log(`✅ Redemption record created with code: ${redemptionCode}`);

      // STEP 4: Update inventory if applicable
      if (rewardData.inventory_count !== undefined) {
        await updateDoc(rewardRef, {
          inventory_count: increment(-1)
        });
        console.log(`✅ Inventory decremented by 1`);
      }

      // STEP 5: Force refresh user profile to update UI immediately
      console.log(`🔄 Refreshing user profile to update UI...`);
      await refreshUserProfile();

      console.log(`🎉 REDEMPTION COMPLETED SUCCESSFULLY!`);
      
      // Show success message with clear points deduction info
      alert(`🎉 Belöning inlöst framgångsrikt!\n\n📋 Inlösningskod: ${redemptionCode}\n\n💰 Poäng före: ${userProfile.points_balance}\n💸 Kostnad: ${cost} poäng\n💰 Nytt saldo: ${userProfile.points_balance - cost} poäng\n\n✅ ${cost} poäng har dragits från ditt konto.`);
      
      setActiveTab('redeemed'); // Switch to redeemed tab to show the redemption
      
    } catch (error: any) {
      console.error('❌ REDEMPTION FAILED:', error);
      alert(`❌ Fel vid inlösning av belöning:\n\n${error.message || 'Okänt fel uppstod'}\n\nFörsök igen eller kontakta support.`);
    } finally {
      setRedeeming(null);
    }
  };

  const getRewardIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Gift;
    return <IconComponent className="h-8 w-8 text-blue-600" />;
  };

  const canAfford = (cost: number) => {
    return (userProfile?.points_balance || 0) >= cost;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('login_required')}
          </h2>
          <p className="text-gray-600 mb-6">
            {t('login_to_see_rewards')}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {t('go_to_homepage')}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading_rewards')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Award className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {t('rewards_title')}
          </h1>
          <div className="inline-flex items-center bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-6 py-3 rounded-full shadow-sm">
            <Star className="h-6 w-6 mr-2 text-yellow-500" />
            <span className="font-bold text-lg">
              {userProfile?.points_balance || 0} {t('points')}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'available'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('available_rewards')} ({rewards.length})
          </button>
          <button
            onClick={() => setActiveTab('redeemed')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'redeemed'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('my_redemptions')} ({redemptions.length})
          </button>
        </div>

        {/* Available Rewards Tab */}
        {activeTab === 'available' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => (
              <div key={reward.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="mr-3">
                        {getRewardIcon(reward.icon_name)}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {reward.title[language] || reward.title.sv}
                        </h3>
                        <div className="flex items-center mt-1">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm font-medium text-gray-700">
                            {reward.cost} {t('points')}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canAfford(reward.cost) ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                    {reward.description[language] || reward.description.sv}
                  </p>
                  
                  {reward.inventory_count !== undefined && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{t('available')}</span>
                        <span>{reward.inventory_count} {t('remaining')}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (reward.inventory_count / 100) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => redeemReward(reward.id, reward.cost)}
                    disabled={redeeming === reward.id || !canAfford(reward.cost)}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                      canAfford(reward.cost)
                        ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    } disabled:opacity-50`}
                  >
                    {redeeming === reward.id ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {t('redeeming')}
                      </div>
                    ) : canAfford(reward.cost) ? (
                      <>
                        {t('redeem')} (-{reward.cost}p)
                      </>
                    ) : (
                      t('need_more_points').replace('{amount}', (reward.cost - (userProfile?.points_balance || 0)).toString())
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Redeemed Rewards Tab */}
        {activeTab === 'redeemed' && (
          <div className="space-y-4">
            {redemptions.length === 0 ? (
              <div className="text-center py-12">
                <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('no_redemptions_yet')}
                </h3>
                <p className="text-gray-600 mb-6">
                  {t('start_earning_points')}
                </p>
                <button
                  onClick={() => setActiveTab('available')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  {t('see_available_rewards')}
                </button>
              </div>
            ) : (
              redemptions.map((redemption) => (
                <div key={redemption.id} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center">
                      <div className="mr-4">
                        {getRewardIcon(redemption.reward.icon_name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {redemption.reward.title[language] || redemption.reward.title.sv}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {t('redeemed_on')} {redemption.redeemed_at.toLocaleDateString()}
                        </p>
                        <div className="flex items-center mt-1">
                          {redemption.used ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('used')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Clock className="h-3 w-3 mr-1" />
                              {t('unused')}
                            </span>
                          )}
                          <span className="ml-2 text-xs text-red-600 font-medium">
                            -{redemption.reward.cost}p
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 font-mono">
                          {redemption.redemption_code}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowQR(showQR === redemption.id ? null : redemption.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                      >
                        {showQR === redemption.id ? t('hide_qr') : t('show_qr')}
                      </button>
                    </div>
                  </div>
                  
                  {showQR === redemption.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                          <QRCode 
                            value={redemption.redemption_code} 
                            size={200} 
                          />
                        </div>
                        <p className="text-center text-gray-600 mt-4 text-sm">
                          {t('show_qr_to_use')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Empty State for Available Rewards */}
        {activeTab === 'available' && rewards.length === 0 && (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('no_rewards_available')}
            </h3>
            <p className="text-gray-600">
              {t('new_rewards_coming')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}