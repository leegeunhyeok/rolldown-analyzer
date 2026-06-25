import type {
  ModuleListItem,
  PackageInfo,
  RolldownAssetInfo,
  RolldownChunkInfo,
  RolldownData,
  SessionContext,
} from '@rolldown-analyzer/core/types';
import { convertAnalyzeData } from '@rolldown-analyzer/core/utils/convert-analyze-data';
import type { AnalyzeData } from '@rolldown-analyzer/core/utils/convert-analyze-data';
import { computed, shallowRef } from 'vue';

import { getFileTypeFromName } from '../../packages/app/utils/icon';

const _data = shallowRef<RolldownData | null>(null);

export function loadAnalyzeData(data: AnalyzeData) {
  _data.value = convertAnalyzeData(data);
}

export function clearData() {
  _data.value = null;
}

export function useData() {
  const session = computed<SessionContext | null>(() => {
    const data = _data.value;
    if (!data) return null;

    return {
      meta: data.meta,
      modulesList: data.modules.map((mod) => ({
        id: mod.id,
        fileType: getFileTypeFromName(mod.id).name,
        imports: mod.imports ?? [],
        importers: mod.importers ?? [],
        buildMetrics: mod.build_metrics,
      })) as ModuleListItem[],
      buildDuration: data.build_duration,
    };
  });

  const assets = computed<RolldownAssetInfo[]>(() => _data.value?.assets ?? []);
  const chunks = computed<RolldownChunkInfo[]>(() => _data.value?.chunks ?? []);
  const packages = computed<PackageInfo[]>(() => _data.value?.packages ?? []);

  return {
    session,
    assets,
    chunks,
    packages,
  };
}
