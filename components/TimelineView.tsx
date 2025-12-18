import React, { useState, useEffect } from 'react';
import { IdeaCard, IdeaSet } from '../types';
import Card from './Card';
import { GripVertical } from 'lucide-react';

interface TimelineViewProps {
  cards: IdeaCard[];
  sets: IdeaSet[];
  isDarkMode: boolean;
  onCardClick: (card: IdeaCard) => void;
  onUpdateCards: (cards: IdeaCard[]) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ cards, sets, isDarkMode, onCardClick, onUpdateCards }) => {
  const [sortedCards, setSortedCards] = useState<IdeaCard[]>([]);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    // Sort by timelineOrder, then by date as fallback
    const sorted = [...cards].sort((a, b) => {
        if (a.timelineOrder !== undefined && b.timelineOrder !== undefined) {
            return a.timelineOrder - b.timelineOrder;
        }
        return a.createdAt - b.createdAt;
    });
    setSortedCards(sorted);
  }, [cards]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
      setDraggedCardIndex(index);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedCardIndex === null || draggedCardIndex === index) return;
      
      const newSorted = [...sortedCards];
      const draggedItem = newSorted[draggedCardIndex];
      newSorted.splice(draggedCardIndex, 1);
      newSorted.splice(index, 0, draggedItem);
      
      setSortedCards(newSorted);
      setDraggedCardIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDraggedCardIndex(null);
      
      const updatedCards = sortedCards.map((c, idx) => ({
          ...c,
          timelineOrder: idx
      }));
      onUpdateCards(updatedCards);
  };

  // Group cards by Set + "Unsorted"
  // Note: Cards can belong to multiple sets, so they will appear in multiple swimlanes.
  // This view is for visualization; drag reordering here only affects the global linear order currently.
  
  const swimlanes: { set: IdeaSet | null, cards: IdeaCard[] }[] = [];
  
  // Create swimlanes for each Set
  sets.forEach(set => {
      swimlanes.push({
          set: set,
          cards: sortedCards.filter(c => (c.sets || []).includes(set.id))
      });
  });

  // Create "Unsorted" swimlane
  const unsortedCards = sortedCards.filter(c => !c.sets || c.sets.length === 0);
  if (unsortedCards.length > 0) {
      swimlanes.push({
          set: null,
          cards: unsortedCards
      });
  }
  
  // If no sets exist, just show one main timeline (handled by unsorted logic above essentially)
  // If only unsorted exists, it renders as one swimlane.

  return (
    <div className="w-full h-[calc(100vh-12rem)] overflow-x-auto overflow-y-auto no-scrollbar pb-8 pt-4 px-4">
        <div className="flex flex-col gap-8 min-w-max">
            {swimlanes.map((lane, laneIdx) => (
                <div key={lane.set ? lane.set.id : 'unsorted'} className="relative">
                    {/* Swimlane Header */}
                    <div className="sticky left-0 flex items-center gap-2 mb-4 bg-stone-100/90 dark:bg-night-bg/90 backdrop-blur-sm py-1 z-10 w-fit pr-4 rounded-r-lg">
                        <span className="w-2 h-2 rounded-full bg-stone-400"></span>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                            {lane.set ? lane.set.name : 'Unsorted'} <span className="text-stone-300 dark:text-stone-600 ml-1">({lane.cards.length})</span>
                        </h3>
                    </div>

                    {/* Cards Row */}
                    <div className="flex gap-8 items-center pl-4">
                        {lane.cards.length === 0 ? (
                            <div className="h-32 w-80 flex items-center justify-center border border-dashed border-stone-200 dark:border-white/10 rounded-xl">
                                <span className="text-[10px] text-stone-400 uppercase tracking-widest">Empty</span>
                            </div>
                        ) : (
                            lane.cards.map((card) => (
                                <div 
                                    key={`${lane.set?.id || 'u'}-${card.id}`}
                                    className="relative group w-80 flex-shrink-0"
                                >
                                     {/* Connector Line Logic (Simplified linear) */}
                                    <div className="absolute top-1/2 -left-8 w-8 h-px bg-stone-200 dark:bg-white/10 z-0"></div>

                                    <Card 
                                        card={card} 
                                        isDarkMode={isDarkMode} 
                                        onClick={() => onCardClick(card)} 
                                    />
                                </div>
                            ))
                        )}
                        {/* Placeholder at end */}
                         <div className="w-20"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default TimelineView;
