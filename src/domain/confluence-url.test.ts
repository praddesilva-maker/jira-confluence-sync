import { describe, expect, it } from 'vitest';
import { parseConfluencePageUrl } from './confluence-url';

const HOST = 'pradeep-de-silva.atlassian.net';

describe('parseConfluencePageUrl', () => {
  it('parses a pretty URL with a title slug', () => {
    const result = parseConfluencePageUrl(
      `https://${HOST}/wiki/spaces/ADT/pages/123456789/Initiative+Title`,
    );
    expect(result).toEqual({ ok: true, pageId: '123456789' });
  });

  it('parses a plain /pages/<id> URL with no trailing slash', () => {
    const result = parseConfluencePageUrl(`https://${HOST}/wiki/spaces/ADT/pages/123456789`);
    expect(result).toEqual({ ok: true, pageId: '123456789' });
  });

  it('parses a /pages/<id>/ URL with a trailing slash and no title', () => {
    const result = parseConfluencePageUrl(`https://${HOST}/wiki/spaces/ADT/pages/123456789/`);
    expect(result).toEqual({ ok: true, pageId: '123456789' });
  });

  it('rejects a malformed URL', () => {
    const result = parseConfluencePageUrl('not a url');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_URL');
  });

  it('rejects a well-formed URL that is not a Confluence page', () => {
    const result = parseConfluencePageUrl(`https://${HOST}/wiki/spaces/ADT/overview`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_URL');
  });

  it('rejects a URL from a different site when expectedHost is given', () => {
    const result = parseConfluencePageUrl(
      'https://someone-elses-site.atlassian.net/wiki/spaces/ADT/pages/123456789/Title',
      HOST,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('WRONG_SITE');
  });

  it('accepts a matching-site URL when expectedHost is given', () => {
    const result = parseConfluencePageUrl(
      `https://${HOST}/wiki/spaces/ADT/pages/123456789/Title`,
      HOST,
    );
    expect(result).toEqual({ ok: true, pageId: '123456789' });
  });
});
