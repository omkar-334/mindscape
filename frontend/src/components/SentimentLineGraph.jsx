import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SentimentLineGraph = ({ sentiments }) => {
  console.log('SentimentLineGraph - Initial sentiments:', sentiments);

  const dailyEmotions = useMemo(() => {
    if (!sentiments || !Array.isArray(sentiments)) {
      console.log('SentimentLineGraph - Invalid or empty sentiments array');
      return [];
    }

    const groupedByDate = sentiments.reduce((acc, sentiment) => {
      const dateObj = new Date(sentiment.createdAt);
      console.log('Processing date:', dateObj);
      
      if (isNaN(dateObj.getTime())) {
        console.log('Invalid date found:', sentiment.createdAt);
        return acc;
      }
      
      const date = dateObj.toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          joy: [],
          sadness: [],
          anger: [],
          fear: [],
          disgust: [],
          surprise: [],
          neutral: []
        };
      }
      
      if (sentiment.emotions && typeof sentiment.emotions === 'object') {
        Object.entries(sentiment.emotions).forEach(([emotion, score]) => {
          if (typeof score === 'number' && !isNaN(score)) {
            acc[date][emotion].push(score);
          }
        });
      }
      
      return acc;
    }, {});

    console.log('Grouped by date:', groupedByDate);

    const dailyAverages = Object.entries(groupedByDate).map(([date, data]) => {
      const averages = {
        date: date,
      };

      Object.entries(data).forEach(([emotion, scores]) => {
        if (Array.isArray(scores)) {
          averages[emotion] = scores.length > 0 
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;
        }
      });

      console.log(`Averages for ${date}:`, averages);
      return averages;
    });

    const sortedData = dailyAverages.sort((a, b) => new Date(a.date) - new Date(b.date));
    console.log('Final sorted data:', sortedData);
    return sortedData;
  }, [sentiments]);

  const emotionColors = {
    joy: "#22c55e",      
    surprise: "#f59e0b", 
    neutral: "#64748b", 
    disgust: "#eab308", 
    fear: "#7c3aed",     
    sadness: "#3b82f6",  
    anger: "#ef4444"     
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm text-gray-600 font-medium mb-2">
            {new Date(label).toLocaleDateString()}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {(entry.value * 100).toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96 bg-white rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Emotion Trends</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={dailyEmotions}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="text-gray-200" />
          <XAxis 
            dataKey="date" 
            tickFormatter={str => {
              try {
                return new Date(str).toLocaleDateString();
              } catch (e) {
                return str;
              }
            }}
            className="text-sm"
          />
          <YAxis
            domain={[0, 1]}
            tickFormatter={value => `${(value * 100).toFixed(0)}%`}
            className="text-sm"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {Object.entries(emotionColors).map(([emotion, color]) => (
            <Line
              key={emotion}
              type="monotone"
              dataKey={emotion}
              name={emotion.charAt(0).toUpperCase() + emotion.slice(1)}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SentimentLineGraph;