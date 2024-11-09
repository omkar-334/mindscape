import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../contexts/AuthContext';

const Analysis = () => {
  const { user } = useAuth();
  const [sentiments, setSentiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisResults, setAnalysisResults] = useState({
    totalEntries: 0,
    averageScores: {},
    dominantEmotion: '',
    recentTrend: '',
    highestScore: 0,
    lowestScore: 1
  });

  useEffect(() => {
    if (!user) return;

    const sentimentsRef = collection(db, `users/${user.uid}/sentiments`);
    const sentimentsQuery = query(sentimentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(sentimentsQuery, 
      (snapshot) => {
        try {
          const sentimentData = [];
          snapshot.forEach((doc) => {
            sentimentData.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate()
            });
          });
          setSentiments(sentimentData);
          analyzeData(sentimentData);
          setLoading(false);
        } catch (err) {
          setError('Error fetching sentiment data');
          setLoading(false);
        }
      },
      (err) => {
        setError('Error fetching sentiment data: ' + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const analyzeData = (data) => {
    if (!data.length) return;

    const emotionTotals = {};
    const emotionCounts = {};
    let totalScore = 0;
    let highest = 0;
    let lowest = 1;

    data.forEach(entry => {
      highest = Math.max(highest, entry.score);
      lowest = Math.min(lowest, entry.score);
      totalScore += entry.score;

      Object.entries(entry.emotions).forEach(([emotion, value]) => {
        emotionTotals[emotion] = (emotionTotals[emotion] || 0) + value;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });

    const averageScores = {};
    Object.keys(emotionTotals).forEach(emotion => {
      averageScores[emotion] = emotionTotals[emotion] / emotionCounts[emotion];
    });

    const dominantEmotion = Object.entries(averageScores)
      .sort(([,a], [,b]) => b - a)[0][0];

    const recentEntries = data.slice(0, 5);
    const trend = recentEntries.length > 1 
      ? recentEntries[0].score > recentEntries[recentEntries.length - 1].score
        ? 'Improving'
        : 'Declining'
      : 'Not enough data';

    setAnalysisResults({
      totalEntries: data.length,
      averageScores,
      dominantEmotion,
      recentTrend: trend,
      highestScore: highest,
      lowestScore: lowest,
      averageScore: totalScore / data.length
    });
  };

  if (loading) {
    return <div className="p-8">Loading analysis...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Sentiment Analysis</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Overall Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded shadow">
            <p className="text-gray-600">Total Entries</p>
            <p className="text-2xl font-bold">{analysisResults.totalEntries}</p>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <p className="text-gray-600">Recent Trend</p>
            <p className="text-2xl font-bold">{analysisResults.recentTrend}</p>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <p className="text-gray-600">Highest Score</p>
            <p className="text-2xl font-bold">{analysisResults.highestScore.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <p className="text-gray-600">Lowest Score</p>
            <p className="text-2xl font-bold">{analysisResults.lowestScore.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Emotion Averages</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(analysisResults.averageScores).map(([emotion, score]) => (
            <div key={emotion} className="p-4 bg-white rounded shadow">
              <p className="text-gray-600 capitalize">{emotion}</p>
              <p className="text-2xl font-bold">{(score * 100).toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Entries</h2>
        <div className="bg-white rounded shadow">
          {sentiments.map((sentiment) => (
            <div key={sentiment.id} className="p-6 border-b last:border-b-0">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500">
                    {sentiment.createdAt.toLocaleDateString()} {sentiment.createdAt.toLocaleTimeString()}
                  </p>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                      Type: {sentiment.type}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                      Score: {sentiment.score.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold capitalize">
                    Dominant: {Object.entries(sentiment.emotions)
                      .sort(([,a], [,b]) => b - a)[0][0]}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4">{sentiment.content}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(sentiment.emotions).map(([emotion, value]) => (
                  <div key={emotion} className="text-sm">
                    <span className="capitalize text-gray-600">{emotion}:</span>
                    <span className="ml-1 font-medium">{(value * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analysis;