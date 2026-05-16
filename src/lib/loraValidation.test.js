import { describe, it, expect } from 'vitest';
import { validateLoraTrainingConfig } from './loraValidation';

describe('validateLoraTrainingConfig', () => {
  it('throws if config is missing', () => {
    expect(() => validateLoraTrainingConfig()).toThrow('Config is required for LoRA training.');
  });

  it('sets default batchSize and resolution if omitted', () => {
    const config = validateLoraTrainingConfig({ epochs: 10 });
    expect(config.batchSize).toBe(1);
    expect(config.resolution).toBe(512);
    expect(config.epochs).toBe(10);
  });

  it('validates batchSize limit correctly', () => {
    expect(() => validateLoraTrainingConfig({ batchSize: 5 })).toThrow(/batchSize exceeds maximum allowed limit/);
  });

  it('validates resolution limit correctly', () => {
    expect(() => validateLoraTrainingConfig({ resolution: 2048 })).toThrow(/resolution exceeds maximum allowed limit/);
  });

  it('validates networkDim correctly including 0', () => {
    expect(() => validateLoraTrainingConfig({ networkDim: 0 })).toThrow(/networkDim must be between/);
    expect(() => validateLoraTrainingConfig({ networkDim: 3 })).toThrow(/networkDim must be between/);
    expect(() => validateLoraTrainingConfig({ networkDim: 256 })).toThrow(/networkDim must be between/);

    // Valid values shouldn't throw
    expect(() => validateLoraTrainingConfig({ networkDim: 64 })).not.toThrow();
  });

  it('allows valid inputs', () => {
    const validConfig = {
      batchSize: 2,
      resolution: 768,
      epochs: 50,
      networkDim: 32
    };

    const result = validateLoraTrainingConfig(validConfig);
    expect(result).toEqual(validConfig);
  });
});
