
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IdeaCard, CardCategory, ALL_CATEGORIES, SUBCATEGORIES, CardColor, getThemeColor, Project, MediaAttachment, MediaType, IdeaSet, StoryQuestion } from '../types';
import { X, Save, Tag, Plus, Trash2, ChevronDown, Image as ImageIcon, Link as LinkIcon, Video, Music, ExternalLink, GitMerge, Search, Layers, Archive, RefreshCw, HelpCircle, PenTool } from 'lucide-react';
import { autoTagCard } from '../services/geminiService';
import { getProjects, getSets, getStoryQuestions } from '../services/storageService';
import DrawingCanvas from './DrawingCanvas';

interface CardEditorProps {
  card: IdeaCard;
  allCards: IdeaCard[]; // Needed for linking
  isDarkMode: boolean;
  onSave: (card: IdeaCard) => void;
  onClose: () => void;
  onDelete: (id: string) => void; 
  onSwitchCard: (card: IdeaCard) => void; 
}

const CardEditor: React.FC<CardEditorProps> = ({ card, allCards, isDarkMode, onSave, onClose, onDelete, onSwitchCard }) => {
  const [editedCard, setEditedCard] = useState<IdeaCard>({ ...card, media: card.media || [], threads: card.threads || [], sets: card.sets || [], storyQuestions: card.storyQuestions || [] });
  const [isGenerating, setIsGenerating] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableSets, setAvailableSets] = useState<IdeaSet[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<StoryQuestion[]>([]);
  
  const [activeTab, setActiveTab] = useState<'content' | 'tags' | 'threads'>('content');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Tag Builder State
  const [newTagCategory, setNewTagCategory] = useState<CardCategory>(CardCategory.Setting);
  const [newTagSub, setNewTagSub] = useState<string>('');
  const [newTagValue, setNewTagValue] = useState<string>('');
  
  // Media Input State
  const [isAddingMedia, setIsAddingMedia] = useState<MediaType | null>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [mediaLabelInput, setMediaLabelInput] = useState('');

  // Draw Mode State
  const [isDrawMode, setIsDrawMode] = useState(false);

  // Thread State
  const [threadSearch, setThreadSearch] = useState('');

  useEffect(() => {
    setProjects(getProjects());
    const allSets = getSets();
    setAvailableSets(allSets.filter(s => s.projectId === card.projectId));
    
    const allQuestions = getStoryQuestions();
    setAvailableQuestions(allQuestions.filter(q => q.projectId === card.projectId));
    
    setEditedCard({ ...card, media: card.media || [], threads: card.threads || [], sets: card.sets || [], storyQuestions: card.storyQuestions || [] });
  }, [card]);

  useEffect(() => {
    const subs = SUBCATEGORIES[newTagCategory];
    setNewTagSub(subs && subs.length > 0 ? subs[0] : '');
  }, [newTagCategory]);

  // Auto-resize textarea
  useEffect(() => {
    if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
        textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 'px';
    }
  }, [editedCard.content]);

  const handleChange = (field: keyof IdeaCard, value: any) => {
    setEditedCard(prev => ({ ...prev, [field]: value, updatedAt: Date.now() }));
  };
  
  const toggleSet = (setId: string) => {
      setEditedCard(prev => {
          const currentSets = prev.sets || [];
          if (currentSets.includes(setId)) {
              return { ...prev, sets: currentSets.filter(id => id !== setId), updatedAt: Date.now() };
          } else {
              return { ...prev, sets: [...currentSets, setId], updatedAt: Date.now() };
          }
      });
  }

  const toggleQuestion = (qId: string) => {
      setEditedCard(prev => {
          const currentQs = prev.storyQuestions || [];
          if (currentQs.includes(qId)) {
              return { ...prev, storyQuestions: currentQs.filter(id => id !== qId), updatedAt: Date.now() };
          } else {
              return { ...prev, storyQuestions: [...currentQs, qId], updatedAt: Date.now() };
          }
      });
  }

  const addTag = () => {
    if (!newTagValue.trim()) return;

    const formattedTag = newTagSub && newTagSub.trim() 
      ? `${newTagSub} – ${newTagValue.trim()}`
      : newTagValue.trim();

    setEditedCard(prev => {
      const existingTags = prev.tags[newTagCategory] || [];
      if (existingTags.includes(formattedTag)) return prev;

      return {
        ...prev,
        tags: {
          ...prev.tags,
          [newTagCategory]: [...existingTags, formattedTag]
        }
      };
    });
    setNewTagValue('');
  };

  const removeTag = (category: CardCategory, tagToRemove: string) => {
    setEditedCard(prev => ({
      ...prev,
      tags: {
        ...prev.tags,
        [category]: prev.tags[category]?.filter(t => t !== tagToRemove) || []
      }
    }));
  };

  const handleAutoTag = async () => {
    setIsGenerating(true);
    const suggestedTags = await autoTagCard(editedCard);
    setEditedCard(prev => {
        const newTags = { ...prev.tags };
        (Object.keys(suggestedTags) as CardCategory[]).forEach(cat => {
            const current = newTags[cat] || [];
            const incoming = suggestedTags[cat] || [];
            newTags[cat] = Array.from(new Set([...current, ...incoming]));
        });
        return { ...prev, tags: newTags };
    });
    setIsGenerating(false);
    setActiveTab('tags');
  };

  const handleSave = () => {
    onSave(editedCard);
    onClose();
  };

  const handleDrawingSave = (data: string | null) => {
      if (data) {
          setEditedCard(prev => ({ ...prev, drawing: data, updatedAt: Date.now() }));
      } else {
          // If data is null (e.g. cleared canvas), remove the drawing
          setEditedCard(prev => ({ ...prev, drawing: undefined, updatedAt: Date.now() }));
      }
      setIsDrawMode(false);
  }

  const handleDeleteSketch = () => {
    if (confirm("Are you sure you want to delete this sketch? This cannot be undone.")) {
        setEditedCard(prev => ({ ...prev, drawing: undefined, updatedAt: Date.now() }));
        setIsDrawMode(false);
    }
  };

  // --- THREAD HANDLERS ---
  const toggleThread = (targetId: string) => {
      setEditedCard(prev => {
          const currentThreads = prev.threads || [];
          if (currentThreads.includes(targetId)) {
              return { ...prev, threads: currentThreads.filter(id => id !== targetId), updatedAt: Date.now() };
          } else {
              return { ...prev, threads: [...currentThreads, targetId], updatedAt: Date.now() };
          }
      });
  };

  const availableCardsForThreading = useMemo(() => {
    return allCards.filter(c => c.id !== editedCard.id && 
       (c.title.toLowerCase().includes(threadSearch.toLowerCase()) || 
        c.content.toLowerCase().includes(threadSearch.toLowerCase()))
    );
  }, [allCards, editedCard.id, threadSearch]);

  const linkedCards = useMemo(() => {
      return allCards.filter(c => (editedCard.threads || []).includes(c.id));
  }, [allCards, editedCard.threads]);


  // --- MEDIA HANDLERS ---
  const handleAddMedia = () => {
      if (!mediaUrlInput.trim()) return;
      const newMedia: MediaAttachment = {
          id: crypto.randomUUID(),
          type: isAddingMedia || 'link',
          url: mediaUrlInput.trim(),
          label: mediaLabelInput.trim() || undefined
      };
      setEditedCard(prev => ({ ...prev, media: [...prev.media, newMedia], updatedAt: Date.now() }));
      setMediaUrlInput('');
      setMediaLabelInput('');
      setIsAddingMedia(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
          alert("Image is too large. Please use an image under 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
          const base64 = reader.result as string;
          const newMedia: MediaAttachment = {
              id: crypto.randomUUID(),
              type: 'image',
              url: base64,
              label: file.name
          };
          setEditedCard(prev => ({ ...prev, media: [...prev.media, newMedia], updatedAt: Date.now() }));
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeMedia = (id: string) => {
      setEditedCard(prev => ({ ...prev, media: prev.media.filter(m => m.id !== id), updatedAt: Date.now() }));
  };

  const getYoutubeEmbedUrl = (url: string) => {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
  };

  const colorOptions: CardColor[] = ['white', 'amber', 'royal', 'crimson', 'gold', 'sage', 'plum', 'teal'];
  const accentColorHex = getThemeColor(editedCard.color, isDarkMode);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-300/40 dark:bg-black/60 backdrop-blur-md">
      <div 
        className={`w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden bg-white/95 dark:bg-night-surface/95 border border-white/50 dark:border-white/10 animate-enter transition-all duration-500`}
        style={{ borderTop: `6px solid ${accentColorHex}` }}
      >
        {/* Header / Toolbar */}
        <div className={`flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10 bg-white dark:bg-night-surface`}>
            <div className="flex items-center gap-6 w-full md:w-auto">
                <button onClick={onClose} className="p-2 -ml-2 text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 rounded-full transition-colors">
                    <X size={20} />
                </button>
                
                {/* Project Selector */}
                <div className="relative group">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 block mb-0.5">Project</span>
                    <select 
                        value={editedCard.projectId}
                        onChange={(e) => handleChange('projectId', e.target.value)}
                        className="appearance-none bg-transparent text-sm font-semibold text-stone-900 dark:text-night-text focus:outline-none cursor-pointer pr-6 tracking-tight"
                    >
                        {projects.map(p => (
                            <option key={p.id} value={p.id} className="dark:bg-night-surface">{p.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-0 bottom-1.5 text-stone-400 pointer-events-none" />
                </div>
            </div>
            
            <div className="flex items-center justify-between w-full md:w-auto mt-4 md:mt-0 gap-6">
                 {/* Color Dots */}
                 <div className="flex gap-2 p-1 bg-stone-50 dark:bg-white/5 rounded-full border border-stone-200 dark:border-white/10">
                    {colorOptions.map(c => {
                        const hex = getThemeColor(c, isDarkMode);
                        const isSelected = editedCard.color === c || (editedCard.color === undefined && c === 'white');
                        return (
                          <button 
                              key={c}
                              onClick={() => handleChange('color', c)}
                              className={`w-4 h-4 rounded-full transition-all duration-300 hover:scale-110 ${isSelected ? 'ring-2 ring-stone-900 dark:ring-white ring-offset-2 dark:ring-offset-night-surface' : ''}`}
                              style={{ backgroundColor: hex, border: (c === 'white' && !isDarkMode) ? '1px solid #E5E7EB' : 'none' }}
                              aria-label={`Set color to ${c}`}
                          />
                        );
                    })}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleAutoTag}
                        disabled={isGenerating}
                        className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Auto-Tag"
                    >
                        <Tag size={16} />
                    </button>
                    
                    <button 
                        onClick={handleSave}
                        className="ml-2 flex items-center gap-2 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white dark:text-black bg-stone-900 dark:bg-white rounded-lg shadow-lg hover:bg-black dark:hover:bg-stone-200 hover:scale-105 transition-all"
                    >
                        <Save size={14} />
                        Save
                    </button>
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-white dark:bg-night-surface">
            
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex border-b border-stone-100 dark:border-white/5">
                <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'content' ? 'text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white' : 'text-stone-400'}`}>Content</button>
                <button onClick={() => setActiveTab('threads')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'threads' ? 'text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white' : 'text-stone-400'}`}>Threads</button>
                <button onClick={() => setActiveTab('tags')} className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'tags' ? 'text-stone-900 dark:text-white border-b-2 border-stone-900 dark:border-white' : 'text-stone-400'}`}>Tags</button>
            </div>

            {/* Left Column: Content & Media */}
            <div className={`flex-1 flex flex-col relative overflow-hidden ${activeTab === 'tags' || activeTab === 'threads' ? 'hidden md:flex' : 'flex'}`}>
                
                <div className="flex-1 flex flex-col overflow-y-auto card-scroll">
                    
                    <div className="w-full p-8 md:px-12 md:py-10 pb-4 space-y-6">
                        {/* Title Input */}
                        <input 
                            type="text"
                            value={editedCard.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder="Untitled"
                            className="w-full text-4xl md:text-5xl font-bold text-stone-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 placeholder-stone-300 dark:placeholder-stone-600 tracking-tight leading-none"
                        />

                        {/* Content Input */}
                        <textarea 
                            ref={textAreaRef}
                            value={editedCard.content}
                            onChange={(e) => handleChange('content', e.target.value)}
                            placeholder="Start writing your story..."
                            className="w-full min-h-[16rem] bg-transparent font-mono font-light text-lg leading-relaxed text-stone-700 dark:text-night-body focus:outline-none placeholder-stone-300 dark:placeholder-stone-600 resize-none overflow-hidden"
                        />
                        
                         {/* DRAWING SECTION */}
                         <div className="pt-6 border-t border-stone-100 dark:border-white/5">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
                                    <PenTool size={12} /> Sketch
                                </h4>
                                {!isDrawMode && (
                                    <div className="flex items-center gap-2">
                                        {editedCard.drawing && (
                                            <button 
                                                onClick={handleDeleteSketch}
                                                className="p-1.5 text-stone-400 hover:text-red-500 dark:text-stone-500 dark:hover:text-red-400 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/10"
                                                title="Delete Sketch"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setIsDrawMode(true)}
                                            className="text-xs font-bold text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white bg-stone-100 dark:bg-white/10 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            {editedCard.drawing ? 'Edit Sketch' : 'Add Sketch'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {isDrawMode ? (
                                <div className="w-full h-96 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl overflow-hidden relative">
                                    <DrawingCanvas 
                                        initialData={editedCard.drawing}
                                        onSave={handleDrawingSave}
                                        onClose={() => setIsDrawMode(false)}
                                        accentColor={accentColorHex}
                                        isDarkMode={isDarkMode}
                                    />
                                </div>
                            ) : (
                                editedCard.drawing && (
                                    <div 
                                        onClick={() => setIsDrawMode(true)}
                                        className="w-full md:w-1/2 h-64 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-xl overflow-hidden cursor-pointer group relative"
                                    >
                                        <img src={editedCard.drawing} alt="Sketch" className="w-full h-full object-contain p-4" />
                                        <div className="absolute inset-0 bg-black/5 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="bg-white dark:bg-stone-800 text-stone-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">Edit</span>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Media Section */}
                    <div className="px-8 md:px-12 pb-12 space-y-6">
                        <div className="flex items-center justify-between border-t border-stone-100 dark:border-white/5 pt-8">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Attachments</h4>
                            <div className="flex items-center gap-1">
                                <div className="w-px h-4 bg-stone-200 dark:bg-white/10 mx-1"></div>
                                <button onClick={() => setIsAddingMedia('link')} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-white/10 rounded-lg transition-colors" title="Add Link"><LinkIcon size={16} /></button>
                                <button onClick={() => { setIsAddingMedia('image'); }} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-white/10 rounded-lg transition-colors" title="Add Image"><ImageIcon size={16} /></button>
                                <button onClick={() => setIsAddingMedia('video')} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-white/10 rounded-lg transition-colors" title="Add Video"><Video size={16} /></button>
                                <button onClick={() => setIsAddingMedia('audio')} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-50 dark:hover:bg-white/10 rounded-lg transition-colors" title="Add Audio"><Music size={16} /></button>
                            </div>
                        </div>

                        {/* Media Input Form */}
                        {isAddingMedia && (
                            <div className="bg-stone-50 dark:bg-white/5 p-6 rounded-xl border border-stone-200 dark:border-white/10 animate-enter shadow-inner">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">Add {isAddingMedia}</span>
                                    <button onClick={() => setIsAddingMedia(null)} className="text-stone-400 hover:text-stone-800 dark:hover:text-white"><X size={14} /></button>
                                </div>
                                
                                {isAddingMedia === 'image' && (
                                    <div className="mb-4">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            className="block w-full text-xs text-stone-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-stone-200 dark:file:bg-white/10 file:text-stone-700 dark:file:text-stone-300 hover:file:bg-stone-300 dark:hover:file:bg-white/20 cursor-pointer"
                                        />
                                        <div className="text-center text-[10px] text-stone-400 my-3 font-medium uppercase tracking-widest">- OR -</div>
                                    </div>
                                )}

                                <div className="flex flex-col gap-3">
                                    <input 
                                        type="text" 
                                        placeholder={isAddingMedia === 'image' ? "Paste Image URL..." : `${isAddingMedia} URL...`}
                                        value={mediaUrlInput}
                                        onChange={(e) => setMediaUrlInput(e.target.value)}
                                        className="w-full text-sm bg-white dark:bg-black/20 border-none rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 placeholder-stone-400 dark:placeholder-stone-600 text-stone-800 dark:text-stone-200"
                                        autoFocus
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Label / Caption (optional)"
                                        value={mediaLabelInput}
                                        onChange={(e) => setMediaLabelInput(e.target.value)}
                                        className="w-full text-sm bg-white dark:bg-black/20 border-none rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 placeholder-stone-400 dark:placeholder-stone-600 text-stone-800 dark:text-stone-200"
                                    />
                                    <button 
                                        onClick={handleAddMedia} 
                                        className="self-end px-5 py-2 bg-stone-900 dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-black dark:hover:bg-stone-200 transition-colors"
                                    >
                                        Add Media
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Media Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {editedCard.media?.map(media => (
                                <div key={media.id} className="relative group bg-stone-50 dark:bg-white/5 rounded-lg border border-stone-200/60 dark:border-white/5 overflow-hidden transition-all hover:shadow-md">
                                    <button onClick={() => removeMedia(media.id)} className="absolute top-2 right-2 z-10 p-2 bg-white/90 dark:bg-black/80 text-stone-500 hover:text-red-500 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                    
                                    {media.type === 'image' && (
                                        <div className="aspect-video w-full bg-stone-100 dark:bg-white/5 relative group-hover:scale-[1.02] transition-transform duration-500">
                                            <img src={media.url} alt={media.label || "Attachment"} className="w-full h-full object-cover" />
                                            {media.label && <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white text-[10px] p-2 truncate font-medium tracking-wide">{media.label}</div>}
                                        </div>
                                    )}

                                    {media.type === 'video' && (
                                        <div className="aspect-video w-full bg-black relative">
                                            {getYoutubeEmbedUrl(media.url) ? (
                                                <iframe 
                                                    src={getYoutubeEmbedUrl(media.url)!} 
                                                    className="w-full h-full" 
                                                    allowFullScreen 
                                                    title={media.label || "Video"}
                                                />
                                            ) : (
                                                <video src={media.url} controls className="w-full h-full" />
                                            )}
                                        </div>
                                    )}

                                    {media.type === 'audio' && (
                                        <div className="p-4 flex flex-col justify-center h-full bg-stone-50 dark:bg-white/5">
                                            <div className="flex items-center gap-3 mb-3 text-stone-700 dark:text-stone-300">
                                                <Music size={16} />
                                                <span className="text-xs font-medium truncate tracking-tight">{media.label || "Audio Clip"}</span>
                                            </div>
                                            <audio src={media.url} controls className="w-full h-8" />
                                        </div>
                                    )}

                                    {media.type === 'link' && (
                                        <a href={media.url} target="_blank" rel="noopener noreferrer" className="block p-4 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors h-full flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white dark:bg-white/10 rounded-lg shadow-sm border border-stone-100 dark:border-white/5 flex items-center justify-center shrink-0">
                                                <ExternalLink size={16} className="text-stone-400" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate tracking-wide">{media.label || media.url}</div>
                                                <div className="text-[10px] text-stone-400 truncate mt-0.5">{media.url}</div>
                                            </div>
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Threads & Tags */}
            <div className={`w-full md:w-[20rem] bg-stone-50/50 dark:bg-black/20 border-l border-stone-100 dark:border-white/5 flex flex-col overflow-hidden ${activeTab === 'tags' || activeTab === 'threads' ? 'flex h-full' : 'hidden md:flex h-full'}`}>
                {/* ... Right column content unchanged ... */}
                 {/* Mode Switcher for Right Column (Desktop) */}
                <div className="hidden md:flex border-b border-stone-200/50 dark:border-white/5">
                     <button 
                        onClick={() => setActiveTab('threads')} 
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'threads' ? 'text-stone-900 dark:text-white bg-white dark:bg-night-surface border-b-2 border-stone-900 dark:border-white' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                    >
                        Threads {linkedCards.length > 0 && `(${linkedCards.length})`}
                    </button>
                    <button 
                        onClick={() => setActiveTab('tags')} 
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'tags' || activeTab === 'content' ? 'text-stone-900 dark:text-white bg-white dark:bg-night-surface border-b-2 border-stone-900 dark:border-white' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                    >
                        Tags
                    </button>
                </div>
                
                {/* THREADS CONTENT */}
                <div className={`flex-col h-full overflow-y-auto ${activeTab === 'threads' ? 'flex' : 'hidden'}`}>
                    
                    {/* QUESTIONS SELECTOR */}
                     <div className="p-4 border-b border-stone-200/50 dark:border-white/5 bg-stone-50 dark:bg-white/5">
                        <div className="flex items-center gap-2 mb-2">
                            <HelpCircle size={10} className="text-stone-400" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Story Questions</h3>
                        </div>
                         {availableQuestions.length === 0 ? (
                             <div className="text-[10px] text-stone-400 italic">No questions defined.</div>
                         ) : (
                             <div className="flex flex-col gap-1.5">
                                 {availableQuestions.map(q => (
                                     <button
                                        key={q.id}
                                        onClick={() => toggleQuestion(q.id)}
                                        className={`w-full text-left px-2 py-1.5 rounded-md text-[10px] font-medium border transition-all truncate flex items-center gap-2 ${
                                            (editedCard.storyQuestions || []).includes(q.id) 
                                            ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-black dark:border-white' 
                                            : 'bg-white dark:bg-transparent text-stone-500 dark:text-stone-400 border-stone-200 dark:border-white/20 hover:border-stone-400'
                                        }`}
                                        title={q.question}
                                     >
                                         <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${(editedCard.storyQuestions || []).includes(q.id) ? 'bg-amber-400' : 'bg-stone-300 dark:bg-stone-600'}`}></div>
                                         <span className="truncate">{q.question}</span>
                                     </button>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* SETS SELECTOR */}
                     <div className="p-4 border-b border-stone-200/50 dark:border-white/5 bg-stone-50 dark:bg-white/5">
                        <div className="flex items-center gap-2 mb-2">
                             <Layers size={10} className="text-stone-400" />
                             <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Assign to Sets</h3>
                        </div>
                         {availableSets.length === 0 ? (
                             <div className="text-[10px] text-stone-400 italic">No sets created.</div>
                         ) : (
                             <div className="flex flex-wrap gap-2">
                                 {availableSets.map(set => (
                                     <button
                                        key={set.id}
                                        onClick={() => toggleSet(set.id)}
                                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all ${
                                            (editedCard.sets || []).includes(set.id) 
                                            ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-black dark:border-white' 
                                            : 'bg-white dark:bg-transparent text-stone-500 dark:text-stone-400 border-stone-200 dark:border-white/20 hover:border-stone-400'
                                        }`}
                                     >
                                         {set.name}
                                     </button>
                                 ))}
                             </div>
                         )}
                    </div>

                    {/* Thread Search */}
                    <div className="p-4 border-b border-stone-200/50 dark:border-white/5 bg-stone-50 dark:bg-white/5">
                         <div className="relative">
                            <input 
                                type="text"
                                value={threadSearch}
                                onChange={(e) => setThreadSearch(e.target.value)}
                                placeholder="Search cards to link..."
                                className="w-full pl-8 pr-4 py-2 bg-white dark:bg-night-surface border border-stone-200 dark:border-white/10 rounded-lg text-xs focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 focus:outline-none placeholder-stone-400 dark:placeholder-stone-600 text-stone-800 dark:text-stone-200"
                            />
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                         </div>
                    </div>
                    
                    {/* Linked Cards List */}
                    <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                        {linkedCards.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Linked Threads</h4>
                                <div className="space-y-2">
                                    {linkedCards.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-white/5 border border-stone-200 dark:border-white/5 rounded-lg shadow-sm group">
                                            <button 
                                                onClick={() => {
                                                    onSave(editedCard); // Save current progress before switch
                                                    onSwitchCard(c);
                                                }}
                                                className="text-left overflow-hidden flex-1 mr-2"
                                            >
                                                <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{c.title || "Untitled"}</div>
                                                <div className="text-[10px] text-stone-400 truncate mt-0.5">{c.content.substring(0, 30)}...</div>
                                            </button>
                                            <button 
                                                onClick={() => toggleThread(c.id)}
                                                className="text-stone-300 hover:text-rose-500 p-1"
                                                title="Unlink"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Search Results */}
                        {threadSearch && (
                             <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Add Link</h4>
                                <div className="space-y-2">
                                    {availableCardsForThreading.length === 0 ? (
                                        <div className="text-[10px] text-stone-400 italic p-2">No matching cards found.</div>
                                    ) : (
                                        availableCardsForThreading.map(c => (
                                            <button 
                                                key={c.id}
                                                onClick={() => {
                                                    toggleThread(c.id);
                                                    setThreadSearch('');
                                                }}
                                                className="w-full flex items-center justify-between p-2.5 bg-stone-100 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-stone-200 dark:hover:border-white/10 rounded-lg transition-all text-left group"
                                            >
                                                <div className="overflow-hidden">
                                                    <div className="text-xs font-bold text-stone-700 dark:text-stone-300 truncate">{c.title || "Untitled"}</div>
                                                </div>
                                                <Plus size={12} className="text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white" />
                                            </button>
                                        ))
                                    )}
                                </div>
                             </div>
                        )}

                         {!threadSearch && linkedCards.length === 0 && (
                            <div className="text-center py-10 opacity-40">
                                <GitMerge className="mx-auto mb-3 text-stone-400" size={24} />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">No threads yet</p>
                                <p className="text-[9px] text-stone-400 mt-1">Search to link ideas</p>
                            </div>
                         )}
                    </div>
                </div>

                {/* TAGS CONTENT */}
                <div className={`flex-col h-full overflow-y-auto ${activeTab === 'tags' || (activeTab !== 'threads' && !activeTab /* Default for non-mobile logic */) ? 'flex' : 'hidden'}`}>
                    {/* Tag Builder */}
                    <div className="p-6 border-b border-stone-200/50 dark:border-white/5">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4">Create Tag</h3>
                        <div className="space-y-3">
                            <div className="relative">
                                <select 
                                    value={newTagCategory}
                                    onChange={(e) => setNewTagCategory(e.target.value as CardCategory)}
                                    className="w-full text-[11px] font-bold uppercase tracking-wide p-2.5 pr-8 bg-white dark:bg-night-surface border-none rounded-lg shadow-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-200 dark:focus:ring-white/20 cursor-pointer appearance-none"
                                >
                                    {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                            </div>
                            
                            {SUBCATEGORIES[newTagCategory]?.length > 0 && (
                                <div className="relative">
                                    <select
                                        value={newTagSub}
                                        onChange={(e) => setNewTagSub(e.target.value)}
                                        className="w-full text-xs p-2.5 pr-8 bg-white dark:bg-night-surface border-none rounded-lg shadow-sm text-stone-600 dark:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-200 dark:focus:ring-white/20 cursor-pointer appearance-none"
                                    >
                                        <option value="" disabled>Select Subcategory</option>
                                        {SUBCATEGORIES[newTagCategory].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                    </select>
                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                </div>
                            )}

                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={newTagValue}
                                    onChange={(e) => setNewTagValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                                    placeholder="Tag name..."
                                    className="flex-1 text-xs p-2.5 bg-white dark:bg-night-surface border-none rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-stone-200 dark:focus:ring-white/20 placeholder-stone-400 text-stone-800 dark:text-stone-200 font-medium"
                                />
                                <button 
                                    onClick={addTag}
                                    disabled={!newTagValue.trim()}
                                    className="p-2.5 bg-stone-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-black dark:hover:bg-stone-200 disabled:opacity-50 transition-colors shadow-lg"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Existing Tags List */}
                    <div className="p-6 space-y-6 flex-1">
                        {ALL_CATEGORIES.map(category => {
                            const tags = editedCard.tags[category] || [];
                            if (tags.length === 0) return null;

                            return (
                                <div key={category}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">{category}</span>
                                        <div className="h-px bg-stone-200 dark:bg-white/10 flex-1"></div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag, idx) => (
                                            <div key={idx} className="group flex items-center gap-2 px-2.5 py-1 bg-white dark:bg-white/5 border border-stone-100 dark:border-white/5 rounded-md shadow-sm hover:shadow-md transition-all">
                                                <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 uppercase tracking-wide">{tag}</span>
                                                <button 
                                                    onClick={() => removeTag(category, tag)}
                                                    className="text-stone-300 hover:text-rose-500 transition-colors"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {Object.values(editedCard.tags).every((t) => !t || (t as string[]).length === 0) && (
                            <div className="text-center py-10 opacity-30">
                                <Tag className="mx-auto mb-3 text-stone-400" size={24} />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">No tags yet</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-stone-200/50 dark:border-white/5 bg-stone-100/50 dark:bg-white/5">
                     <button 
                        onClick={() => {
                            if(editedCard.isArchived) {
                                if(confirm("Restore this card to active view?")) {
                                    onDelete(editedCard.id); // Parent logic handles toggle based on ID or we pass action
                                    onClose();
                                }
                            } else {
                                if(confirm("Archive this card? It will be hidden from main views but saved forever.")) {
                                    onDelete(editedCard.id);
                                    onClose();
                                }
                            }
                        }}
                        className={`w-full py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors rounded-lg 
                            ${editedCard.isArchived 
                                ? 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-white/10' 
                                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-200 dark:hover:bg-white/10'
                            }`}
                    >
                        {editedCard.isArchived ? (
                            <><RefreshCw size={12} /> Restore Card</>
                        ) : (
                            <><Archive size={12} /> Archive Card</>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CardEditor;
