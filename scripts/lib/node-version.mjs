export function parseVersion(versionString) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(versionString ?? '');
  if (!match) {
    throw new Error(`Cannot parse Node version string: ${versionString}`);
  }
  const [, major, minor, patch] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

export function parseRequirement(requirement) {
  const match = /^(\d+)\.(\d+)\.(x|\d+)$/.exec(requirement ?? '');
  if (!match) {
    throw new Error(`Cannot parse Node version requirement: ${requirement}`);
  }
  const [, major, minor, patch] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: patch === 'x' ? null : Number(patch),
  };
}

export function checkNodeVersion(actualVersionString, requirement) {
  const actual = parseVersion(actualVersionString);
  const required = parseRequirement(requirement);

  const ok =
    actual.major === required.major &&
    actual.minor === required.minor &&
    (required.patch === null || actual.patch === required.patch);

  return {
    ok,
    message: ok
      ? `Node ${actualVersionString} satisfies ${requirement}.`
      : buildMismatchMessage(actualVersionString, requirement),
  };
}

function buildMismatchMessage(actualVersionString, requirement) {
  const pinned = requirement.replace(/\.x$/, '.0');
  return [
    `Node ${actualVersionString} does not satisfy the required version ${requirement}.`,
    '',
    'Install/switch to a matching version with:',
    `  macOS/Linux (nvm):     nvm install ${pinned} && nvm use ${pinned}`,
    `  Windows (nvm-windows): nvm install ${pinned} && nvm use ${pinned}`,
    '',
    'See https://github.com/nvm-sh/nvm or https://github.com/coreybutler/nvm-windows.',
  ].join('\n');
}
