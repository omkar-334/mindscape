import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { Loader, Mic, Square } from 'lucide-react';
import { useVideo } from '../contexts/VideoContext';
import MentalHealthAnalysis from './MentalHealthAnalysis';

const API_URL = import.meta.env.VITE_API_URL;

const MentalHealthQuestionnaire = () => {
  const { user } = useAuth();
  const { setIsOnQuestionnaire, startRecording: startVideoRecording, stopRecording: stopVideoRecording } = useVideo();
  const [questions] = useState([
    "How have you been managing stress lately?",
    "What activities bring you joy and fulfillment?",
    "How would you describe your sleep patterns recently?",
    "What are your current goals and aspirations?"
  ]);
  
  const [recordings, setRecordings] = useState({});
  const [isRecording, setIsRecording] = useState({});
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});
  const [isQuestionnaireStarted, setIsQuestionnaireStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [completedQuestions, setCompletedQuestions] = useState(new Set());
  
  const mediaRecorders = useRef({});
  const audioStreams = useRef({});
  const audioChunks = useRef({});
  const audioContexts = useRef({});

  useEffect(() => {
    if (!user) return;

    const qSentimentsRef = collection(db, `users/${user.uid}/q_sentiments`);
    const qSentimentsQuery = query(qSentimentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(qSentimentsQuery, 
      (snapshot) => {
        const sentimentData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setAnalysis(sentimentData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching sentiment data:', error);
        setError('Failed to load analysis results');
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      cleanupAllAudioStreams();
    };
  }, [user]);

  const startNewQuestionnaire = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const qSentimentsRef = collection(db, `users/${user.uid}/q_sentiments`);
      const snapshot = await getDocs(qSentimentsRef);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      setRecordings({});
      setIsRecording({});
      setSaving({});
      setCurrentQuestionIndex(0);
      setCompletedQuestions(new Set());
      setIsQuestionnaireStarted(true);
      setIsOnQuestionnaire(true);
      startVideoRecording();
    } catch (err) {
      console.error('Error starting new questionnaire:', err);
      setError('Failed to start new questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const cleanupAudioStream = (questionIndex) => {
    if (audioStreams.current[questionIndex]) {
      audioStreams.current[questionIndex].getTracks().forEach(track => track.stop());
      audioStreams.current[questionIndex] = null;
    }
    if (mediaRecorders.current[questionIndex]) {
      if (mediaRecorders.current[questionIndex].state !== 'inactive') {
        mediaRecorders.current[questionIndex].stop();
      }
      mediaRecorders.current[questionIndex] = null;
    }
    if (audioContexts.current[questionIndex]) {
      audioContexts.current[questionIndex].close();
      audioContexts.current[questionIndex] = null;
    }
    audioChunks.current[questionIndex] = [];
  };

  const cleanupAllAudioStreams = () => {
    questions.forEach((_, index) => cleanupAudioStream(index));
  };

  const convertToWav = async (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length;
    
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, length * 2, true);
    
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

  const moveToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else if (completedQuestions.size === questions.length) {
      setIsQuestionnaireStarted(false);
      setIsOnQuestionnaire(false);
      stopVideoRecording();
    }
  };

  const startRecording = async (questionIndex) => {
    try {
      cleanupAudioStream(questionIndex);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100,
        }
      });

      audioStreams.current[questionIndex] = stream;
      audioChunks.current[questionIndex] = [];

      const recorder = new MediaRecorder(stream);
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current[questionIndex].push(event.data);
        }
      };

      mediaRecorders.current[questionIndex] = recorder;
      recorder.start(500);
      
      setIsRecording(prev => ({ ...prev, [questionIndex]: true }));
      setError(null);

    } catch (err) {
      console.error('Recording error:', err);
      setError(err.message);
      cleanupAudioStream(questionIndex);
      setIsRecording(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  const stopRecording = async (questionIndex) => {
    try {
      if (!mediaRecorders.current[questionIndex] || !isRecording[questionIndex]) return;
      
      mediaRecorders.current[questionIndex].stop();
      setIsRecording(prev => ({ ...prev, [questionIndex]: false }));
      
      await new Promise(resolve => {
        mediaRecorders.current[questionIndex].onstop = resolve;
      });

      const blob = new Blob(audioChunks.current[questionIndex]);
      const arrayBuffer = await blob.arrayBuffer();
      
      audioContexts.current[questionIndex] = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContexts.current[questionIndex].decodeAudioData(arrayBuffer);
      const wavBlob = await convertToWav(audioBuffer);
      
      setRecordings(prev => ({ ...prev, [questionIndex]: wavBlob }));
      setSaving(prev => ({ ...prev, [questionIndex]: true }));

      setCompletedQuestions(prev => new Set(prev).add(questionIndex));
      moveToNextQuestion();

      const formData = new FormData();
      formData.append('file', wavBlob, `audio-q${questionIndex}.wav`);
      formData.append('question_index', questionIndex.toString());

      const response = await fetch(`${API_URL}/analyze_audio?user_id=${user.uid}&q=${true}`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to analyze audio');
      }

      cleanupAudioStream(questionIndex);
      setSaving(prev => ({ ...prev, [questionIndex]: false }));

    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Failed to process audio. Please try again.');
      setSaving(prev => ({ ...prev, [questionIndex]: false }));
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center bg-yellow-50 rounded-lg">
        <p className="text-yellow-700">Please sign in to access the questionnaire.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <p>{error}</p>
        </div>
      )}

      {!isQuestionnaireStarted && (
        <div className="text-center">
          <button
            onClick={startNewQuestionnaire}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader className="w-5 h-5 animate-spin" />
                Starting...
              </span>
            ) : (
              'Start New Questionnaire'
            )}
          </button>
        </div>
      )}

      {isQuestionnaireStarted && (
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Mental Health Check-in</h1>
          
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div 
                key={index} 
                className={`p-4 border rounded-lg ${
                  index === currentQuestionIndex ? 'bg-purple-50 border-purple-200' : 
                  completedQuestions.has(index) ? 'bg-gray-50' : 'opacity-50'
                }`}
              >
                <h3 className="text-lg font-medium text-gray-800 mb-4">{question}</h3>
                
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => isRecording[index] ? stopRecording(index) : startRecording(index)}
                    className={`p-3 rounded-full ${
                      isRecording[index] 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    } text-white transition-colors`}
                    disabled={saving[index] || index !== currentQuestionIndex}
                  >
                    {isRecording[index] ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  
                  {recordings[index] && (
                    <span className="text-sm text-gray-600">
                      Audio recorded ({Math.round(recordings[index].size / 1024)} KB)
                    </span>
                  )}
                  
                  {isRecording[index] && (
                    <span className="text-sm text-red-600 animate-pulse">
                      Recording...
                    </span>
                  )}
                  
                  {saving[index] && (
                    <span className="text-sm text-purple-600 flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      ) : analysis.length > 0 ? (
        <MentalHealthAnalysis analysis={analysis} questions={questions} />
      ) : (
        <p className="text-center text-gray-600">
          No analysis results yet. Start a new questionnaire to see the analysis.
        </p>
      )}
    </div>
  );
};

export default MentalHealthQuestionnaire;