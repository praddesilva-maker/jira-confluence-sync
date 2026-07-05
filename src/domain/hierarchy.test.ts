import { describe, expect, it } from 'vitest';
import { checkPairCoverage, validateHierarchyMapping } from './hierarchy';
import type { HierarchyMapping } from './model';

describe('validateHierarchyMapping', () => {
  it('accepts the full four-role shape', () => {
    const result = validateHierarchyMapping({
      initiative: 'Initiative',
      feature: 'Feature',
      epic: 'Epic',
      story: 'Story',
      task: 'Task',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts the feature/epic/story/task shape', () => {
    const result = validateHierarchyMapping({
      feature: 'Feature',
      epic: 'Epic',
      story: 'Story',
      task: 'Task',
    });
    expect(result.ok).toBe(true);
  });

  it('accepts the minimum epic/story/task shape', () => {
    const result = validateHierarchyMapping({ epic: 'Epic', story: 'Story', task: 'Task' });
    expect(result.ok).toBe(true);
  });

  it('rejects a gap: initiative present but feature missing', () => {
    const result = validateHierarchyMapping({
      initiative: 'Initiative',
      epic: 'Epic',
      story: 'Story',
      task: 'Task',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GAP');
  });

  it('rejects a gap: epic present but story missing', () => {
    const result = validateHierarchyMapping({ epic: 'Epic', task: 'Task' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GAP');
  });

  it('rejects a gap: story/task present but epic missing', () => {
    const result = validateHierarchyMapping({ story: 'Story', task: 'Task' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GAP');
  });

  it('rejects an empty mapping', () => {
    const result = validateHierarchyMapping({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('GAP');
  });

  it('rejects duplicate issue types across roles', () => {
    const result = validateHierarchyMapping({
      epic: 'Epic',
      story: 'Task', // same type as task
      task: 'Task',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('DUPLICATE_TYPE');
  });

  it('treats an empty-string role value as absent', () => {
    const result = validateHierarchyMapping({ epic: 'Epic', story: 'Story', task: 'Task', feature: '' });
    expect(result.ok).toBe(true);
  });
});

describe('checkPairCoverage', () => {
  const epicOnly: HierarchyMapping = { epic: 'Epic', story: 'Story', task: 'Task' };
  const featureAndBelow: HierarchyMapping = {
    epic: 'Epic',
    story: 'Story',
    task: 'Task',
    feature: 'Feature',
  };
  const fullMapping: HierarchyMapping = {
    epic: 'Epic',
    story: 'Story',
    task: 'Task',
    feature: 'Feature',
    initiative: 'Initiative',
  };

  it('epic root is always covered', () => {
    expect(checkPairCoverage(epicOnly, 'epic').ok).toBe(true);
    expect(checkPairCoverage(featureAndBelow, 'epic').ok).toBe(true);
    expect(checkPairCoverage(fullMapping, 'epic').ok).toBe(true);
  });

  it('feature root is rejected under an epic-only mapping', () => {
    const result = checkPairCoverage(epicOnly, 'feature');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ROOT_LEVEL_NOT_COVERED');
  });

  it('feature root is covered once feature is mapped', () => {
    expect(checkPairCoverage(featureAndBelow, 'feature').ok).toBe(true);
    expect(checkPairCoverage(fullMapping, 'feature').ok).toBe(true);
  });

  it('initiative root is rejected under an epic-only or feature-and-below mapping', () => {
    expect(checkPairCoverage(epicOnly, 'initiative').ok).toBe(false);
    expect(checkPairCoverage(featureAndBelow, 'initiative').ok).toBe(false);
  });

  it('initiative root is covered only by the full mapping', () => {
    expect(checkPairCoverage(fullMapping, 'initiative').ok).toBe(true);
  });
});
