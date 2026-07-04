import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ConfigFileNotFoundError,
  ConfigParseError,
  InvalidConfigShapeError,
  UnknownEnvironmentError,
  UnknownSiteError,
  loadDeployConfig,
  resolveSites,
  siteHostname,
  validateDeployConfig,
} from './deploy-config.mjs';

const validConfig = {
  environments: {
    development: {
      sites: [
        {
          name: 'prad-personal',
          url: 'https://pradeep-de-silva.atlassian.net',
          products: ['jira', 'confluence'],
        },
      ],
    },
    production: { sites: [] },
  },
};

describe('loadDeployConfig', () => {
  let dir;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'deploy-config-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('throws ConfigFileNotFoundError when the file is missing', () => {
    const missingPath = path.join(dir, 'deploy.config.json');
    expect(() => loadDeployConfig(missingPath)).toThrow(ConfigFileNotFoundError);
  });

  it('throws ConfigParseError for malformed JSON', () => {
    const badPath = path.join(dir, 'deploy.config.json');
    writeFileSync(badPath, '{ not valid json');
    expect(() => loadDeployConfig(badPath)).toThrow(ConfigParseError);
  });

  it('loads and returns a well-formed config', () => {
    const goodPath = path.join(dir, 'deploy.config.json');
    writeFileSync(goodPath, JSON.stringify(validConfig));
    expect(loadDeployConfig(goodPath)).toEqual(validConfig);
  });
});

describe('validateDeployConfig', () => {
  it('rejects a config with no environments object', () => {
    expect(() => validateDeployConfig({})).toThrow(InvalidConfigShapeError);
  });

  it('rejects an environment without a sites array', () => {
    expect(() => validateDeployConfig({ environments: { development: {} } })).toThrow(
      InvalidConfigShapeError,
    );
  });

  it('rejects a site missing required fields', () => {
    const config = { environments: { development: { sites: [{ name: 'x' }] } } };
    expect(() => validateDeployConfig(config)).toThrow(InvalidConfigShapeError);
  });

  it('accepts a well-formed config', () => {
    expect(() => validateDeployConfig(validConfig)).not.toThrow();
  });
});

describe('resolveSites', () => {
  it('throws UnknownEnvironmentError for an unconfigured environment', () => {
    expect(() => resolveSites(validConfig, 'staging')).toThrow(UnknownEnvironmentError);
  });

  it('throws UnknownSiteError for an unknown --site name', () => {
    expect(() => resolveSites(validConfig, 'development', 'nope')).toThrow(UnknownSiteError);
  });

  it('returns all sites for an environment when no site name is given', () => {
    expect(resolveSites(validConfig, 'development')).toEqual(validConfig.environments.development.sites);
  });

  it('returns only the matching site when a site name is given', () => {
    const result = resolveSites(validConfig, 'development', 'prad-personal');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('prad-personal');
  });
});

describe('siteHostname', () => {
  it('strips the protocol and trailing slash', () => {
    expect(siteHostname({ url: 'https://example.atlassian.net/' })).toBe('example.atlassian.net');
  });

  it('leaves a bare hostname unchanged', () => {
    expect(siteHostname({ url: 'example.atlassian.net' })).toBe('example.atlassian.net');
  });
});
