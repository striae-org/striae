export type ClassType = 'Bullet' | 'Cartridge Case' | 'Shotshell' | 'Other';

export const CUSTOM = '__custom__';

export const PISTOL_CALIBERS: string[] = [
  '.22 LR',
  '.25 ACP',
  '.32 ACP',
  '.380 ACP (9 mm Kurz, 9×17)',
  '9 mm Luger / 9×19 (9 mm Parabellum, 9 mm NATO)',
  '.38 Special',
  '.357 Magnum',
  '.40 S&W',
  '10 mm Auto',
  '.44 Special',
  '.44 Magnum',
  '.45 ACP',
  '.45 Colt (.45 Long Colt)',
  '.454 Casull',
  '.50 AE',
];

export const RIFLE_CALIBERS: string[] = [
  '.22 LR',
  '.17 HMR',
  '.22 WMR (.22 Magnum)',
  '.223 Remington / 5.56×45 NATO',
  '.243 Winchester',
  '6 mm Creedmoor / .243 class',
  '6.5×55 Swedish',
  '6.5 Creedmoor',
  '.270 Winchester',
  '7 mm-08 Remington / 7 mm Remington Magnum',
  '.30-30 Winchester',
  '.308 Winchester / 7.62×51 NATO',
  '.30-06 Springfield',
  '7.62×39 (AK family)',
  '7.62×54R',
  '.300 Winchester Magnum',
  '.300 AAC Blackout',
  '.338 Winchester Magnum',
  '.45-70 Government',
  '.50 BMG (12.7×99)',
];

export const SHOTSHELL_GAUGES: string[] = [
  '10 gauge',
  '12 gauge',
  '16 gauge',
  '20 gauge',
  '28 gauge',
  '.410 bore',
];

export const ALL_CALIBERS: string[] = [...PISTOL_CALIBERS, ...RIFLE_CALIBERS];
export const BULLET_JACKET_METAL_OPTIONS = ['Cu', 'Brass', 'Ni-plated', 'Al', 'Steel', 'None'] as const;
export const BULLET_CORE_METAL_OPTIONS = ['Pb', 'Steel'] as const;
export const BULLET_TYPE_OPTIONS = ['FMJ', 'TMJ', 'HP', 'WC'] as const;
export const BULLET_BARREL_TYPE_OPTIONS = ['Conventional', 'Polygonal'] as const;
export const CARTRIDGE_METAL_OPTIONS = ['Brass', 'Ni-plated', 'Al', 'Steel'] as const;
export const CARTRIDGE_PRIMER_TYPE_OPTIONS = ['CF', 'RF'] as const;
export const CARTRIDGE_FPI_SHAPE_OPTIONS = ['Circular', 'Elliptical', 'Rectangular/Square', 'Tear-drop'] as const;
export const CARTRIDGE_APERTURE_SHAPE_OPTIONS = ['Circular', 'Rectangular'] as const;

export const handleSelectWithCustom = (
  value: string,
  setValue: (nextValue: string) => void,
  setIsCustom: (nextValue: boolean) => void,
) => {
  if (value === CUSTOM) {
    setIsCustom(true);
    setValue('');
    return;
  }

  setIsCustom(false);
  setValue(value);
};

export const isCustomValue = (value: string | undefined, knownValues: readonly string[]): boolean =>
  value !== undefined && value !== '' && !knownValues.includes(value);

export const parseMeasurementValue = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const formatCalculatedDiameter = (value: number): string =>
  value.toFixed(4).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');

export const calculateBulletDiameter = (
  lgCount: number,
  lWidths: string[],
  gWidths: string[],
): number | null => {
  if (lgCount <= 0) return null;

  const lWidthValues = lWidths.slice(0, lgCount).map(parseMeasurementValue);
  const gWidthValues = gWidths.slice(0, lgCount).map(parseMeasurementValue);
  const hasAllMeasurements = lWidthValues.length === lgCount
    && gWidthValues.length === lgCount
    && lWidthValues.every((value) => value !== null)
    && gWidthValues.every((value) => value !== null);

  if (!hasAllMeasurements) return null;

  const lAverage = lWidthValues.reduce((sum, value) => sum + (value ?? 0), 0) / lgCount;
  const gAverage = gWidthValues.reduce((sum, value) => sum + (value ?? 0), 0) / lgCount;
  const circumference = (lAverage + gAverage) * lgCount;

  return circumference / Math.PI;
};