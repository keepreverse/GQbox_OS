import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, relative } from 'path';

const EXCLUDED = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
  '.cache',
  '.husky',
  '.idea',
  '.vscode',
];

const EXCLUDED_FILE_PATTERNS = [
  /\.rar$/,
  /\.zip$/,
  /\.tar\.gz$/,
  /\.7z$/,
  /\.log$/,
  /\.tmp$/,
  /\.temp$/,
];

async function collectFiles(dir: string, root: string = dir): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(root, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED.includes(entry.name)) continue;
      files.push(...await collectFiles(fullPath, root));
      continue;
    }

    if (EXCLUDED_FILE_PATTERNS.some(p => p.test(entry.name))) continue;

    files.push(relPath.replace(/\\/g, '/'));
  }

  return files;
}

function toFlatName(relPath: string): string {
  return relPath.replace(/\//g, '__').replace(/\\/g, '__') + '.txt';
}

async function main() {
  const rootDir = process.cwd();
  const outDir = join(rootDir, 'project-as-text');
  await mkdir(outDir, { recursive: true });

  const files = await collectFiles(rootDir);
  files.sort();

  let copied = 0;
  let skipped = 0;

  for (const relPath of files) {
    const src = join(rootDir, ...relPath.split('/'));
    const destName = toFlatName(relPath);
    const dest = join(outDir, destName);

    try {
      const content = await readFile(src, 'utf8');
      const header = `// File: ${relPath}\n\n`;
      await writeFile(dest, header + content, 'utf8');
      copied++;
    } catch {
      skipped++;
    }
  }

  console.log(`Copied: ${copied}`);
  console.log(`Skipped (binary/read errors): ${skipped}`);
  console.log(`Output: ${outDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});