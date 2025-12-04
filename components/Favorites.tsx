import React, { useState, useEffect } from 'react';
import { FavoriteVerse } from '../types';
import { TrashIcon, CopyIcon, BookIcon, SearchIcon, HeartIcon } from './Icons';
import { db } from '../services/firebase';
import { collection, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';

interface FavoritesProps {
  userId: string;
}

export const Favorites: React.FC<FavoritesProps> = ({ userId }) => {
  const [favorites, setFavorites] = useState<FavoriteVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    if (!userId) return;

    if (userId === 'guest-dev-user') {
      const local = localStorage.getItem('lumen_favorites');
      if (local) setFavorites(JSON.parse(local));
      setLoading(false);
      return;
    }

    if (!db) {
        setLoading(false);
        return;
    }

    const q = query(collection(db, 'users', userId, 'favorites'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedFavs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FavoriteVerse[];
      setFavorites(loadedFavs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Remove this verse from favorites?")) {
      if (userId === 'guest-dev-user') {
        const updated = favorites.filter(f => f.id !== id);
        setFavorites(updated);
        localStorage.setItem('lumen_favorites', JSON.stringify(updated));
      } else if (db) {
        await deleteDoc(doc(db, 'users', userId, 'favorites', id));
      }
    }
  };

  const handleCopy = (text: string, reference: string, id: string) => {
    navigator.clipboard.writeText(`"${text}" - ${reference}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFavorites = favorites.filter(f => 
    f.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full relative bg-slate-50">
       {/* Header */}
       <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
           <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">Favorite Verses</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
             <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>
        ) : (
          <>
            <div className="max-w-4xl mx-auto mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <SearchIcon className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-brand-100 rounded-xl bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  placeholder="Search your collection..."
                />
            </div>

            {filteredFavorites.length === 0 ? (
                <div className="text-center py-20 opacity-60">
                    <BookIcon className="w-16 h-16 mx-auto text-brand-200 mb-4" />
                    <p className="text-brand-800 font-serif text-lg">Your collection is empty.</p>
                    <p className="text-sm text-slate-500 mt-2">Tap the <HeartIcon className="w-4 h-4 inline" /> icon in chat or on the daily verse to save it here.</p>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto grid grid-cols-1 gap-4">
                    {filteredFavorites.map(verse => (
                    <div key={verse.id} className="bg-white rounded-2xl p-6 shadow-sm border border-brand-50 hover:shadow-md transition-shadow relative group">
                        <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleCopy(verse.text, verse.reference, verse.id)}
                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                title="Copy to clipboard"
                            >
                                {copiedId === verse.id ? <span className="text-xs font-bold text-green-600">Copied!</span> : <CopyIcon className="w-4 h-4" />}
                            </button>
                            <button 
                                onClick={() => handleDelete(verse.id)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="font-serif text-lg text-slate-700 italic leading-relaxed mb-4 pr-8">
                            "{verse.text}"
                        </p>
                        <div className="flex items-center space-x-2">
                            <div className="h-px w-8 bg-brand-200"></div>
                            <span className="text-sm font-bold text-brand-600 uppercase tracking-wide">{verse.reference}</span>
                            <span className="text-xs text-slate-300 ml-auto">{new Date(verse.date).toLocaleDateString()}</span>
                        </div>
                    </div>
                    ))}
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};