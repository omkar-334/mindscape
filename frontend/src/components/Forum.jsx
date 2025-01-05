import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Users, MessageCircle, Heart, Shield, 
  Tag, Search, Filter, TrendingUp, Calendar,
  AlertCircle, BookOpen, Coffee, X
} from 'lucide-react';

const ForumCategories = {
  ANXIETY: { name: 'Anxiety Support', icon: AlertCircle, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  DEPRESSION: { name: 'Depression Support', icon: Heart, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  MINDFULNESS: { name: 'Mindfulness & Meditation', icon: Coffee, color: 'text-green-500', bgColor: 'bg-green-50' },
  GENERAL: { name: 'General Discussion', icon: MessageCircle, color: 'text-gray-500', bgColor: 'bg-gray-50' },
  RECOVERY: { name: 'Recovery Journey', icon: TrendingUp, color: 'text-pink-500', bgColor: 'bg-pink-50' },
  RESOURCES: { name: 'Resources & Tips', icon: BookOpen, color: 'text-indigo-500', bgColor: 'bg-indigo-50' }
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
      if (doc.exists()) setUserSettings(doc.data());
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let q = query(collection(db, 'forum'), orderBy('createdAt', 'desc'));
    if (activeCategory !== 'ALL') {
      q = query(
        collection(db, 'forum'),
        where('category', '==', activeCategory),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const discussionList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        creatorName: doc.data().isAnonymous ? doc.data().anonymousName : doc.data().creatorName
      }));

      setDiscussions(searchTerm ? 
        discussionList.filter(disc => 
          disc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          disc.content.toLowerCase().includes(searchTerm.toLowerCase())
        ) : discussionList
      );
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                Community Forum
              </h1>
              <p className="text-gray-600 mt-2">Connect, share, and support each other in a safe space</p>
            </div>
            <button
              onClick={handleNewDiscussionClick}
              className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-xl 
                hover:from-purple-700 hover:to-blue-600 transition-all duration-200 transform hover:scale-105
                flex items-center gap-2 shadow-md"
            >
              <MessageCircle className="h-5 w-5" />
              Start Discussion
            </button>
          </div>

          <div className="mt-8 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="h-5 w-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 
                  focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
              />
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl 
                hover:bg-gray-50 transition-colors bg-white">
                <Filter className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">Filter</span>
              </button>
              <button className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-xl 
                hover:bg-gray-50 transition-colors bg-white">
                <Tag className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">Tags</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105
              ${activeCategory === 'ALL' 
                ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-md' 
                : 'bg-white hover:shadow-md'}`}
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
                className={`p-4 rounded-xl border transition-all duration-200 hover:scale-105
                  ${activeCategory === key 
                    ? `${category.bgColor} border-${category.color.split('-')[1]}-200 shadow-md` 
                    : 'bg-white hover:shadow-md'}`}
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
              className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 
                p-6 border border-gray-100 hover:border-purple-100"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-medium 
                      ${ForumCategories[discussion.category]?.bgColor} 
                      ${ForumCategories[discussion.category]?.color}`}>
                      {ForumCategories[discussion.category]?.name}
                    </span>
                    {discussion.isUrgent && (
                      <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-sm font-medium">
                        Urgent
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{discussion.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{discussion.content}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {discussion.participants?.length || 1}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      {discussion.replyCount || 0}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Heart className="h-4 w-4" />
                      {discussion.supportCount || 0}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-500">
                  <div className="font-medium text-gray-900">{discussion.creatorName}</div>
                  <div className="mt-1">
                    {discussion.createdAt?.toDate().toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {showNewDiscussionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Start a New Discussion</h2>
                <button 
                  onClick={() => setShowNewDiscussionModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={createDiscussion} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={newDiscussion.title}
                    onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 
                      focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                    placeholder="Enter discussion title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newDiscussion.category}
                    onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 
                      focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
                    required
                  >
                    {Object.entries(ForumCategories).map(([key, category]) => (
                      <option key={key} value={key}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea
                    value={newDiscussion.content}
                    onChange={(e) => setNewDiscussion({...newDiscussion, content: e.target.value})}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 
                      focus:ring-purple-500 focus:border-purple-500 bg-gray-50 h-32"
                    placeholder="Share your thoughts..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowNewDiscussionModal(false)}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 
                      rounded-xl hover:from-purple-700 hover:to-blue-600 transition-all duration-200 
                      transform hover:scale-105 shadow-md"
                  >
                    Create Discussion
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 flex items-start gap-4 border border-blue-100">
          <Shield className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Community Guidelines</h3>
            <p className="text-blue-800">
              This is a safe space for support and understanding. Please be respectful, 
              avoid judgment, and remember that everyone's journey is different. If you need 
              immediate help, please use our emergency resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Forum;