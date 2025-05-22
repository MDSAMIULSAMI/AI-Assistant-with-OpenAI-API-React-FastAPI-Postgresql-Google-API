import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Swal from 'sweetalert2';
import EventForm from './EventForm';
import EventList from './EventList';
import EventDetails from './EventDetails';

const Calendar = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('create'); // 'create' or 'edit'
  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:8000/api/calendar/events', {
        params: { 
          token,
          timeMin: new Date().toISOString() // Only fetch future events
        }
      });
      setEvents(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load calendar events. Please check permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setFormMode('create');
    setShowForm(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setFormMode('edit');
    setShowForm(true);
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
    setShowForm(false);
  };

  const handleDeleteEvent = async (eventId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "Do you really want to delete this event?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',  // Indigo color to match our theme
      cancelButtonColor: '#dc2626',   // Red color for cancel
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });
  
    if (!result.isConfirmed) {
      return; // User canceled
    }
  
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/api/calendar/events/${eventId}`, {
        params: { token }
      });
  
      // Optional: Show success message after delete
      await Swal.fire(
        'Deleted!',
        'Your event has been deleted.',
        'success'
      );
  
      // Refresh events list
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      console.error('Error deleting event:', err);
      setError('Failed to delete event.');
      // Optional: Show error message if delete fails
      await Swal.fire(
        'Error!',
        'Failed to delete the event.',
        'error'
      );
    }
  };

  const handleFormSubmit = async (eventData) => {
    try {
      const token = localStorage.getItem('token');
      
      if (formMode === 'create') {
        await axios.post('http://localhost:8000/api/calendar/events', eventData, {
          params: { token }
        });
      } else {
        await axios.patch(`http://localhost:8000/api/calendar/events/${selectedEvent.id}`, eventData, {
          params: { token }
        });
      }
      
      setShowForm(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      console.error('Error saving event:', err);
      setError(`Failed to ${formMode === 'create' ? 'create' : 'update'} event.`);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0 flex items-center">
          <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          {user.name}'s Calendar
        </h2>
        <button 
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          onClick={handleCreateEvent}
        >
          <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 4v16m8-8H4"></path>
          </svg>
          Add New Event
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex flex-col lg:flex-row">
        <div className="w-full lg:w-1/3 lg:pr-6 mb-6 lg:mb-0">
          <div className="bg-white rounded-lg shadow-md p-4 h-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 9l-7 7-7-7"></path>
              </svg>
              Upcoming Events
            </h3>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : (
              <EventList 
                events={events} 
                onViewEvent={handleViewEvent}
                selectedEventId={selectedEvent?.id} 
              />
            )}
          </div>
        </div>
        
        <div className="w-full lg:w-2/3">
          {showForm ? (
            <EventForm 
              mode={formMode}
              initialData={selectedEvent}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
            />
          ) : selectedEvent ? (
            <EventDetails 
              event={selectedEvent}
              onEdit={() => handleEditEvent(selectedEvent)}
              onDelete={() => handleDeleteEvent(selectedEvent.id)}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-500">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p className="text-lg">Select an event from the list or create a new one</p>
                <button 
                  className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                  onClick={handleCreateEvent}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 4v16m8-8H4"></path>
                  </svg>
                  Create New Event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;