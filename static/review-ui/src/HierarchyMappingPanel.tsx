import { useState } from 'react';
import { invoke } from '@forge/bridge';
import Select from '@atlaskit/select';
import Button from '@atlaskit/button/new';
import SectionMessage from '@atlaskit/section-message';
import type {
  HierarchyMapping,
  HierarchyMappingInput,
  HierarchyOptionsByRole,
  ItemType,
} from '../../../src/domain/model';

interface SaveMappingResult {
  ok: boolean;
  error?: { message: string };
}

const ROLES: ReadonlyArray<{ key: ItemType; label: string }> = [
  { key: 'initiative', label: 'Initiative' },
  { key: 'feature', label: 'Feature' },
  { key: 'epic', label: 'Epic' },
  { key: 'story', label: 'Story' },
  { key: 'task', label: 'Task' },
];

interface Props {
  options: HierarchyOptionsByRole;
  mapping: HierarchyMapping | undefined;
  onSaved: () => void;
}

interface SelectOption {
  label: string;
  value: string;
}

export function HierarchyMappingPanel({ options, mapping, onSaved }: Props) {
  const [selections, setSelections] = useState<Partial<Record<ItemType, string>>>({
    initiative: mapping?.initiative,
    feature: mapping?.feature,
    epic: mapping?.epic,
    story: mapping?.story,
    task: mapping?.task,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (role: ItemType, selected: SelectOption | null) => {
    setSelections((prev) => ({ ...prev, [role]: selected?.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const input: HierarchyMappingInput = { ...selections };
    try {
      const result = await invoke<SaveMappingResult>('saveHierarchyMapping', input);
      if (!result.ok) {
        setError(result.error?.message ?? 'Could not save the hierarchy mapping.');
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2>Hierarchy Mapping</h2>
      <p>
        Map each role to a real issue type on this site. Roles unavailable on this site&apos;s tier
        are disabled — that&apos;s expected on Standard/Free sites (CR-001).
      </p>
      {error && (
        <SectionMessage appearance="error" title="Could not save mapping">
          {error}
        </SectionMessage>
      )}
      {ROLES.map(({ key, label }) => {
        const roleOptions = options[key];
        const unavailable = roleOptions.length === 0;
        const currentId = selections[key];
        const selectOptions: SelectOption[] = roleOptions.map((o) => ({ label: o.name, value: o.id }));
        const selectedOption = selectOptions.find((o) => o.value === currentId) ?? null;

        return (
          <div key={key} style={{ marginBottom: '0.75rem', maxWidth: '320px' }}>
            <label htmlFor={`role-${key}`}>{label}</label>
            <Select<SelectOption>
              inputId={`role-${key}`}
              isDisabled={unavailable}
              isClearable
              placeholder={unavailable ? 'Not available on this site' : 'Select an issue type'}
              options={selectOptions}
              value={selectedOption}
              onChange={(selected) => handleChange(key, selected)}
            />
          </div>
        );
      })}
      <Button appearance="primary" onClick={handleSave} isLoading={saving}>
        Save mapping
      </Button>
    </section>
  );
}
