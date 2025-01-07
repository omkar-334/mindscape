import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useAuth } from '../contexts/AuthContext';

const VideoContext = createContext();

export const VideoProvider = ({ children }) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [hasConsented, setHasConsented] = useState(false);
  const [showConsentPopup, setShowConsentPopup] = useState(true);
  const [processingFrames, setProcessingFrames] = useState(false);
  const webcamRef = useRef(null);
  const frameInterval = useRef(null);
  const [error, setError] = useState(null);

  // Helper function to convert base64 to blob
  const base64ToBlob = (base64) => {
    const byteString = atob(base64.split(',')[1]);
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    // Add name property to match File interface
    blob.name = `frame-${new Date().getTime()}.jpg`;
    return blob;
  };

  const captureAndSendFrame = async () => {
    if (webcamRef.current && !processingFrames) {
      setProcessingFrames(true);
      try {
        
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          // Convert base64 to blob
          const imageBlob = base64ToBlob(imageSrc);
          
          // Create FormData and append the image as 'file'
          const formData = new FormData();
          formData.append('file', imageBlob, imageBlob.name);
          

          // Log the data being sent
          console.log('Sending frame data:', {
            timestamp: new Date().toISOString(),
            imageSize: `${(imageBlob.size / 1024).toFixed(2)} KB`,
            imageType: imageBlob.type,
            fileName: imageBlob.name
          });

          const url = `${import.meta.env.VITE_API_URL}/analyze_image?file=${formData}&user_id=${user.uid}&q=${false}`;
          console.log(url)

          const response = await fetch(`${import.meta.env.VITE_API_URL}/analyze_image?user_id=${user.uid}&q=${false}`,{
          method: 'POST',
          body: formData
        
      });

      
          if (!response.ok) {
            throw new Error(`Failed to analyze video frame: ${await response.text()}`);
          }

          // Log the response
          const responseData = await response.json();
          console.log('Response from server:', responseData);
        }
      } catch (error) {
        console.error('Error sending video frame:', error);
        setError(error.message);
      } finally {
        setProcessingFrames(false);
      }
    }
  };

  const startRecording = useCallback(() => {
    setError(null);
    setIsRecording(true);
    console.log('Starting recording...');
    frameInterval.current = setInterval(captureAndSendFrame, 10000);
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    console.log('Stopping recording...');
    if (frameInterval.current) {
      clearInterval(frameInterval.current);
      frameInterval.current = null;
    }
  }, []);

  const giveConsent = useCallback(() => {
    setHasConsented(true);
    setShowConsentPopup(false);
  }, []);

  const denyConsent = useCallback(() => {
    setHasConsented(false);
    setShowConsentPopup(false);
  }, []);

  return (
    <VideoContext.Provider 
      value={{
        isRecording,
        hasConsented,
        showConsentPopup,
        webcamRef,
        error,
        processingFrames,
        setHasConsented,
        setShowConsentPopup,
        startRecording,
        stopRecording,
        giveConsent,
        denyConsent
      }}
    >
      {children}
      {isRecording && (
        <div className="hidden">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: "user"
            }}
          />
        </div>
      )}
    </VideoContext.Provider>
  );
};

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};