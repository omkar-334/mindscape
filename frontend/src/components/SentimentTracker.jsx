import React, { useState, useEffect } from 'react';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, isValid } from 'date-fns';

const SentimentTracker = ({ sentiments }) => {
  console.log('SentimentTracker - Initial sentiments:', sentiments);
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [groupedSentiments, setGroupedSentiments] = useState({});

  useEffect(() => {
    console.log('SentimentTracker - Effect triggered with sentiments:', sentiments);
    
    if (!sentiments || !Array.isArray(sentiments)) {
      console.log('SentimentTracker - Invalid or empty sentiments array');
      return;
    }
    
    const grouped = sentiments.reduce((acc, sentiment) => {
      console.log('Processing sentiment:', sentiment);
      
      if (!sentiment.createdAt) {
        console.log('Missing createdAt:', sentiment);
        return acc;
      }
      
      const dateObj = new Date(sentiment.createdAt);
      console.log('Created date object:', dateObj);
      
      if (!isValid(dateObj)) {
        console.log('Invalid date:', sentiment.createdAt);
        return acc;
      }
      
      const date = format(dateObj, 'yyyy-MM-dd');
      console.log('Formatted date:', date);
      
      if (!acc[date]) acc[date] = [];
      acc[date].push(sentiment);
      return acc;
    }, {});
    
    console.log('Final grouped sentiments:', grouped);
    setGroupedSentiments(grouped);
  }, [sentiments]);

  const getDominantEmotion = (emotions) => {
    console.log('Getting dominant emotion for:', emotions);
    
    if (!emotions || typeof emotions !== 'object') {
      console.log('Invalid emotions object');
      return 'neutral';
    }
    
    try {
      const emotionEntries = Object.entries(emotions);
      const dominant = emotionEntries.reduce((max, current) => 
        (current[1] > max[1]) ? current : max
      , ['neutral', -1])[0];
      
      console.log('Dominant emotion:', dominant);
      return dominant;
    } catch (e) {
      console.error('Error calculating dominant emotion:', e);
      return 'neutral';
    }
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      joy: 'bg-green-200',
      sadness: 'bg-blue-200',
      anger: 'bg-red-200',
      fear: 'bg-purple-200',
      disgust: 'bg-yellow-200',
      surprise: 'bg-pink-200',
      neutral: 'bg-gray-200'
    };
    return colors[emotion] || 'bg-gray-100';
  };

  const getEmotionSymbol = (emotion) => {
    const symbols = {
      joy: '😊',
      sadness: '😢',
      anger: '😠',
      fear: '😨',
      disgust: '🤢',
      surprise: '😮',
      neutral: '😐'
    };
    return symbols[emotion] || '•';
  };

  const renderMonthGrid = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayEntries = groupedSentiments[dateStr] || [];
          const hasEntries = dayEntries.length > 0;
          
          return (
            <div
              key={dateStr}
              className={`
                relative h-16 p-1 border rounded-lg
                ${hasEntries ? 'border-gray-300' : 'border-gray-100'}
                hover:border-blue-500 transition-colors
              `}
            >
              <div className="text-xs text-gray-500 mb-1">{format(day, 'd')}</div>
              {hasEntries && (
                <div className="flex flex-wrap gap-1">
                  {dayEntries.map((entry, i) => {
                    const emotion = getDominantEmotion(entry.emotions);
                    return (
                      <div
                        key={i}
                        className={`
                          w-4 h-4 rounded-full ${getEmotionColor(emotion)}
                          flex items-center justify-center text-xs
                          cursor-pointer transition-transform hover:scale-125
                        `}
                        title={`${emotion} (${((entry.emotions?.[emotion] || 0) * 100).toFixed(1)}%)`}
                      >
                        {getEmotionSymbol(emotion)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Emotion Tracker</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() - 1)))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ←
          </button>
          <span className="font-medium">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setCurrentMonth(prev => new Date(prev.setMonth(prev.getMonth() + 1)))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            →
          </button>
        </div>
      </div>

      {renderMonthGrid()}

      <div className="mt-6 flex flex-wrap gap-4">
        {['joy', 'sadness', 'anger', 'fear', 'disgust', 'surprise', 'neutral'].map(emotion => (
          <div key={emotion} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${getEmotionColor(emotion)}`} />
            <span className="text-sm text-gray-600 capitalize">{emotion}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentimentTracker;