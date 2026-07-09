import { getModuleNameFromPath, isPackageName } from '@rolldown-analyzer/core/utils/filepath';
import { relative } from 'pathe';

import { makeCachedFunction } from './cache';

function getModuleSubpathFromPath(path: string) {
  const match = path.match(/.*\/node_modules\/(.*)$/)?.[1];
  if (!match) return undefined;
  return match;
}

export function isBuiltInModule(name: string | undefined) {
  if (!name) return;
  return ['nuxt', '#app', '#head', 'vue'].includes(name);
}

export function isVirtualModuleId(id: string) {
  return id.startsWith('virtual:') || id.startsWith('\\0') || id.charCodeAt(0) === 0;
}

export const parseReadablePath = makeCachedFunction((path: string, root: string) => {
  const decodedPath = path.replace(/%2F/g, '/');
  if (isVirtualModuleId(decodedPath)) {
    return {
      moduleName: decodedPath,
      path: decodedPath,
    };
  }

  const parsedPath = decodedPath.replace(/\\/g, '/');
  if (isPackageName(parsedPath)) {
    return {
      moduleName: parsedPath,
      path: parsedPath,
    };
  }

  if (
    parsedPath.match(/^\w+:/) &&
    !path.match(/^[a-z]:\\/i) // in order to check if it is Windows' path
  ) {
    return {
      moduleName: parsedPath,
      path: parsedPath,
    };
  }

  let relativePath: string | undefined;
  try {
    const isRelativePath = parsedPath.startsWith('./') || parsedPath.startsWith('../');
    relativePath = root && !isRelativePath ? relative(root, parsedPath) : parsedPath;
    if (root && !relativePath.startsWith('./') && !relativePath.startsWith('../')) {
      relativePath = `./${relativePath}`;
    }
    if (relativePath.startsWith('./.nuxt/')) relativePath = `#build${relativePath.slice(7)}`;
  } catch {}

  const moduleName = getModuleNameFromPath(parsedPath);
  const subpath = getModuleSubpathFromPath(parsedPath);
  if (relativePath?.startsWith('../')) {
    return {
      moduleName,
      path: relativePath,
    };
  }
  if (moduleName && subpath) {
    return {
      moduleName,
      path: subpath,
    };
  }
  // Workaround https://github.com/unjs/pathe/issues/113
  return { path: relativePath ?? parsedPath };
});
