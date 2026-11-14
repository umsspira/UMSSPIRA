import { formatFileSize } from './format-file-size';

describe('formatFileSize', () => {
  it('formats files below one megabyte in kilobytes', () => {
    expect(formatFileSize(512 * 1024)).toBe('512 KB');
    expect(formatFileSize(1536)).toBe('1,5 KB');
  });

  it('formats files of one megabyte or larger in megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1,0 MB');
    expect(formatFileSize(1536 * 1024)).toBe('1,5 MB');
  });
});
