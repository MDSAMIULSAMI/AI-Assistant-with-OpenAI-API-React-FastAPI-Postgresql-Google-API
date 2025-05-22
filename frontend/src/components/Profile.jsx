import React from 'react';

const Profile = ({ user }) => {
  return (
    <div className="lg:col-span-1">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-center">
          {user?.picture ? (
            <img
              src={user.picture}
              alt="Profile"
              className="w-24 h-24 rounded-full border-4 border-white mx-auto"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-300 border-4 border-white mx-auto flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          )}
        </div>
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-gray-800">{user?.name || 'User'}</h2>
          <p className="text-gray-600 mt-1">{user?.email}</p>
          <div className="mt-6 py-2 border-t border-gray-100">
            <p className="text-sm text-gray-500">Account type</p>
            <p className="font-medium text-blue-600">Google Account</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;