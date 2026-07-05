import type { HierarchyMapping, HierarchyMappingInput, ItemType, RootLevel } from './model';
import { ROLE_ORDER } from './model';

export interface MappingValidationError {
  code: 'GAP' | 'DUPLICATE_TYPE';
  message: string;
}

export type MappingValidationResult =
  | { ok: true; mapping: HierarchyMapping }
  | { ok: false; error: MappingValidationError };

/**
 * The only three shapes a mapping may take: a contiguous run from some top
 * role down through the leaf pair (story, task), which is always required
 * together. Matches CR-001/ADR-004's rootLevel options exactly.
 */
const VALID_ROLE_SHAPES: readonly ItemType[][] = [
  ['epic', 'story', 'task'],
  ['feature', 'epic', 'story', 'task'],
  ['initiative', 'feature', 'epic', 'story', 'task'],
];

function presentRoles(input: HierarchyMappingInput): ItemType[] {
  return ROLE_ORDER.filter((role) => {
    const value = input[role];
    return value !== undefined && value !== '';
  });
}

function shapeMatches(shape: readonly ItemType[], present: readonly ItemType[]): boolean {
  return shape.length === present.length && shape.every((role) => present.includes(role));
}

export function validateHierarchyMapping(input: HierarchyMappingInput): MappingValidationResult {
  const present = presentRoles(input);
  const matchedShape = VALID_ROLE_SHAPES.some((shape) => shapeMatches(shape, present));

  if (!matchedShape) {
    return {
      ok: false,
      error: {
        code: 'GAP',
        message:
          'Hierarchy mapping must be a contiguous run down to Story/Task: epic+story+task, ' +
          'feature+epic+story+task, or initiative+feature+epic+story+task. Got: ' +
          (present.length === 0 ? '(nothing mapped)' : present.join(', ')),
      },
    };
  }

  const roleByType = new Map<string, ItemType>();
  for (const role of present) {
    const type = input[role] as string;
    const existingRole = roleByType.get(type);
    if (existingRole) {
      return {
        ok: false,
        error: {
          code: 'DUPLICATE_TYPE',
          message: `Issue type "${type}" is mapped to both "${existingRole}" and "${role}" — each role needs a distinct issue type.`,
        },
      };
    }
    roleByType.set(type, role);
  }

  return {
    ok: true,
    mapping: {
      epic: input.epic as string,
      story: input.story as string,
      task: input.task as string,
      feature: input.feature,
      initiative: input.initiative,
    },
  };
}

export interface CoverageError {
  code: 'ROOT_LEVEL_NOT_COVERED';
  message: string;
}

export type CoverageResult = { ok: true } | { ok: false; error: CoverageError };

/**
 * Checks that a pair's chosen rootLevel is covered by the site's (already
 * validated) hierarchy mapping. epic is always covered by any valid mapping;
 * feature/initiative are only covered if that role was actually mapped.
 */
export function checkPairCoverage(mapping: HierarchyMapping, rootLevel: RootLevel): CoverageResult {
  if (rootLevel === 'epic') {
    return { ok: true };
  }

  if (rootLevel === 'feature') {
    return mapping.feature
      ? { ok: true }
      : {
          ok: false,
          error: {
            code: 'ROOT_LEVEL_NOT_COVERED',
            message:
              'The hierarchy mapping does not cover root level "feature" — map a Feature role before registering a feature-root pair.',
          },
        };
  }

  return mapping.initiative
    ? { ok: true }
    : {
        ok: false,
        error: {
          code: 'ROOT_LEVEL_NOT_COVERED',
          message:
            'The hierarchy mapping does not cover root level "initiative" — map an Initiative role before registering an initiative-root pair.',
        },
      };
}
