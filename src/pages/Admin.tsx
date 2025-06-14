import React, { useState, useEffect } from 'react';
import { Shield, MapPin, Clock, CheckCircle, AlertCircle, Brain, User } from 'lucide-react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  addDoc,
  increment
} from 'firebase/firestore';
import { db, Issue } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const statusOptions = ['new', 'confirmed', 'acknowledged', 'in_progress', 'resolved', 'invalid'];

export function Admin() {
  const { user, userProfile } = useAuth();
  const { t } = useLanguage();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (user && userProfile?.role === 'admin') {
      const issuesRef = collection(db, 'issues');
      const q = query(issuesRef, orderBy('created_at', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const issuesData: Issue[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          issuesData.push({
            id: doc.id,
            user_id: data.user_id,
            type: data.type,
            title: data.title,
            description: data.description,
            image_url: data.image_url,
            location_lat: data.location_lat,
            location_lng: data.location_lng,
            location_address: data.location_address,
            status: data.status,
            created_at: data.created_at?.toDate() || new Date(),
            updated_at: data.updated_at?.toDate() || new Date(),
            is_valid_submission: data.is_valid_submission,
            validated_by: data.validated_by,
            points_awarded: data.points_awarded || 0,
            ai_validation: data.ai_validation
          });
        });
        setIssues(issuesData);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching issues:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    }
  }, [user, userProfile]);

  const updateIssueStatus = async (issueId: string, newStatus: string) => {
    setUpdating(issueId);

    try {
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return;

      const issueRef = doc(db, 'issues', issueId);
      await updateDoc(issueRef, {
        status: newStatus,
        updated_at: serverTimestamp()
      });

      // Handle points logic based on status change
      if (newStatus === 'resolved' && issue.status !== 'resolved' && issue.user_id) {
        // Award resolution bonus points
        await addDoc(collection(db, 'points'), {
          user_id: issue.user_id,
          action_type: 'report_resolved',
          value: 15,
          issue_id: issueId,
          created_at: serverTimestamp()
        });

        // Update user's points balance
        const userRef = doc(db, 'users', issue.user_id);
        await updateDoc(userRef, {
          points_balance: increment(15)
        });
      }

      // If marking as invalid and points were previously awarded, rollback
      if (newStatus === 'invalid' && issue.points_awarded > 0 && issue.user_id) {
        await addDoc(collection(db, 'points'), {
          user_id: issue.user_id,
          action_type: 'rollback_invalid',
          value: -issue.points_awarded,
          issue_id: issueId,
          created_at: serverTimestamp()
        });

        // Update user's points balance
        const userRef = doc(db, 'users', issue.user_id);
        await updateDoc(userRef, {
          points_balance: increment(-issue.points_awarded)
        });

        // Update issue to reflect rollback
        await updateDoc(issueRef, {
          points_awarded: 0
        });
      }

    } catch (error) {
      console.error('Error updating issue status:', error);
      alert('Error updating issue status');
    } finally {
      setUpdating(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Åtkomst nekad
          </h2>
          <p className="text-gray-600">
            Du måste vara inloggad för att komma åt admin-panelen
          </p>
        </div>
      </div>
    );
  }

  if (userProfile?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Obehörig åtkomst
          </h2>
          <p className="text-gray-600">
            Du har inte behörighet att komma åt admin-panelen
          </p>
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'acknowledged':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'invalid':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-orange-100 text-orange-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'invalid':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getValidationBadge = (issue: any) => {
    if (issue.validated_by === 'ai') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          <Brain className="h-3 w-3 mr-1" />
          AI Validerad
        </span>
      );
    } else if (issue.validated_by === 'basic') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Grundvaliderad
        </span>
      );
    } else if (issue.is_valid_submission === false) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Ogiltig
        </span>
      );
    }
    return null;
  };

  const filteredIssues = filter === 'all' ? issues : issues.filter(issue => issue.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center">
            <Shield className="h-8 w-8 mr-3 rtl:ml-3 rtl:mr-0" />
            Admin Dashboard
          </h1>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {issues.filter(i => i.status === 'new').length}
                </div>
                <div className="text-sm text-gray-600">Nya</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {issues.filter(i => i.status === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-600">Bekräftade</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {issues.filter(i => i.status === 'acknowledged').length}
                </div>
                <div className="text-sm text-gray-600">Bekräftade</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {issues.filter(i => i.status === 'in_progress').length}
                </div>
                <div className="text-sm text-gray-600">Pågående</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {issues.filter(i => i.status === 'resolved').length}
                </div>
                <div className="text-sm text-gray-600">Lösta</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {issues.filter(i => i.status === 'invalid').length}
                </div>
                <div className="text-sm text-gray-600">Ogiltiga</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Alla ({issues.length})
              </button>
              {statusOptions.map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {status === 'confirmed' ? 'Bekräftade' : t(status as any)} ({issues.filter(i => i.status === status).length})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2 flex-wrap gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {issue.title}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(issue.status)}`}>
                      {getStatusIcon(issue.status)}
                      <span className="ml-1 rtl:mr-1 rtl:ml-0">
                        {issue.status === 'confirmed' ? 'Bekräftad' : t(issue.status as any)}
                      </span>
                    </span>
                    {getValidationBadge(issue)}
                    {issue.points_awarded > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        +{issue.points_awarded}p
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 mb-2">{issue.description}</p>
                  <div className="flex items-center text-sm text-gray-500 space-x-4 rtl:space-x-reverse flex-wrap gap-2">
                    <span className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1 rtl:ml-1 rtl:mr-0" />
                      {issue.location_address || `${issue.location_lat}, ${issue.location_lng}`}
                    </span>
                    <span>{t(issue.type as any)}</span>
                    <span>{issue.created_at.toLocaleString()}</span>
                    <span className="flex items-center">
                      {issue.user_id ? (
                        <>
                          <User className="h-4 w-4 mr-1" />
                          Registrerad användare
                        </>
                      ) : (
                        'Anonym'
                      )}
                    </span>
                  </div>
                  
                  {/* AI Validation Details */}
                  {issue.ai_validation && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-md">
                      <div className="flex items-center mb-1">
                        <Brain className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-sm font-medium text-purple-900">AI Validering</span>
                      </div>
                      <p className="text-xs text-purple-700">
                        Förtroende: {issue.ai_validation.confidence}% | {issue.ai_validation.reason}
                      </p>
                      {issue.ai_validation.suggested_category !== issue.type && (
                        <p className="text-xs text-purple-600">
                          Föreslagen kategori: {t(issue.ai_validation.suggested_category as any)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {issue.image_url && (
                  <img
                    src={issue.image_url}
                    alt={issue.title}
                    className="w-24 h-24 object-cover rounded-lg ml-4 rtl:mr-4 rtl:ml-0"
                  />
                )}
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <label className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <select
                  value={issue.status}
                  onChange={(e) => updateIssueStatus(issue.id, e.target.value)}
                  disabled={updating === issue.id}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status === 'confirmed' ? 'Bekräftad' : t(status as any)}
                    </option>
                  ))}
                </select>
                {updating === issue.id && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredIssues.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Inga rapporter hittades
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Det finns inga rapporter att visa än.'
                : `Det finns inga rapporter med status "${filter === 'confirmed' ? 'Bekräftad' : t(filter as any)}".`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}