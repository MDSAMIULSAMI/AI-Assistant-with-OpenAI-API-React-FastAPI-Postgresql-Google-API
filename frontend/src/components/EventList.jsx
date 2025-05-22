import React from 'react';

const EventList = ({ events, onViewEvent, selectedEventId }) => {
  // Helper to format date and time
  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper to format just the date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper to determine if an event is an all-day event
  const isAllDayEvent = (event) => {
    return event.start?.date != null;
  };

  // Helper to format the time display based on event type
  const getEventTimeDisplay = (event) => {
    if (isAllDayEvent(event)) {
      return `All Day · ${formatDate(event.start.date)}`;
    }
    
    // For time-specific events
    if (event.start?.dateTime) {
      // Check if it's a multi-day event
      const startDate = new Date(event.start.dateTime).toDateString();
      const endDate = new Date(event.end.dateTime).toDateString();
      
      if (startDate !== endDate) {
        return `${formatDateTime(event.start.dateTime)} - ${formatDateTime(event.end.dateTime)}`;
      }
      
      // Same day event - show only hours
      const startTime = new Date(event.start.dateTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const endTime = new Date(event.end.dateTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `${formatDate(event.start.dateTime)}, ${startTime} - ${endTime}`;
    }
    
    return 'Time not specified';
  };

  if (events.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8 italic">
        No upcoming events found
      </p>
    );
  }

  return (
    <div className="w-full">
      {events.map(event => (
        <div 
          key={event.id} 
          className={`
            mb-4 p-4 rounded-lg transition-all duration-200 cursor-pointer
            hover:shadow-md border border-gray-100 
            ${event.id === selectedEventId 
              ? 'bg-indigo-50 border-indigo-200 shadow-md' 
              : 'bg-white hover:bg-gray-50'}
          `}
          onClick={() => onViewEvent(event)}
        >
          <div className="text-xs font-medium text-indigo-600 mb-1 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            {getEventTimeDisplay(event)}
          </div>
          <h3 className="font-medium text-gray-900 text-base mb-1 line-clamp-1">
            {event.summary}
          </h3>
          {event.location && (
            <div className="text-sm text-gray-600 flex items-center">
              <svg className="w-3 h-3 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EventList;