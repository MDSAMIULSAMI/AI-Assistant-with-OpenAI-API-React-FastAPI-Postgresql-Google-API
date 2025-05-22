import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Login = () => {
  const [googleAuthUrl, setGoogleAuthUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }

    const fetchGoogleAuthUrl = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get('http://localhost:8000/api/auth/google/url');
        setGoogleAuthUrl(response.data.url);
      } catch (error) {
        console.error('Failed to fetch Google auth URL:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoogleAuthUrl();
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Design Elements - Abstract Shapes */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-8 left-20 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
      {/* Login Card */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full z-10 relative">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome</h1>
          <p className="opacity-80">Sign in to have your personal AI assistant</p>
        </div>
        
        {/* Content */}
        <div className="p-8">
          <div className="flex flex-col items-center space-y-6">
            {/* App Logo/Icon */}
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">AI Assisstant</h2>
              <p className="text-gray-500 mt-1">Access your Assisstant with Google</p>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <a 
                href={googleAuthUrl} 
                className="flex items-center justify-center space-x-3 bg-white border border-gray-300 rounded-lg py-3 px-8 shadow-md hover:shadow-lg transition duration-300 w-full"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                <span className="text-gray-800 font-medium">Sign in with Google</span>
              </a>
            )}
          </div>
          
          {/* Footer Info */}
          <div className="mt-10 text-center text-sm text-gray-500">
            <p>Secure login powered by Google</p>
            <p className="mt-2">© 2025 Astha Insight. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;