import React, { useState } from 'react';
import { StoryQuestion } from '../types';
import { Plus, X, Edit3, Save, HelpCircle, ChevronRight, ChevronDown, Trash2 } from 'lucide-react';

interface StoryQuestionsPanelProps {
  questions: StoryQuestion[];
  onAdd: (question: string, description: string) => void;
  onUpdate: (id: string, question: string, description: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const StoryQuestionsPanel: React.FC<StoryQuestionsPanelProps> = ({ questions, onAdd, onUpdate, onDelete, isOpen, setIsOpen }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Accordion state for descriptions
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
      setExpandedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleAddSubmit = () => {
      if (!newQuestion.trim()) return;
      onAdd(newQuestion, newDescription);
      setNewQuestion('');
      setNewDescription('');
      setIsAdding(false);
  };

  const startEditing = (q: StoryQuestion) => {
      setEditingId(q.id);
      setEditQuestion(q.question);
      setEditDescription(q.description || '');
  };

  const handleUpdateSubmit = () => {
      if (!editingId || !editQuestion.trim()) return;
      onUpdate(editingId, editQuestion, editDescription);
      setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="w-full bg-stone-50 dark:bg-[#151515] border-b border-stone-200 dark:border-white/5 animate-enter shadow-inner">
      <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-stone-200 dark:bg-white/10 rounded-lg">
                    <HelpCircle size={18} className="text-stone-600 dark:text-stone-300" />
                  </div>
                  <div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-stone-900 dark:text-white">Story Questions</h3>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">The core questions driving your project.</p>
                  </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors">
                  <X size={20} />
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Add New Question Card */}
              {isAdding ? (
                  <div className="bg-white dark:bg-night-surface p-4 rounded-xl border border-stone-200 dark:border-white/10 shadow-cinematic flex flex-col gap-3">
                      <input 
                          type="text" 
                          placeholder="What is the core conflict?" 
                          className="w-full text-sm font-bold text-stone-900 dark:text-white bg-transparent border-b border-stone-100 dark:border-white/10 pb-2 focus:outline-none focus:border-stone-400"
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          autoFocus
                      />
                      <textarea 
                          placeholder="Context or details..." 
                          className="w-full text-xs text-stone-600 dark:text-stone-400 bg-transparent resize-none h-16 focus:outline-none"
                          value={newDescription}
                          onChange={(e) => setNewDescription(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 mt-auto pt-2">
                          <button onClick={() => setIsAdding(false)} className="text-[10px] uppercase font-bold text-stone-400 hover:text-stone-600 px-3 py-1">Cancel</button>
                          <button 
                            onClick={handleAddSubmit} 
                            disabled={!newQuestion.trim()}
                            className="bg-stone-900 dark:bg-white text-white dark:text-black text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                          >
                              Save Question
                          </button>
                      </div>
                  </div>
              ) : (
                  <button 
                      onClick={() => setIsAdding(true)}
                      className="flex flex-col items-center justify-center p-6 h-full min-h-[140px] rounded-xl border-2 border-dashed border-stone-200 dark:border-white/10 hover:border-stone-400 dark:hover:border-white/30 transition-colors group"
                  >
                      <Plus size={24} className="text-stone-300 dark:text-stone-600 group-hover:text-stone-500 dark:group-hover:text-stone-400 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-widest text-stone-400 dark:text-stone-600 group-hover:text-stone-600 dark:group-hover:text-stone-400">Add Question</span>
                  </button>
              )}

              {/* Existing Questions */}
              {questions.map(q => (
                  <div key={q.id} className="bg-white dark:bg-night-surface p-4 rounded-xl border border-stone-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all group">
                      {editingId === q.id ? (
                          <div className="flex flex-col gap-3 h-full">
                               <input 
                                  type="text" 
                                  className="w-full text-sm font-bold text-stone-900 dark:text-white bg-transparent border-b border-stone-100 dark:border-white/10 pb-2 focus:outline-none focus:border-stone-400"
                                  value={editQuestion}
                                  onChange={(e) => setEditQuestion(e.target.value)}
                                  autoFocus
                              />
                              <textarea 
                                  className="w-full text-xs text-stone-600 dark:text-stone-400 bg-transparent resize-none h-16 focus:outline-none"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                              />
                              <div className="flex justify-between items-center mt-auto pt-2">
                                  <button onClick={() => onDelete(q.id)} className="text-stone-300 hover:text-red-500"><Trash2 size={14}/></button>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingId(null)} className="text-[10px] uppercase font-bold text-stone-400 hover:text-stone-600 px-2">Cancel</button>
                                    <button 
                                        onClick={handleUpdateSubmit} 
                                        className="bg-stone-900 dark:bg-white text-white dark:text-black text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg hover:opacity-90"
                                    >
                                        Save
                                    </button>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col h-full">
                              <div className="flex justify-between items-start gap-2 mb-2">
                                  <h4 className="text-sm font-bold text-stone-900 dark:text-white leading-tight">{q.question}</h4>
                                  <button onClick={() => startEditing(q)} className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-900 dark:hover:text-white transition-opacity"><Edit3 size={12} /></button>
                              </div>
                              {q.description && (
                                  <div className="mt-1">
                                      <p className={`text-xs text-stone-500 dark:text-stone-400 leading-relaxed ${expandedIds.includes(q.id) ? '' : 'line-clamp-2'}`}>
                                          {q.description}
                                      </p>
                                      {q.description.length > 80 && (
                                          <button onClick={() => toggleExpand(q.id)} className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase text-stone-400 hover:text-stone-600">
                                              {expandedIds.includes(q.id) ? 'Show Less' : 'Show More'} <ChevronDown size={10} className={`transform transition-transform ${expandedIds.includes(q.id) ? 'rotate-180' : ''}`}/>
                                          </button>
                                      )}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};

export default StoryQuestionsPanel;
