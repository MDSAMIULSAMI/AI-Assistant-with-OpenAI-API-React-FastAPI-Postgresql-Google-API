import React, { useState } from 'react';

const Sidebar = ({ onDemoSelect, onChatSelect, activeChatId, chatSessions }) => {
  const [activeDemo, setActiveDemo] = useState(null);
  
  const demos = [
    { id: 1, name: 'Personal Assistant', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 2, name: 'Calendar Manager', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { id: 3, name: 'Task Planner', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 4, name: 'Image Generator', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' }
  ];
  
  const handleDemoClick = (demo) => {
    setActiveDemo(demo.id);
    if (onDemoSelect) {
      onDemoSelect(demo);
    }
  };

  const handleChatClick = (sessionId) => {
    if (onChatSelect) {
      onChatSelect(sessionId);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  
  return (
    <div className="bg-white border-r border-gray-200 w-64 flex-shrink-0 h-full shadow-sm flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
        <p className="text-sm text-gray-500">Chat and AI capabilities</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* Chat Sessions */}
        <div className="py-2">
          <div className="px-4 py-2 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-500">RECENT CHATS</h3>
            <button 
              onClick={() => onChatSelect('new')}
              className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <ul className="mt-1">
            {chatSessions && chatSessions.map((session) => (
              <li key={session.session_id}>
                <button
                  className={`w-full flex items-center px-4 py-2 text-left ${
                    activeChatId === session.session_id
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleChatClick(session.session_id)}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-3" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" 
                    />
                  </svg>
                  <div className="flex-1 truncate">
                    <span className="font-medium text-sm">{session.title}</span>
                    <span className="text-xs text-gray-400 ml-2">
                      {formatDate(session.last_activity)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Capabilities */}
        <div className="py-2">
          <div className="px-4 py-2">
            <h3 className="text-sm font-medium text-gray-500">CAPABILITIES</h3>
          </div>
          <ul>
            {demos.map((demo) => (
              <li key={demo.id}>
                <button
                  className={`w-full flex items-center px-4 py-2 text-left ${
                    activeDemo === demo.id
                      ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => handleDemoClick(demo)}
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-3" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={demo.icon} 
                    />
                  </svg>
                  <span className="text-sm">{demo.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="p-4 mt-auto border-t border-gray-200">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 font-medium">AI Assistant</p>
          <p className="text-xs text-gray-500 mt-1">Ask me anything about your calendar, tasks, or generate creative content</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;