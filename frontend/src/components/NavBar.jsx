import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useVideo } from '../contexts/VideoContext';
import { Camera, StopCircle } from 'lucide-react';
import RecordingModal from './RecordingModal';

const NavBar = () => {
  const { user, logout } = useAuth();
  const { isRecording, hasConsented, startRecording, stopRecording } = useVideo();
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const handleStartRecording = () => {
    startRecording();
  };

  const handleStopRecording = () => {
    stopRecording();
    setIsModalOpen(false);
  };

  if (['/login', '/signup'].includes(location.pathname)) {
    return null;
  }


  return (
    <>
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-xl font-bold text-purple-600">
                mindscape
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className={`${
                  location.pathname === '/'
                    ? 'border-purple-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Home
              </Link>
              
              <Link
                to="/forum"
                className={`${
                  location.pathname === '/forum'
                    ? 'border-purple-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Forum
              </Link>
              <Link
                to="/journal"
                className={`${
                  location.pathname === '/journal'
                    ? 'border-purple-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                My Journal
              </Link>
              <Link
                to="/support"
                className={`${
                  location.pathname === '/support'
                    ? 'border-purple-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Support
              </Link>
              <Link
                to="/analysis"
                className={`${
                  location.pathname === '/analysis'
                    ? 'border-purple-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Analysis
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="flex items-center space-x-4">
                {hasConsented && (
                  <div className="flex items-center mr-4">
                    <button
                      onClick={() => setIsModalOpen(true)}
                      className={`flex items-center gap-2 transition-colors ${
                        isRecording
                          ? 'text-red-600 hover:text-red-700'
                          : 'text-gray-600 hover:text-gray-700'
                      }`}
                      title={isRecording ? 'Recording in progress' : 'Start Recording'}
                    >
                      {isRecording ? (
                        <>
                          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                          <StopCircle className="w-4 h-4" />
                        </>
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                )}
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link to="/profile">
                    <span className="text-sm text-purple-700">
                      {user.displayName || user.email}
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
    <RecordingModal
    isOpen={isModalOpen}
    onClose={() => setIsModalOpen(false)}
    isRecording={isRecording}
    onStartRecording={handleStartRecording}
    onStopRecording={handleStopRecording}
  />
  </>
  );
};

export default NavBar;