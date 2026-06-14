import { spawn } from 'node:child_process';
import fs, { type PathLike } from 'node:fs';
import path from 'node:path';

import { generateData } from './generate-data';
import { appPublicPath, liteDistPath } from './public';

export type ReportPreset = 'lite' | 'full';

interface BaseGenerateReportOptions {
  title?: string;
  open?: boolean;
}

export interface GenerateLiteReportOptions extends BaseGenerateReportOptions {
  preset: 'lite';
  dataPath: PathLike;
  filename?: string;
}

export interface GenerateFullReportOptions extends BaseGenerateReportOptions {
  preset: 'full';
  logsPath: PathLike;
  metaPath: PathLike;
  outDir?: string;
}

export type GenerateReportOptions = GenerateLiteReportOptions | GenerateFullReportOptions;

export interface GenerateReportResult {
  preset: ReportPreset;
  outputPath: string;
  files: string[];
}

/**
 * Generate analyzer report HTML from the selected report preset.
 */
export async function generateReport(
  options: GenerateReportOptions,
): Promise<GenerateReportResult> {
  const result =
    options.preset === 'lite' ? generateLiteReport(options) : await generateFullReport(options);

  if (options.open) {
    openFile(result.outputPath);
  }

  return result;
}

/** @deprecated Use `generateReport({ preset: 'full', ... })` instead. */
export interface GenerateDevtoolsOptions {
  logsPath: PathLike;
  metaPath: PathLike;
  outDir: string;
}

/** @deprecated Use `generateReport({ preset: 'lite', ... })` instead. */
export interface GenerateAnalyzerOptions {
  dataPath: PathLike;
  outDir: string;
}

/**
 * Generate full devtools page from logs.json + meta.json
 *
 * @deprecated Use `generateReport({ preset: 'full', ... })` instead.
 */
export async function generateDevtools(options: GenerateDevtoolsOptions): Promise<void> {
  await generateFullReport({ preset: 'full', ...options });
}

async function generateFullReport(
  options: GenerateFullReportOptions,
): Promise<GenerateReportResult> {
  const outDir = path.resolve(options.outDir ?? 'rolldown-analyzer');
  const { logsPath, metaPath } = options;
  const data = await generateData({ logsPath, metaPath });

  fs.mkdirSync(outDir, { recursive: true });
  const files = copyDirSync(appPublicPath, outDir);

  const dataPath = path.join(outDir, 'rolldown-data.json');
  fs.writeFileSync(dataPath, JSON.stringify(data));
  files.push(dataPath);

  const htmlPath = path.join(outDir, 'index.html');
  applyTitleToHtmlFile(htmlPath, options.title);

  return {
    preset: 'full',
    outputPath: htmlPath,
    files,
  };
}

/**
 * Generate single-file analyzer page from analyze-data.json
 *
 * @deprecated Use `generateReport({ preset: 'lite', ... })` instead.
 */
export function generateAnalyzer(options: GenerateAnalyzerOptions): void {
  generateLiteReport({
    preset: 'lite',
    dataPath: options.dataPath,
    filename: path.join(options.outDir, 'index.html'),
  });
}

function generateLiteReport(options: GenerateLiteReportOptions): GenerateReportResult {
  const { dataPath } = options;
  const filename = path.resolve(options.filename ?? 'report.html');

  const htmlPath = path.join(liteDistPath, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Analyze template not found at ${htmlPath}. Run 'build:lite' first.`);
  }

  const json = fs.readFileSync(dataPath, 'utf-8');
  const parsedJson = JSON.parse(json);

  let html = fs.readFileSync(htmlPath, 'utf-8');
  html = html.replace(
    'window.__ANALYZE_DATA__ = window.__ANALYZE_DATA__ || {};',
    `window.__ANALYZE_DATA__ = ${JSON.stringify(parsedJson)};`,
  );
  html = applyHtmlTitle(html, options.title);

  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, html);

  return {
    preset: 'lite',
    outputPath: filename,
    files: [filename],
  };
}

function copyDirSync(src: string, dest: string): string[] {
  const files: string[] = [];
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      files.push(...copyDirSync(srcPath, destPath));
    } else {
      fs.copyFileSync(srcPath, destPath);
      files.push(destPath);
    }
  }
  return files;
}

function applyTitleToHtmlFile(filePath: string, title: string | undefined): void {
  if (!title || !fs.existsSync(filePath)) {
    return;
  }
  const html = fs.readFileSync(filePath, 'utf-8');
  fs.writeFileSync(filePath, applyHtmlTitle(html, title));
}

function applyHtmlTitle(html: string, title: string | undefined): string {
  if (!title) {
    return html;
  }
  const titleTag = `<title>${escapeHtml(title)}</title>`;
  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
  }
  return html.replace(/<\/head>/i, `${titleTag}</head>`);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function openFile(filePath: string): void {
  const command =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', filePath] : [filePath];
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {});
  child.unref();
}
