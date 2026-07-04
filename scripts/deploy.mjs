#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNodeVersion } from './lib/node-version.mjs';
import { loadDeployConfig, resolveSites, siteHostname } from './lib/deploy-config.mjs';
import { runForge, runForgeCaptured } from './lib/forge-cli.mjs';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseCliArgs(argv) {
  const { values } = parseArgs({
    args: argv,
    options: {
      env: { type: 'string' },
      site: { type: 'string' },
      yes: { type: 'boolean', default: false },
    },
  });

  if (values.env !== 'development' && values.env !== 'production') {
    throw new Error('Usage: deploy.mjs --env development|production [--site <name>] [--yes]');
  }

  return { env: values.env, site: values.site, yes: values.yes };
}

async function confirmProductionDeploy() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question('Type "production" to confirm this deploy: ');
    return answer.trim() === 'production';
  } finally {
    rl.close();
  }
}

async function installOneTarget({ env, hostname, product }) {
  const baseArgs = [
    'install',
    '-e',
    env,
    '-s',
    hostname,
    '-p',
    product,
    '--confirm-scopes',
    '--non-interactive',
  ];

  let { code, stderr } = await runForgeCaptured(baseArgs);

  if (code !== 0 && /already installed/i.test(stderr)) {
    ({ code, stderr } = await runForgeCaptured([...baseArgs, '--upgrade']));
  }

  if (code === 0) {
    return { ok: true, detail: '' };
  }

  if (/permission|not authorized|forbidden|\badmin\b/i.test(stderr)) {
    return {
      ok: false,
      detail:
        'deploy succeeded; install requires site admin — use the installation-link path ' +
        '(see README: Client onboarding)',
    };
  }

  return { ok: false, detail: `install failed (exit ${code}) — see output above` };
}

function printSummary(results) {
  console.log('\n== Install summary ==');
  const siteWidth = Math.max(4, ...results.map((r) => r.site.length));
  const productWidth = Math.max(7, ...results.map((r) => r.product.length));
  for (const r of results) {
    const status = r.ok ? 'OK' : 'FAILED';
    console.log(
      `${r.site.padEnd(siteWidth)}  ${r.product.padEnd(productWidth)}  ${status.padEnd(6)}  ${r.detail}`,
    );
  }
}

async function main() {
  const { env, site: siteName, yes } = parseCliArgs(process.argv.slice(2));

  const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const nodeCheck = checkNodeVersion(process.version, pkg.engines?.node);
  if (!nodeCheck.ok) {
    console.error(nodeCheck.message);
    process.exit(1);
  }

  const configPath = path.join(repoRoot, 'deploy.config.json');
  const config = loadDeployConfig(configPath);
  const sites = resolveSites(config, env, siteName);

  if (env === 'production' && !yes) {
    const confirmed = await confirmProductionDeploy();
    if (!confirmed) {
      console.error('Aborted: production deploy requires typed confirmation (or --yes in CI).');
      process.exit(1);
    }
  }

  console.log('\n== forge lint ==');
  const lintCode = await runForge(['lint']);
  if (lintCode !== 0) {
    console.error('forge lint failed — fix the errors above before deploying.');
    process.exit(lintCode);
  }

  console.log(`\n== forge deploy -e ${env} ==`);
  const deployCode = await runForge(['deploy', '-e', env, '--non-interactive']);
  if (deployCode !== 0) {
    console.error(`forge deploy failed (exit ${deployCode}). No installs attempted.`);
    process.exit(deployCode);
  }

  const results = [];
  for (const targetSite of sites) {
    const hostname = siteHostname(targetSite);
    for (const product of targetSite.products) {
      console.log(`\n== forge install: ${targetSite.name} (${hostname}) / ${product} ==`);
      const result = await installOneTarget({ env, hostname, product });
      results.push({ site: targetSite.name, product, ...result });
    }
  }

  printSummary(results);
  process.exit(results.some((r) => !r.ok) ? 1 : 0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
