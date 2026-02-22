/**
 * Ported from:
 * https://github.com/vitejs/devtools/tree/v0.0.0-alpha.32/packages/rolldown/src/node/rolldown
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

import type {
  Chunk,
  Event,
  HookLoadCallEnd,
  HookLoadCallStart,
  HookResolveIdCallEnd,
  HookResolveIdCallStart,
  HookTransformCallEnd,
  HookTransformCallStart,
} from '@rolldown/debug';
import { diffLines } from 'diff';
import { createDebug } from 'obug';

type ModuleBuildHookEvents = (Exclude<Event, 'StringRef'> &
  (
    | HookResolveIdCallStart
    | HookResolveIdCallEnd
    | HookLoadCallStart
    | HookLoadCallEnd
    | HookTransformCallStart
    | HookTransformCallEnd
  )) & { event_id: string };

const debug = createDebug('rolldown-devtools:generate-data');

function computeDiffCounts(from, to) {
  if (!from || !to || from === to) {
    return { diff_added: 0, diff_removed: 0 };
  }

  const delta = diffLines(from, to);

  return {
    diff_added: delta
      .filter((d) => d.added)
      .map((d) => d.value)
      .join('')
      .split(/\n/g).length,
    diff_removed: delta
      .filter((d) => d.removed)
      .map((d) => d.value)
      .join('')
      .split(/\n/g).length,
  };
}

export interface GenerateDataOptions {
  logsPath: string;
  metaPath: string;
}

export async function generateData(options: GenerateDataOptions) {
  const { logsPath, metaPath } = options;

  // Parse `meta.json`
  const metaRaw = fs.readFileSync(metaPath, 'utf-8').trim();
  const meta = JSON.parse(metaRaw);

  // Process `logs.json` line by line (JSONL format)
  const source_refs = new Map();
  const module_build_hook_events = new Map();
  const module_build_metrics = new Map();
  const plugin_build_metrics = new Map();
  const modules = new Map();
  const chunks = new Map();
  const assets = new Map();
  const chunkAssetMap = new Map();
  let build_start_time = 0;
  let build_end_time = 0;

  function getContentByteSize(content: string | null | undefined) {
    if (content == null) {
      return 0;
    }
    return new TextEncoder().encode(content).length;
  }

  function guessChunkName(chunk: Chunk) {
    if (chunk.name) {
      return chunk.name;
    }
    if (chunk.modules.length === 1) {
      return `[${simplifyModuleName(chunk.modules[0])}]`;
    }
    if (chunk.modules.length > 1) {
      return `[${simplifyModuleName(chunk.modules[0])}_${chunk.modules.length}]`;
    }
    return '[unnamed]';
  }

  function simplifyModuleName(module: string) {
    let parts = module
      .replace(/^.*(\\.pnpm|\.yarn|node_modules|src|app|packages)\//gi, '')
      .replace(/\b(index|main|dist|test|component|components)\b/gi, '')
      .replace(/\/+/g, '/')
      .replace(/\?.*$/, '')
      .replace(/\.\w+$/, '')
      .replace(/\W/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase()
      .split('_')
      .filter(Boolean);
    parts = Array.from(new Set(parts));
    if (parts.length > 5) parts = parts.slice(0, 5);
    return parts.join('_');
  }

  function getInitialChunkIds(chunkList: Chunk[]) {
    const chunkMap = new Map(chunkList.map((c) => [c.chunk_id, c]));
    const entryChunkIds = chunkList.filter((c) => !!c.is_user_defined_entry).map((c) => c.chunk_id);
    const visited = new Set();
    const initialChunkIds = new Set(entryChunkIds);
    const queue = [...entryChunkIds];
    while (queue.length > 0) {
      const chunkId = queue.shift();
      if (chunkId == null) {
        continue;
      }
      if (visited.has(chunkId)) {
        continue;
      }
      visited.add(chunkId);
      const chunk = chunkMap.get(chunkId);
      if (chunk?.imports) {
        for (const _import of chunk.imports) {
          if (!initialChunkIds.has(_import.chunk_id)) {
            initialChunkIds.add(_import.chunk_id);
            queue.push(_import.chunk_id);
          }
        }
      }
    }
    return initialChunkIds;
  }

  function interpretSourceRefs(event: Event, key: string) {
    if (key in event && typeof event[key] === 'string') {
      if (event[key].startsWith('$ref:')) {
        const refKey = event[key].slice(5);
        if (source_refs.has(refKey)) {
          event[key] = source_refs.get(refKey);
        }
      }
    }
  }

  function recordBuildMetrics(event: ModuleBuildHookEvents) {
    const startHooks = ['HookResolveIdCallStart', 'HookLoadCallStart', 'HookTransformCallStart'];
    const endHooks = ['HookResolveIdCallEnd', 'HookLoadCallEnd', 'HookTransformCallEnd'];

    if (startHooks.includes(event.action)) {
      module_build_hook_events.set(event.call_id, event);
    } else if (endHooks.includes(event.action)) {
      const start = module_build_hook_events.get(event.call_id);
      const module_id =
        event.action === 'HookResolveIdCallEnd'
          ? event.resolved_id
          : (event as HookLoadCallEnd | HookTransformCallEnd).module_id;
      if (start && module_id) {
        const pluginId = event.plugin_id;
        const info = {
          id: event.event_id,
          timestamp_start: +start.timestamp,
          timestamp_end: +event.timestamp,
          duration: +event.timestamp - +start.timestamp,
          plugin_id: pluginId,
          plugin_name: event.plugin_name,
        };
        const mbm = module_build_metrics.get(module_id) ?? {
          resolve_ids: [],
          loads: [],
          transforms: [],
        };
        const pbm = plugin_build_metrics.get(pluginId) ?? {
          plugin_id: pluginId,
          plugin_name: event.plugin_name,
          calls: [],
        };

        if (event.action === 'HookResolveIdCallEnd') {
          mbm.resolve_ids.push({
            ...info,
            type: 'resolve',
            importer: start.importer,
            module_request: start.module_request,
            import_kind: start.import_kind,
            resolved_id: event.resolved_id,
          });
          pbm.calls.push({
            ...info,
            type: 'resolve',
            module: start.module_request,
          });
        } else if (event.action === 'HookLoadCallEnd') {
          mbm.loads.push({
            ...info,
            type: 'load',
            content: event.content ?? null,
          });
          pbm.calls.push({
            ...info,
            type: 'load',
            module: event.module_id,
            unchanged: !event.content,
          });
        } else if (event.action === 'HookTransformCallEnd') {
          const contentFrom = start.content ?? null;
          const contentTo = event.content ?? null;
          const diffs = computeDiffCounts(contentFrom, contentTo);
          mbm.transforms.push({
            ...info,
            type: 'transform',
            content_from: contentFrom,
            content_to: contentTo,
            diff_added: diffs.diff_added,
            diff_removed: diffs.diff_removed,
            source_code_size: getContentByteSize(start.content),
            transformed_code_size: getContentByteSize(event.content),
          });
          pbm.calls.push({
            ...info,
            type: 'transform',
            module: event.module_id,
            unchanged: start.content === event.content,
          });
        }
        plugin_build_metrics.set(pluginId, pbm);
        module_build_metrics.set(module_id, mbm);
      }
    }
  }

  let eventIndex = 0;

  function handleEvent(raw: Event) {
    const event = {
      ...raw,
      event_id: `${'timestamp' in raw ? raw.timestamp : 'x'}#${this.events.length}`,
    };

    if (event.action === 'BuildStart') {
      build_start_time = +event.timestamp;
    }
    if (event.action === 'BuildEnd') {
      build_end_time = +event.timestamp;
    }
    if (event.action === 'StringRef') {
      source_refs.set(event.id, event.content);
      return;
    }
    if (event.action === 'ChunkGraphReady') {
      const initialChunkIds = getInitialChunkIds(event.chunks);
      for (const chunk of event.chunks) {
        chunks.set(chunk.chunk_id, {
          ...chunk,
          is_initial: initialChunkIds.has(chunk.chunk_id),
          name: chunk.name || guessChunkName(chunk),
        });
      }
      return;
    }

    interpretSourceRefs(event, 'content');
    recordBuildMetrics(event as ModuleBuildHookEvents);

    if ('module_id' in event) {
      if (!modules.has(event.module_id)) {
        modules.set(event.module_id, {
          id: event.module_id,
          is_external: false,
          imports: [],
          importers: [],
          build_metrics: { resolve_ids: [], loads: [], transforms: [] },
        });
      }
    }

    if (event.action === 'ModuleGraphReady') {
      module_build_hook_events.clear();
      for (const module of event.modules) {
        modules.set(module.id, {
          ...module,
          build_metrics: module_build_metrics.get(module.id),
        });
        module.importers = Array.from(new Set(module.importers || [])).sort((a, b) =>
          a.localeCompare(b),
        );
        module.imports = Array.from(new Set(module.imports || [])).sort((a, b) =>
          a.module_id.localeCompare(b.module_id),
        );
      }
    }

    if (event.action === 'AssetsReady') {
      for (const asset of event.assets) {
        const chunk = chunks.get(asset.chunk_id);
        assets.set(asset.filename, { ...asset, chunk });
        chunkAssetMap.set(asset.chunk_id, asset);
      }
    }
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(logsPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const event = JSON.parse(trimmed) as Event;
      handleEvent(event);
    } catch {
      // noop
    }
  }

  debug(`Processed ${eventIndex} events`);
  debug(`Modules: ${modules.size}, Chunks: ${chunks.size}, Assets: ${assets.size}`);

  for (const [chunkId, chunk] of chunks) {
    chunk.asset = chunkAssetMap.get(chunkId);
  }

  function isNodeModulePath(p) {
    return !!p.match(/[/\\]node_modules[/\\]/);
  }

  function getModuleNameFromPath(p) {
    const match = p.replace(/\\/g, '/').match(/.*\/node_modules\/(.*)$/)?.[1];
    if (!match) return undefined;
    if (match.startsWith('@')) return match.split('/').slice(0, 2).join('/');
    return match.split('/')[0];
  }

  function getPackageDirPath(p) {
    const normalizedPath = p.replace(/%2F/g, '/').replace(/\\/g, '/');
    const nodeModulesPrefix = normalizedPath.match(/^(.+\/node_modules\/)/)?.[1];
    const packageName = getModuleNameFromPath(p);
    return nodeModulesPrefix + packageName;
  }

  const packagesMap = new Map();

  for (const chunk of chunks.values()) {
    for (const moduleId of chunk.modules) {
      if (!isNodeModulePath(moduleId)) continue;
      const moduleName = getModuleNameFromPath(moduleId);
      if (!moduleName) continue;

      const dir = getPackageDirPath(moduleId);
      const key = `${moduleName}@${dir}`;

      const moduleInfo = modules.get(moduleId);
      const mbm = moduleInfo?.build_metrics;
      const transformedCodeSize = mbm?.transforms?.length
        ? (mbm.transforms[mbm.transforms.length - 1]?.transformed_code_size ?? 0)
        : 0;

      if (!packagesMap.has(key)) {
        let version = '';
        try {
          const pkgJsonPath = path.join(dir, 'package.json');
          if (fs.existsSync(pkgJsonPath)) {
            const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
            version = pkgJson.version || '';
          }
        } catch {}

        packagesMap.set(key, {
          name: moduleName,
          version,
          dir,
          type: 'transitive',
          transformedCodeSize: 0,
          files: [],
        });
      }

      const pkg = packagesMap.get(key);
      pkg.transformedCodeSize += transformedCodeSize;
      pkg.files.push({
        path: moduleId,
        transformedCodeSize,
        importers: (moduleInfo?.importers || []).map((i) => ({ path: i, version: '' })),
      });
    }
  }

  // Determine direct vs transitive
  for (const pkg of packagesMap.values()) {
    const isDirect = pkg.files.some((f) => {
      const mod = modules.get(f.path);
      return mod?.importers?.some((i) => i.includes(meta.cwd));
    });
    pkg.type = isDirect ? 'direct' : 'transitive';
  }

  // Detect duplicates
  const nameCount = new Map();
  for (const pkg of packagesMap.values()) {
    nameCount.set(pkg.name, (nameCount.get(pkg.name) ?? 0) + 1);
  }
  for (const pkg of packagesMap.values()) {
    pkg.duplicated = nameCount.get(pkg.name) > 1;
  }

  const packages = Array.from(packagesMap.values()).filter((p) => p.transformedCodeSize > 0);

  // Build output
  const modulesList = Array.from(modules.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({
      id: m.id,
      imports: m.imports || [],
      importers: m.importers || [],
      build_metrics: m.build_metrics,
    }));

  // Convert `plugin_build_metrics` Map to a serializable object
  const pluginBuildMetricsObj = {};
  for (const [pluginId, metrics] of plugin_build_metrics) {
    pluginBuildMetricsObj[pluginId] = metrics;
  }

  const analysisData = {
    meta,
    modules: modulesList,
    build_duration: build_end_time - build_start_time,
    assets: Array.from(assets.values()),
    chunks: Array.from(chunks.values()),
    packages,
    plugin_build_metrics: pluginBuildMetricsObj,
  };

  debug(`Modules: ${modulesList.length}`);
  debug(`Chunks: ${analysisData.chunks.length}`);
  debug(`Assets: ${analysisData.assets.length}`);
  debug(`Packages: ${packages.length}`);
  debug(`Plugin Build Metrics: ${plugin_build_metrics.size}`);

  return analysisData;
}
