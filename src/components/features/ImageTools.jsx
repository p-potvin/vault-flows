import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

export function ImageTools() {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);
  const [activeObject, setActiveObject] = useState(null);
  const [mode, setMode] = useState('select'); // select, draw
  const [brushColor, setBrushColor] = useState('#ff0000');
  const [brushSize, setBrushSize] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Before/After Slider state
  const [showSlider, setShowSlider] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  // Filters state
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);

  useEffect(() => {
    const canvas = new fabric.Canvas(canvasRef.current, {
      backgroundColor: '#f3f4f6',
      width: 800,
      height: 600,
      preserveObjectStacking: true,
      isDrawingMode: false
    });

    setFabricCanvas(canvas);

    canvas.on('selection:created', (e) => setActiveObject(e.selected[0]));
    canvas.on('selection:updated', (e) => setActiveObject(e.selected[0]));
    canvas.on('selection:cleared', () => setActiveObject(null));
    canvas.on('object:modified', () => canvas.renderAll());

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = mode === 'draw';
    if (mode === 'draw') {
      fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
      fabricCanvas.freeDrawingBrush.color = brushColor;
      fabricCanvas.freeDrawingBrush.width = parseInt(brushSize, 10);
    }
  }, [mode, brushColor, brushSize, fabricCanvas]);

  const applyFilters = () => {
    if (!activeObject || activeObject.type !== 'image') return;
    
    activeObject.filters = [];
    
    if (brightness !== 0) activeObject.filters.push(new fabric.Image.filters.Brightness({ brightness: parseFloat(brightness) }));
    if (contrast !== 0) activeObject.filters.push(new fabric.Image.filters.Contrast({ contrast: parseFloat(contrast) }));
    if (saturation !== 0) activeObject.filters.push(new fabric.Image.filters.Saturation({ saturation: parseFloat(saturation) }));
    if (blur > 0) activeObject.filters.push(new fabric.Image.filters.Blur({ blur: parseFloat(blur) }));

    activeObject.applyFilters();
    fabricCanvas.renderAll();
  };

  useEffect(() => {
    applyFilters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brightness, contrast, saturation, blur]);

  const onSelectImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      setOriginalImage(f.target.result); // Store original for comparison
      fabric.Image.fromURL(f.target.result, (img) => {
        // scale down if too large
        if (img.width > 800) img.scaleToWidth(800);
        fabricCanvas.add(img);
        fabricCanvas.setActiveObject(img);
      });
    };
    reader.readAsDataURL(file);
  };

  const addText = () => {
    if (!fabricCanvas) return;
    const text = new fabric.IText('Double click to edit', {
      left: 100,
      top: 100,
      fontFamily: 'Arial',
      fill: brushColor,
      fontSize: 40
    });
    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
  };

  const deleteActive = () => {
    if (activeObject) {
      fabricCanvas.remove(activeObject);
      setActiveObject(null);
    }
  };

  const exportMask = () => {
      if(!fabricCanvas) return;
      const dataURL = fabricCanvas.toDataURL({
          format: 'png',
          multiplier: 1
      });
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = dataURL;
      link.click();
  };

  const runAIPipeline = async (pipelineType) => {
    if (!fabricCanvas) return;
    setIsProcessing(true);
    
    try {
      // 1. Flatten the current canvas visual state
      const base64Image = fabricCanvas.toDataURL({
        format: 'png',
        multiplier: 1,
      });

      // Provide a fallback local endpoint matching common Python agent port boundaries
      const localApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const payload = {
        image: base64Image,
        pipeline: pipelineType,
        options: {}
      };

      // 2. Transmit to the local AI backend (e.g., worker agent)
      const res = await fetch(`${localApiUrl}/api/ai/invoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`AI Pipeline ${pipelineType} Failed with status ${res.status}`);
      }

      const data = await res.json();
      
      // 3. Render the returned AI result directly onto the canvas
      if (data && data.result_image_b64) {
        fabric.Image.fromURL(data.result_image_b64, (img) => {
          // You might prefer to add it as a new layer or overwrite the canvas
          fabricCanvas.clear();
          fabricCanvas.backgroundColor = '#f3f4f6';
          fabricCanvas.add(img);
          fabricCanvas.setActiveObject(img);
          fabricCanvas.renderAll();
        });
      } else {
        alert("The pipeline completed but returned no image data.");
      }

    } catch (e) {
      console.error(e);
      alert(`Error running ${pipelineType}: ` + e.message + "\nMake sure your local worker agent and API are running.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded shadow mb-8">
      <h2 className="text-2xl font-bold mb-4">Photo Editing Tools</h2>
      
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Sidebar Tools */}
        <div className="w-full xl:w-64 flex flex-col gap-4">
          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2 text-vault-600 dark:text-vault-400">Local AI Pipelines</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => runAIPipeline('face_enhance')} 
                disabled={isProcessing}
                className="w-full py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : '✨ Enhance (GFPGAN)'}
              </button>
              <button 
                onClick={() => runAIPipeline('facefusion_swap')} 
                disabled={isProcessing}
                className="w-full py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : '🎭 FaceSwap (FaceFusion)'}
              </button>
              <button 
                onClick={() => runAIPipeline('sd_inpaint')} 
                disabled={isProcessing}
                className="w-full py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-bold disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : '🖌️ Inpaint Canvas'}
              </button>
            </div>
          </div>

          {/* New Before/After Compare View */}
          {originalImage && (
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-2">Compare Tool</h3>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="compare_mode" 
                  checked={showSlider} 
                  onChange={(e) => setShowSlider(e.target.checked)} 
                  className="cursor-pointer"
                />
                <label htmlFor="compare_mode" className="text-sm cursor-pointer select-none">
                  Show Before / After Slider
                </label>
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Import & Export</h3>
            <input type="file" accept="image/*" onChange={onSelectImage} className="mb-2 text-sm w-full" />
            <button onClick={exportMask} className="w-full py-1 bg-vault-900 text-white rounded hover:bg-vault-800 dark:bg-vault-200 dark:text-vault-900 text-sm font-bold">Export Image</button>
          </div>

          <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Tools</h3>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setMode('select')} className={`px-2 py-1 rounded text-sm ${mode === 'select' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>Select</button>
              <button onClick={() => setMode('draw')} className={`px-2 py-1 rounded text-sm ${mode === 'draw' ? 'bg-blue-600 text-white' : 'bg-gray-300 dark:bg-gray-600'}`}>Draw</button>
            </div>
            
            <label className="block text-sm mb-1">Color / Fill</label>
            <input type="color" value={brushColor} onChange={e => setBrushColor(e.target.value)} className="w-full mb-2" />
            
            {mode === 'draw' && (
              <>
                <label className="block text-sm mb-1">Brush Size ({brushSize})</label>
                <input type="range" min="1" max="100" value={brushSize} onChange={e => setBrushSize(e.target.value)} className="w-full" />
              </>
            )}

            <button onClick={addText} className="w-full py-1 bg-gray-300 dark:bg-gray-600 rounded text-sm mt-2">Add Text</button>
            <button onClick={deleteActive} disabled={!activeObject} className="w-full py-1 bg-red-600 text-white rounded text-sm mt-2 disabled:opacity-50">Delete Selected</button>
          </div>

          {activeObject && activeObject.type === 'image' && (
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold mb-2">Filters</h3>
              <label className="block text-sm mb-1">Brightness ({brightness})</label>
              <input type="range" min="-1" max="1" step="0.05" value={brightness} onChange={e => setBrightness(e.target.value)} className="w-full mb-2" />
              
              <label className="block text-sm mb-1">Contrast ({contrast})</label>
              <input type="range" min="-1" max="1" step="0.05" value={contrast} onChange={e => setContrast(e.target.value)} className="w-full mb-2" />
              
              <label className="block text-sm mb-1">Saturation ({saturation})</label>
              <input type="range" min="-1" max="1" step="0.05" value={saturation} onChange={e => setSaturation(e.target.value)} className="w-full mb-2" />
              
              <label className="block text-sm mb-1">Blur ({blur})</label>
              <input type="range" min="0" max="1" step="0.01" value={blur} onChange={e => setBlur(e.target.value)} className="w-full mb-2" />
              <button 
                onClick={() => { setBrightness(0); setContrast(0); setSaturation(0); setBlur(0); }} 
                className="w-full mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="relative flex-1 bg-gray-200 dark:bg-gray-800 rounded overflow-hidden flex items-center justify-center border border-gray-300 dark:border-gray-700">
          <canvas ref={canvasRef} />
        
          {/* Before/After Overlay Slider */}
          {showSlider && originalImage && (
            <div className="absolute inset-0 bg-gray-200 overflow-hidden pointer-events-none z-10 select-none">
            {/* Base layer: Current Edited Canvas (simulated by capturing current data url) */}
            <img 
              src={fabricCanvas ? fabricCanvas.toDataURL({format: 'png', multiplier: 1}) : originalImage} 
              className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
              alt="Edited"
            />
            {/* Top layer: Original Image, masked by the slider */}
            <div 
              className="absolute inset-0 h-full overflow-hidden pointer-events-none"
              style={{ width: `${sliderPosition}%` }}
            >
              <img 
                src={originalImage} 
                className="absolute inset-0 object-contain max-w-none h-full pointer-events-none" 
                style={{ width: '100vw', minWidth: '100%' /* We'll use a trick to keep aspect ratio if needed, but for simplicity object-cover works below */}} 
                alt="Original" 
              />
            </div>
            {/* The Invisible Range Input handling the drag */}
            <input 
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(e.target.value)}
              className="absolute inset-y-0 w-full h-full opacity-0 cursor-ew-resize z-20 pointer-events-auto"
            />
            {/* Visual Slider thumb */}
            <div 
              className="absolute inset-y-0 w-1 bg-white shadow-lg z-10 pointer-events-none flex items-center justify-center"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-8 h-8 bg-white border border-gray-300 rounded-full shadow flex items-center justify-center">
                <div className="w-4 flex justify-between">
                  <div className="w-0.5 h-3 bg-gray-400"></div>
                  <div className="w-0.5 h-3 bg-gray-400"></div>
                </div>
              </div>
            </div>
            
            <div className="absolute top-4 left-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none z-20">Original</div>
            <div className="absolute top-4 right-4 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold pointer-events-none z-20">Edited</div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
