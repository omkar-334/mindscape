import React from 'react';
import { Camera, StopCircle, X } from 'lucide-react';
import Webcam from 'react-webcam';
import { useVideo } from '../contexts/VideoContext';

const RecordingModal = ({ isOpen, onClose }) => {
  const { 
    isRecording, 
    webcamRef,
    error,
    processingFrames,
    startRecording, 
    stopRecording 
  } = useVideo();

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Emotion Analysis Recording</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isRecording ? 'Currently analyzing your emotions' : 'Start emotion analysis recording'}
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-gray-100 rounded-lg overflow-hidden">
            {isRecording ? (
              <Webcam
                ref={webcamRef}
                audio={false}
                className="w-full h-64 object-contain"
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: "user"
                }}
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-gray-200">
                <p className="text-gray-500">Camera preview will appear here</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-6 flex flex-col items-center">
            {isRecording ? (
              <>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                  <span className="text-red-600 font-medium">
                    {processingFrames ? 'Processing frame...' : 'Recording in progress'}
                  </span>
                </div>
                <button
                  onClick={stopRecording}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  <StopCircle className="w-5 h-5" />
                  <span>Stop Recording</span>
                </button>
              </>
            ) : (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>Start Recording</span>
              </button>
            )}
          </div>

          {isRecording && (
            <div className="text-sm text-gray-500 text-center mt-4">
              Click the stop button or press ESC to stop recording
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingModal;