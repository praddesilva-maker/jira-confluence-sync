import { randomUUID } from 'node:crypto';
import { asUser, route } from '@forge/api';
import { kvs, WhereConditions } from '@forge/kvs';
import type Resolver from '@forge/resolver';
import { parseConfluencePageUrl } from '../domain/confluence-url';
import { checkPairCoverage, validateHierarchyMapping } from '../domain/hierarchy';
import type {
  HierarchyMapping,
  HierarchyMappingInput,
  HierarchyOption,
  HierarchyOptionsByRole,
  PairConfig,
  RootLevel,
} from '../domain/model';

const GLOBAL_CONFIG_KEY = 'config:global';
const PAIR_KEY_PREFIX = 'config:pair:';

interface TypedError {
  code: string;
  message: string;
}

type Result<T> = { ok: true; value: T } | { ok: false; error: TypedError };

/** Jira Cloud issue-type shape, trimmed to the fields this resolver uses. */
interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
  hierarchyLevel: number;
}

/**
 * Groups the site's issue types by hierarchy role. Jira's hierarchyLevel:
 * -1 = subtask, 0 = base level (both Story and Task live here — the "Type"
 * column, not the level, tells them apart, per Q3), 1 = Epic, 2 = the first
 * Premium level above Epic (assumed "Feature" in this app's fixed 4-role
 * model), 3 = the second Premium level (assumed "Initiative"). Levels above
 * Epic legitimately don't exist on Standard/Free sites — an empty array for
 * those roles is valid data, not an error (CR-001, ADR-004).
 */
export async function getHierarchyOptions(): Promise<HierarchyOptionsByRole> {
  const response = await asUser().requestJira(route`/rest/api/3/issuetype`);
  const issueTypes = (await response.json()) as JiraIssueType[];

  const baseLevel = issueTypes.filter((t) => !t.subtask && t.hierarchyLevel === 0);

  return {
    initiative: toOptions(issueTypes.filter((t) => t.hierarchyLevel === 3)),
    feature: toOptions(issueTypes.filter((t) => t.hierarchyLevel === 2)),
    epic: toOptions(issueTypes.filter((t) => t.hierarchyLevel === 1)),
    story: toOptions(baseLevel),
    task: toOptions(baseLevel),
  };
}

function toOptions(issueTypes: JiraIssueType[]): HierarchyOption[] {
  return issueTypes.map((t) => ({ id: t.id, name: t.name }));
}

export async function saveHierarchyMapping(input: HierarchyMappingInput): Promise<Result<HierarchyMapping>> {
  const validated = validateHierarchyMapping(input);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  await kvs.set(GLOBAL_CONFIG_KEY, validated.mapping);
  return { ok: true, value: validated.mapping };
}

export async function getConfig(): Promise<{ mapping: HierarchyMapping | undefined; pairs: PairConfig[] }> {
  const [mapping, pairs] = await Promise.all([
    kvs.get<HierarchyMapping>(GLOBAL_CONFIG_KEY),
    listPairs(),
  ]);
  return { mapping, pairs };
}

export interface SavePairInput {
  confluencePageUrl: string;
  jiraRootKey: string;
  rootLevel: RootLevel;
}

export async function savePair(
  input: SavePairInput,
  context: { siteUrl?: string } = {},
): Promise<Result<PairConfig>> {
  const mapping = await kvs.get<HierarchyMapping>(GLOBAL_CONFIG_KEY);
  if (!mapping) {
    return {
      ok: false,
      error: { code: 'NO_MAPPING', message: 'Save a hierarchy mapping before registering a pair.' },
    };
  }

  const coverage = checkPairCoverage(mapping, input.rootLevel);
  if (!coverage.ok) {
    return { ok: false, error: coverage.error };
  }

  const expectedHost = context.siteUrl ? new URL(context.siteUrl).host : undefined;
  const urlResult = parseConfluencePageUrl(input.confluencePageUrl, expectedHost);
  if (!urlResult.ok) {
    return { ok: false, error: urlResult.error };
  }

  const pageResponse = await asUser().requestConfluence(route`/wiki/api/v2/pages/${urlResult.pageId}`);
  if (!pageResponse.ok) {
    return {
      ok: false,
      error: {
        code: 'PAGE_NOT_FOUND',
        message: `Confluence page ${urlResult.pageId} could not be found (status ${pageResponse.status}).`,
      },
    };
  }

  const mappedType = mapping[input.rootLevel];
  const issueResponse = await asUser().requestJira(
    route`/rest/api/3/issue/${input.jiraRootKey}?fields=issuetype`,
  );
  if (!issueResponse.ok) {
    return {
      ok: false,
      error: {
        code: 'ISSUE_NOT_FOUND',
        message: `Jira issue ${input.jiraRootKey} could not be found (status ${issueResponse.status}).`,
      },
    };
  }
  const issue = (await issueResponse.json()) as { fields: { issuetype: { id: string; name: string } } };
  if (issue.fields.issuetype.id !== mappedType) {
    return {
      ok: false,
      error: {
        code: 'TYPE_MISMATCH',
        message:
          `${input.jiraRootKey} is a "${issue.fields.issuetype.name}", but the mapping for root level ` +
          `"${input.rootLevel}" expects a different issue type.`,
      },
    };
  }

  const pair: PairConfig = { id: randomUUID(), ...input };
  await kvs.set(`${PAIR_KEY_PREFIX}${pair.id}`, pair);
  return { ok: true, value: pair };
}

export async function listPairs(): Promise<PairConfig[]> {
  const result = await kvs
    .query()
    .where('key', WhereConditions.beginsWith(PAIR_KEY_PREFIX))
    .getMany<PairConfig>();
  return result.results.map((row) => row.value);
}

export async function deletePair(input: { id: string }): Promise<void> {
  await kvs.delete(`${PAIR_KEY_PREFIX}${input.id}`);
}

export function registerConfigResolvers(resolver: Resolver): void {
  resolver.define('getHierarchyOptions', () => getHierarchyOptions());
  resolver.define('saveHierarchyMapping', (req) => saveHierarchyMapping(req.payload));
  resolver.define('savePair', (req) => savePair(req.payload, req.context));
  resolver.define('listPairs', () => listPairs());
  resolver.define('deletePair', (req) => deletePair(req.payload));
  resolver.define('getConfig', () => getConfig());
}
