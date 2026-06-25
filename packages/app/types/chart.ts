import type {
  PackageInfo,
  PluginBuildInfo,
  RolldownAssetInfo,
  RolldownChunkInfo,
} from '@rolldown-analyzer/core/types';
import type { TreeNode } from 'nanovis';

export type AssetChartInfo = Omit<RolldownAssetInfo, 'type'> & {
  path: string;
  type: 'folder' | 'file';
};

export type AssetChartNode = TreeNode<AssetChartInfo | undefined>;

export type ChunkChartInfo = Omit<RolldownChunkInfo, 'type'> & {
  path: string;
  type: 'folder' | 'chunk';
  size: number;
};

export type ChunkChartNode = TreeNode<ChunkChartInfo | undefined>;

export type PackageChartInfo = PackageInfo & {
  path: string;
  type: 'folder' | 'package';
};

export type PackageChartNode = TreeNode<PackageChartInfo | undefined>;

export type PluginChartInfo = Omit<PluginBuildInfo, 'type' | 'plugin_id' | 'plugin_name'> & {
  type: 'module' | 'hook';
  title: string;
  text: string;
  children?: any[];
};

export type PluginChartNode = TreeNode<PluginChartInfo | undefined>;

export type AnalyzeChartInfo = {
  id: string;
  filename: string;
  path: string;
  size: number;
  type: 'folder' | 'module';
};
export type AnalyzeChartNode = TreeNode<AnalyzeChartInfo | undefined>;
