export function formatFileSize(sizeInKb: number): string {
  if (sizeInKb < 1024) return `${Math.round(sizeInKb)} KB`
  return `${(sizeInKb / 1024).toFixed(1)} MB`
}
