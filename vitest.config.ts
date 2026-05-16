import { defineConfig, configDefaults, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig(async (env) => {
  const resolvedViteConfig = await (typeof viteConfig === 'function' ? viteConfig(env) : viteConfig)
  return mergeConfig(resolvedViteConfig, defineConfig({
    test: {
      exclude: [...configDefaults.exclude, 'tests/e2e/**']
    }
  }))
})
