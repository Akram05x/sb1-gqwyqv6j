import React, { useState, useEffect } from 'react';
import { User, Award, Calendar, TrendingUp, Mail, Edit, Lock } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, PointsTransaction } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface PointsHistoryWithIssue extends PointsTransaction {
  issue_title?: string;
}

export function Profile() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryWithIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const pointsRef = collection(db, 'points');
      const q = query(
        pointsRef,
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const pointsData: PointsHistoryWithIssue[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const pointsItem: PointsHistoryWithIssue = {
            id: docSnap.id,
            user_id: data.user_id,
            action_type: data.action_type,
            value: data.value,
            issue_id: data.issue_id,
            created_at: data.created_at?.toDate() || new Date()
          };

          // If there's an issue_id, fetch the issue title
          if (data.issue_id) {
            try {
              const issueDoc = await db.collection('issues').doc(data.issue_id).get();
              if (issueDoc.exists) {
                pointsItem.issue_title = issueDoc.data()?.title;
              }
            } catch (error) {
              console.error('Error fetching issue:', error);
            }
          }

          pointsData.push(pointsItem);
        }
        
        setPointsHistory(pointsData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching points history:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('login_required')}
          </h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'report_submitted':
        return '📝';
      case 'report_resolved':
        return '✅';
      case 'bonus':
        return '🎁';
      default:
        return '⭐';
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'report_submitted':
        return 'Rapport skickad';
      case 'report_resolved':
        return 'Rapport löst';
      case 'bonus':
        return 'Belöning inlöst';
      default:
        return action;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4 rtl:mr-4 rtl:ml-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  {userProfile?.name || user.email}
                </h1>
                <p className="text-gray-600">
                  Medlem sedan {userProfile?.created_at?.toLocaleDateString() || 'N/A'}
                </p>
              </div>
            </div>
            <div className="text-right rtl:text-left">
              <div className="text-3xl font-bold text-blue-600">
                {userProfile?.points_balance || 0}
              </div>
              <div className="text-sm text-gray-600">
                {t('points')}
              </div>
            </div>
          </div>

          {/* Points Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('save_for_rewards')}
              </h3>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600 font-bold text-sm">500p</span>
              </div>
              <p className="text-xs text-gray-500">
                <strong>{t('all_rewards_cost')}</strong>
              </p>
            </div>
          </div>

          {/* Account Settings */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('account_settings')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Mail className="h-5 w-5" />
                <span>{t('change_email')}</span>
              </button>
              <button className="flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit className="h-5 w-5" />
                <span>{t('change_name')}</span>
              </button>
              <button className="flex items-center justify-center space-x-2 rtl:space-x-reverse p-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Lock className="h-5 w-5" />
                <span>{t('change_password')}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="h-6 w-6 mr-2 rtl:ml-2 rtl:mr-0" />
            Poänghistorik
          </h2>

          {pointsHistory.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Award className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Inga poäng ännu. Börja rapportera problem för att tjäna poäng!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pointsHistory.map((point) => (
                <div key={point.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3 rtl:ml-3 rtl:mr-0">
                      {getActionIcon(point.action_type)}
                    </span>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {getActionText(point.action_type)}
                      </h3>
                      {point.issue_title && (
                        <p className="text-sm text-gray-600">
                          {point.issue_title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {point.created_at.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    point.value > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {point.value > 0 ? '+' : ''}{point.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}