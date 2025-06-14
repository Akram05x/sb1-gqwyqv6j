import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, AlertTriangle, CheckCircle, Brain, Check } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc, 
  increment 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { PhotoCapture } from '../components/PhotoCapture';
import { validateCivicIssue } from '../api/openai';

const issueTypes = ['pothole', 'streetlight', 'graffiti', 'garbage', 'other'];

export function ReportIssue() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submissionStartTime, setSubmissionStartTime] = useState<number | null>(null);
  const [locationObtained, setLocationObtained] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'pothole',
    location_lat: 57.7089, // Default to Gothenburg
    location_lng: 11.9746,
    location_address: '',
    image_url: ''
  });

  // Track when user starts typing to measure engagement
  const handleFirstInput = () => {
    if (!submissionStartTime) {
      setSubmissionStartTime(Date.now());
    }
  };

  const validateSubmission = (timeSpent: number): boolean => {
    // Minimum time spent (in milliseconds) to consider it a valid submission
    const MIN_TIME_SPENT = 15000; // 15 seconds
    
    // Check if user spent enough time filling the form
    if (timeSpent < MIN_TIME_SPENT) {
      return false;
    }

    // Check if description is substantial enough
    if (formData.description.length < 15) {
      return false;
    }

    // Check if title is meaningful
    if (formData.title.length < 8) {
      return false;
    }

    return true;
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location_lat: position.coords.latitude,
            location_lng: position.coords.longitude
          }));
          setLocationObtained(true);
        },
        (error) => {
          console.error('Error getting location:', error);
          alert(t('location_permission_error'));
        }
      );
    } else {
      alert(t('geolocation_not_supported'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidating(true);

    try {
      const submissionEndTime = Date.now();
      const timeSpent = submissionStartTime ? submissionEndTime - submissionStartTime : 0;
      
      // Basic validation first
      const isBasicValid = validateSubmission(timeSpent);
      
      let imageUrl = formData.image_url;

      // Upload image to Firebase Storage if it's a blob URL
      if (imageUrl && imageUrl.startsWith('blob:')) {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const imageRef = ref(storage, `issues/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        await uploadBytes(imageRef, blob);
        imageUrl = await getDownloadURL(imageRef);
      }

      // AI Validation - only if basic validation passes
      let aiValidation = null;
      let finalValidation = false;
      let validationMethod = 'none';
      
      if (isBasicValid) {
        try {
          console.log('🤖 Starting AI validation...');
          aiValidation = await validateCivicIssue(
            formData.title,
            formData.description,
            formData.type,
            imageUrl
          );
          
          console.log('🤖 AI Validation Complete:', aiValidation);
          
          // AI validation must have high confidence to be considered valid
          finalValidation = aiValidation.isValid && aiValidation.confidence >= 70;
          validationMethod = finalValidation ? 'ai' : 'ai_rejected';
          
        } catch (error) {
          console.error('❌ AI validation failed, using basic validation:', error);
          // If AI fails, fall back to basic validation
          finalValidation = isBasicValid;
          validationMethod = 'basic';
        }
      } else {
        console.log('⚠️ Basic validation failed, skipping AI validation');
        validationMethod = 'basic_rejected';
      }

      setValidating(false);

      const issueData = {
        title: formData.title,
        description: formData.description,
        type: aiValidation?.suggestedCategory || formData.type,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        location_address: formData.location_address || null,
        image_url: imageUrl || null,
        user_id: user?.uid || null,
        status: finalValidation ? 'confirmed' : 'pending_validation',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        submission_time_spent: timeSpent,
        is_valid_submission: finalValidation,
        validated_by: validationMethod,
        ai_validation: aiValidation ? {
          confidence: aiValidation.confidence,
          reason: aiValidation.reason,
          suggested_category: aiValidation.suggestedCategory,
          validation_timestamp: new Date().toISOString()
        } : null,
        points_awarded: 0 // Will be updated after points are awarded
      };

      console.log('📝 Creating issue with data:', {
        ...issueData,
        finalValidation,
        validationMethod,
        aiValidation: aiValidation ? 'Present' : 'None'
      });

      const docRef = await addDoc(collection(db, 'issues'), issueData);

      // Award points only if user is logged in AND submission is valid
      let pointsAwarded = 0;
      if (user && finalValidation) {
        pointsAwarded = 10;
        
        console.log(`💰 Awarding ${pointsAwarded} points to user ${user.uid} for valid submission`);
        
        // Add points transaction
        await addDoc(collection(db, 'points'), {
          user_id: user.uid,
          action_type: 'report_submitted',
          value: pointsAwarded,
          issue_id: docRef.id,
          validation_method: validationMethod,
          ai_confidence: aiValidation?.confidence || null,
          created_at: serverTimestamp()
        });

        // Update user's points balance
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          points_balance: increment(pointsAwarded)
        });

        // Update issue with points awarded
        await updateDoc(docRef, {
          points_awarded: pointsAwarded
        });
      } else if (user && !finalValidation) {
        console.log(`⚠️ No points awarded - submission failed validation`);
      } else if (!user) {
        console.log(`⚠️ No points awarded - anonymous submission`);
      }

      // Navigate to thank you page with details
      const searchParams = new URLSearchParams({
        title: formData.title,
        points: pointsAwarded.toString(),
        valid: finalValidation.toString(),
        issueId: docRef.id,
        validationMethod: validationMethod,
        aiConfidence: aiValidation?.confidence?.toString() || '0'
      });
      
      navigate(`/thank-you?${searchParams.toString()}`);
    } catch (error) {
      console.error('❌ Error submitting report:', error);
      alert('Error submitting report. Please try again.');
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  const handlePhotoCapture = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, image_url: imageUrl }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            {t('reportIssue')}
          </h1>

          {!user && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    {t('login_required')} - Registrera dig för att tjäna poäng för dina rapporter.
                  </p>
                </div>
              </div>
            </div>
          )}

          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm text-blue-800 font-medium">
                    {t('earn_points_valid_reports')}
                  </p>
                  <p className="text-xs text-blue-600">
                    {t('reports_ai_quality_check')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {validating && (
            <div className="bg-purple-50 border border-purple-200 rounded-md p-4 mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-3"></div>
                <Brain className="h-4 w-4 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm text-purple-800 font-medium">
                    {t('ai_reviewing_report')}
                  </p>
                  <p className="text-xs text-purple-600">
                    {t('ai_reviewing_report_desc')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                {t('title_field')} *
              </label>
              <input
                type="text"
                id="title"
                required
                value={formData.title}
                onChange={(e) => {
                  handleFirstInput();
                  setFormData(prev => ({ ...prev, title: e.target.value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('title_example')}
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('describe_clearly_specific')}
              </p>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                {t('problem_type')}
              </label>
              <select
                id="type"
                value={formData.type}
                onChange={(e) => {
                  handleFirstInput();
                  setFormData(prev => ({ ...prev, type: e.target.value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {issueTypes.map(type => (
                  <option key={type} value={type}>
                    {t(type as any)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('description')} *
              </label>
              <textarea
                id="description"
                required
                rows={4}
                value={formData.description}
                onChange={(e) => {
                  handleFirstInput();
                  setFormData(prev => ({ ...prev, description: e.target.value }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('description_placeholder')}
                minLength={15}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('detailed_info_help')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('location')}
              </label>
              
              {/* Location Status Box */}
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <MapPin className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                    {t('use_location')}
                  </button>
                  {locationObtained && (
                    <div className="flex items-center text-green-600">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">{t('location_obtained')}</span>
                    </div>
                  )}
                </div>
                {locationObtained && (
                  <div className="mt-2 text-xs text-gray-500">
                    Lat: {formData.location_lat.toFixed(6)}, Lng: {formData.location_lng.toFixed(6)}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                {t('address_optional')}
              </label>
              <input
                type="text"
                id="address"
                value={formData.location_address}
                onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('address_example_gothenburg')}
              />
            </div>

            <PhotoCapture
              onPhotoCapture={handlePhotoCapture}
              currentPhoto={formData.image_url}
            />

            <div className="flex space-x-4 rtl:space-x-reverse">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {validating ? t('ai_reviewing_report') : t('sending')}
                  </div>
                ) : (
                  t('submit')
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-3 border border-gray-300 rounded-md font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}