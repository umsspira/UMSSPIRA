export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kilobytes = (bytes / 1024).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `${kilobytes} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
