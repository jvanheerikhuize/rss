import { readFileSync, existsSync } from 'fs';
import { parse } from 'toml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      target[key] = target[key] || {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

function loadToml(path) {
  if (!existsSync(path)) return {};
  return parse(readFileSync(path, 'utf-8'));
}

function applyEnvOverrides(config) {
  const mapping = {
    RSS_SERVER_PORT: (v) => { config.server.port = parseInt(v, 10); },
    RSS_SERVER_HOST: (v) => { config.server.host = v; },
    RSS_DATABASE_PATH: (v) => { config.database.path = v; },
    RSS_AI_ENABLED: (v) => { config.ai.enabled = v === 'true'; },
    RSS_AI_OLLAMA_URL: (v) => { config.ai.ollama_url = v; },
    RSS_AI_MODEL: (v) => { config.ai.model = v; },
  };

  for (const [env, apply] of Object.entries(mapping)) {
    if (process.env[env]) apply(process.env[env]);
  }
  return config;
}

const defaults = loadToml(join(root, 'config.default.toml'));
const userConfig = loadToml(join(root, 'config.toml'));
const config = applyEnvOverrides(deepMerge(defaults, userConfig));

export default config;
