import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, limit } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Link } from 'react-router-dom';
import { Heart, Users, BarChart2, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DailyMoodPopup from './DailyMoodPopup';

const Home = () => {
  const { user } = useAuth();
  const [supportGroups, setSupportGroups] = useState([]);
  const [moodTracking, setMoodTracking] = useState(null);
  const [moodStats, setMoodStats] = useState({
    weeklyAverage: 0,
    moodTrend: '',
    trackingStreak: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log('User ID:', user.uid); 

    const q = query(
      collection(db, 'forum'),
      orderBy('participants', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const groups = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        groups.push({ 
          id: doc.id,
          title: data.title,
          description: data.content,
          category: data.category,
          memberCount: data.participants?.length || 1,
          messageCount: data.replyCount || 0,
          supportCount: data.supportCount || 0,
          uid: data.uid,
          creatorName: data.creatorName,
          createdAt: data.createdAt
        });
      });
      setSupportGroups(groups);
      setLoading(false);
    });

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    console.log('Fetching moods since:', oneWeekAgo.toISOString()); 

    const moodQuery = query(
      collection(db, `users/${user.uid}/moods`),
      where('createdAt', '>=', oneWeekAgo),
      orderBy('createdAt', 'desc')
    );

    const moodUnsubscribe = onSnapshot(moodQuery, (snapshot) => {
      console.log('Mood snapshot size:', snapshot.size); 

      const moodData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const entry = {
          ...data,
          createdAt: data.createdAt?.toDate()
        };
        console.log('Mood entry:', entry); 
        moodData.push(entry);
      });

      console.log('Processed mood data:', moodData); 

      if (moodData.length > 0) {
        console.log('Most recent mood:', moodData[0]); 
        setMoodTracking(moodData[0]);
      }

      const weeklyAverage = moodData.length > 0
        ? moodData.reduce((sum, entry) => {
            console.log('Adding to sum:', entry.mood); 
            return sum + entry.mood;
          }, 0) / moodData.length
        : 0;

      console.log('Calculated weekly average:', weeklyAverage); 

      let trend = 'Not enough data';
      if (moodData.length >= 2) {
        const recentMoods = moodData.slice(0, Math.min(5, moodData.length));
        console.log('Recent moods for trend:', recentMoods);
        trend = recentMoods[0].mood > recentMoods[recentMoods.length - 1].mood
          ? 'Improving'
          : 'Declining';
      }

      console.log('Calculated mood trend:', trend); 

      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log('Calculating streak starting from:', today.toISOString()); 

      for (let i = 0; i < moodData.length; i++) {
        const entryDate = new Date(moodData[i].createdAt);
        entryDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
        
        console.log('Streak entry date:', entryDate.toISOString(), 'Days diff:', daysDiff); 

        if (daysDiff === streak) {
          streak++;
          console.log('Streak increased to:', streak); 
        } else {
          console.log('Streak broken at:', streak); 
          break;
        }
      }

      const newMoodStats = {
        weeklyAverage: weeklyAverage.toFixed(1),
        moodTrend: trend,
        trackingStreak: streak
      };

      console.log('Setting new mood stats:', newMoodStats);
      setMoodStats(newMoodStats);
    });

    return () => {
      unsubscribe();
      moodUnsubscribe();
    };
  }, [user]);

  useEffect(() => {
    console.log('Current moodTracking:', moodTracking);
    console.log('Current moodStats:', moodStats);
  }, [moodTracking, moodStats]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <h2 className="text-2xl font-semibold text-yellow-800 mb-4">Welcome to Our Mental Wellness Platform</h2>
          <p className="text-yellow-700 mb-6">Please sign in to access all features and support groups.</p>
          <Link 
            to="/login" 
            className="inline-block bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 transition"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  console.log('Rendering with moodTracking:', moodTracking);
  console.log('Rendering with moodStats:', moodStats);
  return (
    <><DailyMoodPopup/>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        

      <div className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-3xl p-8 mb-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            Your Journey to Mental Wellness Starts Here
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Connect with peers, track your mental health journey, and find support in a safe, 
            understanding community.
          </p>
          <div className="flex justify-center gap-4">
            <button className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition">
              Find Support
            </button>
            <Link to='/profile'>
              <button className="bg-white text-purple-600 px-6 py-3 rounded-lg hover:bg-gray-50 transition">
                Track Your Mood
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="mb-4">
            <Users className="h-8 w-8 text-purple-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Peer Support</h3>
          <p className="text-gray-600">
            Connect with others who understand your journey and share experiences in a safe space.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="mb-4">
            <BarChart2 className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Mood Tracking</h3>
          <p className="text-gray-600">
            Monitor your emotional well-being and identify patterns to better understand yourself.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="mb-4">
            <Heart className="h-8 w-8 text-pink-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Self-Care Tools</h3>
          <p className="text-gray-600">
            Access resources and techniques for maintaining your mental health.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Popular Support Groups</h2>
          <Link 
            to="/forum"
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            View All Groups
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div>Loading groups...</div>
          ) : (
            supportGroups.map((group) => (
              <Link
                key={group.id}
                to={`/chat/${group.id}`}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                <h3 className="text-xl font-semibold mb-2">{group.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{group.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {group.memberCount} participants
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {group.messageCount} replies
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {group.supportCount} support
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {moodTracking && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Mood Journey</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Today's Mood</h4>
              <p className="text-2xl font-semibold text-blue-600">
                {moodTracking.mood || 'Not tracked'}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Weekly Average</h4>
              <p className="text-2xl font-semibold text-purple-600">{moodStats.weeklyAverage}</p>
            </div>
            <div className="p-4 bg-pink-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Mood Trend</h4>
              <p className="text-2xl font-semibold text-pink-600">
                {moodStats.moodTrend === 'Improving' ? '↗' : '↘'} {moodStats.moodTrend}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-600 mb-1">Tracking Streak</h4>
              <p className="text-2xl font-semibold text-green-600">{moodStats.trackingStreak} days</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
          <h3 className="text-xl font-semibold mb-4">Need Immediate Support?</h3>
          <p className="mb-4">
            Our community is here 24/7. Connect with a peer supporter now.
          </p>
          <button className="bg-white text-blue-600 px-6 py-2 rounded-lg hover:bg-blue-50 transition">
            Connect Now
          </button>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <h3 className="text-xl font-semibold mb-4">Schedule a Check-in</h3>
          <p className="mb-4">
            Regular check-ins help maintain mental wellness. Book your next session.
          </p>
          <button className="bg-white text-purple-600 px-6 py-2 rounded-lg hover:bg-purple-50 transition">
            Schedule Now
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default Home;