import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Award, MapPin, Home, Plus, Brain, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export function ThankYou() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);

  const issueTitle = searchParams.get('title') || 'Your issue';
  const pointsEarned = parseInt(searchParams.get('points') || '0');
  const isValid = searchParams.get('valid') === 'true';
  const issueId = searchParams.get('issueId');
  const isAnonymous = !user;

  useEffect(() => {
    // Show points animation after a short delay
    const timer = setTimeout(() => {
      setShowPointsAnimation(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-8">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Success Icon */}
          <div className="relative mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isValid ? 'bg-green-100' : 'bg-yellow-100'
            }`}>
              {isValid ? (
                <CheckCircle className="h-12 w-12 text-green-600" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-yellow-600" />
              )}
            </div>
            
            {/* Points Animation */}
            {!isAnonymous && pointsEarned > 0 && (
              <div className={`absolute -top-2 -right-2 transition-all duration-1000 ${
                showPointsAnimation ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}>
                <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center shadow-lg">
                  <Award className="h-4 w-4 mr-1" />
                  +{pointsEarned}p
                </div>
              </div>
            )}
          </div>

          {/* Thank You Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('thank_you')}!
          </h1>
          
          <p className="text-gray-600 mb-6">
            {isValid 
              ? t('issue_submitted_successfully')
              : t('report_submitted_manual_review')
            }
          </p>

          {/* Issue Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <MapPin className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-medium text-gray-900 text-sm">
                  {issueTitle}
                </h3>
                <div className="flex items-center mt-1">
                  {isValid ? (
                    <>
                      <Brain className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-xs text-green-600">{t('ai_validated_confirmed')}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                      <span className="text-xs text-yellow-600">{t('awaiting_manual_review')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Points Earned Section */}
          {!isAnonymous && (
            <div className={`border rounded-lg p-4 mb-6 ${
              pointsEarned > 0 ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-center mb-2">
                <Award className={`h-5 w-5 mr-2 ${pointsEarned > 0 ? 'text-blue-600' : 'text-yellow-600'}`} />
                <span className={`font-semibold ${pointsEarned > 0 ? 'text-blue-900' : 'text-yellow-900'}`}>
                  {pointsEarned > 0 ? t('points_earned') : t('no_points_yet')}
                </span>
              </div>
              {pointsEarned > 0 ? (
                <>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    +{pointsEarned} {t('points')}
                  </div>
                  <p className="text-xs text-blue-700">
                    {t('points_earned_description')}
                  </p>
                  {userProfile && (
                    <p className="text-xs text-blue-600 mt-2">
                      {t('total_points')}: {userProfile.points_balance} {t('points')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-yellow-700">
                  {t('points_awarded_after_review')}
                </p>
              )}
            </div>
          )}

          {/* Anonymous User Message */}
          {isAnonymous && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                {t('anonymous_submission_message')}
              </p>
            </div>
          )}

          {/* Validation Info */}
          {!isValid && !isAnonymous && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-orange-900 mb-2">{t('why_no_points')}</h4>
              <ul className="text-xs text-orange-700 text-left space-y-1">
                <li>• {t('report_needs_more_detail')}</li>
                <li>• {t('description_too_short')}</li>
                <li>• {t('problem_not_municipal')}</li>
                <li>• {t('points_after_manual_review')}</li>
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/')}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Home className="h-5 w-5 mr-2" />
              {t('back_to_home')}
            </button>
            
            <button
              onClick={() => navigate('/report')}
              className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('report_another_issue')}
            </button>

            {!isAnonymous && (
              <button
                onClick={() => navigate('/rewards')}
                className="w-full text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
              >
                {t('view_rewards')}
              </button>
            )}
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {t('issue_tracking_info')}
            </p>
            {issueId && (
              <p className="text-xs text-gray-400 mt-1">
                {t('report_id')}: {issueId.slice(-8)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}