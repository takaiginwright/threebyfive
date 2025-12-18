import React, { useEffect, useState, useRef } from 'react';
import { IdeaCard, IdeaSet } from '../types';
import Card from './Card';

interface ThreadsViewProps {
  cards: IdeaCard[];
  sets: IdeaSet[];
  isDarkMode: boolean;
  onCardClick: (card: IdeaCard) => void;
}

// Simple force simulation node
interface SimNode {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
}

const ThreadsView: React.FC<ThreadsViewProps> = ({ cards, sets, isDarkMode, onCardClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const requestRef = useRef<number | null>(null);
  
  // Initialize Simulation
  useEffect(() => {
    const initialNodes = cards.map(c => ({
        id: c.id,
        x: Math.random() * 800,
        y: Math.random() * 600,
        vx: 0,
        vy: 0
    }));
    setNodes(initialNodes);
  }, [cards.length]); // Re-init only on count change roughly

  // Simulation Loop
  const tick = () => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const center = { x: width / 2, y: height / 2 };

    setNodes(prevNodes => {
        const nextNodes = prevNodes.map(n => ({ ...n })); // Shallow copy
        
        // 1. Repulsion (Nodes push apart)
        for (let i = 0; i < nextNodes.length; i++) {
            for (let j = i + 1; j < nextNodes.length; j++) {
                const a = nextNodes[i];
                const b = nextNodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;
                const dist = Math.sqrt(distSq) || 1;
                
                const force = 5000 / (distSq + 100); // Repulsion strength
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;
                
                a.vx += fx;
                a.vy += fy;
                b.vx -= fx;
                b.vy -= fy;
            }
        }

        // 2. Attraction (Connected threads pull together)
        cards.forEach(card => {
            const sourceNode = nextNodes.find(n => n.id === card.id);
            if (!sourceNode) return;
            
            (card.threads || []).forEach(targetId => {
                const targetNode = nextNodes.find(n => n.id === targetId);
                if (targetNode) {
                    const dx = targetNode.x - sourceNode.x;
                    const dy = targetNode.y - sourceNode.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    
                    const force = (dist - 150) * 0.005; 
                    
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    
                    sourceNode.vx += fx;
                    sourceNode.vy += fy;
                    targetNode.vx -= fx;
                    targetNode.vy -= fy;
                }
            });
        });

        // 3. Set Attraction (Neighborhoods)
        sets.forEach(set => {
            // Find all nodes in this set
            const setNodes = nextNodes.filter(n => {
                const c = cards.find(card => card.id === n.id);
                return c && (c.sets || []).includes(set.id);
            });

            if (setNodes.length > 1) {
                // Pull them towards their common centroid
                let cx = 0, cy = 0;
                setNodes.forEach(n => { cx += n.x; cy += n.y; });
                cx /= setNodes.length;
                cy /= setNodes.length;

                setNodes.forEach(n => {
                    const dx = cx - n.x;
                    const dy = cy - n.y;
                    n.vx += dx * 0.002; // Gentle pull
                    n.vy += dy * 0.002;
                });
            }
        });


        // 4. Gravity (Pull to center)
        nextNodes.forEach(n => {
            n.vx += (center.x - n.x) * 0.005;
            n.vy += (center.y - n.y) * 0.005;
            
            // Damping
            n.vx *= 0.9;
            n.vy *= 0.9;
            
            // Update Position
            n.x += n.vx;
            n.y += n.vy;
        });

        return nextNodes;
    });

    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
      requestRef.current = requestAnimationFrame(tick);
      return () => {
          if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      };
  }, [cards, sets]);

  // Render Lines
  const renderConnections = () => {
      const lines: React.ReactElement[] = [];
      const drawnPairs = new Set<string>();

      cards.forEach(card => {
          const source = nodes.find(n => n.id === card.id);
          if (!source) return;

          (card.threads || []).forEach(tid => {
              const target = nodes.find(n => n.id === tid);
              if (target) {
                   // Avoid duplicate lines
                   const pairId = [card.id, tid].sort().join('-');
                   if (drawnPairs.has(pairId)) return;
                   drawnPairs.add(pairId);

                   lines.push(
                       <line 
                            key={pairId}
                            x1={source.x + 96} // Center of 192px width card approx
                            y1={source.y + 30} 
                            x2={target.x + 96} 
                            y2={target.y + 30}
                            stroke={isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"}
                            strokeWidth="1.5"
                       />
                   );
              }
          });
      });
      return lines;
  };

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-9rem)] overflow-hidden relative bg-stone-50 dark:bg-night-bg rounded-xl border border-stone-200 dark:border-white/5 shadow-inner">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {renderConnections()}
        </svg>

        {nodes.map(node => {
            const card = cards.find(c => c.id === node.id);
            if (!card) return null;
            return (
                <div 
                    key={node.id}
                    className="absolute transition-shadow hover:z-50"
                    style={{ 
                        transform: `translate(${node.x}px, ${node.y}px)`,
                        width: '12rem'
                    }}
                >
                    <Card 
                        card={card} 
                        isDarkMode={isDarkMode} 
                        onClick={() => onCardClick(card)}
                        variant="compact"
                        className="shadow-md"
                    />
                </div>
            );
        })}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 p-4 bg-white/80 dark:bg-black/80 backdrop-blur rounded-lg shadow-sm border border-stone-100 dark:border-white/5 pointer-events-none">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-1">Relationship Map</h4>
            <p className="text-[9px] text-stone-400 dark:text-stone-500">Auto-organizing based on threads & sets.</p>
        </div>
    </div>
  );
};

export default ThreadsView;
