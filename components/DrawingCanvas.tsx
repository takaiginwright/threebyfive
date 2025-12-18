
import React, { useRef, useEffect, useState } from 'react';

interface DrawingCanvasProps {
  className?: string;
  initialData?: string | null;
  onSave: (data: string | null) => void;
  onClose: () => void;
  accentColor: string;
  isDarkMode: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  className = '',
  initialData,
  onSave,
  onClose,
  accentColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [strokeColor, setStrokeColor] = useState('#000000');
  
  // Track if we've loaded the initial data to avoid overwriting user changes on resize
  const isInitialized = useRef(false);

  // Resize canvas to match container using ResizeObserver for better accuracy during animations
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateSize = () => {
      const { width, height } = container.getBoundingClientRect();
      
      // Prevent resizing to 0/invalid dims
      if (width < 1 || height < 1) return;

      // If dimensions haven't changed, don't wipe the canvas
      if (canvas.width === width && canvas.height === height) return;

      // Save current content before resizing (which clears canvas)
      const currentContent = canvas.toDataURL();

      // Update buffer size
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Restore content
      const img = new Image();
      const source = (!isInitialized.current && initialData) ? initialData : currentContent;
      
      img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
      };
      
      if (source && source !== 'data:,') {
          img.src = source;
      }
      
      isInitialized.current = true;
    };

    const resizeObserver = new ResizeObserver(() => {
        // Request animation frame to avoid "ResizeObserver loop limit exceeded"
        requestAnimationFrame(updateSize);
    });
    
    resizeObserver.observe(container);

    return () => {
        resizeObserver.disconnect();
    };
  }, [initialData]);


  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale factors map display size to buffer size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return { 
        x: (clientX - rect.left) * scaleX, 
        y: (clientY - rect.top) * scaleY 
    };
  };


  const startDrawing = (e: any) => {
    // Prevent default to stop scrolling, but only if inside canvas
    // However, touch-action: none is set on canvas class, so e.preventDefault might be redundant or safe.
    // e.preventDefault(); 
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getPos(e);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    if (isDrawing) {
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext('2d');
        ctx?.closePath();
    }
  };

  const isCanvasBlank = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return true;
    
    const pixelBuffer = new Uint32Array(
      ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    
    return !pixelBuffer.some(color => color !== 0);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      onSave(null);
      onClose();
      return;
    }
    
    // If canvas is blank/empty, save as null (delete)
    if (isCanvasBlank(canvas)) {
        onSave(null);
        onClose();
        return;
    }

    const data = canvas.toDataURL('image/png');
    onSave(data);
    onClose();
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };


  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={endDrawing}
      onMouseLeave={endDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={endDrawing}
    >
      <canvas ref={canvasRef} className="w-full h-full bg-transparent cursor-crosshair touch-none" />

      {/* TOOLBAR */}
      <div className="absolute top-2 left-2 flex items-center gap-2 bg-white/90 dark:bg-black/70 backdrop-blur-md px-3 py-1 rounded-full shadow z-30">

        {/* Stroke Sizes */}
        {[2, 4, 6].map((size) => (
          <button
            key={size}
            onClick={() => setStrokeWidth(size)}
            className="rounded-full flex items-center justify-center transition-transform hover:scale-110"
            style={{
              width: 24,
              height: 24,
              border: strokeWidth === size ? `2px solid ${accentColor}` : "1px solid transparent",
            }}
            title={`Size ${size}`}
          >
             <div 
                className="rounded-full bg-stone-800 dark:bg-white"
                style={{ width: size + 2, height: size + 2 }}
             />
          </button>
        ))}

        <div className="w-px h-4 bg-stone-300 dark:bg-white/20 mx-1"></div>

        {/* Color Picker */}
        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-stone-200 dark:border-white/20">
            <input
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer p-0 border-0"
            />
        </div>

        <div className="w-px h-4 bg-stone-300 dark:bg-white/20 mx-1"></div>

        <button onClick={handleClear} className="text-[10px] uppercase font-bold text-stone-500 hover:text-red-500 px-1 transition-colors">
          Clear
        </button>

        <button onClick={handleSave} className="text-[10px] uppercase font-bold text-stone-900 dark:text-white hover:opacity-70 px-1 transition-opacity">
          Done
        </button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
