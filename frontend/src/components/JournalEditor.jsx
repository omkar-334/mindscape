import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Loader } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const JournalEditor = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [currentEntry, setCurrentEntry] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};

    const fetchEntries = () => {
      try {
        if (!user) {
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, `users/${user.uid}/journal`),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const journalEntries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEntries(journalEntries);
          setLoading(false);
        }, (error) => {
          setError('Failed to load journal entries. Please try again later.');
          setLoading(false);
        });
      } catch (err) {
        setError('Failed to initialize journal. Please try again later.');
        setLoading(false);
      }
    };

    fetchEntries();
    return () => unsubscribe();
  }, [user]);

  const handleSave = async () => {
    if (!currentEntry.trim() || !user) return;

    setSaving(true);
    setError(null);

    try {
      const docRef = await addDoc(collection(db, `users/${user.uid}/journal`), {
        content: currentEntry,
        createdAt: new Date(),
        userId: user.uid
      });

      setCurrentEntry('');

      if (API_URL) {
        try {
          const postParams = new URLSearchParams();
          postParams.append('user_id', user.uid);
          postParams.append('note_id', docRef.id);
          
          const response = await fetch(`${API_URL}/analyze_note?${postParams.toString()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          if (!response.ok) {
            console.error('Analysis failed:', await response.text());
          }
        } catch (analysisError) {
          console.error('Error analyzing entry:', analysisError);
        }
      }
    } catch (error) {
      setError('Failed to save journal entry. Please try again.');
      console.error('Error saving journal entry:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-6 text-center bg-yellow-50 rounded-lg">
        <p className="text-yellow-700">Please sign in to access your journal.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="border-b pb-4 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">My Journal</h2>
        </div>
        
        <div className="space-y-4">
          <textarea
            value={currentEntry}
            onChange={(e) => setCurrentEntry(e.target.value)}
            placeholder="Write your thoughts here..."
            className="w-full h-64 p-4 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={saving}
          />
          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              disabled={!currentEntry.trim() || saving}
            >
              {saving && <Loader className="w-4 h-4 animate-spin" />}
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Previous Entries</h2>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-600 text-center py-8 bg-white shadow rounded-lg">
            No journal entries yet. Start writing!
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="bg-white shadow rounded-lg p-6">
                <div className="border-b pb-3 mb-3 text-sm text-gray-500">
                  {format(entry.createdAt.toDate(), 'MMMM d, yyyy - h:mm a')}
                </div>
                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalEditor;