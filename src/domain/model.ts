export type ItemType = 'initiative' | 'feature' | 'epic' | 'story' | 'task';

/** Levels a pair may be rooted at — epic is the floor (CR-001, ADR-004). */
export type RootLevel = 'initiative' | 'feature' | 'epic';

/** Canonical top-to-bottom order of every hierarchy role, including the leaf pair. */
export const ROLE_ORDER: readonly ItemType[] = ['initiative', 'feature', 'epic', 'story', 'task'];

export interface ADFDoc {
  type: 'doc';
  version: number;
  content: unknown[];
}

export interface WorkItem {
  itemType: ItemType;
  jiraKey: string | null; // null = new item (Confluence side only)
  summary: string;
  description: {
    adf: ADFDoc; // preserved verbatim for writes
    text: string; // normalised plain text for diffing/LLM
  };
  parentKey: string | null; // Jira key of parent
  origin: JiraLocator | ConfluenceLocator;
}

export interface JiraLocator {
  source: 'jira';
  issueId: string;
}

export interface ConfluenceLocator {
  source: 'confluence';
  pageId: string;
  pageVersion: number;
  tableIndex?: number;
  rowIndex?: number; // undefined for page-level items
}

/**
 * The user-submitted candidate mapping, before contiguity/uniqueness validation.
 * Any role may be omitted; `validateHierarchyMapping` decides whether what's
 * present forms a valid shape.
 */
export type HierarchyMappingInput = Partial<Record<ItemType, string>>;

/**
 * A validated, site-global hierarchy mapping (config:global). epic/story/task
 * are always present — that's the minimum valid shape (CR-001, ADR-004);
 * feature/initiative are optional prefix extensions above it.
 */
export interface HierarchyMapping {
  epic: string;
  story: string;
  task: string;
  feature?: string;
  initiative?: string;
}

export interface PairConfig {
  id: string;
  confluencePageUrl: string;
  jiraRootKey: string;
  rootLevel: RootLevel;
}

/** One selectable Jira issue type, as offered for a given hierarchy role. */
export interface HierarchyOption {
  id: string;
  name: string;
}

/**
 * The site's issue types grouped by role (from getHierarchyOptions). A role
 * with an empty array means that level legitimately doesn't exist on this
 * site's tier (CR-001, ADR-004) — valid data, not an error.
 */
export type HierarchyOptionsByRole = Record<ItemType, HierarchyOption[]>;
