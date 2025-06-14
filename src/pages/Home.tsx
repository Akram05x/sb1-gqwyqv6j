import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Award, Users, Brain, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { IssueMap } from '../components/IssueMap';

export function Home() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6">
              {t('title')}
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              {t('subtitle')}
            </p>
            <div className="flex justify-center">
              <Link
                to="/report"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 transition-colors shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2 rtl:ml-2 rtl:mr-0" />
                {t('reportIssue')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg mb-3 sm:mb-4">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {t('reported_problems')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {t('help_improve')}
            </p>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg mb-3 sm:mb-4">
              <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {t('ai_validation')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {t('ai_validation_desc')}
            </p>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg mb-3 sm:mb-4">
              <Award className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {t('earn_rewards')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {t('get_points')}
            </p>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-lg mb-3 sm:mb-4">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
              {t('community_driven')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              {t('everyone_contribute')}
            </p>
          </div>
        </div>

        {/* Points System Info */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
            {t('points_system_how')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 font-bold text-lg">+1</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{t('valid_report')}</h4>
              <p className="text-sm text-gray-600">{t('ai_validates_automatically')}</p>
            </div>
            
            {/* Gothenburg City Logo - Made much bigger and perfectly centered */}
            <div className="text-center flex flex-col items-center justify-center">
              <div className="w-32 h-32 mx-auto mb-2 flex items-center justify-center p-2">
                <img 
                  src="/src/assets/image.png" 
                  alt={t('gothenburg_logo_alt')} 
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 font-bold text-lg">5</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">{t('rewards')}</h4>
              <p className="text-sm text-gray-600">{t('save_for_valuable_rewards')}</p>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div id="map" className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
            {t('reported_problems_city')}
          </h2>
          <IssueMap />
        </div>
      </div>
    </div>
  );
}