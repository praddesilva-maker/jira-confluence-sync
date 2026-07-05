import { spawn } from 'node:child_process';

const FORGE_INVOCATION = ['--yes', '--package=@forge/cli', 'forge'];

function spawnNpx(args, { capture }) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', [...FORGE_INVOCATION, ...args], {
      // npm-installed binaries are .cmd/.ps1 shims on Windows; child_process.spawn
      // can't resolve them without shell:true there. POSIX doesn't need it, but
      // shell:true is harmless there since args are still passed as an array.
      shell: process.platform === 'win32',
      stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    });

    let stdout = '';
    let stderr = '';

    if (capture) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
        process.stdout.write(chunk);
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
        process.stderr.write(chunk);
      });
    }

    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function runForge(args) {
  const { code } = await spawnNpx(args, { capture: false });
  return code;
}

export async function runForgeCaptured(args) {
  return spawnNpx(args, { capture: true });
}
