export const directCloudRequestBytes = 4_000_000;
export const cloudRequestBytes = 54_000_000;
export const cloudChunkBytes = 2_500_000;
export const cloudMaxParts = Math.ceil(cloudRequestBytes / cloudChunkBytes);
