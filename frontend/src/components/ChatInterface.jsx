import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ChatInterface = ({ sessionId, onNewSession }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Create fetchChatHistory as a useCallback
  const fetchChatHistory = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`http://localhost:8000/api/chat/history/${sessionId}`, {
        params: { token }
      });
      const history = response.data;
      
      // Convert chat history to messages format
      const formattedMessages = history.map(msg => ({
        id: msg.id,
        role: msg.message_type,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        actions: msg.actions || []
      }));
      
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  }, [sessionId, token]);
  
  // Fetch chat history when session ID changes
  useEffect(() => {
    if (sessionId && sessionId !== 'new') {
      fetchChatHistory();
    } else {
      setMessages([]);
    }
  }, [sessionId, token, fetchChatHistory]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Prepare request payload
      const payload = {
        request: {
          prompt: input,
          message_history: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          session_id: sessionId === 'new' ? null : sessionId
        },
        token: token
      };
      
      // Send request to backend
      const response = await axios.post('http://localhost:8000/api/chat', payload);
      
      // Get actions from response
      const newActions = response.data.actions || [];
      
      // Format assistant response
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date(),
        actions: newActions
      };
      
      // Add assistant message to chat
      setMessages(prev => [...prev, assistantMessage]);
      
      // If this was a new session, update the session ID and notify parent
      if (sessionId === 'new' && response.data.session_id) {
        if (onNewSession) {
          onNewSession(response.data.session_id);
        }
      }
      
      // Check for pending calendar events and update their status
      if (newActions.some(action => action.type === 'calendar_event_created' || action.type === 'calendar_event_pending')) {
        // Set a timeout to check event status
        setTimeout(() => {
          checkCalendarEventStatus(response.data.session_id || sessionId);
        }, 3000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
      // Focus input field after sending message
      inputRef.current?.focus();
    }
  };
  
  // Add a function to check calendar event status
  const checkCalendarEventStatus = async (chatSessionId) => {
    if (!token || !chatSessionId || chatSessionId === 'new') return;
    
    try {
      console.log('Checking calendar event status for session:', chatSessionId);
      // Fetch the latest chat history to get updated event status
      const response = await axios.get(`http://localhost:8000/api/chat/history/${chatSessionId}`, {
        params: { token }
      });
      
      const updatedHistory = response.data;
      console.log('Updated history:', updatedHistory);
      
      // Update the event status from pending to created if needed
      const updatedMessages = [...messages];
      let updated = false;
      
      // Loop through all messages to find any with pending calendar events
      for (let i = updatedMessages.length - 1; i >= 0; i--) {
        const message = updatedMessages[i];
        if (message.role === 'assistant' && message.actions && message.actions.length > 0) {
          const pendingEventIndex = message.actions.findIndex(action => 
            action.type === 'calendar_event_pending'
          );
          
          if (pendingEventIndex !== -1) {
            console.log('Found pending event in message:', i);
            // Check if this event has been created in the updated history
            for (const historyItem of updatedHistory) {
              if (historyItem.actions && historyItem.actions.length > 0) {
                const createdEvent = historyItem.actions.find(action => 
                  action.type === 'calendar_event_created' && 
                  action.details && 
                  message.actions[pendingEventIndex].details && 
                  action.details.summary === message.actions[pendingEventIndex].details.summary
                );
                
                if (createdEvent) {
                  console.log('Found matching created event in history');
                  // Replace the pending event with the created event
                  message.actions[pendingEventIndex] = createdEvent;
                  updated = true;
                  break;
                }
              }
            }
          }
        }
      }
      
      // Only update state if we've made changes
      if (updated) {
        console.log('Updating messages with new event status');
        setMessages(updatedMessages);
      } else {
        // If not updated yet, poll again in 3 seconds
        setTimeout(() => {
          console.log('Polling again for event status');
          checkCalendarEventStatus(chatSessionId);
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking calendar event status:', error);
    }
  };
  
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const renderMessageContent = (message) => {
    // For regular text message
    if (!message.actions || message.actions.length === 0) {
      return <div className="text-sm whitespace-pre-wrap">{message.content}</div>;
    }
    
    // For messages with actions
    return (
      <>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        {message.actions.map((action, index) => (
          <div key={index} className="mt-3">
            {action.type === 'image_created' && (
              <div className="mt-2">
                <img 
                  src={action.image_url} 
                  alt={action.prompt || "Generated image"} 
                  className="max-w-full h-auto rounded-lg shadow-md"
                />
                <div className="mt-1 text-xs text-gray-500">
                  <span className="font-medium">Prompt:</span> {action.prompt}
                </div>
              </div>
            )}
            
            {action.type.includes('calendar_event_') && renderCalendarAction(action)}
          </div>
        ))}
      </>
    );
  };
  
  const renderCalendarAction = (action) => {
    // For created events
    if (action.type === 'calendar_event_created') {
      return (
        <div className="mt-2 bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-green-800">Event Created</span>
          </div>
          
          <div className="mt-2 text-sm">
            <p className="font-medium text-gray-700">{action.details?.summary || "Event"}</p>
            {action.details?.start_datetime && action.details?.end_datetime && (
              <p className="text-gray-600 mt-1">
                {new Date(action.details.start_datetime).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
                {' to '}
                {new Date(action.details.end_datetime).toLocaleTimeString([], {
                  timeStyle: 'short'
                })}
              </p>
            )}
            
            {action.details?.location && (
              <p className="text-gray-600 mt-1">
                <span className="font-medium">Location:</span> {action.details.location}
              </p>
            )}
            
            {action.details?.description && (
              <p className="text-gray-600 mt-1">
                <span className="font-medium">Description:</span> {action.details.description}
              </p>
            )}
          </div>
          
          {action.details?.htmlLink && (
            <a
              href={action.details.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-blue-600 hover:text-blue-800 text-sm"
            >
              View in Calendar
            </a>
          )}
        </div>
      );
    }
    
    // For pending events that need authorization
    if (action.type === 'calendar_event_needs_auth') {
      return (
        <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-yellow-800">Calendar Access Required</span>
          </div>
          
          <p className="mt-2 text-sm text-yellow-700">
            To create this event, you need to authorize calendar access.
          </p>
          
          <a
            href="/login"
            className="mt-2 inline-flex items-center px-3 py-1.5 border border-yellow-300 text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-50 hover:bg-yellow-100 focus:outline-none"
          >
            Authorize Access
          </a>
        </div>
      );
    }
    
    // For failed events
    if (action.type === 'calendar_event_failed') {
      return (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-red-800">Failed to Create Event</span>
          </div>
          
          <p className="mt-2 text-sm text-red-700">
            {action.details?.error || "There was an error creating your calendar event."}
          </p>
          
          <button
            onClick={() => setInput("Please try creating that calendar event again.")}
            className="mt-2 inline-flex items-center px-3 py-1.5 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none"
          >
            Try Again
          </button>
        </div>
      );
    }
    
    // For pending events
    if (action.type === 'calendar_event_pending') {
      return (
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium text-blue-800">Creating Event...</span>
          </div>
          
          <div className="mt-2 text-sm">
            <p className="font-medium text-gray-700">{action.details?.summary || "Event"}</p>
            {action.details?.start_datetime && action.details?.end_datetime && (
              <p className="text-gray-600 mt-1">
                {new Date(action.details.start_datetime).toLocaleString([], {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
                {' to '}
                {new Date(action.details.end_datetime).toLocaleTimeString([], {
                  timeStyle: 'short'
                })}
              </p>
            )}
            
            {action.details?.location && (
              <p className="text-gray-600 mt-1">
                <span className="font-medium">Location:</span> {action.details.location}
              </p>
            )}
          </div>
          
          <div className="mt-2 flex items-center">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent mr-2"></div>
            <span className="text-sm text-blue-600">Processing...</span>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
      {/* Chat header */}
      <div className="bg-white shadow-sm border-b border-gray-200 p-4">
        <div className="flex items-center">
          <div className="bg-blue-600 text-white p-2 rounded-lg mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h2 className="font-semibold text-gray-800">AI Assistant</h2>
            <p className="text-sm text-gray-500">Ask me anything or request specific actions</p>
          </div>
        </div>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="max-w-sm">Try these examples:</p>
            <div className="mt-4 grid gap-2">
              <button 
                onClick={() => setInput("Create a calendar event for a team meeting tomorrow at 3pm.")}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm border border-gray-200 rounded-lg text-left"
              >
                Create a calendar event for a team meeting tomorrow at 3pm
              </button>
              <button 
                onClick={() => setInput("Generate an image of a mountain landscape at sunset.")}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm border border-gray-200 rounded-lg text-left"
              >
                Generate an image of a mountain landscape at sunset
              </button>
              <button 
                onClick={() => setInput("How can you help me with task management?")}
                className="px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm border border-gray-200 rounded-lg text-left"
              >
                How can you help me with task management?
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div 
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-lg px-4 py-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white' 
                      : message.isError 
                        ? 'bg-red-50 text-red-800 border border-red-200' 
                        : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  {renderMessageContent(message)}
                  
                  <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Chat input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`ml-2 bg-blue-600 text-white rounded-lg p-2 ${
              isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <div className="h-5 w-5 flex items-center justify-center">
                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
              </div>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500 flex items-center">
          <span>Try asking about calendar events, image generation, or general assistance</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;