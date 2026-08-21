import * as fs from 'node:fs/promises';
import path from 'node:path';

const distFolders = (await fs.readdir(process.cwd()))
  .filter((file) => file === 'dist')
  .map((file) => path.join(process.cwd(), file));

if (distFolders.length === 0) {
  console.error('No dist folder found, run `npm run build` first.');
  process.exit(1);
}
const distFolder = distFolders[0];
const functionsFolder = path.join(distFolder, 'src', 'functions');
const foldersToCheck = [functionsFolder];

const functionsFolders = [path.join(distFolder, 'src', 'common')];

while (foldersToCheck.length > 0) {
  const folder = foldersToCheck.pop();
  const files = await fs.readdir(folder);
  if (files.includes('index.js')) {
    functionsFolders.push(folder);
    continue;
  }
  for (const file of files) {
    const filePath = path.join(folder, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      foldersToCheck.push(filePath);
    }
  }
}

const packageFile = JSON.stringify({ type: 'module' });

const errors = (
  await Promise.allSettled(
    functionsFolders.map(async (folder) => {
      await Promise.all([fs.writeFile(path.join(folder, 'package.json'), packageFile, 'utf-8')]);
    })
  )
)
  .map((response) => (response.status === 'rejected' ? (response.reason ?? null) : null))
  .filter((response) => response !== null);

if (errors.length > 0) {
  errors.forEach((error) => console.error(error));
  process.exit(1);
}
