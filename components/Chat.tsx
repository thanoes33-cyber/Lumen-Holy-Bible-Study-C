import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GenerateContentResponse, Content } from "@google/genai";
import { getChatSession, resetChatSession } from '../services/geminiService';
import { Message, Role } from '../types';
import { SendIcon, RefreshIcon, DoveIcon, BookIcon, HeartIcon, ShareIcon, CheckIcon, SpeakerIcon, StopIcon, CopyIcon } from './Icons';
import { DailyVerseCard } from './DailyVerseCard';
import { db } from '../services/firebase';
import { collection, doc, setDoc, getDoc, addDoc } from 'firebase/firestore';
import { ShareModal } from './ShareModal';

interface ChatProps {
  userId: string;
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
}

const findBibleReference = (text: string): string | null => {
  const regex = /\b((?:1|2|3|I|II|III)\s?)?[A-Z][a-z]+\.?\s\d+(?::\d+(?:-\d+)?)?\b/;
  const match = text.match(regex);
  return match ? match[0] : null;
};

export const Chat: React.FC<ChatProps> = ({ userId, initialPrompt, onClearInitialPrompt }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [sharingMessage, setSharingMessage] = useState<{text: string, id: string} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedHistory = useRef(false);

  // Load history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        if (userId === 'guest-dev-user') {
          const saved = localStorage.getItem('lumen_chat_history');
          if (saved) {
             const savedMessages = JSON.parse(saved);
             setMessages(savedMessages);
             const history: Content[] = savedMessages
               .filter((m: Message) => m.id !== 'welcome' && !m.isStreaming)
               .map((m: Message) => ({
                 role: m.role,
                 parts: [{ text: m.text }]
               }));
             getChatSession(history);
          } else {
             // Default for guest
             const welcomeMsg: Message = { id: 'welcome', role: Role.MODEL, text: "Welcome. I am Lumen. How can I support your spiritual journey today?", timestamp: Date.now() };
             setMessages([welcomeMsg]);
             getChatSession([]);
          }
          hasLoadedHistory.current = true;
          return;
        }

        if (db) {
            const docRef = doc(db, 'users', userId, 'chats', 'main');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const savedMessages = docSnap.data().messages as Message[];
              setMessages(savedMessages);
              
              // Restore Gemini context
              const history: Content[] = savedMessages
                .filter(m => m.id !== 'welcome' && !m.isStreaming)
                .map(m => ({
                  role: m.role,
                  parts: [{ text: m.text }]
                }));
              getChatSession(history);
            } else {
              // Default Welcome
              const welcomeMsg: Message = {
                id: 'welcome',
                role: Role.MODEL,
                text: "Welcome. I am Lumen. How can I support your spiritual journey today?",
                timestamp: Date.now(),
              };
              setMessages([welcomeMsg]);
              getChatSession([]);
            }
        } else {
             const welcomeMsg: Message = { id: 'welcome', role: Role.MODEL, text: "Welcome. I am Lumen. How can I support your spiritual journey today?", timestamp: Date.now() };
             setMessages([welcomeMsg]);
             getChatSession([]);
        }
      } catch (e) {
        console.error("Error loading chat history", e);
        setMessages([{ id: 'welcome', role: Role.MODEL, text: "Welcome. I am Lumen. How can I support your spiritual journey today?", timestamp: Date.now() }]);
      } finally {
        hasLoadedHistory.current = true;
      }
    };
    
    if (userId) loadHistory();
  }, [userId]);

  // Save history
  useEffect(() => {
    if (!hasLoadedHistory.current || messages.length === 0) return;
    const saveHistory = async () => {
        try {
            if (userId === 'guest-dev-user') {
                localStorage.setItem('lumen_chat_history', JSON.stringify(messages));
            } else if (db) {
                await setDoc(doc(db, 'users', userId, 'chats', 'main'), { messages });
            }
        } catch (e) { console.error("Error saving chat", e); }
    };
    const timeout = setTimeout(saveHistory, 1000);
    return () => clearTimeout(timeout);
  }, [messages, userId]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => window.speechSynthesis.cancel();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Stop speaking if new message is sent
    window.speechSynthesis.cancel();
    setSpeakingId(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Role.USER,
      text: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const chat = getChatSession();
      
      const botMsgId = (Date.now() + 1).toString();
      setMessages(prev => [
        ...prev,
        {
          id: botMsgId,
          role: Role.MODEL,
          text: '',
          isStreaming: true,
          timestamp: Date.now(),
        }
      ]);

      const result = await chat.sendMessageStream({ message: text });
      let fullText = '';

      for await (const chunk of result) {
        const chunkText = (chunk as GenerateContentResponse).text || '';
        fullText += chunkText;
        setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: fullText } : msg));
      }

      setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, isStreaming: false } : msg));

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: Role.MODEL, text: "I apologize, but I am having trouble connecting right now.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  useEffect(() => {
    if (initialPrompt && hasLoadedHistory.current) {
      handleSend(initialPrompt);
      if(onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, hasLoadedHistory.current]);

  const handleReset = async () => {
    if(window.confirm("Clear chat history?")) {
        window.speechSynthesis.cancel();
        setSpeakingId(null);
        resetChatSession();
        const welcomeMsg = {
            id: Date.now().toString(),
            role: Role.MODEL,
            text: "Chat cleared. How may I help you anew?",
            timestamp: Date.now(),
        };
        setMessages([welcomeMsg]);
        if (userId === 'guest-dev-user') {
            localStorage.setItem('lumen_chat_history', JSON.stringify([welcomeMsg]));
        } else if (db) {
            await setDoc(doc(db, 'users', userId, 'chats', 'main'), { messages: [welcomeMsg] });
        }
    }
  };

  const handleRegenerate = async () => {
    if (isLoading || messages.length < 2) return;
    
    // Find last message and check if it's from model
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role !== Role.MODEL) return;
    
    // Find the user message before it
    const userMsg = messages[messages.length - 2];
    if (!userMsg || userMsg.role !== Role.USER) return;
    
    // Stop any speech
    window.speechSynthesis.cancel();
    setSpeakingId(null);

    // Remove both the last model response and the user message (handleSend will re-add user message)
    const keptMessages = messages.slice(0, -2);
    setMessages(keptMessages);
    
    // Re-initialize session with history up to that point
    const history = keptMessages
      .filter(m => m.id !== 'welcome' && !m.isStreaming)
      .map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
    resetChatSession(history);
    
    // Resend the user's last message
    await handleSend(userMsg.text);
  };

  const handleSaveVerse = async (text: string, reference: string) => {
      const newFav = {
          reference: reference,
          text: text, // Saving the full context for now, ideally AI would parse just the verse text
          date: Date.now(),
          source: 'chat'
      };

      try {
        if (userId === 'guest-dev-user') {
            const local = localStorage.getItem('lumen_favorites');
            const favs = local ? JSON.parse(local) : [];
            favs.unshift({ ...newFav, id: Date.now().toString() });
            localStorage.setItem('lumen_favorites', JSON.stringify(favs));
        } else if (db) {
            await addDoc(collection(db, 'users', userId, 'favorites'), newFav);
        }
        alert("Verse saved to favorites!");
      } catch (e) {
        console.error("Error saving favorite", e);
      }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const handleSpeak = (text: string, id: string) => {
      if (speakingId === id) {
          window.speechSynthesis.cancel();
          setSpeakingId(null);
      } else {
          window.speechSynthesis.cancel(); // Cancel any current speech
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.onend = () => setSpeakingId(null);
          utterance.onerror = () => setSpeakingId(null);
          window.speechSynthesis.speak(utterance);
          setSpeakingId(id);
      }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Chat Header */}
      <div className="shrink-0 px-6 py-4 bg-white/80 backdrop-blur-md border-b border-brand-100 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true"></div>
          <span className="text-brand-800 font-display font-semibold tracking-wide">Lumen Companion</span>
        </div>
        <button 
            onClick={handleReset} 
            className="p-2 text-brand-400 hover:text-brand-600 transition-colors rounded-full hover:bg-brand-50"
            aria-label="Start New Chat"
            title="Reset Chat"
        >
          <RefreshIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32" aria-live="polite">
        <div className="max-w-3xl mx-auto space-y-6">
          <DailyVerseCard userId={userId} />
          {messages.map((msg, index) => {
            const reference = msg.role === Role.MODEL && !msg.isStreaming ? findBibleReference(msg.text) : null;
            const isLastMessage = index === messages.length - 1;
            
            return (
            <div key={msg.id} className={`flex w-full ${msg.role === Role.USER ? 'justify-end' : 'justify-start items-end'}`}>
              {msg.role === Role.MODEL && (
                <div className="flex-shrink-0 mr-2.5 mb-1" aria-hidden="true">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-100 to-white border border-brand-200 flex items-center justify-center shadow-sm text-brand-500">
                    <DoveIcon className="w-4 h-4" />
                  </div>
                </div>
              )}
              <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-5 py-4 shadow-sm leading-relaxed ${msg.role === Role.USER ? 'bg-brand-600 text-white rounded-br-none' : 'bg-gradient-to-br from-white to-brand-50 text-slate-700 rounded-bl-none border border-brand-100 group relative'}`}>
                <div className="whitespace-pre-wrap font-sans text-[15px] sm:text-[16px]">
                  {msg.text}
                  
                  {/* Streaming Cursor for content */}
                  {msg.isStreaming && msg.text.length > 0 && (
                    <span className="inline-block w-1.5 h-4 ml-0.5 align-middle bg-brand-400/80 animate-pulse rounded-[1px]"></span>
                  )}

                  {/* Thinking Indicator for initial load */}
                  {msg.isStreaming && msg.text.length === 0 && (
                    <div className="flex space-x-1 items-center h-6 my-1" aria-label="Thinking">
                      <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"></div>
                    </div>
                  )}
                </div>
                
                {/* Actions Footer - Only for completed model messages */}
                {msg.role === Role.MODEL && !msg.isStreaming && (
                  <div className="mt-3 pt-3 border-t border-brand-100/50 flex flex-wrap gap-2 items-center justify-between">
                    {/* Left: Reference Actions */}
                    <div>
                      {reference && (
                        <button onClick={() => handleSend(`Read surrounding verses for ${reference}`)} className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/60 hover:bg-white rounded-lg text-xs font-medium text-brand-700 transition-colors border border-brand-100 shadow-sm">
                          <BookIcon className="w-3.5 h-3.5 text-brand-400" />
                          <span>Read Context</span>
                        </button>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center space-x-2">
                       {/* Regenerate Button - Only on last message */}
                       {isLastMessage && (
                           <button 
                              onClick={handleRegenerate}
                              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors hover:bg-white/60"
                              aria-label="Regenerate response"
                              title="Regenerate"
                           >
                              <RefreshIcon className="w-4 h-4" />
                              <span className="hidden sm:inline">Regenerate</span>
                           </button>
                       )}

                       {/* Read Aloud Button */}
                       <button
                          onClick={() => handleSpeak(msg.text, msg.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors hover:bg-white/60"
                          aria-label={speakingId === msg.id ? "Stop reading" : "Read aloud"}
                          title={speakingId === msg.id ? "Stop reading" : "Read aloud"}
                       >
                          {speakingId === msg.id ? <StopIcon className="w-4 h-4 text-brand-600 animate-pulse" /> : <SpeakerIcon className="w-4 h-4" />}
                          <span className="hidden sm:inline">{speakingId === msg.id ? 'Stop' : 'Listen'}</span>
                       </button>

                       {reference && (
                        <button 
                            onClick={() => handleSaveVerse(msg.text, reference)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 transition-colors hover:bg-white/60"
                            aria-label="Save verse"
                            title="Save verse"
                        >
                            <HeartIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Save</span>
                        </button>
                       )}
                       
                       <button 
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors hover:bg-white/60"
                          aria-label="Copy text"
                          title="Copy text"
                       >
                          {copiedId === msg.id ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                          <span className="hidden sm:inline">{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                       </button>

                       <button 
                          onClick={() => setSharingMessage({ text: msg.text, id: msg.id })}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors hover:bg-white/60"
                          aria-label="Share message"
                          title="Share"
                       >
                          <ShareIcon className="w-4 h-4" />
                          <span className="hidden sm:inline">Share</span>
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )})}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-brand-100 p-2 flex items-end space-x-2 ring-1 ring-brand-100/50">
          <label htmlFor="chatInput" className="sr-only">Type your message</label>
          <textarea
            id="chatInput"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); }}}
            placeholder="Ask a question..."
            className="flex-1 max-h-32 min-h-[52px] bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400 resize-none p-3"
            rows={1}
          />
          <button 
            onClick={() => handleSend(input)} 
            disabled={!input.trim() || isLoading} 
            className={`p-3 rounded-xl flex-shrink-0 transition-all duration-200 ${input.trim() && !isLoading ? 'bg-brand-600 text-white shadow-md hover:bg-brand-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            aria-label="Send Message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <ShareModal 
        isOpen={!!sharingMessage} 
        onClose={() => setSharingMessage(null)} 
        text={sharingMessage?.text || ''} 
      />
    </div>
  );
};