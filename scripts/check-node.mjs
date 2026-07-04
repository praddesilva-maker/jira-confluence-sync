#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkNodeVersion } from './lib/node-version.mjs';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const requirement = pkg.engines?.node;

if (!requirement) {
  console.error('package.json is missing an engines.node requirement — cannot check.');
  process.exit(1);
}

const result = checkNodeVersion(process.version, requirement);

if (!result.ok) {
  console.error(result.message);
  process.exit(1);
}

console.log(`Node ${process.version} OK (requires ${requirement}).`);
