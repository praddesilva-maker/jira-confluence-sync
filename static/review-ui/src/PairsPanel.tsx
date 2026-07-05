import { useState } from 'react';
import { invoke } from '@forge/bridge';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import type { HierarchyMapping, PairConfig, RootLevel } from '../../../src/domain/model';

interface SavePairResult {
  ok: boolean;
  value?: PairConfig;
  error?: { message: string };
}

interface Props {
  mapping: HierarchyMapping | undefined;
  pairs: PairConfig[];
  onChanged: () => void;
}

interface RootLevelOption {
  label: string;
  value: RootLevel;
}

const ROOT_LEVEL_LABELS: Record<RootLevel, string> = {
  initiative: 'Initiative',
  feature: 'Feature',
  epic: 'Epic',
};

function coveredRootLevels(mapping: HierarchyMapping | undefined): RootLevel[] {
  if (!mapping) return [];
  const levels: RootLevel[] = ['epic'];
  if (mapping.feature) levels.unshift('feature');
  if (mapping.initiative) levels.unshift('initiative');
  return levels;
}

export function PairsPanel({ mapping, pairs, onChanged }: Props) {
  const availableRootLevels = coveredRootLevels(mapping);
  const [rootLevel, setRootLevel] = useState<RootLevel | null>(availableRootLevels[0] ?? null);
  const [confluencePageUrl, setConfluencePageUrl] = useState('');
  const [jiraRootKey, setJiraRootKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!rootLevel) return;
    setSaving(true);
    setError(null);
    try {
      const result = await invoke<SavePairResult>('savePair', {
        confluencePageUrl,
        jiraRootKey,
        rootLevel,
      });
      if (!result.ok) {
        setError(result.error?.message ?? 'Could not save the pair.');
        return;
      }
      setConfluencePageUrl('');
      setJiraRootKey('');
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this pair?')) return;
    await invoke('deletePair', { id });
    onChanged();
  };

  if (!mapping) {
    return (
      <section>
        <h2>Pairs</h2>
        <SectionMessage appearance="information" title="No hierarchy mapping yet">
          Save a hierarchy mapping above before registering a pair.
        </SectionMessage>
      </section>
    );
  }

  const rootLevelOptions: RootLevelOption[] = availableRootLevels.map((level) => ({
    label: ROOT_LEVEL_LABELS[level],
    value: level,
  }));

  return (
    <section>
      <h2>Pairs</h2>
      {pairs.length === 0 && <p>No pairs registered yet.</p>}
      {pairs.map((pair) => (
        <div
          key={pair.id}
          style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}
        >
          <span style={{ minWidth: '90px' }}>{ROOT_LEVEL_LABELS[pair.rootLevel]}</span>
          <span>{pair.jiraRootKey}</span>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {pair.confluencePageUrl}
          </span>
          <Button appearance="subtle" onClick={() => handleDelete(pair.id)}>
            Delete
          </Button>
        </div>
      ))}

      <h3>Add a pair</h3>
      {error && (
        <SectionMessage appearance="error" title="Could not add pair">
          {error}
        </SectionMessage>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '480px' }}>
        <div>
          <label htmlFor="pair-root-level">Root level</label>
          <Select<RootLevelOption>
            inputId="pair-root-level"
            options={rootLevelOptions}
            value={rootLevelOptions.find((o) => o.value === rootLevel) ?? null}
            onChange={(selected) => setRootLevel(selected?.value ?? null)}
          />
        </div>
        <div>
          <label htmlFor="pair-confluence-url">Confluence page URL</label>
          <Textfield
            id="pair-confluence-url"
            value={confluencePageUrl}
            onChange={(e) => setConfluencePageUrl(e.currentTarget.value)}
            placeholder="https://your-site.atlassian.net/wiki/spaces/KEY/pages/123456789/Title"
          />
        </div>
        <div>
          <label htmlFor="pair-jira-key">Jira root issue key</label>
          <Textfield
            id="pair-jira-key"
            value={jiraRootKey}
            onChange={(e) => setJiraRootKey(e.currentTarget.value)}
            placeholder="ADT-1"
          />
        </div>
        <Button
          appearance="primary"
          onClick={handleAdd}
          isLoading={saving}
          isDisabled={!rootLevel || !confluencePageUrl || !jiraRootKey}
        >
          Add pair
        </Button>
      </div>
    </section>
  );
}
