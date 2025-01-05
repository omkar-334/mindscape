import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, doc, query, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { Users, Heart, MessageCircle, Send, Flag, Share, Bookmark, AlertTriangle, ArrowLeft, Reply, X } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [discussion, setDiscussion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [supportCount, setSupportCount] = useState(0);
  const [hasSupported, setHasSupported] = useState(false);
  const [error, setError] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) setUserSettings(doc.data());
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!id) {
      setError('No discussion ID provided');
      setIsLoading(false);
      return;
    }
  }, [id, user]);

  useEffect(() => {
    if (!id) return;
    setError(null);

    const discussionRef = doc(db, 'forum', id);
    const unsubscribe = onSnapshot(discussionRef, (doc) => {
      if (doc.exists()) {
        const discussionData = { id: doc.id, ...doc.data() };
        setDiscussion(discussionData);
        setSupportCount(discussionData.supportCount || 0);
        setHasSupported(discussionData.supporters?.includes(user?.uid));
      } else {
        setError('Discussion not found');
        toast.error('Discussion not found');
        navigate('/forum');
      }
      setIsLoading(false);
    }, (error) => {
      setError(`Error fetching discussion: ${error.message}`);
      setIsLoading(false);
      toast.error('Error loading discussion');
    });

    return () => unsubscribe();
  }, [id, user?.uid, navigate]);

  useEffect(() => {
    if (!id) return;
    
    const q = query(
      collection(db, 'forum', id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageList);
    }, (error) => {
      toast.error('Error loading messages');
    });

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to participate in discussions');
      navigate('/login');
      return;
    }

    if (!newMessage.trim()) return;
    
    try {
      const messageData = {
        content: newMessage.trim(),
        uid: user.uid,
        createdAt: serverTimestamp(),
        isAnonymous: userSettings?.isAnonymous || false,
        authorName: userSettings?.isAnonymous ? 
          userSettings.anonymousName : 
          (user.displayName || 'Anonymous User'),
        authorPhotoURL: userSettings?.isAnonymous ? null : user.photoURL,
        replyTo: replyTo ? {
          messageId: replyTo.id,
          content: replyTo.content,
          authorName: replyTo.authorName
        } : null
      };

      const messageRef = await addDoc(collection(db, 'forum', id, 'messages'), messageData);

      await updateDoc(doc(db, 'forum', id), {
        lastActivity: serverTimestamp(),
        replyCount: (discussion?.replyCount || 0) + 1,
        participants: [...new Set([...(discussion?.participants || []), user.uid])]
      });

      try {
        const postParams = new URLSearchParams();
        postParams.append('post_id', messageRef.id);
        postParams.append('room_id', id);
        await fetch(`${API_URL}/analyze_post?${postParams.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.error('Error sending message notification:', error);
      }

      setNewMessage('');
      setReplyTo(null);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const handleSupport = async () => {
    if (!user) {
      toast.error('Please sign in to show support');
      return;
    }
    
    try {
      const discussionRef = doc(db, 'forum', id);
      const discussionDoc = await getDoc(discussionRef);
      
      if (!discussionDoc.exists()) {
        toast.error('Discussion not found');
        return;
      }

      const currentSupporters = discussionDoc.data().supporters || [];
      
      await updateDoc(discussionRef, {
        supportCount: currentSupporters.includes(user.uid) ? supportCount - 1 : supportCount + 1,
        supporters: currentSupporters.includes(user.uid) 
          ? currentSupporters.filter(uid => uid !== user.uid)
          : [...currentSupporters, user.uid]
      });
    } catch (error) {
      toast.error('Failed to update support');
    }
  };

  const MessageComponent = ({ message, isReply = false }) => (
    <div 
    key={message.id}
    className={`mb-6 ${message.uid === user?.uid ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'}`}
    >
      <div className={`flex items-start gap-3 ${message.uid === user?.uid ? 'flex-row-reverse' : ''}`}>
        <div className="flex-shrink-0">
          {message.authorPhotoURL ? (
            <img 
              src={message.authorPhotoURL} 
              alt={message.authorName}
              className="h-10 w-10 rounded-full"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 
              flex items-center justify-center text-white font-medium">
              {message.authorName?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900">
              {message.authorName}
            </span>
            <span className="text-xs text-gray-500">
              {message.createdAt?.toDate().toLocaleString()}
            </span>
          </div>
          <div className={`p-4 rounded-2xl shadow-sm ${
            message.uid === user?.uid 
              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white' 
              : 'bg-gray-50 text-gray-800'
          }`}>
            {message.replyTo && !isReply && (
              <div className="mb-2 p-2 rounded bg-black/10 text-sm">
                <div className="font-medium">{message.replyTo.authorName}</div>
                <div className="line-clamp-2">{message.replyTo.content}</div>
              </div>
            )}
            {message.content}
          </div>
          {!isReply && (
            <button
              onClick={() => setReplyTo(message)}
              className="mt-1 text-sm text-gray-500 hover:text-purple-600 flex items-center gap-1"
            >
              <Reply className="h-4 w-4" />
              Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Discussion</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button 
          onClick={() => navigate('/forum')}
          className="text-purple-600 hover:text-purple-700"
        >
          Return to Forum
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Discussion not found</h2>
        <p className="text-gray-600 mb-4">This discussion may have been removed or you don't have access to it.</p>
        <button 
          onClick={() => navigate('/forum')}
          className="text-purple-600 hover:text-purple-700"
        >
          Return to Forum
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/forum')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Forum
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-purple-50 text-purple-600">
                {discussion.category}
              </span>
              {discussion.isUrgent && (
                <span className="bg-red-50 text-red-600 px-4 py-1.5 rounded-full text-sm font-medium">
                  Urgent
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{discussion.title}</h1>
            <p className="text-gray-600 mb-4">{discussion.content}</p>
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <Users className="h-4 w-4" />
                {discussion.participants?.length || 1}
              </span>
              <span className="flex items-center gap-2 text-gray-500">
                <MessageCircle className="h-4 w-4" />
                {discussion.replyCount || 0}
              </span>
              <button 
                onClick={handleSupport}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                  hasSupported 
                    ? 'bg-purple-100 text-purple-600 shadow-sm' 
                    : 'hover:bg-purple-50 border-purple-600 text-gray-500 hover:text-purple-600'
                }`}
              >
                <Heart className={`h-4 w-4 transition-colors ${hasSupported ? 'fill-current' : ''}`} />
                <span className="font-medium">{supportCount}</span>
              </button>
            </div>
          </div>
            
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <Bookmark className="h-5 w-5" />
              </button>
              <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <Share className="h-5 w-5" />
              </button>
              <button className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <Flag className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-6">
          <div className="h-[500px] overflow-y-auto p-6">
            {messages.map((message) => (
              <MessageComponent key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t border-gray-100">
            {replyTo && (
              <div className="mb-4 p-3 bg-gray-50 rounded-xl flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    Replying to {replyTo.authorName}
                  </div>
                  <div className="text-sm text-gray-600 line-clamp-1">
                    {replyTo.content}
                  </div>
                </div>
                <button 
                  onClick={() => setReplyTo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={replyTo ? "Type your reply..." : "Type your message..."}
                className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 
                  focus:ring-purple-500 focus:border-purple-500 bg-gray-50"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 
                rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 
                disabled:cursor-not-allowed transition-all duration-200 transform 
                hover:scale-105 disabled:hover:scale-100"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 
        flex items-start gap-4 border border-blue-100">
        <AlertTriangle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-2">Support Guidelines</h3>
          <p className="text-blue-800">
            Remember to be supportive and respectful. If you or someone else needs immediate help, 
            please contact emergency services or use our crisis resources.
          </p>
        </div>
      </div>
    </div>
  </div>
);
};

export default ChatPage;