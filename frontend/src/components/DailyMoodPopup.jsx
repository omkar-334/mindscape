import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const DailyMoodPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const moods = [
    { emoji: "😊", value: "Happy", label: "Happy" },
    { emoji: "😌", value: "Calm", label: "Calm" },
    { emoji: "😐", value: "Neutral", label: "Neutral" },
    { emoji: "😔", value: "Sad", label: "Sad" },
    { emoji: "😣", value: "Stressed", label: "Stressed" }
  ];

  useEffect(() => {
    const checkDailyMood = async () => {
      if (!user) return;

      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        const moodQuery = query(
          collection(db, `users/${user.uid}/moods`),
          where('date', '==', today)
        );

        const querySnapshot = await getDocs(moodQuery);
        
        if (querySnapshot.empty) {
          setShowPopup(true);
        }
      } catch (error) {
        console.error("Error checking mood:", error);
        setShowPopup(true);
      }
    };

    checkDailyMood();
  }, [user]);

  const handleMoodSelect = async (mood) => {
    setSelectedMood(mood);
    
    const moodData = {
      uid: user.uid,
      mood: mood.value,
      emoji: mood.emoji,
      createdAt: new Date().toISOString(),
      date: format(new Date(), 'yyyy-MM-dd')
    };

    try {
      const moodRef = doc(collection(db, `users/${user.uid}/moods`));
      await setDoc(moodRef, moodData);
    } catch (error) {
      console.error("Error saving mood:", error);
    }
  };

  const handleJournalRedirect = () => {
    setShowPopup(false);
    navigate('/journal');
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-xl">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          How are you feeling today?
        </h2>
        
        <div className="grid grid-cols-5 gap-4 mb-8">
          {moods.map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodSelect(mood)}
              className={`flex flex-col items-center p-4 rounded-lg transition-all ${
                selectedMood?.value === mood.value
                  ? 'bg-purple-100 ring-2 ring-purple-500'
                  : 'hover:bg-gray-100'
              }`}
            >
              <span className="text-4xl mb-2">{mood.emoji}</span>
              <span className="text-sm text-gray-600">{mood.label}</span>
            </button>
          ))}
        </div>

        {selectedMood && (
          <div className="text-center">
            <button
              onClick={handleJournalRedirect}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition"
            >
              Write about your day in your journal
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyMoodPopup;