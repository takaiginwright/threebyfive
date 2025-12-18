import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Search, ChevronDown, Sparkles, Send, Sun, Moon, LayoutGrid, Kanban, MousePointer2, GitGraph, Layers, Trash2, Archive, HelpCircle, LogOut, User as UserIcon, MoreHorizontal } from 'lucide-react';
import { IdeaCard, ALL_CATEGORIES, CardCategory, Project, ViewMode, IdeaSet, StoryQuestion, User, CategoryDefinition } from './types';
import { getCards, saveCard, saveCards, createNewCard, getProjects, saveProject, getTheme, saveTheme, Theme, getSets, saveSet, deleteSet, getStoryQuestions, saveStoryQuestion, deleteStoryQuestion, setStorageNamespace } from './services/storageService';
import { setStorageNamespace as setCategoryNamespace, getCategoriesForProject } from './services/categoryService';
import { getSession, logout as authLogout } from './services/authService';
import Card from './components/Card';
import CardEditor from './components/CardEditor';
import TimelineView from './components/TimelineView';
import CanvasView from './components/CanvasView';
import ThreadsView from './components/ThreadsView';
import StoryQuestionsPanel from './components/StoryQuestionsPanel';
import AuthScreen from './components/AuthScreen';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [theme, setTheme] = useState<Theme>('light');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  const [cards, setCards] = useState<IdeaCard[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sets, setSets] = useState<IdeaSet[]>([]);
  const [questions, setQuestions] = useState<StoryQuestion[]>([]);
  const [editingCard, setEditingCard] = useState<IdeaCard | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [isViewingArchive, setIsViewingArchive] = useState(false);
  const [isQuestionsPanelOpen, setIsQuestionsPanelOpen] = useState(false);

  // NEW: custom category support
  const [customCategories, setCustomCategories] = useState<CategoryDefinition[]>([]);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [newSetName, setNewSetName] = useState('');

  // Quick Capture State
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickContent, setQuickContent] = useState('');
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Init Theme
    const savedTheme = getTheme();
    setTheme(savedTheme);
    applyTheme(savedTheme);

    // Init Session
    const session = getSession();
    if (session) {
        initDataForUser(session);
    }
    setLoadingAuth(false);
  }, []);

  // NEW: Reload custom categories when project changes
  useEffect(() => {
    loadCustomCategories();
  }, [selectedProjectId]);

  // NEW: Close "More" dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initDataForUser = (u: User) => {
      setUser(u);
      setStorageNamespace(u.id);
      setCategoryNamespace(u.id); // NEW: Initialize category namespace
      refreshData();
  }

  const applyTheme = (t: Theme) => {
      if (t === 'dark') {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  };

  const toggleTheme = () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      saveTheme(newTheme);
      applyTheme(newTheme);
  };

  const refreshData = () => {
    setCards(getCards());
    setProjects(getProjects());
    setSets(getSets());
    setQuestions(getStoryQuestions());
    // NEW: Load custom categories for current project
    loadCustomCategories();
  };

  // NEW: Load custom categories for the selected project
  const loadCustomCategories = () => {
    if (selectedProjectId && selectedProjectId !== 'all') {
      const allCategories = getCategoriesForProject(selectedProjectId);
      // Filter out system categories (those that match CardCategory enum values)
      const systemCategoryNames = Object.values(CardCategory).map(c => c.toUpperCase());
      const custom = allCategories.filter(cat => !systemCategoryNames.includes(cat.name.toUpperCase()));
      setCustomCategories(custom);
    } else {
      setCustomCategories([]);
    }
  };

  const handleAuthSuccess = (u: User) => {
      initDataForUser(u);
  };

  const handleLogout = () => {
      if (confirm("Log out?")) {
          authLogout();
          setUser(null);
          setCards([]); // Clear view
      }
  };

  const handleCreateNewCard = () => {
    const defaultProject = selectedProjectId === 'all' ? 'general' : selectedProjectId;
    const newCard = createNewCard(defaultProject);
    setEditingCard(newCard);
  };

  const handleSaveCard = (card: IdeaCard) => {
    const updatedCards = saveCard(card);
    setCards(updatedCards);
    // If saving from editor, close editor
    if (editingCard?.id === card.id) {
        setEditingCard(null);
    }
  };
  
  // Bulk update (for DnD reordering)
  const handleUpdateCards = (updatedCardsList: IdeaCard[]) => {
      saveCards(updatedCardsList);
      setCards(updatedCardsList);
  };

  // Single update without closing editor (for Canvas drag)
  const handleSilentUpdateCard = (card: IdeaCard) => {
      saveCard(card);
      setCards(prev => prev.map(c => c.id === card.id ? card : c));
  }

  // Formerly delete, now toggles Archive status
  const handleArchiveCard = (id: string) => {
      const cardToUpdate = cards.find(c => c.id === id);
      if (cardToUpdate) {
          const updatedCard = { ...cardToUpdate, isArchived: !cardToUpdate.isArchived };
          const updatedCards = saveCard(updatedCard);
          setCards(updatedCards);
          setEditingCard(null);
      }
  }

  const handleCreateProject = () => {
      if (!newProjectName.trim()) return;
      const newProject: Project = {
          id: crypto.randomUUID(),
          name: newProjectName.trim(),
          createdAt: Date.now()
      };
      const updatedProjects = saveProject(newProject);
      setProjects(updatedProjects);
      setNewProjectName('');
      setIsProjectModalOpen(false);
      setSelectedProjectId(newProject.id); 
  };
  
  const handleCreateSet = () => {
      if (!newSetName.trim()) return;
      const defaultProject = selectedProjectId === 'all' ? 'general' : selectedProjectId;
      
      const newSet: IdeaSet = {
          id: crypto.randomUUID(),
          projectId: defaultProject,
          name: newSetName.trim(),
          createdAt: Date.now()
      };
      
      const updatedSets = saveSet(newSet);
      setSets(updatedSets);
      setNewSetName('');
      setIsSetModalOpen(false);
  }

  const handleDeleteSet = (id: string) => {
      if(confirm('Delete this set? Cards will remain.')) {
        const updatedSets = deleteSet(id);
        setSets(updatedSets);
        // Refresh cards to clear set associations
        setCards(getCards());
      }
  }

  // Question Handlers
  const handleAddQuestion = (text: string, description: string) => {
      const defaultProject = selectedProjectId === 'all' ? 'general' : selectedProjectId;
      const newQ: StoryQuestion = {
          id: crypto.randomUUID(),
          projectId: defaultProject,
          question: text,
          description: description,
          createdAt: Date.now()
      };
      const updatedQs = saveStoryQuestion(newQ);
      setQuestions(updatedQs);
  };

  const handleUpdateQuestion = (id: string, text: string, description: string) => {
      const q = questions.find(q => q.id === id);
      if (q) {
          const updated = { ...q, question: text, description };
          const updatedQs = saveStoryQuestion(updated);
          setQuestions(updatedQs);
      }
  };

  const handleDeleteQuestion = (id: string) => {
      if(confirm("Delete this story question? Links to cards will be removed.")) {
          const updatedQs = deleteStoryQuestion(id);
          setQuestions(updatedQs);
          // Refresh cards to clear connections
          setCards(getCards());
      }
  }

  // Quick Capture Logic
  const handleQuickCaptureSave = () => {
      if (!quickTitle.trim() && !quickContent.trim()) return;
      const defaultProject = selectedProjectId === 'all' ? 'general' : selectedProjectId;
      const newCard = createNewCard(defaultProject);
      newCard.title = quickTitle.trim();
      newCard.content = quickContent.trim();
      
      const updatedCards = saveCard(newCard);
      setCards(updatedCards);
      
      // Reset
      setQuickTitle('');
      setQuickContent('');
      setIsQuickCaptureOpen(false);
  };

  const handleDropCardOnSet = (e: React.DragEvent, setId: string) => {
      e.preventDefault();
      try {
          const cardId = e.dataTransfer.getData("text/plain");
          if (!cardId) return;

          const card = cards.find(c => c.id === cardId);
          if (card) {
              const currentSets = card.sets || [];
              if (!currentSets.includes(setId)) {
                  const updatedCard = { ...card, sets: [...currentSets, setId] };
                  handleSaveCard(updatedCard);
              }
          }
      } catch (err) {
          console.error("Drop failed", err);
      }
  }

  // FIX: consistent category filtering helper
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      // Archive Filter Logic
      if (isViewingArchive) {
          if (!card.isArchived) return false;
      } else {
          if (card.isArchived) return false;
      }

      // Project Filter
      if (selectedProjectId !== 'all' && card.projectId !== selectedProjectId) return false;

      // Search Filter
      const q = searchQuery.toLowerCase();
      const matchesSearch = (card.title?.toLowerCase() || '').includes(q) ||
                            (card.content?.toLowerCase() || '').includes(q) ||
                            Object.values(card.tags).flat().some((t) => typeof t === 'string' && t.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // FIX: category filtering supports custom categories
      if (selectedCategory === 'All') {
          return true; // ALL = show all cards, no filtering
      } else {
          // Only show cards that have at least one tag in the selected category
          // Works for both system categories (enum values) and custom categories (by name)
          const tagsInCategory = card.tags[selectedCategory as CardCategory];
          return tagsInCategory && tagsInCategory.length > 0;
      }
    });
  }, [cards, searchQuery, selectedCategory, selectedProjectId, isViewingArchive]);
  
  const filteredSets = useMemo(() => {
      if (selectedProjectId === 'all') return sets;
      return sets.filter(s => s.projectId === selectedProjectId);
  }, [sets, selectedProjectId]);

  const filteredQuestions = useMemo(() => {
      if (selectedProjectId === 'all') return questions;
      return questions.filter(q => q.projectId === selectedProjectId);
  }, [questions, selectedProjectId]);

  // Long Press Logic
  const handleTouchStart = (e: React.TouchEvent) => {
      // Ignore if touching an input or button
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || target.closest('button')) return;

      longPressTimerRef.current = setTimeout(() => {
          setIsQuickCaptureOpen(true);
      }, 800); // 800ms long press
  };

  const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
      }
  };

  const renderView = () => {
      if (filteredCards.length === 0) {
           return (
            <div className="animate-enter flex flex-col items-center justify-center h-[50vh] text-center rounded-2xl border border-dashed border-stone-300 dark:border-white/10 bg-stone-50/50 dark:bg-white/5">
                <div className="w-16 h-16 bg-white dark:bg-night-surface rounded-xl flex items-center justify-center mb-6 shadow-cinematic border border-stone-100 dark:border-white/5">
                    {isViewingArchive ? (
                         <Archive size={24} className="text-stone-400 dark:text-stone-500" />
                    ) : (
                         <Sparkles size={24} className="text-stone-400 dark:text-stone-500" />
                    )}
                </div>
                <h3 className="text-xl font-medium text-stone-800 dark:text-night-text mb-2 tracking-tight">
                    {isViewingArchive ? 'Archive Empty' : 'Clean Slate'}
                </h3>
                <p className="text-stone-400 dark:text-stone-500 max-w-xs leading-relaxed text-sm font-light">
                    {isViewingArchive ? 'Archived ideas will appear here.' : 'This project is waiting for your first spark of inspiration.'}
                </p>
                {!isViewingArchive && (
                    <button 
                        onClick={handleCreateNewCard}
                        className="mt-8 text-stone-900 dark:text-white border-b border-stone-900 dark:border-white pb-0.5 text-xs font-bold uppercase tracking-widest hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-400 transition-all"
                    >
                        Create a card
                    </button>
                )}
            </div>
           )
      }

      switch (viewMode) {
          case 'timeline':
              return <TimelineView cards={filteredCards} sets={filteredSets} isDarkMode={theme === 'dark'} onCardClick={setEditingCard} onUpdateCards={handleUpdateCards} />;
          case 'canvas':
              return <CanvasView cards={filteredCards} isDarkMode={theme === 'dark'} onCardClick={setEditingCard} onUpdateCard={handleSilentUpdateCard} />;
          case 'threads':
              return <ThreadsView cards={filteredCards} sets={filteredSets} isDarkMode={theme === 'dark'} onCardClick={setEditingCard} />;
          case 'grid':
          default:
              // FIX: ALL view renders ungrouped cards
              // Note: Sets are a separate organizational feature, not category grouping
              // Cards are grouped by Sets (user-created collections), not by tag categories
              return (
                <div className="pb-20 space-y-12">
                    {/* Render Organized Sets First */}
                    {/* FIX: never render empty headers - only show Sets that have cards */}
                    {filteredSets
                        .filter(set => {
                            const setCards = filteredCards.filter(c => (c.sets || []).includes(set.id));
                            return setCards.length > 0; // FIX: only render Sets with at least 1 card
                        })
                        .map(set => {
                        const setCards = filteredCards.filter(c => (c.sets || []).includes(set.id));

                        return (
                            <div
                                key={set.id}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDropCardOnSet(e, set.id)}
                            >
                                <div className="flex items-center gap-2 mb-4 group">
                                    <span className="w-1.5 h-1.5 bg-stone-900 dark:bg-white rounded-full"></span>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-stone-900 dark:text-white">{set.name}</h3>
                                    <span className="text-xs text-stone-400">({setCards.length})</span>
                                    <button onClick={() => handleDeleteSet(set.id)} className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition-opacity"><Trash2 size={12} /></button>
                                </div>

                                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-6 space-y-6">
                                    {setCards.map((card) => (
                                        <div key={`set-${set.id}-${card.id}`} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}>
                                            <Card
                                                card={card}
                                                isDarkMode={theme === 'dark'}
                                                onClick={() => setEditingCard(card)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Unsorted Cards */}
                    {/* FIX: only show "Unsorted" section if there are actually unsorted cards */}
                    {(() => {
                        const unsortedCards = filteredCards.filter(c => !c.sets || c.sets.length === 0);
                        if (unsortedCards.length === 0) return null;

                        return (
                            <div>
                                {/* Only show "Unsorted" header if there are also Sets being shown */}
                                {filteredSets.filter(set => {
                                    const setCards = filteredCards.filter(c => (c.sets || []).includes(set.id));
                                    return setCards.length > 0;
                                }).length > 0 && (
                                    <div className="flex items-center gap-2 mb-4 mt-8">
                                        <span className="w-1.5 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full"></span>
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Unsorted</h3>
                                    </div>
                                )}
                                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-6 space-y-6">
                                    {unsortedCards.map((card) => (
                                        <div key={card.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}>
                                            <Card
                                                card={card}
                                                isDarkMode={theme === 'dark'}
                                                onClick={() => setEditingCard(card)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
              );
      }
  }

  // Auth Loading
  if (loadingAuth) {
      return <div className="min-h-screen bg-stone-100 dark:bg-black flex items-center justify-center"><div className="w-12 h-12 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin"></div></div>;
  }

  // Auth Screen
  if (!user) {
      return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div 
        className="min-h-screen pb-32 bg-stone-100 dark:bg-night-bg transition-colors duration-500"
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd} 
        onTouchMove={handleTouchEnd} // Cancel on scroll
    >
      
      {/* Guest Mode Banner */}
      {user.isGuest && (
          <div className="bg-stone-200 dark:bg-white/10 text-stone-600 dark:text-stone-300 text-[10px] font-bold uppercase tracking-widest py-2 text-center border-b border-stone-300 dark:border-white/5">
              You’re in Guest Mode. <button onClick={() => { authLogout(); setUser(null); }} className="underline hover:text-stone-900 dark:hover:text-white">Sign up</button> to sync your stories.
          </div>
      )}

      {/* Cinematic Header - Floating Glass */}
      <nav className="sticky top-0 z-40 px-4 py-4 md:py-6">
        <div className="max-w-screen-2xl mx-auto">
            <div className="glass-panel rounded-xl px-6 py-4 shadow-cinematic flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-cinematic-hover">
                
                {/* Brand & Project */}
                <div className="flex items-center gap-6">
                    {/* New Minimal Logo: Outline + Centered Text */}
                    <div className="relative w-14 h-9 flex items-center justify-center group cursor-pointer transition-transform hover:scale-105 duration-300">
                        {/* Logo SVG Outline */}
                        <svg viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full drop-shadow-sm">
                             {/* TL Amber */}
                             <path d="M2 12 V 5 Q 2 2 5 2 H 12" stroke="#FF9F1C" strokeWidth="2" strokeLinecap="round" />
                             {/* TR Royal */}
                             <path d="M38 2 H 45 Q 48 2 48 5 V 12" stroke="#2955D9" strokeWidth="2" strokeLinecap="round" />
                             {/* BR Crimson */}
                             <path d="M48 18 V 25 Q 48 28 45 28 H 38" stroke="#D7263D" strokeWidth="2" strokeLinecap="round" />
                             {/* BL Sage */}
                             <path d="M12 28 H 5 Q 2 28 2 25 V 18" stroke="#6BA292" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {/* Text Inside */}
                        <span className="font-bold text-sm tracking-tighter text-stone-900 dark:text-white z-10 pt-0.5">3x5</span>
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-stone-300 dark:bg-white/10 hidden md:block"></div>

                    {/* Custom Project Selector */}
                    <div className="relative group">
                        <select
                            value={selectedProjectId}
                            onChange={(e) => {
                                if (e.target.value === 'new_project_action') {
                                    setIsProjectModalOpen(true);
                                } else {
                                    setSelectedProjectId(e.target.value);
                                }
                            }}
                            className="appearance-none bg-transparent py-1 pl-0 pr-8 text-lg font-medium text-stone-900 dark:text-night-text focus:outline-none cursor-pointer hover:text-stone-600 dark:hover:text-stone-300 transition-colors w-full md:w-auto tracking-tight"
                        >
                            <option value="all" className="dark:bg-night-surface">All Projects</option>
                            <option disabled className="dark:bg-night-surface">──────────</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id} className="dark:bg-night-surface">{p.name}</option>
                            ))}
                            <option disabled className="dark:bg-night-surface">──────────</option>
                            <option value="new_project_action" className="dark:bg-night-surface">+ New Project</option>
                        </select>
                        <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500 pointer-events-none group-hover:text-stone-600 transition-colors" />
                    </div>
                </div>

                {/* View Switcher (Desktop) */}
                <div className="hidden lg:flex items-center p-1 bg-stone-100 dark:bg-white/5 rounded-lg border border-stone-200 dark:border-white/10">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600'}`}
                        title="Grid View"
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('timeline')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600'}`}
                        title="Timeline View"
                    >
                        <Kanban size={16} className="rotate-90" />
                    </button>
                    <button 
                        onClick={() => setViewMode('canvas')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'canvas' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600'}`}
                        title="Canvas View"
                    >
                        <MousePointer2 size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('threads')}
                        className={`p-2 rounded-md transition-all ${viewMode === 'threads' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400 hover:text-stone-600'}`}
                        title="Threads View"
                    >
                        <GitGraph size={16} />
                    </button>
                </div>

                {/* Search & Actions */}
                <div className="flex items-center gap-4 flex-1 md:justify-end">
                    
                    {/* Dark Mode Toggle */}
                    <button 
                        onClick={toggleTheme}
                        className="shrink-0 p-2 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all duration-300"
                        title={theme === 'light' ? 'Switch to Night Mode' : 'Switch to Light Mode'}
                    >
                        {theme === 'light' ? (
                            <Sun size={18} className="animate-enter" />
                        ) : (
                            <Moon size={18} className="animate-enter" />
                        )}
                    </button>

                     {/* Archive Toggle */}
                    <button 
                        onClick={() => setIsViewingArchive(!isViewingArchive)}
                        className={`shrink-0 p-2 rounded-full transition-all duration-300 ${isViewingArchive ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10'}`}
                        title={isViewingArchive ? "Hide Archive" : "View Archive"}
                    >
                        <Archive size={18} />
                    </button>
                    
                     {/* Story Questions Toggle */}
                     <button 
                        onClick={() => setIsQuestionsPanelOpen(!isQuestionsPanelOpen)}
                        className={`shrink-0 p-2 rounded-full transition-all duration-300 ${isQuestionsPanelOpen ? 'text-stone-900 bg-stone-100 dark:bg-white/10 dark:text-white' : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10'}`}
                        title="Story Questions"
                    >
                        <HelpCircle size={18} />
                    </button>
                    
                    <button 
                        onClick={() => setIsSetModalOpen(true)}
                        className="shrink-0 p-2 rounded-full text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all duration-300"
                        title="New Set"
                    >
                        <Layers size={18} />
                    </button>

                    <div className="relative group flex-1 md:flex-none md:w-48 lg:w-56">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={14} className="text-stone-400 dark:text-stone-500 group-focus-within:text-stone-600 dark:group-focus-within:text-stone-300 transition-colors" />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="block w-full pl-9 pr-4 py-2 bg-stone-100/50 dark:bg-white/5 border border-transparent hover:bg-stone-100 dark:hover:bg-white/10 focus:bg-white dark:focus:bg-night-surface rounded-lg text-xs font-medium text-stone-700 dark:text-night-text placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-1 focus:ring-stone-200 dark:focus:ring-white/20 focus:shadow-sm transition-all tracking-wide"
                        />
                    </div>

                     {/* Profile / Logout */}
                     <button 
                        onClick={handleLogout}
                        className="relative z-10 shrink-0 p-2 rounded-full text-stone-500 hover:text-red-500 dark:text-stone-400 dark:hover:text-red-400 hover:bg-stone-100 dark:hover:bg-white/10 transition-all duration-300"
                        title={`Log Out (${user.email || 'Guest'})`}
                    >
                         {user.avatarUrl ? (
                             <img src={user.avatarUrl} alt="Avatar" className="w-5 h-5 rounded-full pointer-events-none" />
                         ) : (
                             <LogOut size={18} className="pointer-events-none" />
                         )}
                    </button>

                    <button 
                        onClick={handleCreateNewCard}
                        className="hidden md:flex shrink-0 items-center gap-2 px-5 py-2.5 bg-stone-900 dark:bg-white text-stone-50 dark:text-black text-xs font-bold uppercase tracking-widest rounded-lg shadow-lg hover:bg-black dark:hover:bg-stone-200 hover:scale-105 active:scale-95 transition-all duration-300"
                    >
                        <Plus size={16} />
                        <span className="hidden lg:inline">New Idea</span>
                    </button>
                </div>
            </div>
            
             {/* Story Questions Panel Dropdown */}
            {isQuestionsPanelOpen && (
                <StoryQuestionsPanel 
                    questions={filteredQuestions}
                    onAdd={handleAddQuestion}
                    onUpdate={handleUpdateQuestion}
                    onDelete={handleDeleteQuestion}
                    isOpen={isQuestionsPanelOpen}
                    setIsOpen={setIsQuestionsPanelOpen}
                />
            )}

            {/* Mobile View Switcher & Filter Bar */}
            <div className="mt-6 flex flex-col md:flex-row gap-4 items-start md:items-center">
                 {/* Mobile View Switcher */}
                <div className="flex lg:hidden items-center p-1 bg-white/50 dark:bg-white/5 rounded-lg border border-stone-200 dark:border-white/10 w-full md:w-auto justify-between">
                     <button 
                        onClick={() => setViewMode('grid')}
                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${viewMode === 'grid' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('timeline')}
                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${viewMode === 'timeline' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}
                    >
                        <Kanban size={16} className="rotate-90" />
                    </button>
                    <button 
                        onClick={() => setViewMode('canvas')}
                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${viewMode === 'canvas' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}
                    >
                        <MousePointer2 size={16} />
                    </button>
                    <button 
                        onClick={() => setViewMode('threads')}
                        className={`flex-1 p-2 rounded-md transition-all flex justify-center ${viewMode === 'threads' ? 'bg-white dark:bg-night-surface shadow text-stone-900 dark:text-white' : 'text-stone-400'}`}
                    >
                        <GitGraph size={16} />
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 px-1">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${selectedCategory === 'All' ? 'bg-stone-900 dark:bg-white text-white dark:text-black border-stone-900 dark:border-white shadow-md transform scale-105' : 'bg-white dark:bg-night-surface text-stone-500 dark:text-stone-400 border-transparent hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-800 dark:hover:text-stone-200'}`}
                    >
                        All
                    </button>
                    {ALL_CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border ${selectedCategory === cat ? 'bg-stone-900 dark:bg-white text-white dark:text-black border-stone-900 dark:border-white shadow-md transform scale-105' : 'bg-white dark:bg-night-surface text-stone-500 dark:text-stone-400 border-transparent hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-800 dark:hover:text-stone-200'}`}
                        >
                            {cat}
                        </button>
                    ))}

                    {/* NEW: More dropdown for custom categories */}
                    {customCategories.length > 0 && (
                        <div ref={moreDropdownRef} className="relative">
                            <button
                                onClick={() => setIsMoreDropdownOpen(!isMoreDropdownOpen)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all duration-300 border flex items-center gap-1 ${
                                    customCategories.some(cat => cat.name === selectedCategory)
                                        ? 'bg-stone-900 dark:bg-white text-white dark:text-black border-stone-900 dark:border-white shadow-md transform scale-105'
                                        : 'bg-white dark:bg-night-surface text-stone-500 dark:text-stone-400 border-transparent hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-800 dark:hover:text-stone-200'
                                }`}
                            >
                                <MoreHorizontal size={12} />
                                More
                            </button>

                            {isMoreDropdownOpen && (
                                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-night-surface border border-stone-200 dark:border-white/10 rounded-lg shadow-xl z-50 min-w-[12rem] py-2 animate-enter">
                                    {customCategories.map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => {
                                                setSelectedCategory(cat.name);
                                                setIsMoreDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                                                selectedCategory === cat.name
                                                    ? 'bg-stone-100 dark:bg-white/10 text-stone-900 dark:text-white'
                                                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white'
                                            }`}
                                        >
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-screen-2xl mx-auto px-4 md:px-6 pt-2">
        
        {/* Context Header */}
        <div className="flex items-baseline justify-between mb-8 px-2">
             <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isViewingArchive ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-700'}`}></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                    {filteredCards.length} {isViewingArchive ? 'Archived' : ''} Cards &middot; {viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} View
                </span>
             </div>
        </div>

        {renderView()}

      </main>

      {/* QUICK CAPTURE SHEET (Slide Up) */}
      <div 
        className={`fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ease-out ${isQuickCaptureOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
          <div className="bg-white dark:bg-night-surface rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] p-6 pb-12 md:pb-6 max-w-2xl mx-auto border-t border-stone-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                    Quick Capture
                  </h3>
                  <button onClick={() => setIsQuickCaptureOpen(false)} className="p-2 -mr-2 text-stone-400 hover:text-stone-800 dark:hover:text-white"><ChevronDown size={20} /></button>
              </div>
              
              <input 
                type="text" 
                placeholder="Idea Title..." 
                className="w-full text-xl font-bold text-stone-900 dark:text-white bg-transparent border-none p-0 mb-4 focus:ring-0 placeholder-stone-300 dark:placeholder-stone-600"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                autoFocus={isQuickCaptureOpen}
              />
              <textarea 
                placeholder="Jot down the details..."
                className="w-full h-32 resize-none font-mono text-sm text-stone-600 dark:text-night-body bg-stone-50 dark:bg-white/5 rounded-lg p-4 border-none focus:ring-1 focus:ring-stone-200 dark:focus:ring-white/20 placeholder-stone-400 dark:placeholder-stone-600"
                value={quickContent}
                onChange={(e) => setQuickContent(e.target.value)}
              />
              
              <div className="flex justify-between items-center mt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 dark:text-stone-600">
                    Saving to: {projects.find(p => p.id === selectedProjectId)?.name || 'General'}
                  </span>
                  <button 
                    onClick={handleQuickCaptureSave}
                    disabled={!quickTitle && !quickContent}
                    className="flex items-center gap-2 px-6 py-2 bg-stone-900 dark:bg-white text-white dark:text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black dark:hover:bg-stone-200 transition-colors disabled:opacity-50 shadow-lg"
                  >
                      Save <Send size={12} />
                  </button>
              </div>
          </div>
      </div>

      {/* Mobile FAB - Triggers Quick Capture */}
      {!isQuickCaptureOpen && (
        <div className="fixed bottom-8 right-6 md:hidden z-40 animate-enter">
            <button 
                onClick={() => setIsQuickCaptureOpen(true)}
                className="w-14 h-14 bg-stone-900 dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center hover:bg-black dark:hover:bg-stone-200 active:scale-95 transition-transform"
            >
                <Plus size={28} />
            </button>
        </div>
      )}

      {/* New Project Modal - Cinematic */}
      {isProjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-200/60 dark:bg-black/60 backdrop-blur-md">
              <div className="bg-white/90 dark:bg-night-surface/90 rounded-xl shadow-2xl w-full max-w-md p-8 border border-white/50 dark:border-white/10 animate-enter">
                  <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-6 tracking-tight">Start a New Project</h3>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Project Name..."
                    className="w-full bg-stone-50 dark:bg-white/5 border-none rounded-lg px-4 py-3 mb-6 focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 text-base text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 font-medium"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setIsProjectModalOpen(false)}
                        className="px-6 py-2.5 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleCreateProject}
                        disabled={!newProjectName.trim()}
                        className="px-6 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 shadow-lg"
                      >
                          Create
                      </button>
                  </div>
              </div>
          </div>
      )}
      
       {/* New Set Modal */}
      {isSetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-200/60 dark:bg-black/60 backdrop-blur-md">
              <div className="bg-white/90 dark:bg-night-surface/90 rounded-xl shadow-2xl w-full max-w-md p-8 border border-white/50 dark:border-white/10 animate-enter">
                  <h3 className="text-lg font-medium text-stone-900 dark:text-white mb-6 tracking-tight">Create a New Set</h3>
                  <p className="text-sm text-stone-500 mb-6">Sets help organize related ideas within {projects.find(p => p.id === selectedProjectId)?.name || 'this project'}.</p>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Set Name (e.g., Act 1, Characters, Visuals)..."
                    className="w-full bg-stone-50 dark:bg-white/5 border-none rounded-lg px-4 py-3 mb-6 focus:ring-1 focus:ring-stone-300 dark:focus:ring-white/20 text-base text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 font-medium"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateSet()}
                  />
                  <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setIsSetModalOpen(false)}
                        className="px-6 py-2.5 text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleCreateSet}
                        disabled={!newSetName.trim()}
                        className="px-6 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 shadow-lg"
                      >
                          Create
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Editor Modal */}
      {editingCard && (
        <CardEditor
            card={editingCard}
            allCards={cards}
            isDarkMode={theme === 'dark'}
            onSave={handleSaveCard}
            onClose={() => setEditingCard(null)}
            onDelete={handleArchiveCard} // Passing archive handler instead of delete
            onSwitchCard={(c) => {
                setEditingCard(c); // Switch editor to the linked card
            }}
            onCategoriesChanged={loadCustomCategories} // NEW: Refresh custom categories when changed
        />
      )}
    </div>
  );
};

export default App;