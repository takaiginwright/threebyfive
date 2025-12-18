
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { IdeaCard, CardCategory, ALL_CATEGORIES, SUBCATEGORIES, CardColor, getThemeColor, Project, MediaAttachment, MediaType, IdeaSet, StoryQuestion, CategoryDefinition } from '../types';
import { X, Save, Tag, Plus, Trash2, ChevronDown, Image as ImageIcon, Link as LinkIcon, Video, Music, ExternalLink, GitMerge, Search, Layers, Archive, RefreshCw, HelpCircle, PenTool } from 'lucide-react';
import { autoTagCard } from '../services/geminiService';
import { getProjects, getSets, getStoryQuestions } from '../services/storageService';
import { getCategoriesForProject, addCategory, addSubcategory } from '../services/categoryService';
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

  // FIX: Default to 'tags' so the Create Tag UI is immediately visible in right panel
  const [activeTab, setActiveTab] = useState<'content' | 'tags' | 'threads'>('tags');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // NEW: custom category + subcategory support
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  // Tag Builder State
  const [newTagCategory, setNewTagCategory] = useState<string>('');
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

    // NEW: Load categories for this project
    const projectCategories = getCategoriesForProject(card.projectId);
    setCategories(projectCategories);
    if (projectCategories.length > 0 && !newTagCategory) {
      setNewTagCategory(projectCategories[0].id);
    }

    setEditedCard({ ...card, media: card.media || [], threads: card.threads || [], sets: card.sets || [], storyQuestions: card.storyQuestions || [] });
  }, [card]);

  useEffect(() => {
    // NEW: Update subcategory when category changes
    const selectedCategory = categories.find(cat => cat.id === newTagCategory);
    if (selectedCategory && selectedCategory.subcategories.length > 0) {
      setNewTagSub(selectedCategory.subcategories[0].id);
    } else {
      setNewTagSub('');
    }
  }, [newTagCategory, categories]);

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

  // NEW: Handlers for adding categories and subcategories
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    try {
      const updated = addCategory(editedCard.projectId, newCategoryName);
      setCategories(updated);
      const newCat = updated.find(c => c.name.toUpperCase() === newCategoryName.trim().toUpperCase());
      if (newCat) {
        setNewTagCategory(newCat.id);
      }
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error: any) {
      alert(error.message || 'Failed to add category');
    }
  };

  const handleAddSubcategory = () => {
    if (!newSubcategoryName.trim()) return;
    try {
      const updated = addSubcategory(editedCard.projectId, newTagCategory, newSubcategoryName);
      setCategories(updated);
      const updatedCategory = updated.find(c => c.id === newTagCategory);
      const newSub = updatedCategory?.subcategories.find(
        s => s.name.toLowerCase() === newSubcategoryName.trim().toLowerCase()
      );
      if (newSub) {
        setNewTagSub(newSub.id);
      }
      setNewSubcategoryName('');
      setIsAddingSubcategory(false);
    } catch (error: any) {
      alert(error.message || 'Failed to add subcategory');
    }
  };

  const addTag = () => {
    if (!newTagValue.trim()) return;

    // NEW: Get category and subcategory names for the tag
    const selectedCategory = categories.find(cat => cat.id === newTagCategory);
    if (!selectedCategory) return;

    const selectedSubcategory = selectedCategory.subcategories.find(sub => sub.id === newTagSub);
    const formattedTag = selectedSubcategory
      ? `${selectedSubcategory.name} – ${newTagValue.trim()}`
      : newTagValue.trim();

    // Use category name as the key (for backward compatibility)
    const categoryKey = selectedCategory.name as CardCategory;

    setEditedCard(prev => {
      const existingTags = prev.tags[categoryKey] || [];
      if (existingTags.includes(formattedTag)) return prev;

      return {
        ...prev,
        tags: {
          ...prev.tags,
          [categoryKey]: [...existingTags, formattedTag]
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
                 {/* FIX: Simplified mode switcher - removed confusing activeTab === 'content' condition */}
                 <div className="hidden md:flex border-b border-stone-200/50 dark:border-white/5">
                    <button
                        onClick={() => setActiveTab('tags')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'tags' ? 'text-stone-900 dark:text-white bg-white dark:bg-night-surface border-b-2 border-stone-900 dark:border-white' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                    >
                        Tags
                    </button>
                     <button
                        onClick={() => setActiveTab('threads')}
                        className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest ${activeTab === 'threads' ? 'text-stone-900 dark:text-white bg-white dark:bg-night-surface border-b-2 border-stone-900 dark:border-white' : 'text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'}`}
                    >
                        Threads {linkedCards.length > 0 && `(${linkedCards.length})`}
                    </button>
                </div>
                
                {/* UX: SIMPLIFIED THREADS PANEL - Only card-to-card relationships */}
                <div className={`flex-col h-full overflow-y-auto ${activeTab === 'threads' ? 'flex' : 'hidden'}`}>

                    {/* UX: Removed "Story Questions" - doesn't belong in card editor */}
                    {/* UX: Removed "Assign to Sets" - doesn't belong in card editor */}

                    {/* Linked Cards List */}
                    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                        {linkedCards.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2">
                                    <GitMerge size={12} />
                                    Linked Cards
                                </h4>
                                <div className="space-y-2">
                                    {linkedCards.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-stone-200 dark:border-white/5 rounded-lg shadow-sm group hover:shadow-md transition-all">
                                            <button
                                                onClick={() => {
                                                    onSave(editedCard);
                                                    onSwitchCard(c);
                                                }}
                                                className="text-left overflow-hidden flex-1 mr-2"
                                            >
                                                <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">{c.title || "Untitled"}</div>
                                                <div className="text-[10px] text-stone-400 truncate mt-1">{c.content.substring(0, 40)}...</div>
                                            </button>
                                            <button
                                                onClick={() => toggleThread(c.id)}
                                                className="text-stone-300 hover:text-rose-500 p-1.5 rounded transition-colors"
                                                title="Unlink"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* UX: Clean, minimal search to add threads */}
                        <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-3">Link to Another Card</h4>
                            <div className="relative mb-4">
                                <input
                                    type="text"
                                    value={threadSearch}
                                    onChange={(e) => setThreadSearch(e.target.value)}
                                    placeholder="Search cards..."
                                    className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-night-surface border border-stone-200 dark:border-white/10 rounded-lg text-xs focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 focus:outline-none placeholder-stone-400 dark:placeholder-stone-600 text-stone-800 dark:text-stone-200"
                                />
                                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                            </div>

                            {/* Search Results */}
                            {threadSearch && (
                                <div className="space-y-2">
                                    {availableCardsForThreading.length === 0 ? (
                                        <div className="text-[10px] text-stone-400 italic p-3 text-center">No matching cards found.</div>
                                    ) : (
                                        availableCardsForThreading.slice(0, 10).map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => {
                                                    toggleThread(c.id);
                                                    setThreadSearch('');
                                                }}
                                                className="w-full flex items-center justify-between p-3 bg-stone-100 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-transparent hover:border-stone-200 dark:hover:border-white/10 rounded-lg transition-all text-left group"
                                            >
                                                <div className="overflow-hidden flex-1">
                                                    <div className="text-xs font-bold text-stone-700 dark:text-stone-300 truncate">{c.title || "Untitled"}</div>
                                                    <div className="text-[10px] text-stone-400 truncate mt-0.5">{c.content.substring(0, 35)}...</div>
                                                </div>
                                                <Plus size={14} className="text-stone-400 group-hover:text-stone-900 dark:group-hover:text-white ml-2 shrink-0" />
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* UX: Calm empty state - no overwhelming instructions */}
                        {!threadSearch && linkedCards.length === 0 && (
                            <div className="text-center py-12 opacity-40">
                                <GitMerge className="mx-auto mb-4 text-stone-400" size={28} />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">No Threads</p>
                                <p className="text-[10px] text-stone-400 mt-2 max-w-[12rem] mx-auto leading-relaxed">Connect related ideas by searching above</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* UX: TAGS CONTENT - Always visible when selected, immediate Create Tag UI */}
                <div className={`flex-col h-full overflow-y-auto ${activeTab === 'tags' ? 'flex' : 'hidden'}`}>
                    {/* UX: Tag Builder - immediately visible, no hidden state */}
                    <div className="p-6 border-b border-stone-200/50 dark:border-white/5 bg-white dark:bg-night-surface">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-4 flex items-center gap-2">
                            <Tag size={12} />
                            Create Tag
                        </h3>
                        <div className="space-y-3">
                            {/* NEW: Category dropdown with inline add */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Category</span>
                                    {!isAddingCategory && (
                                        <button
                                            onClick={() => setIsAddingCategory(true)}
                                            className="text-[9px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white transition-colors"
                                        >
                                            + New Category
                                        </button>
                                    )}
                                </div>

                                {isAddingCategory ? (
                                    <div className="flex gap-2 animate-enter">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleAddCategory();
                                                if (e.key === 'Escape') {
                                                    setIsAddingCategory(false);
                                                    setNewCategoryName('');
                                                }
                                            }}
                                            placeholder="Category name (e.g., CULTURE)"
                                            className="flex-1 text-xs p-2.5 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 placeholder-stone-400 text-stone-800 dark:text-stone-200"
                                            autoFocus
                                        />
                                        <button
                                            onClick={handleAddCategory}
                                            className="px-3 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-black text-[9px] font-bold rounded-lg hover:bg-black dark:hover:bg-stone-200 transition-colors"
                                        >
                                            Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAddingCategory(false);
                                                setNewCategoryName('');
                                            }}
                                            className="px-3 py-2.5 text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white text-[9px] font-bold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <select
                                            value={newTagCategory}
                                            onChange={(e) => setNewTagCategory(e.target.value)}
                                            className="w-full text-[11px] font-bold uppercase tracking-wide p-2.5 pr-8 bg-white dark:bg-night-surface border-none rounded-lg shadow-sm text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-200 dark:focus:ring-white/20 cursor-pointer appearance-none"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                    </div>
                                )}
                            </div>

                            {/* NEW: Subcategory dropdown with inline add */}
                            {!isAddingCategory && newTagCategory && (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[9px] font-bold uppercase tracking-widest text-stone-400">Subcategory</span>
                                        {!isAddingSubcategory && (
                                            <button
                                                onClick={() => setIsAddingSubcategory(true)}
                                                className="text-[9px] font-bold uppercase tracking-widest text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white transition-colors"
                                            >
                                                + New Subcategory
                                            </button>
                                        )}
                                    </div>

                                    {isAddingSubcategory ? (
                                        <div className="flex gap-2 animate-enter">
                                            <input
                                                type="text"
                                                value={newSubcategoryName}
                                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleAddSubcategory();
                                                    if (e.key === 'Escape') {
                                                        setIsAddingSubcategory(false);
                                                        setNewSubcategoryName('');
                                                    }
                                                }}
                                                placeholder="Subcategory name (e.g., Ritual)"
                                                className="flex-1 text-xs p-2.5 bg-stone-50 dark:bg-black/20 border border-stone-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 placeholder-stone-400 text-stone-800 dark:text-stone-200"
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleAddSubcategory}
                                                className="px-3 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-black text-[9px] font-bold rounded-lg hover:bg-black dark:hover:bg-stone-200 transition-colors"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddingSubcategory(false);
                                                    setNewSubcategoryName('');
                                                }}
                                                className="px-3 py-2.5 text-stone-500 hover:text-stone-900 dark:text-stone-500 dark:hover:text-white text-[9px] font-bold transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {categories.find(c => c.id === newTagCategory)?.subcategories.length === 0 ? (
                                                <div className="text-[10px] text-stone-400 italic p-3 bg-stone-50 dark:bg-white/5 rounded-lg text-center">
                                                    No subcategories yet. Click "+ New Subcategory" to add one.
                                                </div>
                                            ) : (
                                                <div className="relative">
                                                    <select
                                                        value={newTagSub}
                                                        onChange={(e) => setNewTagSub(e.target.value)}
                                                        className="w-full text-xs p-2.5 pr-8 bg-white dark:bg-night-surface border-none rounded-lg shadow-sm text-stone-600 dark:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-200 dark:focus:ring-white/20 cursor-pointer appearance-none"
                                                    >
                                                        {categories.find(c => c.id === newTagCategory)?.subcategories.map(sub => (
                                                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Tag name input */}
                            {!isAddingCategory && !isAddingSubcategory && (
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
                            )}
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
