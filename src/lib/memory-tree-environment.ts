// Coordinates are fractions of the original painting, measured from its top left.
export const environmentWorld = { width: 1672, height: 941 } as const;

export const environmentAnchors = {
  root: { x: .486, y: .842, label: 'Root flare' },
  fork: { x: .488, y: .500, label: 'Main fork' },
  crown: { x: .493, y: .135, label: 'Upper crown' },
  left: { x: .341, y: .527, label: 'Left bough' },
  right: { x: .652, y: .519, label: 'Right bough' },
  peak: { x: .927, y: .466, label: 'Right peak' },
  horizon: { x: .500, y: .791, label: 'Valley horizon' },
} as const;

// Painter's order, back to front. The final two slots accept live content.
export const environmentLayers = [
  { id: 'sky', label: 'Sky' },
  { id: 'clouds-distant', label: 'Distant clouds' },
  { id: 'clouds-primary', label: 'Primary clouds' },
  { id: 'mountains-distant', label: 'Distant mountains' },
  { id: 'mountains-right', label: 'Right mountain range' },
  { id: 'valley', label: 'Valley' },
  { id: 'vegetation', label: 'Background vegetation' },
  { id: 'meadow', label: 'Meadow' },
  { id: 'tree-shadow', label: 'Tree shadow' },
  { id: 'tree-wood', label: 'Trunk and branches' },
  { id: 'foliage-upper', label: 'Upper foliage' },
  { id: 'foliage-left', label: 'Left foliage' },
  { id: 'foliage-right', label: 'Right foliage' },
  { id: 'grass', label: 'Foreground grass' },
  { id: 'wildflowers', label: 'Foreground flowers' },
  { id: 'finches', label: 'Two finches' },
  { id: 'memory-markers', label: 'Memory markers' },
] as const;

export type LayerId = typeof environmentLayers[number]['id'];
export type LiveLayerId = 'finches' | 'memory-markers';
export type PaintedLayerId = Exclude<LayerId, LiveLayerId>;
export type WorldBounds = { x: number; y: number; width: number; height: number };
export const originalWorldBounds: WorldBounds = { x: 0, y: 0, width: 1, height: 1 };

// Fit the painted extent while keeping the original coordinate space for every layer.
export function frameEnvironment(bounds = originalWorldBounds) {
  const { x, y, width, height } = bounds;
  return {
    aspect: (environmentWorld.width * width) / (environmentWorld.height * height),
    registration: { x: -x / width, y: -y / height, width: 1 / width, height: 1 / height },
  };
}

export type EnvironmentPlate = {
  src: string;
  smallSrc?: string;
  // Tight crops and overscanned plates can use any rect in world coordinates.
  bounds?: WorldBounds;
  // Optional alpha matte, registered to the same rectangle as its plate.
  mask?: string;
  pivot?: { x: number; y: number };
};

export type EnvironmentAssets = Partial<Record<PaintedLayerId, EnvironmentPlate>>;
export const masterPlate: EnvironmentPlate = {
  src: '/memory-tree/environment/master.webp',
  smallSrc: '/memory-tree/environment/master-960.webp',
};

// Fill these slots only with approved, reconstructed artwork.
export const suppliedPlates: EnvironmentAssets = {};

export function isPaintedLayer(id: LayerId): id is PaintedLayerId {
  return id !== 'finches' && id !== 'memory-markers';
}

export function hasCompletePainting(assets: EnvironmentAssets) {
  return environmentLayers.every(({ id }) => !isPaintedLayer(id) || Boolean(assets[id]));
}
