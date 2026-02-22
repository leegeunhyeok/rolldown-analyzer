import { fileURLToPath } from 'node:url';

export const frontendPublicPath = fileURLToPath(new URL('./public', import.meta.dirname));
