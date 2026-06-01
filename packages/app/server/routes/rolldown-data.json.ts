import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createError, defineEventHandler, setHeader } from 'h3';

function resolveDataPath() {
  return [
    path.resolve(process.cwd(), 'rolldown-data.json'),
    path.resolve(process.cwd(), '..', '..', 'rolldown-data.json'),
  ].find((file) => fs.existsSync(file));
}

export default defineEventHandler(async (event) => {
  const dataPath = resolveDataPath();

  if (!dataPath) {
    throw createError({
      statusCode: 404,
      statusMessage: '`rolldown-data.json` not found. Run `yarn generate-data` first.',
    });
  }

  setHeader(event, 'content-type', 'application/json; charset=utf-8');
  return readFile(dataPath, 'utf-8');
});
