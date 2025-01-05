import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Loader, Mic, Square } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const JournalEditor = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioStream = useRef(null);

  useEffect(() => {
    // Cleanup function to stop any active streams when component unmounts
    return () => {
      if (audioStream.current) {
        audioStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const cleanupAudioStream = () => {
    if (audioStream.current) {
      console.log('Cleaning up previous audio stream...');
      audioStream.current.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.label);
      });
      audioStream.current = null;
    }
    if (mediaRecorder.current) {
      if (mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      mediaRecorder.current = null;
    }
    audioChunks.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAudioStream();
    };
  }, []);

// Cleanup on unmount
useEffect(() => {
return () => {
  cleanupAudioStream();
};
}, []);

const startRecording = async () => {
try {
  // Clean up any existing streams first
  cleanupAudioStream();
  
  console.log('Requesting audio stream with new constraints...');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 44100,
    }
  });

  // Short delay to ensure previous streams are fully cleaned up
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('Audio stream obtained successfully');
  audioStream.current = stream;

  // Test the stream before creating MediaRecorder
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack || !audioTrack.enabled) {
    throw new Error('Audio track is not available or enabled');
  }

  console.log('Audio track settings:', audioTrack.getSettings());

  // Create and configure the media recorder
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('audio/webm') 
      ? 'audio/webm' 
      : 'audio/ogg'
  });

  mediaRecorder.current = recorder;
  audioChunks.current = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.current.push(event.data);
    }
  };

  recorder.onstop = () => {
    const chunks = audioChunks.current;
    const blob = new Blob(chunks, { type: recorder.mimeType });
    setAudioBlob(blob);
  };

  recorder.onerror = (event) => {
    console.error('MediaRecorder error:', event.error);
    cleanupAudioStream();
    setError('An error occurred while recording: ' + event.error.message);
    setIsRecording(false);
  };

  // Start recording with smaller chunks
  recorder.start(500);
  console.log('Recording started');
  setIsRecording(true);
  setError(null);

} catch (err) {
  console.error('Detailed recording error:', err);
  cleanupAudioStream();
  
  if (err.name === 'NotReadableError') {
    setError(
      'Could not access the microphone. Please try the following:\n' +
      '1. Close other apps that might be using the microphone\n' +
      '2. Refresh the page\n' +
      '3. Check if your microphone is properly connected'
    );
  } else if (err.name === 'NotAllowedError') {
    setError('Microphone access was denied. Please allow microphone access in your browser settings.');
  } else if (err.name === 'NotFoundError') {
    setError('No microphone found. Please connect a microphone and try again.');
  } else {
    setError(`Failed to start recording: ${err.message}`);
  }
  setIsRecording(false);
}
};

const stopRecording = () => {
try {
  if (mediaRecorder.current && isRecording) {
    mediaRecorder.current.stop();
    cleanupAudioStream();
    setIsRecording(false);
  }
} catch (err) {
  console.error('Error stopping recording:', err);
  setError('Failed to stop recording properly.');
  cleanupAudioStream();
  setIsRecording(false);
}
};

  const handleSave = async () => {
    if ((!currentEntry.trim() && !audioBlob) || !user) return;

    setSaving(true);
    setError(null);

    try {
      // Create the basic journal entry
      const docRef = await addDoc(collection(db, `users/${user.uid}/journal`), {
        content: currentEntry,
        createdAt: new Date(),
        userId: user.uid,
        hasAudio: !!audioBlob
      });

      // If there's audio, send it to the backend
      if (audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, `audio-${docRef.id}.wav`);
        formData.append('user_id', user.uid);
        formData.append('note_id', docRef.id);

        const audioResponse = await fetch(`${API_URL}/analyze_audio`, {
          method: 'POST',
          body: formData
        });

        if (!audioResponse.ok) {
          console.error('Audio analysis failed:', await audioResponse.text());
        }
      }

      // Send text analysis request if there's text content
      if (currentEntry.trim() && API_URL) {
        try {
          const postParams = new URLSearchParams();
          postParams.append('user_id', user.uid);
          postParams.append('note_id', docRef.id);
          
          const response = await fetch(`${API_URL}/analyze_note?${postParams.toString()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            console.error('Analysis failed:', await response.text());
          }
        } catch (analysisError) {
          console.error('Error analyzing entry:', analysisError);
        }
      }

      setCurrentEntry('');
      setAudioBlob(null);
    } catch (error) {
      setError('Failed to save journal entry. Please try again.');
      console.error('Error saving journal entry:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center bg-yellow-50 rounded-lg">
        <p className="text-yellow-700">Please sign in to access your journal.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <p>{error}</p>
          {error.includes('permission') && (
            <button 
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          )}
        </div>
      )}


      <div className="bg-white shadow rounded-lg p-6">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">My Journal</h2>
        </div>
        
        <div className="space-y-4">
          <textarea
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            placeholder="Write your thoughts here..."
            className="w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={saving}
          />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-full ${
                  isRecording 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-purple-600 hover:bg-purple-700'
                } text-white transition-colors`}
                disabled={saving}
              >
                {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              {audioBlob && (
                <span className="text-sm text-gray-600">
                  Audio recorded ({Math.round(audioBlob.size / 1024)} KB)
                </span>
              )}
              {isRecording && (
                <span className="text-sm text-red-600 animate-pulse">
                  Recording...
                </span>
              )}
            </div>

            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              disabled={(!currentEntry.trim() && !audioBlob) || saving}
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Previous Entries</h2>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-600 text-center py-8 bg-white shadow rounded-lg">
            No journal entries yet. Start writing!
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white shadow rounded-lg p-6">
                <div className="border-b pb-3 mb-3 text-sm text-gray-500">
                  {format(entry.createdAt.toDate(), 'MMMM d, yyyy - h:mm a')}
                  {entry.hasAudio && (
                    <span className="ml-2 text-purple-600">
                      • Contains audio recording
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalEditor;