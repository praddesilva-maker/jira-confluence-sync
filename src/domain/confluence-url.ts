export interface UrlParseError {
  code: 'INVALID_URL' | 'WRONG_SITE';
  message: string;
}

export type UrlParseResult = { ok: true; pageId: string } | { ok: false; error: UrlParseError };

const PAGE_PATH_PATTERN = /\/wiki\/spaces\/[^/]+\/pages\/(\d+)(?:\/|$)/;

/**
 * Parses a Confluence page URL to its pageId. Supports both the "pretty" form
 * (.../wiki/spaces/<KEY>/pages/<id>/<title-slug>) and the plain
 * .../pages/<id> form, with or without a trailing slash.
 *
 * @param expectedHost if provided, the URL's host must match exactly — used
 *   to reject a pair pointing at a different Atlassian site.
 */
export function parseConfluencePageUrl(url: string, expectedHost?: string): UrlParseResult {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      ok: false,
      error: { code: 'INVALID_URL', message: `"${url}" is not a valid URL.` },
    };
  }

  if (expectedHost !== undefined && parsed.host !== expectedHost) {
    return {
      ok: false,
      error: {
        code: 'WRONG_SITE',
        message: `URL host "${parsed.host}" does not match this installation's site ("${expectedHost}").`,
      },
    };
  }

  const match = PAGE_PATH_PATTERN.exec(parsed.pathname);
  const pageId = match?.[1];
  if (!pageId) {
    return {
      ok: false,
      error: {
        code: 'INVALID_URL',
        message: `"${url}" doesn't look like a Confluence page URL (expected .../wiki/spaces/<KEY>/pages/<id>/...).`,
      },
    };
  }

  return { ok: true, pageId };
}
