import React, { useState } from 'react';
import { FacebookIcon, InstagramIcon, XSocialIcon, MailIcon, LinkIcon, XIcon } from './Icons';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  text: string;
  url?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, text, url = window.location.href }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const shareLinks = [
    {
      name: 'Facebook',
      icon: <FacebookIcon className="w-6 h-6 text-blue-600" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
      bgColor: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      name: 'X (Twitter)',
      icon: <XSocialIcon className="w-5 h-5 text-black" />,
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      bgColor: 'bg-gray-100 hover:bg-gray-200',
    },
    {
      name: 'Email',
      icon: <MailIcon className="w-6 h-6 text-red-500" />,
      href: `mailto:?subject=Shared from Lumen&body=${encodedText}%0A%0A${url}`,
      bgColor: 'bg-red-50 hover:bg-red-100',
    },
    {
      name: 'Instagram',
      icon: <InstagramIcon className="w-6 h-6 text-pink-600" />,
      action: () => {
        navigator.clipboard.writeText(`${text} ${url}`);
        window.open('https://instagram.com', '_blank');
      },
      bgColor: 'bg-pink-50 hover:bg-pink-100',
      label: 'Copy & Open App'
    }
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
          <XIcon className="w-5 h-5" />
        </button>
        
        <h3 className="text-xl font-display font-semibold text-slate-800 mb-1">Share</h3>
        <p className="text-sm text-slate-500 mb-6 line-clamp-2">"{text}"</p>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {shareLinks.map((link) => (
            <div key={link.name} className="flex flex-col items-center gap-2">
              <a 
                href={link.href} 
                target={link.href ? "_blank" : undefined}
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (link.action) {
                    e.preventDefault();
                    link.action();
                  }
                }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform hover:scale-105 ${link.bgColor}`}
                title={link.label || link.name}
              >
                {link.icon}
              </a>
              <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">{link.name}</span>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
             <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
             <input type="text" value={url} readOnly className="bg-transparent border-none text-xs text-slate-500 w-full focus:ring-0 truncate" />
             <button 
               onClick={handleCopyLink} 
               className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
             >
               {copied ? 'Copied' : 'Copy'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};