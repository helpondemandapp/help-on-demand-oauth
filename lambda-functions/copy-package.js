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

const functionsFolders = (await fs.readdir(functionsFolder)).map((folder) => path.join(functionsFolder, folder));
functionsFolders.push(path.join(distFolder, 'src', 'common'));

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
