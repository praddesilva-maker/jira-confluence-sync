import { readFileSync } from 'node:fs';

export class DeployConfigError extends Error {}
export class ConfigFileNotFoundError extends DeployConfigError {}
export class ConfigParseError extends DeployConfigError {}
export class InvalidConfigShapeError extends DeployConfigError {}
export class UnknownEnvironmentError extends DeployConfigError {}
export class UnknownSiteError extends DeployConfigError {}

export function loadDeployConfig(filePath) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new ConfigFileNotFoundError(
        `Deploy config not found at ${filePath}. Copy deploy.config.example.json to ` +
          `${filePath} and fill in your site(s) — see README "Deploying".`,
      );
    }
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new ConfigParseError(`Deploy config at ${filePath} is not valid JSON: ${err.message}`);
  }

  return validateDeployConfig(parsed, filePath);
}

export function validateDeployConfig(config, sourceLabel = 'deploy config') {
  if (typeof config !== 'object' || config === null || Array.isArray(config)) {
    throw new InvalidConfigShapeError(`${sourceLabel} must be a JSON object.`);
  }
  if (typeof config.environments !== 'object' || config.environments === null) {
    throw new InvalidConfigShapeError(`${sourceLabel} must have a top-level "environments" object.`);
  }

  for (const [envName, env] of Object.entries(config.environments)) {
    if (typeof env !== 'object' || env === null || !Array.isArray(env.sites)) {
      throw new InvalidConfigShapeError(
        `${sourceLabel}: environment "${envName}" must have a "sites" array.`,
      );
    }
    for (const [index, site] of env.sites.entries()) {
      if (
        !site ||
        typeof site.name !== 'string' ||
        typeof site.url !== 'string' ||
        !Array.isArray(site.products) ||
        site.products.length === 0
      ) {
        throw new InvalidConfigShapeError(
          `${sourceLabel}: environment "${envName}" site at index ${index} must have a ` +
            `"name" (string), "url" (string), and a non-empty "products" array.`,
        );
      }
    }
  }

  return config;
}

export function resolveSites(config, envName, siteName) {
  const env = config.environments?.[envName];
  if (!env) {
    const known = Object.keys(config.environments ?? {}).join(', ') || '(none configured)';
    throw new UnknownEnvironmentError(`Unknown environment "${envName}". Known environments: ${known}.`);
  }

  if (siteName === undefined) {
    return env.sites;
  }

  const site = env.sites.find((candidate) => candidate.name === siteName);
  if (!site) {
    const known = env.sites.map((candidate) => candidate.name).join(', ') || '(none configured)';
    throw new UnknownSiteError(
      `Unknown site "${siteName}" in environment "${envName}". Known sites: ${known}.`,
    );
  }
  return [site];
}

export function siteHostname(site) {
  return site.url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}
