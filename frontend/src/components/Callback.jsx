import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const Callback = () => {
  const [error, setError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      // Get the code from URL query parameters
      const queryParams = new URLSearchParams(location.search);
      const code = queryParams.get('code');

      if (!code) {
        setError('Authentication failed: No code provided');
        return;
      }

      try {
        const response = await axios.post('http://localhost:8000/api/auth/google/callback', 
          null, 
          { params: { code } }
        );

        // Save token and user data
        login(response.data.user, response.data.access_token);
        navigate('/dashboard');
      } catch (error) {
        console.error('Authentication error:', error);
        setError('Authentication failed. Please try again.');
      }
    };

    handleCallback();
  }, [location, login, navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button 
            onClick={() => navigate('/login')} 
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Processing Authentication</h2>
        <p className="text-gray-700">Please wait while we complete your sign-in...</p>
      </div>
    </div>
  );
};

export default Callback;