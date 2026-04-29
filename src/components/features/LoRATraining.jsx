import React, { useEffect, useState, useMemo } from 'react';
import { FlowRuntimePanel } from '../ui/FlowRuntimePanel';
import { buildLoRAPlanManifest } from '../../lib/flowRuntime';

const steps = ['Dataset', 'Parameters', 'Plan & Validate', 'Export'];

const defaultParams = {
  conceptName: 'product style',
  triggerWord: 'vaultstyle',
  captionPrefix: 'photo of',
  learningRate: '0.0001',
  batchSize: '1',
  epochs: '12',
  repeats: '10',
  resolution: '1024',
  networkRank: '32',
  alpha: '16',
  dropout: '0.05',
  precision: 'fp16',
};

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function inferOrientation(width, height) {
  const ratio = width / height;

  if (ratio > 1.2) {
    return 'landscape';
  }

  if (ratio < 0.85) {
    return 'portrait';
  }

  return 'square-ish';
}

function cleanFilename(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\d{3,}\b/g, '')
    .trim();
}

function buildPromptSuggestion(item, params) {
  const prefix = params.captionPrefix.trim() || 'photo of';
  const tokenBits = [params.triggerWord.trim(), params.conceptName.trim()].filter(Boolean).join(' ');
  const subject = item.cleanedName || params.conceptName.trim() || 'training image';

  if (tokenBits) {
    return `${prefix} ${tokenBits}, ${subject}`;
  }

  return `${prefix} ${subject}`;
}

async function readImageMetadata(file, previewUrl, index) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      resolve({
        id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
        name: file.name,
        size: file.size,
        width: image.naturalWidth,
        height: image.naturalHeight,
        orientation: inferOrientation(image.naturalWidth, image.naturalHeight),
        previewUrl,
        cleanedName: cleanFilename(file.name),
      });
    };

    image.onerror = () => reject(new Error(`Could not read ${file.name}`));
    image.src = previewUrl;
  });
}

function buildDatasetSummary(items) {
  const totalSize = items.reduce((sum, item) => sum + item.size, 0);
  const totalWidth = items.reduce((sum, item) => sum + item.width, 0);
  const totalHeight = items.reduce((sum, item) => sum + item.height, 0);
  const orientationCounts = items.reduce((accumulator, item) => {
    accumulator[item.orientation] = (accumulator[item.orientation] || 0) + 1;
    return accumulator;
  }, {});

  return {
    imageCount: items.length,
    totalSize,
    averageWidth: Math.round(totalWidth / items.length),
    averageHeight: Math.round(totalHeight / items.length),
    smallestEdge: Math.min(...items.map((item) => Math.min(item.width, item.height))),
    orientationCounts,
  };
}

function buildPlan(items, params) {
  if (!items.length) {
    return null;
  }

  const summary = buildDatasetSummary(items);
  const learningRate = toNumber(params.learningRate, 0.0001);
  const batchSize = Math.max(1, Math.round(toNumber(params.batchSize, 1)));
  const epochs = Math.max(1, Math.round(toNumber(params.epochs, 12)));
  const repeats = Math.max(1, Math.round(toNumber(params.repeats, 10)));
  const resolution = Math.max(256, Math.round(toNumber(params.resolution, 1024)));
  const networkRank = Math.max(1, Math.round(toNumber(params.networkRank, 32)));
  const alpha = Math.max(1, Math.round(toNumber(params.alpha, 16)));
  const dropout = Math.max(0, toNumber(params.dropout, 0.05));

  const stepsPerEpoch = Math.ceil((summary.imageCount * repeats) / batchSize);
  const totalSteps = stepsPerEpoch * epochs;
  const workloadScore =
    (totalSteps * (resolution / 512) * (resolution / 512) * Math.max(networkRank / 16, 1)) / 1000;

  let workloadLabel = 'light';
  if (workloadScore > 18) {
    workloadLabel = 'heavy';
  } else if (workloadScore > 8) {
    workloadLabel = 'moderate';
  }

  const strengths = [];
  const warnings = [];
  const nextSteps = [];

  if (summary.imageCount >= 12 && summary.imageCount <= 40) {
    strengths.push('Dataset size is in a healthy range for a focused concept/style LoRA.');
  } else if (summary.imageCount < 12) {
    warnings.push('Very small dataset. Expect unstable results unless the concept is extremely narrow.');
    nextSteps.push('Add more angles, backgrounds, and lighting conditions before training.');
  } else {
    nextSteps.push('Large dataset detected. Consider trimming near-duplicates to keep the concept focused.');
  }

  if (summary.smallestEdge >= resolution) {
    strengths.push('All images are at or above the target resolution.');
  } else {
    warnings.push('Some images are smaller than the chosen training resolution and will be upscaled.');
    nextSteps.push('Lower the target resolution or replace undersized images.');
  }

  if (Object.keys(summary.orientationCounts).length === 1) {
    strengths.push('Image framing is consistent, which usually makes training more predictable.');
  } else {
    nextSteps.push('Mixed orientations detected. Bucketed training or consistent crops will help.');
  }

  if (learningRate > 0.0002) {
    warnings.push('Learning rate is aggressive for a small LoRA and may overfit quickly.');
  }

  if (networkRank > 64 && summary.imageCount < 25) {
    warnings.push('High network rank with a small dataset usually memorizes faster than it generalizes.');
  }

  if (alpha > networkRank) {
    warnings.push('Alpha is larger than rank. Most training stacks keep alpha at or below rank.');
  }

  if (dropout > 0.15) {
    warnings.push('Dropout is high for a compact concept LoRA and may wash out useful detail.');
  }

  if (!warnings.length) {
    strengths.push('No obvious red flags were found in the current parameter set.');
  }

  if (!nextSteps.length) {
    nextSteps.push('Review the generated captions CSV and replace any filename-derived prompts that are too vague.');
  }

  const starterCommand = [
    'accelerate launch train_network.py \\',
    '  --pretrained_model_name_or_path="/path/to/base-model" \\',
    '  --train_data_dir="/path/to/dataset" \\',
    '  --output_dir="./lora-output" \\',
    `  --resolution="${resolution},${resolution}" \\`,
    `  --train_batch_size=${batchSize} \\`,
    `  --max_train_epochs=${epochs} \\`,
    `  --learning_rate=${learningRate} \\`,
    `  --network_dim=${networkRank} \\`,
    `  --network_alpha=${alpha} \\`,
    `  --mixed_precision=${params.precision} \\`,
    '  --caption_extension=".txt"',
  ].join('\n');

  return {
    summary,
    numeric: {
      learningRate,
      batchSize,
      epochs,
      repeats,
      resolution,
      networkRank,
      alpha,
      dropout,
    },
    stepsPerEpoch,
    totalSteps,
    workloadLabel,
    strengths,
    warnings,
    nextSteps,
    starterCommand,
  };
}

function buildCaptionsCsv(items, params) {
  const header = 'filename,caption';
  const rows = items.map((item) => {
    const caption = buildPromptSuggestion(item, params).replace(/"/g, '""');
    return `"${item.name.replace(/"/g, '""')}","${caption}"`;
  });

  return [header, ...rows].join('\n');
}

function buildExportPayload(items, params) {
  const plan = buildPlan(items, params);
  if (!plan) {
    return null;
  }

  return {
    generatedAt: new Date().toISOString(),
    disclaimer:
      'This file was prepared in the browser. It validates dataset structure and exports starter config/captions, but it does not train a LoRA.',
    params: {
      ...plan.numeric,
      conceptName: params.conceptName.trim(),
      triggerWord: params.triggerWord.trim(),
      captionPrefix: params.captionPrefix.trim(),
      precision: params.precision,
    },
    summary: plan.summary,
    strengths: plan.strengths,
    warnings: plan.warnings,
    nextSteps: plan.nextSteps,
    starterCommand: plan.starterCommand,
    dataset: items.map((item) => ({
      name: item.name,
      width: item.width,
      height: item.height,
      orientation: item.orientation,
      size: item.size,
      caption: buildPromptSuggestion(item, params),
    })),
  };
}

export default function LoRATraining() {
  const [step, setStep] = useState(0);
  const [datasetItems, setDatasetItems] = useState([]);
  const [params, setParams] = useState(defaultParams);
  const [status, setStatus] = useState({ loading: false, error: '' });
  const [downloadUrls, setDownloadUrls] = useState({ plan: '', captions: '' });
  const [runtimeConfig, setRuntimeConfig] = useState(null);

  useEffect(() => {
    return () => {
      datasetItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [datasetItems]);

  useEffect(() => {
    if (!datasetItems.length) {
      setDownloadUrls({ plan: '', captions: '' });
      return undefined;
    }

    const payload = buildExportPayload(datasetItems, params);
    const captionsCsv = buildCaptionsCsv(datasetItems, params);

    if (!payload) {
      setDownloadUrls({ plan: '', captions: '' });
      return undefined;
    }

    const plan = buildPlan(datasetItems, params);
    const planPayload = runtimeConfig
      ? buildLoRAPlanManifest({ config: runtimeConfig, plan, payload })
      : payload;

    const planUrl = URL.createObjectURL(
      new Blob([JSON.stringify(planPayload, null, 2)], { type: 'application/json' }),
    );
    const captionsUrl = URL.createObjectURL(new Blob([captionsCsv], { type: 'text/csv' }));

    setDownloadUrls({ plan: planUrl, captions: captionsUrl });

    return () => {
      URL.revokeObjectURL(planUrl);
      URL.revokeObjectURL(captionsUrl);
    };
  }, [datasetItems, params, runtimeConfig]);

  async function handleDatasetUpload(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setStatus({ loading: true, error: '' });

    try {
      const nextItems = await Promise.all(
        files.map(async (file, index) => {
          const previewUrl = URL.createObjectURL(file);
          return readImageMetadata(file, previewUrl, index);
        }),
      );

      setDatasetItems(nextItems);
    } catch (error) {
      setStatus({ loading: false, error: error.message || 'Could not prepare the dataset locally.' });
      return;
    }

    setStatus({ loading: false, error: '' });
  }

  function handleParamChange(event) {
    const { name, value } = event.target;
    setParams((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // ⚡ Bolt: Memoize expensive dataset calculations to prevent redundant looping
  // over dataset items on every render (e.g., when switching UI tabs).
  const plan = useMemo(() => buildPlan(datasetItems, params), [datasetItems, params]);
  const payload = useMemo(() => buildExportPayload(datasetItems, params), [datasetItems, params]);
  const datasetSummary = useMemo(() => datasetItems.length ? buildDatasetSummary(datasetItems) : null, [datasetItems]);

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded shadow mt-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">LoRA Dataset & Training Planner</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Frontend-only prep workspace. It organizes image metadata, validates a parameter set, and exports
          starter config files for real training tools. It does not run LoRA training in the browser.
        </p>
      </div>

      <div className="mb-4">
        <FlowRuntimePanel
          flowId="loraTraining"
          title="LoRA Runtime"
          description="Pick the exact local base checkpoint you want this exported plan to target."
          onConfigChange={setRuntimeConfig}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {steps.map((stepName, index) => (
          <button
            key={stepName}
            type="button"
            className={`rounded px-3 py-1 text-sm font-semibold ${
              index === step
                ? 'bg-vault-900 text-white dark:bg-vault-100 dark:text-vault-900'
                : 'bg-vault-100 text-vault-900 hover:bg-vault-200 dark:bg-vault-800 dark:text-vault-100 dark:hover:bg-vault-700'
            }`}
            onClick={() => setStep(index)}
          >
            {stepName}
          </button>
        ))}
      </div>

      {status.error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {status.error}
        </div>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <div className="rounded border border-vault-200 bg-vault-50 p-3 text-sm text-vault-900 dark:border-vault-700 dark:bg-vault-950/40 dark:text-vault-100">
            Upload training images to build a local manifest. Filenames are turned into starter captions, so
            clean names help.
          </div>

          <input type="file" multiple accept="image/*" onChange={handleDatasetUpload} />

          {status.loading && <div className="text-sm text-vault-700 dark:text-vault-200">Reading image metadata...</div>}

          {datasetSummary && (
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Images</div>
                <div className="font-semibold">{datasetSummary.imageCount}</div>
              </div>
              <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Dataset Size</div>
                <div className="font-semibold">{formatFileSize(datasetSummary.totalSize)}</div>
              </div>
              <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Average Resolution</div>
                <div className="font-semibold">
                  {datasetSummary.averageWidth} × {datasetSummary.averageHeight}
                </div>
              </div>
              <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Orientation Mix</div>
                <div className="font-semibold">
                  {Object.entries(datasetSummary.orientationCounts)
                    .map(([name, count]) => `${name}: ${count}`)
                    .join(' • ')}
                </div>
              </div>
            </div>
          )}

          {datasetItems.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {datasetItems.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded border border-gray-200 p-3 dark:border-gray-700">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="mb-3 h-40 w-full rounded object-cover"
                  />
                  <div className="text-sm font-semibold">{item.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {item.width} × {item.height} • {formatFileSize(item.size)} • {item.orientation}
                  </div>
                  <div className="mt-2 rounded bg-gray-100 p-2 text-xs dark:bg-gray-800">
                    {buildPromptSuggestion(item, params)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Concept Name</span>
              <input
                name="conceptName"
                value={params.conceptName}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Trigger Word</span>
              <input
                name="triggerWord"
                value={params.triggerWord}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Caption Prefix</span>
              <input
                name="captionPrefix"
                value={params.captionPrefix}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Learning Rate</span>
              <input
                type="number"
                step="0.00001"
                name="learningRate"
                value={params.learningRate}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Batch Size</span>
              <input
                type="number"
                step="1"
                name="batchSize"
                value={params.batchSize}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Epochs</span>
              <input
                type="number"
                step="1"
                name="epochs"
                value={params.epochs}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Repeats</span>
              <input
                type="number"
                step="1"
                name="repeats"
                value={params.repeats}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Resolution</span>
              <input
                type="number"
                step="64"
                name="resolution"
                value={params.resolution}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Network Rank</span>
              <input
                type="number"
                step="1"
                name="networkRank"
                value={params.networkRank}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Alpha</span>
              <input
                type="number"
                step="1"
                name="alpha"
                value={params.alpha}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Dropout</span>
              <input
                type="number"
                step="0.01"
                name="dropout"
                value={params.dropout}
                onChange={handleParamChange}
                className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
          </div>

          <label className="block max-w-xs">
            <span className="mb-1 block text-sm font-medium">Precision</span>
            <select
              name="precision"
              value={params.precision}
              onChange={handleParamChange}
              className="w-full rounded border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="fp16">fp16</option>
              <option value="bf16">bf16</option>
              <option value="fp32">fp32</option>
            </select>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          {!plan ? (
            <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Upload a dataset first. This panel needs real image metadata before it can produce a training plan.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Steps / Epoch</div>
                  <div className="font-semibold">{plan.stepsPerEpoch}</div>
                </div>
                <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Steps</div>
                  <div className="font-semibold">{plan.totalSteps}</div>
                </div>
                <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Workload</div>
                  <div className="font-semibold">{plan.workloadLabel}</div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
                  <div className="mb-2 text-sm font-semibold text-green-800 dark:text-green-200">What looks good</div>
                  <ul className="space-y-2 text-sm text-green-900 dark:text-green-100">
                    {plan.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                  <div className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">Watchouts</div>
                  <ul className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
                    {plan.warnings.length ? (
                      plan.warnings.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>No obvious issues surfaced from the current settings.</li>
                    )}
                  </ul>
                </div>

                <div className="rounded border border-vault-200 bg-vault-50 p-4 dark:border-vault-800 dark:bg-vault-950/30">
                  <div className="mb-2 text-sm font-semibold text-vault-900 dark:text-vault-100">Before real training</div>
                  <ul className="space-y-2 text-sm text-vault-900 dark:text-vault-100">
                    {plan.nextSteps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold">Starter command</div>
                <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                  {plan.starterCommand}
                </pre>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  This is a starting template for external trainers such as kohya_ss or equivalent diffusers
                  scripts. Paths, base model, and data loader details still need to be set in your real stack.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {!payload ? (
            <div className="rounded border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300">
              Add a dataset first. Export files are generated from the uploaded image metadata.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-3">
                <a
                  href={downloadUrls.plan}
                  download="vault-lora-plan.json"
                  className="rounded bg-vault-900 px-4 py-2 text-sm font-semibold text-white hover:bg-vault-800 dark:bg-vault-100 dark:text-vault-900 dark:hover:bg-vault-200"
                >
                  Download Plan JSON
                </a>
                <a
                  href={downloadUrls.captions}
                  download="vault-lora-captions.csv"
                  className="rounded bg-vault-200 px-4 py-2 text-sm font-semibold text-vault-900 hover:bg-vault-300 dark:bg-vault-800 dark:text-vault-100 dark:hover:bg-vault-700"
                >
                  Download Captions CSV
                </a>
              </div>

              <div className="rounded border border-vault-200 bg-vault-50 p-3 text-sm text-vault-900 dark:border-vault-700 dark:bg-vault-950/40 dark:text-vault-100">
                Export contains: dataset manifest, parameter snapshot, validation notes, and starter command. It
                is a handoff package for real training, not a trained LoRA.
              </div>

              <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-3 text-xs dark:bg-gray-800">
                {JSON.stringify(payload, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
