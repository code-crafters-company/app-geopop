#!/usr/bin/env node
// Executa `maestro test` repassando as variáveis de e2e/.env via `-e`.
// Necessário porque nem toda versão do Maestro CLI suporta `--env-file`
// (a 2.6.x, por exemplo, só aceita `-e/--env`).
// Uso: node scripts/run-maestro.mjs e2e/flows/01_login.yaml [outros.yaml...]
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const envPath = 'e2e/.env';
const envArgs = [];
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !line.trim().startsWith('#')) envArgs.push('-e', `${match[1]}=${match[2]}`);
  }
}

const result = spawnSync('maestro', ['test', ...process.argv.slice(2), ...envArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
process.exit(result.status ?? 1);
