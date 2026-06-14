import fs from 'node:fs';
import path from 'node:path';

import { Command } from 'commander';

import { generateData } from './generate-data';
import { generateReport } from './generate-template';

const program = new Command();

program.name('rolldown-analyzer').description('Standalone Analyzer for Rolldown');

// rolldown-analyzer generate --preset full --logs <path> --meta <path> -o <dir>
// rolldown-analyzer generate --preset lite --data <path> --filename <file>
program
  .command('generate')
  .description('Generate static analysis page')
  .option('-p, --preset <type>', 'Report preset: "full" or "lite"')
  .option('-t, --template <type>', 'Deprecated alias for --preset')
  .option('-o, --out-dir <path>', 'Output directory')
  .option('--filename <path>', 'Output HTML file path (for "lite" preset)')
  .option('--title <title>', 'HTML document title')
  .option('--open', 'Open generated report in the default browser')
  .option('--logs <path>', 'Path to logs.json (for "full" template)')
  .option('--meta <path>', 'Path to meta.json (for "full" template)')
  .option('--data <path>', 'Path to bundle-analysis.json (for "lite" template)')
  .action(async (options) => {
    const preset = options.preset ?? options.template;

    if (!preset) {
      console.error('Error: --preset is required. Use "full" or "lite"');
      process.exit(1);
    }

    if (preset === 'full') {
      if (!options.logs || !options.meta) {
        console.error('Error: --logs and --meta are required for "full" preset');
        process.exit(1);
      }
      const result = await generateReport({
        preset: 'full',
        logsPath: path.resolve(options.logs),
        metaPath: path.resolve(options.meta),
        outDir: options.outDir ? path.resolve(options.outDir) : undefined,
        title: options.title,
        open: options.open,
      });
      console.log(`Generated full report at ${result.outputPath}`);
    } else if (preset === 'lite') {
      if (!options.data) {
        console.error('Error: --data is required for "lite" preset');
        process.exit(1);
      }
      const result = await generateReport({
        preset: 'lite',
        dataPath: path.resolve(options.data),
        filename: resolveLiteFilename(options.filename, options.outDir),
        title: options.title,
        open: options.open,
      });
      console.log(`Generated lite report at ${result.outputPath}`);
    } else {
      console.error(`Error: unknown preset "${preset}". Use "full" or "lite"`);
      process.exit(1);
    }
  });

// rolldown-analyzer generate-data --logs <path> --meta <path> -o <file>
program
  .command('generate-data')
  .description('Generate devtools data as JSON (without "full" template)')
  .requiredOption('--logs <path>', 'Path to logs.json')
  .requiredOption('--meta <path>', 'Path to meta.json')
  .requiredOption('-o, --out-file <path>', 'Output JSON file path')
  .action(async (options) => {
    const data = await generateData({
      logsPath: path.resolve(options.logs),
      metaPath: path.resolve(options.meta),
    });
    const outFile = path.resolve(options.outFile);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(data));
    console.log(`Generated data at ${outFile}`);
  });

program.parse();

function resolveLiteFilename(filename?: string, outDir?: string): string | undefined {
  if (filename) {
    return path.resolve(filename);
  }
  if (outDir) {
    return path.join(path.resolve(outDir), 'index.html');
  }
  return undefined;
}
