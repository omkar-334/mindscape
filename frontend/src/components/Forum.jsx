import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MessageCircle, Heart, Shield, 
  Tag, Search, Filter, TrendingUp, Calendar,
  AlertCircle, BookOpen, Coffee
} from 'lucide-react';

const ForumCategories = {
  ANXIETY: { name: 'Anxiety Support', icon: AlertCircle, color: 'text-blue-500' },
  DEPRESSION: { name: 'Depression Support', icon: Heart, color: 'text-purple-500' },
  MINDFULNESS: { name: 'Mindfulness & Meditation', icon: Coffee, color: 'text-green-500' },
  GENERAL: { name: 'General Discussion', icon: MessageCircle, color: 'text-gray-500' },
  RECOVERY: { name: 'Recovery Journey', icon: TrendingUp, color: 'text-pink-500' },
  RESOURCES: { name: 'Resources & Tips', icon: BookOpen, color: 'text-indigo-500' }
};

const Forum = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewDiscussionModal, setShowNewDiscussionModal] = useState(false);
  const [newDiscussion, setNewDiscussion] = useState({
    title: '',
    category: 'GENERAL',
    content: ''
  });
  const [userSettings, setUserSettings] = useState(null);


  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setUserSettings(doc.data());
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let q = query(
      collection(db, 'forum'),
      orderBy('createdAt', 'desc')
    );

    if (activeCategory !== 'ALL') {
      q = query(
        collection(db, 'forum'),
        where('category', '==', activeCategory),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const discussionList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          creatorName: data.isAnonymous ? data.anonymousName : data.creatorName
        };
      });

      if (searchTerm) {
        const filtered = discussionList.filter(disc => 
          disc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          disc.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setDiscussions(filtered);
      } else {
        setDiscussions(discussionList);
      }
    });

    return () => unsubscribe();
  }, [activeCategory, searchTerm]);

  const handleNewDiscussionClick = () => {
    if (!user) {
      toast.error('Please sign in to start a discussion');
      navigate('/login');
      return;
    }
    setShowNewDiscussionModal(true);
  };

  const createDiscussion = async (e) => {
    e.preventDefault();

    if (!user || !userSettings) {
      toast.error('You must be signed in to create a discussion');
      setShowNewDiscussionModal(false);
      navigate('/login');
      return;
    }

    const loadingToast = toast.loading('Creating discussion...');

    try {
      if (!newDiscussion.title.trim() || !newDiscussion.content.trim()) {
        toast.error('Please fill in all required fields');
        toast.dismiss(loadingToast);
        return;
      }

      const defaultAnonymousName = `Anonymous${Math.floor(Math.random() * 10000)}`;
      
      const discussionData = {
        ...newDiscussion,
        uid: user.uid,
        isAnonymous: userSettings.isAnonymous || false,
        anonymousName: userSettings.anonymousName || defaultAnonymousName,
        creatorName: userSettings.isAnonymous 
          ? (userSettings.anonymousName || defaultAnonymousName) 
          : (user.displayName || 'Anonymous User'),
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp(),
        replyCount: 0,
        supportCount: 0,
        participants: [user.uid]
      };

      await addDoc(collection(db, 'forum'), discussionData);
      toast.success('Discussion created successfully!');
      setShowNewDiscussionModal(false);
      setNewDiscussion({ title: '', category: 'GENERAL', content: '' });
    } catch (error) {
      console.error('Error creating discussion:', error);
      toast.error('Failed to create discussion. Please try again.');
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Community Forum</h1>
            <p className="text-gray-600">Connect, share, and support each other in a safe space</p>
          </div>
          <button
            onClick={handleNewDiscussionClick}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <MessageCircle className="h-5 w-5" />
            Start Discussion
          </button>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search discussions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Filter className="h-5 w-5" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
              <Tag className="h-5 w-5" />
              Tags
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`p-4 rounded-xl border text-center hover:bg-gray-50 transition
            ${activeCategory === 'ALL' ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}
        >
          <Users className="h-6 w-6 mx-auto mb-2 text-purple-500" />
          <span className="text-sm font-medium">All Topics</span>
        </button>
        
        {Object.entries(ForumCategories).map(([key, category]) => {
          const IconComponent = category.icon;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`p-4 rounded-xl border text-center hover:bg-gray-50 transition
                ${activeCategory === key ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}
            >
              <IconComponent className={`h-6 w-6 mx-auto mb-2 ${category.color}`} />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {discussions.map((discussion) => (
          <Link
            key={discussion.id}
            to={`/chat/${discussion.id}`}
            className="block bg-white rounded-xl shadow-sm hover:shadow-md transition p-6"
          >
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium 
                    ${ForumCategories[discussion.category]?.color.replace('text', 'bg')}/10`}>
                    {ForumCategories[discussion.category]?.name}
                  </span>
                  {discussion.isUrgent && (
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                      Urgent
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-2">{discussion.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{discussion.content}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {discussion.participants?.length || 1} participants
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-4 w-4" />
                    {discussion.replyCount || 0} replies
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="h-4 w-4" />
                    {discussion.supportCount || 0} support
                  </span>
                </div>
              </div>
              <div className="text-right text-sm text-gray-500">
                <div>Started by {discussion.creatorName}</div>
                <div>
                  {discussion.createdAt?.toDate().toLocaleDateString()}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {showNewDiscussionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold mb-4">Start a New Discussion</h2>
            <form onSubmit={createDiscussion}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newDiscussion.title}
                  onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Enter discussion title"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={newDiscussion.category}
                  onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                  className="w-full p-2 border rounded-lg"
                  required
                >
                  {Object.entries(ForumCategories).map(([key, category]) => (
                    <option key={key} value={key}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={newDiscussion.content}
                  onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
                  className="w-full p-2 border rounded-lg h-32"
                  placeholder="Share your thoughts..."
                  required
                />
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setShowNewDiscussionModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  Create Discussion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-50 rounded-xl p-6 flex items-start gap-4">
        <Shield className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Community Guidelines</h3>
          <p className="text-blue-800">
            This is a safe space for support and understanding. Please be respectful, 
            avoid judgment, and remember that everyone's journey is different. If you need 
            immediate help, please use our emergency resources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Forum;