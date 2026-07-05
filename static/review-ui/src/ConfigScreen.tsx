import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
import type { HierarchyMapping, HierarchyOptionsByRole, PairConfig } from '../../../src/domain/model';
import { HierarchyMappingPanel } from './HierarchyMappingPanel';
import { PairsPanel } from './PairsPanel';

interface GetConfigResult {
  mapping: HierarchyMapping | undefined;
  pairs: PairConfig[];
}

export function ConfigScreen() {
  const [options, setOptions] = useState<HierarchyOptionsByRole | null>(null);
  const [config, setConfig] = useState<GetConfigResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [optionsResult, configResult] = await Promise.all([
        invoke<HierarchyOptionsByRole>('getHierarchyOptions'),
        invoke<GetConfigResult>('getConfig'),
      ]);
      setOptions(optionsResult);
      setConfig(configResult);
      setLoadError(null);
    } catch {
      setLoadError('Failed to load configuration from the backend.');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loadError) {
    return (
      <SectionMessage appearance="error" title="Could not load configuration">
        {loadError}
      </SectionMessage>
    );
  }

  if (!options || !config) {
    return <Spinner size="medium" label="Loading configuration" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <HierarchyMappingPanel options={options} mapping={config.mapping} onSaved={refresh} />
      <PairsPanel mapping={config.mapping} pairs={config.pairs} onChanged={refresh} />
    </div>
  );
}
