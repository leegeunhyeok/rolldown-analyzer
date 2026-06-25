import type {
  ModuleImport,
  RolldownChunkInfo,
  RolldownData,
  SessionMeta,
} from '../types/data';

export interface AnalyzeModule {
  id: string;
  path: string;
  size: number;
  importers?: number[];
}

export interface AnalyzeImportRelation {
  chunkIndex: number;
  kind: 'import-statement' | 'dynamic-import';
}

export interface AnalyzeChunk {
  id: string;
  name: string;
  size: number;
  type: string;
  moduleIndices: number[];
  entryModule?: number;
  reachableModuleIndices?: number[];
  imports?: AnalyzeImportRelation[];
}

export interface AnalyzeMeta {
  bundler: string;
  version: string;
  timestamp: number;
  cwd?: string;
}

export interface AnalyzeData {
  meta: AnalyzeMeta;
  chunks: AnalyzeChunk[];
  modules: AnalyzeModule[];
}

export function convertAnalyzeData(data: AnalyzeData): RolldownData {
  const modules = data.modules;
  const importsByModule = new Map<number, ModuleImport[]>();

  modules.forEach((mod) => {
    for (const importerIndex of mod.importers ?? []) {
      if (!modules[importerIndex]) continue;

      const imports = importsByModule.get(importerIndex) ?? [];
      imports.push({
        kind: 'import-statement',
        module_id: mod.path,
        module_request: mod.path,
      } as ModuleImport);
      importsByModule.set(importerIndex, imports);
    }
  });

  const convertedModules: RolldownData['modules'] = modules.map((mod, moduleIndex) => {
    const moduleId = mod.path;
    const importers = (mod.importers ?? [])
      .map((idx) => modules[idx]?.path)
      .filter((p): p is string => p != null);

    return {
      id: moduleId,
      imports: importsByModule.get(moduleIndex) ?? [],
      importers,
      build_metrics: {
        resolve_ids: [],
        loads: [],
        transforms: [
          {
            type: 'transform' as const,
            id: moduleId,
            plugin_name: '',
            plugin_id: 0,
            content_from: null,
            content_to: null,
            diff_added: 0,
            diff_removed: 0,
            timestamp_start: 0,
            timestamp_end: 0,
            duration: 0,
            source_code_size: mod.size,
            transformed_code_size: mod.size,
          },
        ],
      },
    };
  });

  const convertedChunks: RolldownChunkInfo[] = data.chunks.map((chunk, chunkIdx) => {
    const chunkModules = chunk.moduleIndices
      .map((idx) => modules[idx]?.path)
      .filter((p): p is string => p != null);

    const entryModule = chunk.entryModule != null
      ? (modules[chunk.entryModule]?.path ?? null)
      : null;

    const imports = (chunk.imports ?? []).map((imp) => ({
      chunk_id: imp.chunkIndex,
      kind: imp.kind,
    }));

    return {
      chunk_id: chunkIdx,
      name: chunk.name,
      advanced_chunk_group_id: null,
      is_user_defined_entry: chunk.type === 'static-entry',
      is_async_entry: chunk.type === 'dynamic-entry',
      entry_module: entryModule,
      modules: chunkModules,
      reason: 'entry' as const,
      imports,
      is_initial: chunk.type === 'static-entry',
    };
  });

  const meta: SessionMeta = {
    action: 'SessionMeta',
    session_id: 'analyze',
    inputs: [],
    plugins: [],
    cwd: data.meta.cwd ?? '',
    platform: 'node',
    format: 'esm',
    dir: null,
    file: null,
  };

  return {
    meta,
    modules: convertedModules,
    build_duration: 0,
    assets: [],
    chunks: convertedChunks,
    packages: [],
  };
}
