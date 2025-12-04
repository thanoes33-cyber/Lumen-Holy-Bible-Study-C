import React, { useState } from 'react';
import { PlayIcon, XIcon, SearchIcon, FilmIcon, BookIcon, DoveIcon, SunIcon } from './Icons';

interface Video {
  id: string;
  videoId: string; // YouTube ID
  title: string;
  channel: string;
  category: 'study' | 'worship' | 'uplifting';
  thumbnail: string;
  duration: string;
}

const VIDEOS: Video[] = [
  // Bible Study
  {
    id: '1',
    videoId: '7_CGP-12AE0',
    title: 'The Story of the Bible',
    channel: 'BibleProject',
    category: 'study',
    thumbnail: 'https://img.youtube.com/vi/7_CGP-12AE0/maxresdefault.jpg',
    duration: '5:50'
  },
  {
    id: '2',
    videoId: 'G-2e9mMf7E8',
    title: 'Gospel of John Overview',
    channel: 'BibleProject',
    category: 'study',
    thumbnail: 'https://img.youtube.com/vi/G-2e9mMf7E8/maxresdefault.jpg',
    duration: '9:03'
  },
  {
    id: '3',
    videoId: 'l9vn5UvsHvM',
    title: 'Holiness',
    channel: 'BibleProject',
    category: 'study',
    thumbnail: 'https://img.youtube.com/vi/l9vn5UvsHvM/maxresdefault.jpg',
    duration: '5:42'
  },
  // Worship - Updated with reliable official/live versions
  {
    id: '4',
    videoId: 'n4XWfwLHeLM',
    title: 'Way Maker (Official Live)',
    channel: 'Sinach',
    category: 'worship',
    thumbnail: 'https://img.youtube.com/vi/n4XWfwLHeLM/maxresdefault.jpg',
    duration: '15:44'
  },
  {
    id: '5',
    videoId: 'n0FBb6hnwTo',
    title: 'Goodness of God (Live)',
    channel: 'Bethel Music',
    category: 'worship',
    thumbnail: 'https://img.youtube.com/vi/n0FBb6hnwTo/maxresdefault.jpg',
    duration: '4:56'
  },
  {
    id: '6',
    videoId: 'DXDGE_lRI0E',
    title: '10,000 Reasons (Bless the Lord)',
    channel: 'Matt Redman',
    category: 'worship',
    thumbnail: 'https://img.youtube.com/vi/DXDGE_lRI0E/maxresdefault.jpg',
    duration: '5:42'
  },
  // Uplifting / Prayer
  {
    id: '7',
    videoId: '3Kk8hD7v6jY',
    title: '15 Minute Morning Prayer',
    channel: 'Grace For Purpose',
    category: 'uplifting',
    thumbnail: 'https://img.youtube.com/vi/3Kk8hD7v6jY/maxresdefault.jpg',
    duration: '15:00'
  },
  {
    id: '8',
    videoId: 'F8c4Z7s6tEw',
    title: 'Quiet Time With God (Instrumental)',
    channel: 'Worship Instrumental',
    category: 'uplifting',
    thumbnail: 'https://img.youtube.com/vi/F8c4Z7s6tEw/maxresdefault.jpg',
    duration: '3:00:00'
  }
];

export const VideoGallery: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<Video['category'] | 'all'>('all');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVideos = VIDEOS.filter(video => {
    const matchesCategory = activeCategory === 'all' || video.category === activeCategory;
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         video.channel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
       {/* Header */}
       <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex justify-between items-center z-10 sticky top-0">
          <div className="flex items-center space-x-3">
             <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">Video Library</span>
          </div>
          <div className="flex items-center space-x-2 bg-slate-100 rounded-full px-3 py-1.5">
             <SearchIcon className="w-4 h-4 text-slate-400" />
             <input 
               type="text"
               placeholder="Search videos..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 w-24 sm:w-32 md:w-48"
             />
          </div>
       </div>

       {/* Filters */}
       <div className="shrink-0 p-4 overflow-x-auto flex space-x-2 scrollbar-hide">
          <button 
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-brand-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >
            All Videos
          </button>
          <button 
            onClick={() => setActiveCategory('study')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeCategory === 'study' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >
            <BookIcon className="w-3 h-3" />
            <span>Bible Study</span>
          </button>
          <button 
            onClick={() => setActiveCategory('worship')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeCategory === 'worship' ? 'bg-purple-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >
            <DoveIcon className="w-3 h-3" />
            <span>Worship</span>
          </button>
          <button 
            onClick={() => setActiveCategory('uplifting')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${activeCategory === 'uplifting' ? 'bg-gold-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
          >
            <SunIcon className="w-3 h-3" />
            <span>Uplifting</span>
          </button>
       </div>

       {/* Grid */}
       <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {filteredVideos.map(video => (
              <div 
                key={video.id}
                className="group bg-white rounded-2xl shadow-sm border border-brand-100 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => setPlayingVideo(video.videoId)}
              >
                 <div className="relative aspect-video bg-slate-200 overflow-hidden">
                    <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                       <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300">
                          <PlayIcon className="w-5 h-5 text-brand-600 ml-0.5" />
                       </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm">
                      {video.duration}
                    </div>
                 </div>
                 <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                       <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          video.category === 'study' ? 'bg-blue-50 text-blue-600' :
                          video.category === 'worship' ? 'bg-purple-50 text-purple-600' :
                          'bg-gold-50 text-gold-600'
                       }`}>
                          {video.category}
                       </span>
                    </div>
                    <h3 className="font-display font-semibold text-slate-800 leading-tight mb-1 line-clamp-2">{video.title}</h3>
                    <p className="text-xs text-slate-500 font-medium">{video.channel}</p>
                 </div>
              </div>
            ))}
          </div>
       </div>

       {/* Video Player Modal */}
       {playingVideo && (
         <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl relative">
               <button 
                 onClick={() => setPlayingVideo(null)}
                 className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-white/20 transition-colors"
               >
                  <XIcon className="w-6 h-6" />
               </button>
               <div className="aspect-video w-full">
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1&modestbranding=1&rel=0`} 
                    title="Video player" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};
