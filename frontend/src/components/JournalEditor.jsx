import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
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
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const audioStream = useRef(null);
  const audioContext = useRef(null);
  const unsubscribeRef = useRef(null);

  const convertToWav = async (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    // Create WAV header
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // Write WAV header
    // "RIFF" chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(view, 8, 'WAVE');
    
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Write audio data
    const data = new Int16Array(buffer, 44, length);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.max(-1, Math.min(1, channelData[i])) * 0x7FFF;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const cleanupAudioStream = () => {
    if (audioStream.current) {
      audioStream.current.getTracks().forEach(track => track.stop());
      audioStream.current = null;
    }
    if (mediaRecorder.current) {
      if (mediaRecorder.current.state !== 'inactive') {
        mediaRecorder.current.stop();
      }
      mediaRecorder.current = null;
    }
    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }
    audioChunks.current = [];
  };

  useEffect(() => {
    return () => {
      cleanupAudioStream();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Fetch entries (unchanged)
  useEffect(() => {
    const fetchEntries = async () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        const journalRef = collection(db, `users/${user.uid}/journal`);
        const q = query(journalRef, orderBy('createdAt', 'desc'));

        try {
          const snapshot = await getDocs(q);
          const journalEntries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEntries(journalEntries);
          setLoading(false);
        } catch (e) {
          console.error('Error getting initial documents:', e);
          throw e;
        }

        const unsub = onSnapshot(q, 
          (snapshot) => {
            const journalEntries = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setEntries(journalEntries);
            setLoading(false);
          },
          (error) => {
            console.error('Snapshot listener error:', error);
            setError('Failed to load journal entries. Please refresh the page.');
            setLoading(false);
          }
        );

        unsubscribeRef.current = unsub;
      } catch (err) {
        console.error('Error in fetchEntries:', err);
        setError('Failed to load journal entries. Please check your connection and try again.');
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user]);

  const startRecording = async () => {
    try {
      cleanupAudioStream();
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
        }
      });

      audioStream.current = stream;
      audioChunks.current = [];

      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current = recorder;
      recorder.start(500);

      setIsRecording(true);
      setError(null);

    } catch (err) {
      console.error('Recording error:', err);
      cleanupAudioStream();
      
      if (err.name === 'NotAllowedError') {
        setError('Microphone access was denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else {
        setError(`Failed to start recording: ${err.message}`);
      }
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.stop();
        setIsRecording(false);
        
        // Wait for all chunks to be captured
        await new Promise(resolve => {
          mediaRecorder.current.onstop = resolve;
        });

        // Create blob from chunks
        const blob = new Blob(audioChunks.current);
        
        // Convert blob to array buffer
        const arrayBuffer = await blob.arrayBuffer();
        
        // Create audio context
        audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
        
        // Decode audio data
        const audioBuffer = await audioContext.current.decodeAudioData(arrayBuffer);
        
        // Convert to WAV
        const wavBlob = await convertToWav(audioBuffer);
        setAudioBlob(wavBlob);
        
        cleanupAudioStream();
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
      setError('Failed to process audio. Please try again.');
      cleanupAudioStream();
      setIsRecording(false);
    }
  };

  const handleSave = async () => {
    if ((!currentEntry.trim() && !audioBlob) || !user) return;

    setSaving(true);
    setError(null);

    try {
      const docRef = await addDoc(collection(db, `users/${user.uid}/journal`), {
        content: currentEntry,
        createdAt: new Date(),
        userId: user.uid,
        hasAudio: !!audioBlob
      });

      if (audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, `audio-${docRef.id}.wav`);

        const audioResponse = await fetch(`${API_URL}/analyze_audio?user_id=${user.uid}`, {
          method: 'POST',
          body: formData
        });

        if (!audioResponse.ok) {
          console.error('Audio analysis failed:', await audioResponse.text());
        }
      }

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
          <p className="whitespace-pre-line">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Refresh Page
          </button>
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
          <div className="flex flex-col items-center justify-center p-8">
            <Loader className="w-8 h-8 animate-spin text-purple-600" />
            <p className="mt-2 text-gray-600">Loading your journal entries...</p>
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