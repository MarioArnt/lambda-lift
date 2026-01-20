import { createZipFile } from './create-zip';
import archiver from 'archiver';
import fg from 'fast-glob';
import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';

jest.mock('archiver');
jest.mock('fast-glob');
jest.mock('node:fs');
jest.mock('node:fs/promises');

describe('createZipFile', () => {
  const mockArchive = {
    pipe: jest.fn(),
    file: jest.fn(),
    finalize: jest.fn(),
    on: jest.fn(),
  };

  const mockWriteStream = {
    on: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (archiver as unknown as jest.Mock).mockReturnValue(mockArchive);
    (createWriteStream as jest.Mock).mockReturnValue(mockWriteStream);
    (mkdir as jest.Mock).mockResolvedValue(undefined);
    (fg.sync as jest.Mock).mockReturnValue([]);

    // Setup default event handlers
    mockArchive.on.mockImplementation((event: string, _handler: any) => {
      if (event === 'error') {
        // Store error handler
      }
      return mockArchive;
    });

    mockWriteStream.on.mockImplementation((event: string, handler: any) => {
      if (event === 'close') {
        // Auto-trigger close event for successful tests
        setTimeout(() => handler(), 0);
      }
      return mockWriteStream;
    });
  });

  it('should create output directory if it does not exist', async () => {
    const outputPath = '/path/to/output/bundle.zip';
    (fg.sync as jest.Mock).mockReturnValue([]);

    await createZipFile(['dist/**'], outputPath);

    expect(mkdir).toHaveBeenCalledWith('/path/to/output', { recursive: true });
  });

  it('should reject pre-built zip files', async () => {
    await expect(createZipFile('pre-built.zip', '/output/bundle.zip')).rejects.toThrow(
      'Pre-built zip files should be handled separately'
    );
  });

  it('should handle single glob pattern', async () => {
    (fg.sync as jest.Mock).mockReturnValue(['file1.js', 'file2.js']);

    await createZipFile('dist/**/*.js', '/output/bundle.zip');

    expect(mockArchive.file).toHaveBeenCalledTimes(2);
    expect(mockArchive.file).toHaveBeenCalledWith(expect.stringContaining('file1.js'), {
      name: 'file1.js',
    });
  });

  it('should handle array of glob patterns', async () => {
    (fg.sync as jest.Mock).mockReturnValueOnce(['file1.js']).mockReturnValueOnce(['file2.ts']);

    await createZipFile(['dist/**/*.js', 'src/**/*.ts'], '/output/bundle.zip');

    expect(fg.sync).toHaveBeenCalledTimes(2);
    expect(mockArchive.file).toHaveBeenCalledTimes(2);
  });

  it('should handle mapped globs object', async () => {
    (fg.sync as jest.Mock).mockReturnValueOnce(['index.js']).mockReturnValueOnce(['lib/helper.js']);

    const files = {
      '.': ['index.js'],
      lib: ['lib/**/*.js'],
    };

    await createZipFile(files, '/output/bundle.zip');

    expect(mockArchive.file).toHaveBeenCalledWith(expect.stringContaining('index.js'), {
      name: 'index.js',
    });
    expect(mockArchive.file).toHaveBeenCalledWith(expect.stringContaining('lib/helper.js'), {
      name: 'lib/lib/helper.js',
    });
  });

  it('should use custom base directory', async () => {
    (fg.sync as jest.Mock).mockReturnValue(['file.js']);

    await createZipFile(['**/*.js'], '/output/bundle.zip', '/custom/base');

    expect(fg.sync).toHaveBeenCalledWith('**/*.js', {
      cwd: '/custom/base',
      dot: true,
      onlyFiles: true,
    });
  });

  it('should finalize the archive', async () => {
    (fg.sync as jest.Mock).mockReturnValue([]);

    await createZipFile(['dist/**'], '/output/bundle.zip');

    expect(mockArchive.finalize).toHaveBeenCalled();
  });

  it('should pipe archive to output stream', async () => {
    (fg.sync as jest.Mock).mockReturnValue([]);

    await createZipFile(['dist/**'], '/output/bundle.zip');

    expect(mockArchive.pipe).toHaveBeenCalledWith(mockWriteStream);
  });

  it('should reject on archive error', async () => {
    const error = new Error('Archive error');

    mockWriteStream.on.mockImplementation(() => mockWriteStream);
    mockArchive.on.mockImplementation((event: string, handler: any) => {
      if (event === 'error') {
        setTimeout(() => handler(error), 0);
      }
      return mockArchive;
    });

    await expect(createZipFile(['dist/**'], '/output/bundle.zip')).rejects.toThrow('Archive error');
  });

  it('should create archive with maximum compression', async () => {
    (fg.sync as jest.Mock).mockReturnValue([]);

    await createZipFile(['dist/**'], '/output/bundle.zip');

    expect(archiver).toHaveBeenCalledWith('zip', { zlib: { level: 9 } });
  });

  it('should handle multiple patterns in mapped object values', async () => {
    (fg.sync as jest.Mock).mockReturnValueOnce(['file1.js']).mockReturnValueOnce(['file2.js']);

    const files = {
      lib: ['src/**/*.js', 'dist/**/*.js'],
    };

    await createZipFile(files, '/output/bundle.zip');

    expect(fg.sync).toHaveBeenCalledTimes(2);
    expect(mockArchive.file).toHaveBeenCalledTimes(2);
  });
});
