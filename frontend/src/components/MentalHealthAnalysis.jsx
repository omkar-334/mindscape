import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar
} from 'recharts';
import { Brain, Heart, BarChart3 } from 'lucide-react';

const EmotionScoreCard = ({ title, score, icon: Icon }) => (
  <div className="bg-white rounded-lg p-6 shadow-md">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-purple-100 rounded-full">
        <Icon className="w-6 h-6 text-purple-600" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{score}/10</p>
      </div>
    </div>
  </div>
);

const AnalysisCard = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow-md overflow-hidden">
    <div className="p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  </div>
);

const MentalHealthAnalysis = ({ analysis, questions }) => {
  const processedData = useMemo(() => {
    // Filter audio entries and assign random question numbers
    const audioData = analysis
      .filter(item => item.type === 'audio')
      .map((item, index) => ({
        ...item,
        questionNumber: `Q${index + 1}`,
        question: questions[index] || `Question ${index + 1}`
      }));

    // Calculate overall emotional state
    const totalEmotions = audioData.reduce((acc, item) => {
      Object.entries(item.emotions).forEach(([emotion, value]) => {
        acc[emotion] = (acc[emotion] || 0) + value;
      });
      return acc;
    }, {});

    const emotionCount = audioData.length || 1;
    const averageEmotions = Object.entries(totalEmotions).map(([emotion, total]) => ({
      emotion,
      value: (total / emotionCount) * 100
    }));

    // Process data for line chart
    const chartData = audioData.map(item => ({
      questionNumber: item.questionNumber,
      question: item.question,
      ...Object.fromEntries(
        Object.entries(item.emotions).map(([key, value]) => [key, value * 100])
      )
    }));

    // Calculate mental state score (1-10)
    const positiveWeight = (totalEmotions.joy || 0) + (totalEmotions.neutral || 0);
    const negativeWeight = (totalEmotions.sadness || 0) + (totalEmotions.fear || 0) + 
                          (totalEmotions.anger || 0) + (totalEmotions.disgust || 0);
    const mentalStateScore = Math.min(Math.max(
      ((positiveWeight / emotionCount) * 10) - ((negativeWeight / emotionCount) * 5),
      1
    ), 10).toFixed(1);

    return {
      chartData,
      averageEmotions,
      mentalStateScore
    };
  }, [analysis, questions]);

  const emotionColors = {
    joy: "#22c55e",
    neutral: "#94a3b8",
    sadness: "#64748b",
    fear: "#dc2626",
    anger: "#b91c1c",
    disgust: "#854d0e",
    surprise: "#7c3aed"
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EmotionScoreCard 
          title="Mental Well-being Score" 
          score={processedData.mentalStateScore}
          icon={Brain}
        />
        <EmotionScoreCard 
          title="Emotional Balance" 
          score={(processedData.averageEmotions.find(e => e.emotion === 'neutral')?.value / 10 || 0).toFixed(1)}
          icon={Heart}
        />
        <EmotionScoreCard 
          title="Positivity Index" 
          score={(processedData.averageEmotions.find(e => e.emotion === 'joy')?.value / 10 || 0).toFixed(1)}
          icon={BarChart3}
        />
      </div>

      <AnalysisCard title="Emotional Pattern Analysis">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={processedData.averageEmotions}>
              <PolarGrid />
              <PolarAngleAxis dataKey="emotion" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar
                name="Emotional State"
                dataKey="value"
                stroke="#7c3aed"
                fill="#7c3aed"
                fillOpacity={0.3}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </AnalysisCard>

      <AnalysisCard title="Emotional Response by Question">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={processedData.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="questionNumber" 
                padding={{ left: 30, right: 30 }}
              />
              <YAxis 
                domain={[0, 100]}
                label={{ 
                  value: 'Emotion Level (%)', 
                  angle: -90, 
                  position: 'insideLeft'
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const questionData = processedData.chartData.find(
                      q => q.questionNumber === label
                    );
                    return (
                      <div className="bg-white p-4 shadow-lg rounded-lg border">
                        <p className="font-medium mb-2">{questionData.question}</p>
                        {payload.map((entry) => (
                          <div key={entry.name} className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="capitalize">{entry.name}:</span>
                            <span className="font-medium">
                              {entry.value.toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              {Object.entries(emotionColors).map(([emotion, color]) => (
                <Line
                  key={emotion}
                  type="monotone"
                  dataKey={emotion}
                  stroke={color}
                  name={emotion}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </AnalysisCard>
    </div>
  );
};

export default MentalHealthAnalysis;