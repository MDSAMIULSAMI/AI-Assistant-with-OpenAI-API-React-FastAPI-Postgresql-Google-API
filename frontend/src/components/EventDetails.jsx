import React from 'react';

const EventDetails = ({ event, onEdit, onDelete }) => {
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-200 mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 sm:mb-0 pr-4">{event.summary}</h3>
        <div className="flex space-x-3 mt-2 sm:mt-0">
          <button 
            onClick={onEdit} 
            className="flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-1.5 text-gray-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </button>
          <button 
            onClick={onDelete} 
            className="flex items-center px-3 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="flex">
          <div className="flex-shrink-0 mr-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">When</div>
            <div className="text-base text-gray-800">
              {(event.start?.dateTime && event.end?.dateTime) 
                ? `${formatDateTime(event.start.dateTime)} to ${formatDateTime(event.end.dateTime)}` 
                : "All Day"}
            </div>
          </div>
        </div>
        
        {event.location && (
          <div className="flex">
            <div className="flex-shrink-0 mr-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Where</div>
              <div className="text-base text-gray-800">{event.location}</div>
            </div>
          </div>
        )}
        
        {event.description && (
          <div className="flex">
            <div className="flex-shrink-0 mr-4">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-500">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Description</div>
              <div className="text-base text-gray-800 whitespace-pre-wrap">{event.description}</div>
            </div>
          </div>
        )}
        
        <div className="flex">
          <div className="flex-shrink-0 mr-4">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-indigo-100 text-indigo-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Calendar</div>
            <div className="text-base text-gray-800">Primary Calendar</div>
          </div>
        </div>
        
        {event.htmlLink && (
          <div className="pt-4 mt-6 border-t border-gray-200">
            <a 
              href={event.htmlLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Google Calendar
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;