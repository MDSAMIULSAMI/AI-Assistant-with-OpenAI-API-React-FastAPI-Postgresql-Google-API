import React, { useState, useEffect } from 'react';

const EventForm = ({ mode, initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    location: '',
    start_datetime: '',
    end_datetime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // User's local timezone
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      // Convert Google Calendar format to our form format
      setFormData({
        summary: initialData.summary || '',
        description: initialData.description || '',
        location: initialData.location || '',
        start_datetime: formatDateTimeForInput(initialData.start?.dateTime),
        end_datetime: formatDateTimeForInput(initialData.end?.dateTime),
        timezone: initialData.start?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
      });
    } else {
      // For new events, set default times (1 hour from now)
      const now = new Date();
      const oneHourLater = new Date(now);
      oneHourLater.setHours(now.getHours() + 1);
      
      setFormData({
        ...formData,
        start_datetime: formatDateTimeForInput(now),
        end_datetime: formatDateTimeForInput(oneHourLater)
      });
    }
  }, [mode, initialData]);
  
  // Helper to format datetime for input fields
  const formatDateTimeForInput = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toISOString().slice(0, 16); // Format: "YYYY-MM-DDThh:mm"
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.summary.trim()) {
      newErrors.summary = 'Title is required';
    }
    
    if (!formData.start_datetime) {
      newErrors.start_datetime = 'Start time is required';
    }
    
    if (!formData.end_datetime) {
      newErrors.end_datetime = 'End time is required';
    } else if (new Date(formData.start_datetime) >= new Date(formData.end_datetime)) {
      newErrors.end_datetime = 'End time must be after start time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        ...formData,
        start_datetime: new Date(formData.start_datetime),
        end_datetime: new Date(formData.end_datetime)
      });
    }
  };
  
  return (
    <div className="w-full max-w-lg mx-auto bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-3 flex items-center">
        <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        {mode === 'create' ? 'Create New Event' : 'Edit Event'}
      </h3>
      
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="summary"
            name="summary"
            value={formData.summary}
            onChange={handleChange}
            placeholder="Add title"
            className={`w-full rounded-md border-gray-300 shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500 
              ${errors.summary ? 'border-red-300 bg-red-50' : 'border'}`}
          />
          {errors.summary && <p className="mt-1 text-sm text-red-600">{errors.summary}</p>}
        </div>
        
        <div>
          <label htmlFor="start_datetime" className="block text-sm font-medium text-gray-700 mb-1">
            Start time <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <input
              type="datetime-local"
              id="start_datetime"
              name="start_datetime"
              value={formData.start_datetime}
              onChange={handleChange}
              className={`w-full rounded-md border pl-10 shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.start_datetime ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            />
          </div>
          {errors.start_datetime && <p className="mt-1 text-sm text-red-600">{errors.start_datetime}</p>}
        </div>
        
        <div>
          <label htmlFor="end_datetime" className="block text-sm font-medium text-gray-700 mb-1">
            End time <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <input
              type="datetime-local"
              id="end_datetime"
              name="end_datetime"
              value={formData.end_datetime}
              onChange={handleChange}
              className={`w-full rounded-md border pl-10 shadow-sm px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.end_datetime ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
            />
          </div>
          {errors.end_datetime && <p className="mt-1 text-sm text-red-600">{errors.end_datetime}</p>}
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Add location"
              className="w-full rounded-md border-gray-300 shadow-sm px-4 pl-10 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <div className="relative">
            <div className="absolute top-3 left-3 flex items-start pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </div>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Add description"
              rows="4"
              className="w-full rounded-md border-gray-300 shadow-sm px-4 pl-10 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button 
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {mode === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EventForm;