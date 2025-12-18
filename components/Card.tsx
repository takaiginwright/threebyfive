
import React from 'react';
import { IdeaCard, getThemeColor, CardCategory, MediaType } from '../types';
import { Image as ImageIcon, Video, Link as LinkIcon, Music, Paperclip, GitMerge, Archive, PenTool } from 'lucide-react';

interface CardProps {
  card: IdeaCard;
  isDarkMode: boolean;
  onClick: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  style?: React.CSSProperties;
  className?: string;
}

const Card: React.FC<CardProps> = ({ card, isDarkMode, onClick, variant = 'default', style, className = '' }) => {
  const accentColor = getThemeColor(card.color, isDarkMode);

  // Flatten and format tags for preview
  const allTagsFormatted: { category: string; label: string }[] = [];
  (Object.keys(card.tags) as CardCategory[]).forEach(cat => {
      const tags = card.tags[cat];
      if (tags) {
          tags.forEach(t => allTagsFormatted.push({ category: cat, label: t }));
      }
  });

  const previewTags = allTagsFormatted.slice(0, 3);
  
  // Media Logic
  const media = card.media || [];
  const coverImage = media.find(m => m.type === 'image');
  const otherMedia = media.filter(m => m.id !== coverImage?.id);
  const distinctTypes = Array.from(new Set(otherMedia.map(m => m.type)));
  
  const threadCount = card.threads ? card.threads.length : 0;
  const isArchived = card.isArchived;

  const getIconForType = (type: MediaType) => {
      switch (type) {
          case 'video': return Video;
          case 'audio': return Music;
          case 'link': return LinkIcon;
          case 'image': return ImageIcon;
          default: return Paperclip;
      }
  };

  if (variant === 'compact') {
      return (
        <div 
            onClick={onClick}
            style={{ ...style, borderTop: `3px solid ${isArchived ? (isDarkMode ? '#555' : '#ccc') : accentColor}` }}
            className={`
                relative group cursor-pointer rounded-lg shadow-md hover:shadow-lg transition-all duration-300
                overflow-hidden bg-white dark:bg-night-surface w-48
                hover:-translate-y-1 border border-stone-200 dark:border-white/5
                ${isArchived ? 'opacity-60 grayscale-[0.8] hover:opacity-100' : ''}
                ${className}
            `}
        >
             <div className="p-3 relative">
                <div className="flex justify-between items-start mb-2">
                    <h3 className={`font-semibold text-xs text-stone-900 dark:text-night-text leading-tight truncate ${!card.title ? 'text-stone-400 italic' : ''}`}>
                        {card.title || 'Untitled'}
                    </h3>
                    {isArchived && <Archive size={10} className="text-stone-400" />}
                </div>
                
                <div className="relative">
                    {/* Compact Card Content Preview */}
                    <p className="text-[9px] text-stone-500 dark:text-stone-400 line-clamp-3 min-h-[2.5em] font-mono leading-relaxed">
                        {card.content || "..."}
                    </p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                    {threadCount > 0 && <span className="flex items-center text-[9px] text-stone-400"><GitMerge size={8} className="mr-0.5"/> {threadCount}</span>}
                    {media.length > 0 && <span className="flex items-center text-[9px] text-stone-400"><Paperclip size={8} className="mr-0.5"/> {media.length}</span>}
                    {card.drawing && <span className="flex items-center text-[9px] text-stone-400"><PenTool size={8} className="mr-0.5"/></span>}
                </div>
             </div>
        </div>
      );
  }

  return (
    <div 
      onClick={onClick}
      style={{
        ...style,
        borderTop: `4px solid ${isArchived ? (isDarkMode ? '#555' : '#ccc') : accentColor}`
      }}
      className={`
        relative group cursor-pointer break-inside-avoid
        rounded-xl transition-all duration-300 shadow-cinematic hover:shadow-cinematic-hover
        overflow-hidden bg-white dark:bg-night-surface
        hover:-translate-y-1.5
        ${isArchived ? 'opacity-70 grayscale hover:opacity-100 hover:grayscale-0' : ''}
        ${className}
      `}
    >
      {/* Content Container */}
      <div className="relative flex flex-col h-full z-10">
          
        {/* Cover Image */}
        {coverImage ? (
            <div className="h-36 w-full relative overflow-hidden bg-stone-100 dark:bg-white/5 border-b border-black/5 dark:border-white/5">
                <div className="absolute inset-0 bg-stone-900/5 dark:bg-black/20 z-10 transition-opacity group-hover:opacity-0" />
                <img 
                    src={coverImage.url} 
                    alt="Cover" 
                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-105" 
                />
            </div>
        ) : null}

        <div className="p-5 flex flex-col min-h-[140px]">
            {/* Title - Inter (Default), bold for clarity */}
            <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className={`font-semibold text-lg text-stone-900 dark:text-night-text leading-tight tracking-tight ${!card.title ? 'text-stone-400 italic font-normal' : ''}`}>
                    {card.title || 'Untitled'}
                </h3>
                {isArchived && (
                    <div className="shrink-0 p-1 bg-stone-100 dark:bg-white/10 rounded">
                        <Archive size={12} className="text-stone-500 dark:text-stone-400" />
                    </div>
                )}
            </div>
            
            <div className="flex-1 relative mb-4">
                {/* Body - IBM Plex Mono for the creative "script" feel */}
                <p className="font-mono font-light text-xs text-stone-600 dark:text-night-body leading-relaxed whitespace-pre-wrap line-clamp-4 relative z-0">
                    {card.content || "Start writing..."}
                </p>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-col gap-3 mt-auto relative z-20 bg-white/50 dark:bg-black/10 backdrop-blur-[1px]">
                {/* Indicators Row */}
                {(otherMedia.length > 0 || threadCount > 0 || card.drawing) && (
                    <div className="flex items-center gap-2">
                        {otherMedia.length > 0 && (
                            <div className="flex items-center gap-2 p-1 px-2 rounded bg-stone-100 dark:bg-white/10 border border-black/5 dark:border-white/5 w-fit">
                                {distinctTypes.map(type => {
                                    const Icon = getIconForType(type);
                                    return <Icon key={type} size={11} className="text-stone-500 dark:text-stone-400" />;
                                })}
                                <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest ml-1">
                                    {otherMedia.length === 1 ? (otherMedia[0].label || 'Attach') : `${otherMedia.length}`}
                                </span>
                            </div>
                        )}
                        
                        {card.drawing && (
                             <div className="flex items-center gap-1.5 p-1 px-2 rounded bg-stone-100 dark:bg-white/10 border border-black/5 dark:border-white/5 w-fit" title="Sketch">
                                <PenTool size={11} className="text-stone-500 dark:text-stone-400" />
                             </div>
                        )}
                        
                        {threadCount > 0 && (
                             <div className="flex items-center gap-1.5 p-1 px-2 rounded bg-stone-100 dark:bg-white/10 border border-black/5 dark:border-white/5 w-fit" title="Linked Threads">
                                <GitMerge size={11} className="text-stone-500 dark:text-stone-400" />
                                <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                                    {threadCount}
                                </span>
                             </div>
                        )}
                    </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                    {previewTags.map((item, idx) => (
                        <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-widest border border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/5 text-stone-500 dark:text-stone-400">
                           {item.label}
                        </span>
                    ))}
                    {previewTags.length === 0 && otherMedia.length === 0 && threadCount === 0 && !coverImage && !card.drawing && (
                        <div className="text-[10px] text-stone-300 dark:text-stone-600 flex items-center gap-1.5 italic">
                             Empty
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Card;
