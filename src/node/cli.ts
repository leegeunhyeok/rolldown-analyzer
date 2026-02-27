import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import { generateData } from './generate-data';
import { generateTemplate } from './generate-template';

const program = new Command();

program
  .name('rolldown-analyzer')
  .description('Standalone Analyzer for Rolldown');

program
  .command('generate')
  .description('Generate static analysis page')
  .requiredOption('--logs <path>', 'Path to logs.json')
  .requiredOption('--meta <path>', 'Path to meta.json')
  .requiredOption('-o, --out-dir <path>', 'Output directory')
  .action(async (options) => {
    await generateTemplate({
      logsPath: path.resolve(options.logs),
      metaPath: path.resolve(options.meta),
      outDir: path.resolve(options.outDir),
    });
    console.log(`Generated static analysis page in ${options.outDir}`);
  });

program
  .command('generate-data')
  .description('Generate analysis data as JSON')
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
    console.log(`Generated analysis data at ${options.outFile}`);
  });

program.parse();
