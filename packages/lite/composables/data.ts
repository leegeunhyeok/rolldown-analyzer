import type {
  ModuleListItem,
  PackageInfo,
  RolldownAssetInfo,
  RolldownChunkInfo,
  SessionContext,
} from '@rolldown-analyzer/core/types';
import { convertAnalyzeData } from '@rolldown-analyzer/core/utils/convert-analyze-data';
import type { AnalyzeData } from '@rolldown-analyzer/core/utils/convert-analyze-data';
import { computed } from 'vue';

import { getFileTypeFromName } from '../../app/utils/icon';

declare global {
  interface Window {
    __ANALYZE_DATA__: AnalyzeData;
  }
}

const _data = convertAnalyzeData(window.__ANALYZE_DATA__);

export function useData() {
  const data = _data;

  const session = computed<SessionContext>(() => ({
    meta: data.meta,
    modulesList: data.modules.map((mod) => ({
      id: mod.id,
      fileType: getFileTypeFromName(mod.id).name,
      imports: mod.imports ?? [],
      importers: mod.importers ?? [],
      buildMetrics: mod.build_metrics,
    })) as ModuleListItem[],
    buildDuration: data.build_duration,
  }));

  const assets = computed<RolldownAssetInfo[]>(() => data.assets ?? []);
  const chunks = computed<RolldownChunkInfo[]>(() => data.chunks ?? []);
  const packages = computed<PackageInfo[]>(() => data.packages ?? []);

  return {
    data,
    session,
    assets,
    chunks,
    packages,
  };
}
