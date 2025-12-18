import React, { useState, useRef, useEffect } from 'react';
import { IdeaCard } from '../types';
import Card from './Card';

interface CanvasViewProps {
  cards: IdeaCard[];
  isDarkMode: boolean;
  onCardClick: (card: IdeaCard) => void;
  onUpdateCard: (card: IdeaCard) => void;
}

const CanvasView: React.FC<CanvasViewProps> = ({ cards, isDarkMode, onCardClick, onUpdateCard }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Viewport State
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Dragging State
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [cardDragOffset, setCardDragOffset] = useState({ x: 0, y: 0 });

  // Mouse Handlers for Panning & Card Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
      // If clicking directly on the canvas background
      if (e.target === containerRef.current) {
          setIsPanning(true);
          setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
      }
  };

  const handleCardMouseDown = (e: React.MouseEvent, card: IdeaCard) => {
      e.stopPropagation(); // Prevent panning
      setDraggingCardId(card.id);
      
      // Calculate offset from card's position to mouse pointer considering scale
      const cardX = card.canvasX || 0;
      const cardY = card.canvasY || 0;
      
      // Convert mouse screen position to world space is tricky with CSS transform.
      // Easiest is to track delta during movement.
      setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isPanning) {
          setPosition({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
          });
      }

      if (draggingCardId) {
          const deltaX = (e.clientX - dragStart.x) / scale;
          const deltaY = (e.clientY - dragStart.y) / scale;
          
          const card = cards.find(c => c.id === draggingCardId);
          if (card) {
              const newX = (card.canvasX || 0) + deltaX;
              const newY = (card.canvasY || 0) + deltaY;
              
              // We need to trigger update in parent, but doing it on every pixel move is heavy.
              // For smoothness, we might want local state or just update efficiently.
              // Since we are using standard React state in App, let's just update. 
              // Optimization: In a real app, use ref for direct DOM manipulation then save on mouseUp.
              // Here we will rely on React's diffing, might be slightly jittery on slow machines but OK for MVP.
              
              // Actually, updating the whole card list on every frame is bad.
              // Let's cheat: we won't update the parent 'cards' state until mouse up.
              // We will update a local visual override? No, that's complex to sync.
              // Let's try direct update first.
               onUpdateCard({
                  ...card,
                  canvasX: newX,
                  canvasY: newY
              });
              
              setDragStart({ x: e.clientX, y: e.clientY });
          }
      }
  };

  const handleMouseUp = () => {
      setIsPanning(false);
      setDraggingCardId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
      e.stopPropagation();
      const zoomSensitivity = 0.001;
      const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 3);
      setScale(newScale);
  };

  return (
    <div 
        ref={containerRef}
        className="w-full h-[calc(100vh-9rem)] bg-stone-100 dark:bg-[#111] overflow-hidden relative cursor-grab active:cursor-grabbing border border-stone-200 dark:border-white/5 rounded-xl shadow-inner"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ 
            backgroundImage: isDarkMode 
                ? 'radial-gradient(circle, #333 1px, transparent 1px)' 
                : 'radial-gradient(circle, #ccc 1px, transparent 1px)',
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${position.x}px ${position.y}px`
        }}
    >
        <div 
            className="absolute origin-top-left transition-transform duration-75 ease-out"
            style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`
            }}
        >
            {cards.map(card => (
                <div
                    key={card.id}
                    className="absolute"
                    style={{
                        left: card.canvasX || 0,
                        top: card.canvasY || 0,
                        width: '320px',
                        zIndex: draggingCardId === card.id ? 50 : 1
                    }}
                    onMouseDown={(e) => handleCardMouseDown(e, card)}
                >
                     <Card 
                        card={card} 
                        isDarkMode={isDarkMode} 
                        onClick={() => {
                            // Only click if not dragging (simple heuristic: if we just moused down and up without move)
                            // For now, standard click.
                            onCardClick(card);
                        }}
                        className="shadow-xl"
                     />
                </div>
            ))}
        </div>
        
        {/* Controls Overlay */}
        <div className="absolute bottom-6 right-6 flex flex-col gap-2 bg-white/90 dark:bg-black/90 p-2 rounded-lg shadow-cinematic backdrop-blur-sm z-50">
            <button onClick={() => setScale(s => Math.min(s + 0.1, 3))} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded font-bold text-stone-600 dark:text-stone-300">+</button>
            <button onClick={() => setScale(1)} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded text-xs font-mono text-stone-500">{Math.round(scale * 100)}%</button>
            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.1))} className="p-2 hover:bg-stone-100 dark:hover:bg-white/10 rounded font-bold text-stone-600 dark:text-stone-300">-</button>
        </div>
    </div>
  );
};

export default CanvasView;
