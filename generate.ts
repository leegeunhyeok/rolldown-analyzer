import fs from 'node:fs';
import path from 'node:path';

import { generateData } from './src/node';

if (!process.env.LOGS_PATH || !process.env.META_PATH) {
  throw new Error('LOGS_PATH and META_PATH are required');
}

const data = await generateData({
  logsPath: process.env.LOGS_PATH,
  metaPath: process.env.META_PATH,
});

fs.writeFileSync(path.join(process.cwd(), '.data/sample.json'), JSON.stringify(data));

console.log('Data generated successfully');
