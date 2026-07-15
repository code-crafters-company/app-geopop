import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { parseAllDocuments } from 'yaml';

const root = path.resolve('e2e');
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(target);
    else if (entry.name.endsWith('.yaml')) files.push(target);
  }
}

collect(root);
const failures = [];

for (const file of files) {
  const documents = parseAllDocuments(fs.readFileSync(file, 'utf8'));
  for (const document of documents) {
    for (const error of document.errors) failures.push(`${path.relative(root, file)}: ${error.message}`);
  }

  if (documents.length !== 2) {
    failures.push(`${path.relative(root, file)}: esperado cabecalho e comandos separados por ---`);
    continue;
  }

  const header = documents[0].toJS();
  const commands = documents[1].toJS();
  if (header?.appId !== 'br.com.codecrafters.geopop') failures.push(`${path.relative(root, file)}: appId invalido`);
  if (!Array.isArray(commands) || commands.length === 0) failures.push(`${path.relative(root, file)}: fluxo sem comandos`);

  for (const command of Array.isArray(commands) ? commands : []) {
    if (typeof command?.runFlow !== 'string') continue;
    const referenced = path.resolve(path.dirname(file), command.runFlow);
    if (!fs.existsSync(referenced)) failures.push(`${path.relative(root, file)}: runFlow inexistente ${command.runFlow}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`${files.length} fluxos Maestro validos.`);
