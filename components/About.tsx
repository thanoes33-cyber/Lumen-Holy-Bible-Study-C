import React from 'react';
import { DoveIcon, MessageCircleIcon, HandsIcon, MapIcon, ShieldIcon } from './Icons';

export const About: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-y-auto">
       <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex items-center justify-between z-10 sticky top-0">
          <span className="text-brand-800 font-display font-semibold tracking-wide text-lg">About</span>
       </div>

       <div className="max-w-3xl mx-auto w-full px-6 py-12 pb-20">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/30 mx-auto mb-6">
               <DoveIcon className="w-10 h-10" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-slate-800 mb-4">Lumen: Holy Bible Study</h1>
            <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
              Your personal AI-powered spiritual companion, designed to help you grow in faith, understand scripture, and find comfort in God's word.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-50">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 mb-4">
                   <MessageCircleIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">Interactive Bible Study</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Chat with Lumen to explore complex theological questions, find specific verses, or receive guidance based on biblical principles.
                </p>
             </div>
             
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-50">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-4">
                   <MapIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">Daily Journey</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Complete daily spiritual tasks including journaling, scripture reading, and personalized devotionals to build a consistent habit.
                </p>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-50">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                   <HandsIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">Prayer Wall</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                   Record your prayer requests, track answered prayers, and let AI guide you in prayer for specific situations in your life.
                </p>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-50">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 mb-4">
                   <ShieldIcon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">Safe & Private</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                   Your spiritual journey is personal. Lumen provides a safe, judgment-free space to ask questions and seek comfort.
                </p>
             </div>
          </div>
       </div>
    </div>
  );
};