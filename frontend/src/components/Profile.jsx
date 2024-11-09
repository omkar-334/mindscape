import React, { useState, useEffect } from 'react';
import { BarChart2, MapPin, Calendar, Award, Book, Heart, Phone, UserX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { doc, collection, query, orderBy, getDocs, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { format, eachDayOfInterval, subDays, startOfWeek, addWeeks } from 'date-fns';
import SentimentTracker from './SentimentTracker';
import SentimentLineGraph from './SentimentLineGraph';

const Profile = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState(null);
  const [moodData, setMoodData] = useState(null);
  const [journalCount, setJournalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sentiments, setSentiments] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time listener for journal entries
    const journalRef = collection(db, `users/${user.uid}/journal`);
    const unsubscribe = onSnapshot(journalRef, (snapshot) => {
      setJournalCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
  
    const sentimentsRef = collection(db, `users/${user.uid}/sentiments`);
    const unsubscribeSentiments = onSnapshot(sentimentsRef, (snapshot) => {
      const sentimentData = [];
      snapshot.forEach((doc) => {
        sentimentData.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });
      setSentiments(sentimentData);
    });
  
    return () => unsubscribeSentiments();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserData({
          ...data,
          joinedDate: new Date(data.createdAt?.toDate()).toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })
        });
        setIsAnonymous(data.isAnonymous || false);
      }
    });

    const moodRef = collection(db, `users/${user.uid}/moods`);
    const unsubscribeMood = onSnapshot(moodRef, (snapshot) => {
      const moods = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const moodScores = {
          'Happy': 5,
          'Calm': 4,
          'Neutral': 3,
          'Sad': 2,
          'Stressed': 1
        };
        
        const date = data.date;
        if (date) {
          moods[date] = moodScores[data.mood] || 0;
        }
      });
      setMoodData(moods);
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribeMood();
    };
  }, [user]);

  const generateAnonymousName = () => {
    const randomNum = Math.floor(10000 + Math.random() * 90000); 
    return `user_${randomNum}`;
  };


  const toggleAnonymous = async () => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const newAnonymousState = !isAnonymous;
    const updates = {
      isAnonymous: newAnonymousState
    };

    if (newAnonymousState) {
      updates.anonymousName = generateAnonymousName();
    }

    try {
      await updateDoc(userRef, updates);
      setIsAnonymous(newAnonymousState);
      setUserData(prev => ({
        ...prev,
        ...updates
      }));
    } catch (error) {
      console.error('Error updating anonymous status:', error);
    }
  };

  const [localResources] = useState([
    {
      name: "Dr. Emily Chen",
      specialty: "Clinical Psychologist",
      distance: "0.8 miles",
      address: "123 Health St, San Francisco",
      phone: "(415) 555-0123"
    },
    {
      name: "Bay Area Mental Wellness Center",
      specialty: "Mental Health Clinic",
      distance: "1.2 miles",
      address: "456 Care Ave, San Francisco",
      phone: "(415) 555-0124"
    },
    {
      name: "Mind & Body Therapy",
      specialty: "Holistic Mental Health",
      distance: "1.5 miles",
      address: "789 Wellness Blvd, San Francisco",
      phone: "(415) 555-0125"
    }
  ]);

  const getContributionColor = (value) => {
    const colors = {
      0: 'bg-gray-100',
      1: 'bg-red-200',
      2: 'bg-orange-200',
      3: 'bg-yellow-200',
      4: 'bg-green-200',
      5: 'bg-green-400'
    };
    return colors[value] || 'bg-gray-100';
  };

  const calculateStreak = (moodData) => {
    if (!moodData) return 0;
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      if (moodData[dateStr]) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const renderMoodGraph = () => {
    const today = new Date();
    const startDate = subDays(today, 51 * 7); 
    const endDate = today;
    
    const dates = eachDayOfInterval({ start: startDate, end: endDate });
    
    const weeks = [];
    let currentWeek = [];
    
    const firstDay = startDate.getDay();
    
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }
    
    dates.forEach((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      currentWeek.push({
        date: dateStr,
        value: moodData?.[dateStr] || 0
      });
      
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    const rows = Array(7).fill().map((_, rowIndex) => 
      weeks.map(week => week[rowIndex])
    );

    return (
      <div className="inline-grid grid-rows-7 grid-flow-col gap-1">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-1">
            {row.map((cell, colIndex) => 
              cell === null ? (
                <div key={`${rowIndex}-${colIndex}`} className="w-3 h-3" />
              ) : (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-3 h-3 rounded-sm ${getContributionColor(cell.value)} transform hover:scale-125 transition-transform`}
                  title={`${cell.date}: ${cell.value === 0 ? 'No entry' : `Mood level: ${cell.value}`}`}
                />
              )
            )}
          </div>
        ))}
      </div>
    );
  };

  if (loading || !userData) {
    return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">Loading...</div>;
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  const currentMoodEntry = moodData?.[today];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-3xl p-8 mb-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-6">
            {userData.photoURL && !isAnonymous ? (
              <img 
                src={userData.photoURL} 
                alt={userData.displayName} 
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                {isAnonymous ? 'A' : userData.displayName?.charAt(0) || 'A'}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {isAnonymous ? userData.anonymousName : userData.displayName}
              </h1>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {userData.location || 'Location not set'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Joined {userData.joinedDate}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggleAnonymous}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isAnonymous 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <UserX className="w-4 h-4" />
              {isAnonymous ? 'Disable Anonymous Mode' : 'Enable Anonymous Mode'}
            </button>
            {isAnonymous && (
              <span className="text-sm text-gray-600">
                Appearing as: {userData.anonymousName}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-pink-500" />
            <h3 className="font-semibold text-gray-700">Current Mood</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {currentMoodEntry ? `Level ${currentMoodEntry}` : 'Not tracked today'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-700">Average Mood</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {Object.values(moodData || {}).length > 0 
              ? (Object.values(moodData).reduce((a, b) => a + b, 0) / Object.values(moodData).length).toFixed(1)
              : 'N/A'}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-gray-700">Current Streak</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {calculateStreak(moodData)} days
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Book className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold text-gray-700">Total Entries</h3>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {journalCount}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Your Mood Journey</h2>
        <div className="overflow-x-auto pb-4">
          {renderMoodGraph()}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-gray-600">Less</span>
          {[0, 1, 2, 3, 4, 5].map(level => (
            <div
              key={level}
              className={`w-3 h-3 rounded-sm ${getContributionColor(level)}`}
            />
          ))}
          <span className="text-sm text-gray-600">More</span>
        </div>
      </div>

      <SentimentTracker sentiments={sentiments} />
      <SentimentLineGraph sentiments={sentiments} />

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Local Mental Health Resources</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {localResources.map((resource, index) => (
            <div 
              key={index}
              className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
            >
              <h3 className="font-semibold text-gray-800 mb-2">{resource.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{resource.specialty}</p>
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                <MapPin className="w-4 h-4" />
                <span>{resource.distance}</span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{resource.address}</p>
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Phone className="w-4 h-4" />
                <a href={`tel:${resource.phone}`}>{resource.phone}</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <h3 className="text-xl font-semibold mb-4">Self-Care Resources</h3>
          <ul className="space-y-2 mb-4">
            <li>• Guided Meditation Library</li>
            <li>• Breathing Exercises</li>
            <li>• Sleep Hygiene Guide</li>
            <li>• Stress Management Tips</li>
          </ul>
          <button className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition">
            Explore Resources
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-xl font-semibold mb-4">Crisis Support</h3>
          <ul className="space-y-2 mb-4">
            <li>• 24/7 Crisis Hotline</li>
            <li>• Online Chat Support</li>
            <li>• Emergency Resources</li>
            <li>• Support Group Directory</li>
          </ul>
          <button className="bg-white text-purple-600 px-6 py-2 rounded-lg hover:bg-purple-50 transition">
            Get Help Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;