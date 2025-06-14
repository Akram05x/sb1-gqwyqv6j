import React, { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Key, Mail, ArrowRight } from 'lucide-react';
import { createAdminAccount } from '../utils/createAdminAccount';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function CreateAdmin() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const handleCreateAdmin = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const adminResult = await createAdminAccount();
      setResult(adminResult);
    } catch (error: any) {
      setError(error.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOutAndRedirect = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create Admin Account
            </h1>
            <p className="text-gray-600">
              Create an administrator account for managing the Fix My City platform
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 rounded-md p-6 mb-6">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-medium text-green-800 mb-2">
                    {result.isNewUser ? 'Admin Account Created Successfully!' : 'Admin Account Ready!'}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-green-700">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="font-medium">Email:</span>
                      <span className="ml-2 font-mono">{result.email}</span>
                    </div>
                    <div className="flex items-center text-sm text-green-700">
                      <Key className="h-4 w-4 mr-2" />
                      <span className="font-medium">Password:</span>
                      <span className="ml-2 font-mono">{result.password}</span>
                    </div>
                    {result.userId && (
                      <div className="text-xs text-green-600 mt-2">
                        User ID: {result.userId}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Next Steps:</h4>
                    <ol className="text-xs text-blue-800 space-y-1">
                      <li>1. Save the credentials above securely</li>
                      <li>2. Sign out of your current account</li>
                      <li>3. Sign in with the admin credentials</li>
                      <li>4. Visit /admin to access the admin dashboard</li>
                    </ol>
                  </div>

                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={handleSignOutAndRedirect}
                      className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      Sign Out & Go to Login
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </button>
                    <button
                      onClick={() => navigate('/admin')}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                    >
                      Go to Admin Dashboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                Admin Account Details
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Email: admin@fixmycity.se</li>
                <li>• Password: admin123456 (change in production)</li>
                <li>• Role: Administrator</li>
                <li>• Starting Points: 1000</li>
                <li>• Access: Full admin dashboard and controls</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">
                Admin Capabilities
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• View and manage all reported issues</li>
                <li>• Change issue statuses (new → resolved)</li>
                <li>• Award bonus points when issues are resolved</li>
                <li>• View user statistics and analytics</li>
                <li>• Manage rewards and redemptions</li>
                <li>• Access admin dashboard at /admin</li>
              </ul>
            </div>

            <button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating Admin Account...
                </div>
              ) : (
                'Create Admin Account'
              )}
            </button>

            {user && (
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Currently signed in as: {user.email}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}