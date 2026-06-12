import { readdir, writeFile } from 'fs/promises';
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

    // Skip excluded directories
    if (entry.isDirectory()) {
      if (EXCLUDED.includes(entry.name)) continue;
      files.push(...await collectFiles(fullPath, root));
      continue;
    }

    // Skip excluded file patterns
    if (EXCLUDED_FILE_PATTERNS.some(p => p.test(entry.name))) continue;

    // Convert backslashes to forward slashes for consistency
    files.push(relPath.replace(/\\/g, '/'));
  }

  return files;
}

async function main() {
  const rootDir = process.cwd();
  const files = await collectFiles(rootDir);

  // Sort for consistent output
  files.sort();

  // Output to console
  files.forEach((f: string) => console.log(f));

  // Optionally write to file
  const outputFile = 'project-files.txt';
  await writeFile(outputFile, files.join('\n'), 'utf8');
  console.error(`\nTotal files: ${files.length}`);
  console.error(`Written to ${outputFile}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
