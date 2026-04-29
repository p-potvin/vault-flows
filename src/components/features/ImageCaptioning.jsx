import React, { useEffect, useState, useMemo } from 'react';
import { FlowRuntimePanel } from '../ui/FlowRuntimePanel';
import { buildCaptionExecutionManifest } from '../../lib/flowRuntime';

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}

function rgbToHex(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness * 100 };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue = 0;
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }

  return {
    h: hue * 60,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function labelColor(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);

  if (s < 10) {
    if (l < 18) return 'charcoal';
    if (l > 86) return 'white';
    return 'gray';
  }

  if (h < 15 || h >= 345) return l < 35 ? 'deep red' : 'red';
  if (h < 40) return l < 45 ? 'brown' : 'orange';
  if (h < 65) return 'gold';
  if (h < 90) return 'lime';
  if (h < 150) return 'green';
  if (h < 185) return 'teal';
  if (h < 220) return 'blue';
  if (h < 260) return 'indigo';
  if (h < 300) return 'purple';
  return 'pink';
}

function describeAspect(width, height) {
  const ratio = width / height;

  if (ratio > 1.8) {
    return { label: 'panoramic', tag: 'panoramic' };
  }

  if (ratio > 1.12) {
    return { label: 'landscape', tag: 'landscape' };
  }

  if (ratio < 0.88) {
    return { label: 'portrait', tag: 'portrait' };
  }

  return { label: 'square', tag: 'square' };
}

function describeLighting(brightness) {
  if (brightness < 70) {
    return { label: 'low lighting', tag: 'low-light' };
  }

  if (brightness < 120) {
    return { label: 'soft lighting', tag: 'soft-light' };
  }

  if (brightness < 180) {
    return { label: 'balanced lighting', tag: 'balanced-light' };
  }

  return { label: 'bright lighting', tag: 'bright' };
}

function describeSaturation(saturation) {
  if (saturation < 20) {
    return { label: 'neutral', tag: 'neutral-tones' };
  }

  if (saturation < 45) {
    return { label: 'natural', tag: 'natural-tones' };
  }

  return { label: 'vivid', tag: 'vivid-tones' };
}

function toTitleCase(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function tokenizeHints(value) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length > 2)
    .slice(0, 4);
}

function buildTagList(analysis, subjectHint, contextHint) {
  if (!analysis) {
    return [];
  }

  return Array.from(
    new Set([
      analysis.aspect.tag,
      analysis.lighting.tag,
      analysis.saturation.tag,
      ...analysis.colorLabels,
      ...tokenizeHints(subjectHint),
      ...tokenizeHints(contextHint),
    ]),
  ).slice(0, 8);
}

function buildCaptionDraft(analysis, subjectHint, contextHint) {
  if (!analysis) {
    return '';
  }

  const subject = subjectHint.trim();
  const context = contextHint.trim();
  const palettePhrase =
    analysis.colorLabels.length > 1
      ? `${analysis.colorLabels.slice(0, 2).join(' and ')} tones`
      : `${analysis.colorLabels[0]} tones`;

  const leadingSentence = subject
    ? `${toTitleCase(subject)} in a ${analysis.aspect.label} frame with ${analysis.lighting.label} and ${analysis.saturation.label} ${palettePhrase}.`
    : `${toTitleCase(analysis.aspect.label)} image with ${analysis.lighting.label} and ${analysis.saturation.label} ${palettePhrase}.`;

  if (context) {
    return `${leadingSentence} Prepared for ${context}.`;
  }

  return leadingSentence;
}

async function analyzeImage(file, imageUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const aspect = describeAspect(width, height);
      const megapixels = (width * height) / 1_000_000;

      const sampleMaxSide = 48;
      const scale = Math.min(sampleMaxSide / width, sampleMaxSide / height, 1);
      const sampleWidth = Math.max(1, Math.round(width * scale));
      const sampleHeight = Math.max(1, Math.round(height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;

      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        reject(new Error('Canvas is not available in this browser.'));
        return;
      }

      context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
      const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);

      let brightnessTotal = 0;
      let saturationTotal = 0;
      let pixelCount = 0;
      const buckets = new Map();

      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3];
        if (alpha < 160) {
          continue;
        }

        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
        const saturation = rgbToHsl(red, green, blue).s;
        const bucketKey = [
          Math.round(red / 48) * 48,
          Math.round(green / 48) * 48,
          Math.round(blue / 48) * 48,
        ].join(',');

        brightnessTotal += brightness;
        saturationTotal += saturation;
        pixelCount += 1;
        buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
      }

      if (pixelCount === 0) {
        reject(new Error('The image could not be sampled.'));
        return;
      }

      const dominantSwatches = [];
      const seenLabels = new Set();
      const sortedBuckets = Array.from(buckets.entries()).sort((left, right) => right[1] - left[1]);

      for (const [bucket] of sortedBuckets) {
        const [red, green, blue] = bucket.split(',').map((value) => Number(value));
        const label = labelColor(red, green, blue);

        if (seenLabels.has(label)) {
          continue;
        }

        dominantSwatches.push({
          hex: rgbToHex(red, green, blue),
          label,
        });
        seenLabels.add(label);

        if (dominantSwatches.length === 4) {
          break;
        }
      }

      const averageBrightness = brightnessTotal / pixelCount;
      const averageSaturation = saturationTotal / pixelCount;
      const lighting = describeLighting(averageBrightness);
      const saturation = describeSaturation(averageSaturation);

      resolve({
        width,
        height,
        megapixels,
        fileType: file.type || 'image',
        fileSize: file.size,
        aspect,
        lighting,
        saturation,
        dominantSwatches,
        colorLabels: dominantSwatches.map((swatch) => swatch.label).slice(0, 3),
      });
    };

    image.onerror = () => reject(new Error('The selected file could not be opened as an image.'));
    image.src = imageUrl;
  });
}

export function ImageCaptioning() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [subjectHint, setSubjectHint] = useState('');
  const [contextHint, setContextHint] = useState('');
  const [captionDraft, setCaptionDraft] = useState('');
  const [captionDirty, setCaptionDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyState, setCopyState] = useState('');
  const [error, setError] = useState('');
  const [runtimeConfig, setRuntimeConfig] = useState(null);

  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    if (!analysis || captionDirty) {
      return;
    }

    setCaptionDraft(buildCaptionDraft(analysis, subjectHint, contextHint));
  }, [analysis, subjectHint, contextHint, captionDirty]);

  async function handleFileSelection(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError('');
    setCopyState('');
    setCaptionDirty(false);
    setSelectedFile(file);
    setAnalysis(null);

    const nextImageUrl = URL.createObjectURL(file);
    setImageUrl(nextImageUrl);
    setLoading(true);

    try {
      const nextAnalysis = await analyzeImage(file, nextImageUrl);
      setAnalysis(nextAnalysis);
      setCaptionDraft(buildCaptionDraft(nextAnalysis, subjectHint, contextHint));
    } catch (nextError) {
      setError(nextError.message || 'Local analysis failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyCaption() {
    if (!captionDraft || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(captionDraft);
    setCopyState('Copied');
  }

  function handleDownloadManifest() {
    if (!analysis || !runtimeConfig) {
      return;
    }

    const payload = buildCaptionExecutionManifest({
      config: runtimeConfig,
      analysis,
      subjectHint,
      contextHint,
      captionDraft,
      tags,
    });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    );

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'vault-caption-job.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  // ⚡ Bolt: Memoize tag generation to prevent unnecessary array reallocation
  // and string manipulation on every keystroke when typing hints.
  const tags = useMemo(() => buildTagList(analysis, subjectHint, contextHint), [analysis, subjectHint, contextHint]);

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded shadow mb-8">
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="text-xl font-bold">Image Captioning & Tagging</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Browser-only helper. It samples image size, brightness, and color palette locally, then turns
          that into an editable caption draft. It does not identify objects or read text unless you add
          that context yourself.
        </p>
      </div>

      <div className="mb-4">
        <FlowRuntimePanel
          flowId="imageCaptioning"
          title="Caption Runtime"
          description="Select the local caption model contract this flow should use when you hand the job off to a local runtime."
          onConfigChange={setRuntimeConfig}
        />
      </div>

      <input type="file" accept="image/*" onChange={handleFileSelection} className="mb-4" />

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-4 rounded border border-vault-200 bg-vault-50 px-3 py-2 text-sm text-vault-800 dark:border-vault-700 dark:bg-vault-950/30 dark:text-vault-100">
          Sampling the image locally...
        </div>
      )}

      {imageUrl && (
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="w-full md:w-5/12">
            <img
              src={imageUrl}
              alt="Selected preview"
              className="max-h-72 w-full rounded border border-gray-200 object-contain dark:border-gray-700"
            />

            {analysis && (
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Resolution</div>
                    <div className="font-semibold">{analysis.width} × {analysis.height}</div>
                  </div>
                  <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">File Size</div>
                    <div className="font-semibold">{formatFileSize(analysis.fileSize)}</div>
                  </div>
                  <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Composition</div>
                    <div className="font-semibold">{toTitleCase(analysis.aspect.label)}</div>
                  </div>
                  <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                    <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Estimated Detail</div>
                    <div className="font-semibold">{analysis.megapixels.toFixed(2)} MP</div>
                  </div>
                </div>

                <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Local Readout</div>
                  <div className="mt-1 font-medium">{toTitleCase(analysis.lighting.label)}</div>
                  <div className="text-gray-700 dark:text-gray-200">{toTitleCase(analysis.saturation.label)} palette</div>
                </div>

                <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Dominant Colors</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {analysis.dominantSwatches.map((swatch) => (
                      <div
                        key={`${swatch.hex}-${swatch.label}`}
                        className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                      >
                        <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: swatch.hex }} />
                        <span className="text-xs font-medium">{swatch.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-full md:w-7/12 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Subject</span>
                <input
                  value={subjectHint}
                  onChange={(event) => setSubjectHint(event.target.value)}
                  placeholder="What is in the image?"
                  className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Usage / Context</span>
                <input
                  value={contextHint}
                  onChange={(event) => setContextHint(event.target.value)}
                  placeholder="Marketplace listing, blog hero, gallery..."
                  className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
            </div>

            <div className="rounded border border-vault-200 bg-vault-50 p-3 text-sm text-vault-900 dark:border-vault-700 dark:bg-vault-950/40 dark:text-vault-100">
              <strong>What this tool actually does:</strong> it drafts copy from measurable image traits. Add a
              subject and intended use to turn the draft into something publishable.
            </div>

            <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-medium">Caption Draft</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                      onClick={handleDownloadManifest}
                      disabled={!analysis || !runtimeConfig}
                    >
                      Download Job
                    </button>
                    <button
                      type="button"
                      className="rounded bg-vault-200 px-3 py-1 text-xs font-semibold text-vault-900 hover:bg-vault-300 dark:bg-vault-800 dark:text-vault-100 dark:hover:bg-vault-700"
                    onClick={() => {
                      setCaptionDirty(false);
                      setCaptionDraft(buildCaptionDraft(analysis, subjectHint, contextHint));
                    }}
                    disabled={!analysis}
                  >
                    Rebuild Draft
                  </button>
                  <button
                    type="button"
                    className="rounded bg-vault-900 px-3 py-1 text-xs font-semibold text-white hover:bg-vault-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-vault-100 dark:text-vault-900 dark:hover:bg-vault-200"
                    onClick={handleCopyCaption}
                    disabled={!captionDraft}
                  >
                    {copyState || 'Copy'}
                  </button>
                </div>
              </div>
              <textarea
                value={captionDraft}
                onChange={(event) => {
                  setCaptionDraft(event.target.value);
                  setCaptionDirty(true);
                }}
                rows={4}
                placeholder="Select an image to generate a local draft."
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Suggested Tags</label>
              <div className="flex min-h-11 flex-wrap gap-2 rounded border border-dashed border-gray-300 p-3 dark:border-gray-700">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-vault-200 bg-vault-100 px-2 py-1 text-xs font-medium text-vault-800 dark:border-vault-700 dark:bg-vault-900/60 dark:text-vault-100"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Tags will appear after local analysis finishes.
                  </span>
                )}
              </div>
            </div>

            {selectedFile && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Source file: {selectedFile.name} ({selectedFile.type || 'image'})
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
