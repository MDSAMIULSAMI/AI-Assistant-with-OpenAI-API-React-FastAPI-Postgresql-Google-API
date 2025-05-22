import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import ChatInterface from './ChatInterface';

const Dashboard = () => {
  const { user, token, logout, hasCalendarAccess } = useAuth();
  const navigate = useNavigate();
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState('new');
  const [isLoading, setIsLoading] = useState(true);
  
  const fetchChatSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/chat/sessions', {
        params: { token }
      });
      
      // Ensure that the response data is an array
      const sessionsData = Array.isArray(response.data) ? response.data : [];
      setChatSessions(sessionsData);
      
      // If we have sessions, select the most recent one
      if (sessionsData.length > 0) {
        setActiveChatId(sessionsData[0].session_id);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
      // Set empty array on error
      setChatSessions([]);
      Swal.fire({
        title: 'Error',
        text: 'Failed to load your chat sessions. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsLoading(false);
    }
  }, [token]);
  
  // Fetch chat sessions when component mounts or token changes
  useEffect(() => {
    if (token) {
      fetchChatSessions();
    } else {
      setChatSessions([]);
      setIsLoading(false);
    }
  }, [token, fetchChatSessions]);
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const handleChatSelect = (sessionId) => {
    setActiveChatId(sessionId);
  };
  
  const handleNewSession = async (sessionId) => {
    await fetchChatSessions();
    setActiveChatId(sessionId);
  };
  
  const handleCreateNewChat = () => {
    setActiveChatId('new');
  };
  
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    
    const result = await Swal.fire({
      title: 'Delete Conversation',
      text: 'Are you sure you want to delete this conversation? This cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });
    
    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:8000/api/chat/sessions/${sessionId}`, {
          params: { token }
        });
        
        // Remove the session from state
        setChatSessions(prev => prev.filter(session => session.session_id !== sessionId));
        
        // If the active chat was deleted, switch to a new chat
        if (activeChatId === sessionId) {
          setActiveChatId('new');
        }
        
        Swal.fire(
          'Deleted!',
          'Your conversation has been deleted.',
          'success'
        );
      } catch (error) {
        console.error('Error deleting session:', error);
        Swal.fire(
          'Error',
          'Failed to delete the conversation. Please try again.',
          'error'
        );
      }
    }
  };
  
  // Format date for display in the sidebar
  const formatSessionDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Today's date
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Within the last 7 days
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    if (date > lastWeek) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    
    // Older than a week
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-600 text-white p-2 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-800">AI Assistant</h1>
              </div>
            </div>
            
            <div className="flex items-center">
              {user?.picture && (
                <img
                  src={user.picture}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border-2 border-blue-500"
                />
              )}
              <div className="ml-3 hidden md:block">
                <p className="text-sm font-medium text-gray-800">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="ml-4 text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={handleCreateNewChat}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Chat</span>
                </button>
              </div>
              
              {/* Chat Sessions List */}
              <div className="divide-y divide-gray-200 max-h-[calc(100vh-200px)] overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent mx-auto mb-2"></div>
                    <p className="text-sm">Loading conversations...</p>
                  </div>
                ) : !Array.isArray(chatSessions) || chatSessions.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p className="text-sm">No previous conversations</p>
                  </div>
                ) : (
                  chatSessions.map((session) => (
                    <div
                      key={session.session_id}
                      className={`p-3 flex justify-between cursor-pointer hover:bg-gray-50 ${
                        activeChatId === session.session_id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleChatSelect(session.session_id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          activeChatId === session.session_id ? 'text-blue-600' : 'text-gray-800'
                        }`}>
                          {session.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatSessionDate(session.last_activity)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(session.session_id, e)}
                        className="ml-2 text-gray-400 hover:text-red-500"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Calendar Access Section */}
            {!hasCalendarAccess && (
              <div className="mt-4 bg-yellow-50 rounded-lg shadow-sm overflow-hidden p-4 border border-yellow-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0 text-yellow-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Calendar Access</h3>
                    <p className="mt-1 text-xs text-yellow-700">
                      To enable calendar features, please authorize access to your Google Calendar.
                    </p>
                    <a 
                      href="/login"
                      className="mt-2 inline-flex items-center px-3 py-1.5 border border-yellow-300 text-xs leading-4 font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none"
                    >
                      Authorize Calendar
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Main Chat Area */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden h-[calc(100vh-130px)]">
              <ChatInterface 
                sessionId={activeChatId} 
                onNewSession={handleNewSession} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;