import archiver from 'archiver';
import fg from 'fast-glob';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

export const createZipFile = async (
  files: string | string[] | Record<string, string | string[]>,
  outputPath: string,
  baseDir: string = process.cwd()
): Promise<string> => {
  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve(outputPath);
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Handle different file formats
    if (typeof files === 'string') {
      // Single file or pre-built zip
      if (files.endsWith('.zip')) {
        reject(new Error('Pre-built zip files should be handled separately'));
        return;
      }
      // Single glob pattern
      addGlobToArchive(archive, files, '.', baseDir);
    } else if (Array.isArray(files)) {
      // Array of glob patterns
      for (const pattern of files) {
        addGlobToArchive(archive, pattern, '.', baseDir);
      }
    } else {
      // Object with path mappings
      for (const [destPath, patterns] of Object.entries(files)) {
        const patternArray = Array.isArray(patterns) ? patterns : [patterns];
        for (const pattern of patternArray) {
          addGlobToArchive(archive, pattern, destPath, baseDir);
        }
      }
    }

    archive.finalize();
  });
};

function addGlobToArchive(
  archive: archiver.Archiver,
  pattern: string,
  destPath: string,
  baseDir: string
): void {
  const matches = fg.sync(pattern, {
    cwd: baseDir,
    dot: true,
    onlyFiles: true,
  });

  for (const file of matches) {
    const filePath = join(baseDir, file);
    // Normalize destination path
    const destination = destPath === '.' ? file : join(destPath, file);
    archive.file(filePath, { name: destination });
  }
}
