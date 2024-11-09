import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_URL = import.meta.env.VITE_API_URL;

import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  serverTimestamp, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase-config';
import { 
  Users, 
  Heart, 
  MessageCircle, 
  Send, 
  MoreVertical, 
  Flag,
  Share,
  Bookmark,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

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
      console.log('ChatPage mounted with ID:', id);
      console.log('Current user:', user);
      
      if (!id) {
        console.error('No discussion ID provided');
        setError('No discussion ID provided');
        setIsLoading(false);
        return;
      }
    }, [id, user]);
  
    useEffect(() => {
      if (!id) return;
  
      console.log('Attempting to fetch discussion:', id);
      setError(null);
  
      const discussionRef = doc(db, 'forum', id);
      
      try {
        const unsubscribe = onSnapshot(discussionRef, (doc) => {
          console.log('Discussion snapshot received:', doc.exists());
          
          if (doc.exists()) {
            const discussionData = { id: doc.id, ...doc.data() };
            console.log('Discussion data:', discussionData);
            setDiscussion(discussionData);
            setSupportCount(discussionData.supportCount || 0);
            setHasSupported(discussionData.supporters?.includes(user?.uid));
          } else {
            console.error('Discussion not found');
            setError('Discussion not found');
            toast.error('Discussion not found');
            navigate('/forum');
          }
          setIsLoading(false);
        }, (error) => {
          console.error('Error fetching discussion:', error);
          setError(`Error fetching discussion: ${error.message}`);
          setIsLoading(false);
          toast.error('Error loading discussion');
        });
  
        return () => {
          console.log('Cleaning up discussion listener');
          unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up discussion listener:', error);
        setError(`Error setting up discussion listener: ${error.message}`);
        setIsLoading(false);
        toast.error('Error loading discussion');
      }
    }, [id, user?.uid, navigate]);
  
    useEffect(() => {
      if (!id) return;
  
      console.log('Attempting to fetch messages for discussion:', id);
      
      try {
        const q = query(
          collection(db, 'forum', id, 'messages'),
          orderBy('createdAt', 'asc')
        );
  
        const unsubscribe = onSnapshot(q, (snapshot) => {
          console.log('Messages snapshot received, count:', snapshot.docs.length);
          
          const messageList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          console.log('Processed messages:', messageList.length);
          setMessages(messageList);
        }, (error) => {
          console.error('Error fetching messages:', error);
          toast.error('Error loading messages');
        });
  
        return () => {
          console.log('Cleaning up messages listener');
          unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up messages listener:', error);
        toast.error('Error loading messages');
      }
    }, [id]);
  
    useEffect(() => {
      console.log('Scrolling to bottom, message count:', messages.length);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!user) {
        console.log('Submit attempted without user');
        toast.error('Please sign in to participate in discussions');
        navigate('/login');
        return;
      }
  
      if (!newMessage.trim()) return;
  
      console.log('Attempting to send message');
      
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
        };
  
        console.log('Message data prepared:', messageData);
  
        const messageRef = await addDoc(collection(db, 'forum', id, 'messages'), messageData);
        console.log('Message added with ID:', messageRef.id);
  
        const discussionRef = doc(db, 'forum', id);
        await updateDoc(discussionRef, {
          lastActivity: serverTimestamp(),
          replyCount: (discussion?.replyCount || 0) + 1,
          participants: [...new Set([...(discussion?.participants || []), user.uid])]
        });
        console.log('Discussion updated with new activity');
  
        try {
            const postParams = new URLSearchParams();
            postParams.append('post_id', messageRef.id);
        postParams.append('room_id', id);
          const response = await fetch(`${API_URL}/analyze_post?${postParams.toString()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            
          });
  
          if (!response.ok) {
            console.error('Failed to send message notification:', await response.text());
          } else {
            console.log('Message notification sent successfully');
          }
        } catch (notificationError) {
          console.error('Error sending message notification:', notificationError);
        }
  
        setNewMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
      }
    };


  const handleSupport = async () => {
    if (!user) {
      console.log('Support attempted without user');
      toast.error('Please sign in to show support');
      return;
    }

    console.log('Attempting to update support');
    
    try {
      const discussionRef = doc(db, 'forum', id);
      const discussionDoc = await getDoc(discussionRef);
      
      if (!discussionDoc.exists()) {
        console.error('Discussion not found during support update');
        toast.error('Discussion not found');
        return;
      }

      const currentSupporters = discussionDoc.data().supporters || [];
      
      if (currentSupporters.includes(user.uid)) {
        console.log('Removing support');
        await updateDoc(discussionRef, {
          supportCount: supportCount - 1,
          supporters: currentSupporters.filter(uid => uid !== user.uid)
        });
      } else {
        console.log('Adding support');
        await updateDoc(discussionRef, {
          supportCount: supportCount + 1,
          supporters: [...currentSupporters, user.uid]
        });
      }
      console.log('Support updated successfully');
    } catch (error) {
      console.error('Error updating support:', error);
      toast.error('Failed to update support');
    }
  };

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Discussion Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-600">
                {discussion.category}
              </span>
              {discussion.isUrgent && (
                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
                  Urgent
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{discussion.title}</h1>
            <p className="text-gray-600 mb-4">{discussion.content}</p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {discussion.participants?.length || 1} participants
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                {discussion.replyCount || 0} replies
              </span>
              <button 
                onClick={handleSupport}
                className={`flex items-center gap-1 ${hasSupported ? 'text-purple-600' : ''}`}
              >
                <Heart className={`h-4 w-4 ${hasSupported ? 'fill-current' : ''}`} />
                {supportCount} support
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Bookmark className="h-5 w-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Share className="h-5 w-5" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Flag className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Section */}
      <div className="bg-white rounded-xl shadow-sm mb-4">
        <div className="h-[500px] overflow-y-auto p-6">
          {messages.map((message, index) => (
            <div 
              key={message.id}
              className={`mb-4 ${message.uid === user?.uid ? 'ml-auto max-w-[80%]' : 'mr-auto max-w-[80%]'}`}
            >
              <div className={`flex items-start gap-3 ${message.uid === user?.uid ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0">
                  {message.authorPhotoURL ? (
                    <img 
                      src={message.authorPhotoURL} 
                      alt={message.authorName}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-medium">
                        {message.authorName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-800">
                      {message.authorName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {message.createdAt?.toDate().toLocaleString()}
                    </span>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    message.uid === user?.uid 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {message.content}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Community Guidelines Reminder */}
      <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-4">
        <AlertTriangle className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
        <div>
          <h3 className="font-semibold text-blue-900 mb-1">Support Guidelines</h3>
          <p className="text-blue-800 text-sm">
            Remember to be supportive and respectful. If you or someone else needs immediate help, 
            please contact emergency services or use our crisis resources.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;