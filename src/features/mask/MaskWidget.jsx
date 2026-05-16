import React, { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';

/**
 * MaskWidget provides a basic scaffold for localized inpainting/outpainting
 * using fabric.js.
 */
export const MaskWidget = React.memo(function MaskWidget({ imageUrl, onMaskComplete }) {
  const canvasRef = useRef(null);
  const [fabricCanvas, setFabricCanvas] = useState(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: true,
      });

      // Basic brush settings for mask creation
      canvas.freeDrawingBrush.color = 'rgba(255, 0, 0, 0.5)';
      canvas.freeDrawingBrush.width = 20;

      setFabricCanvas(canvas);

      return () => {
        canvas.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (fabricCanvas && imageUrl) {
      fabric.Image.fromURL(imageUrl, (img) => {
        fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
          scaleX: fabricCanvas.width / img.width,
          scaleY: fabricCanvas.height / img.height,
        });
      });
    }
  }, [fabricCanvas, imageUrl]);

  const handleExportMask = () => {
    if (fabricCanvas && onMaskComplete) {
      // Temporarily remove background image to export only the mask
      const bgImage = fabricCanvas.backgroundImage;
      fabricCanvas.setBackgroundImage(null, fabricCanvas.renderAll.bind(fabricCanvas));

      const maskDataUrl = fabricCanvas.toDataURL({
        format: 'png',
        multiplier: 1,
      });

      // Restore the background image
      fabricCanvas.setBackgroundImage(bgImage, fabricCanvas.renderAll.bind(fabricCanvas));
      onMaskComplete(maskDataUrl);
    }
  };

  return (
    <div className="mask-widget-container flex flex-col gap-4 p-4 border border-vault-slate rounded-md">
      <h3 className="text-lg font-semibold text-vault-cyan">Mask Creation Widget</h3>
      <div className="canvas-wrapper border border-line">
        <canvas ref={canvasRef} width={512} height={512} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleExportMask}
          className="px-4 py-2 bg-vault-cyan text-vault-base font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
        >
          Export Mask
        </button>
        <button
          onClick={() => fabricCanvas?.clear()}
          className="px-4 py-2 border border-vault-burgundy text-vault-burgundy rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-500"
        >
          Clear Mask
        </button>
      </div>
    </div>
  );
});
