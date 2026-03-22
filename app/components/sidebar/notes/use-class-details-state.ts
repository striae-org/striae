import { useState } from 'react';
import type {
  BulletAnnotationData,
  CartridgeCaseAnnotationData,
  ShotshellAnnotationData,
} from '~/types/annotations';
import {
  ALL_CALIBERS,
  BULLET_BARREL_TYPE_OPTIONS,
  BULLET_CORE_METAL_OPTIONS,
  BULLET_JACKET_METAL_OPTIONS,
  BULLET_TYPE_OPTIONS,
  CARTRIDGE_APERTURE_SHAPE_OPTIONS,
  CARTRIDGE_FPI_SHAPE_OPTIONS,
  CARTRIDGE_METAL_OPTIONS,
  CARTRIDGE_PRIMER_TYPE_OPTIONS,
  SHOTSHELL_GAUGES,
  calculateBulletDiameter,
  formatCalculatedDiameter,
  isCustomValue,
} from './class-details-shared';

interface UseClassDetailsStateParams {
  bulletData?: BulletAnnotationData;
  cartridgeCaseData?: CartridgeCaseAnnotationData;
  shotshellData?: ShotshellAnnotationData;
}

interface BuildSaveDataParams {
  showBullet: boolean;
  showCartridge: boolean;
  showShotshell: boolean;
}

interface BuildSaveDataResult {
  bulletData: BulletAnnotationData | undefined;
  cartridgeCaseData: CartridgeCaseAnnotationData | undefined;
  shotshellData: ShotshellAnnotationData | undefined;
}

export interface BulletDetailsState {
  caliber: string;
  caliberIsCustom: boolean;
  mass: string;
  diameter: string;
  lgNumber: string;
  lgDirection: string;
  lWidths: string[];
  gWidths: string[];
  jacketMetal: string;
  jacketMetalIsCustom: boolean;
  coreMetal: string;
  coreMetalIsCustom: boolean;
  bulletType: string;
  bulletTypeIsCustom: boolean;
  barrelType: string;
  barrelTypeIsCustom: boolean;
  lgCount: number;
  calculatedDiameter: number | null;
  setCaliber: (value: string) => void;
  setCaliberIsCustom: (value: boolean) => void;
  setMass: (value: string) => void;
  setDiameter: (value: string) => void;
  setLgNumber: (value: string) => void;
  setLgDirection: (value: string) => void;
  updateLWidth: (index: number, value: string) => void;
  updateGWidth: (index: number, value: string) => void;
  setJacketMetal: (value: string) => void;
  setJacketMetalIsCustom: (value: boolean) => void;
  setCoreMetal: (value: string) => void;
  setCoreMetalIsCustom: (value: boolean) => void;
  setBulletType: (value: string) => void;
  setBulletTypeIsCustom: (value: boolean) => void;
  setBarrelType: (value: string) => void;
  setBarrelTypeIsCustom: (value: boolean) => void;
}

export interface CartridgeCaseDetailsState {
  caliber: string;
  caliberIsCustom: boolean;
  brand: string;
  metal: string;
  metalIsCustom: boolean;
  primerType: string;
  primerTypeIsCustom: boolean;
  fpiShape: string;
  fpiShapeIsCustom: boolean;
  apertureShape: string;
  apertureShapeIsCustom: boolean;
  hasFpDrag: boolean;
  hasExtractorMarks: boolean;
  hasEjectorMarks: boolean;
  hasChamberMarks: boolean;
  hasMagazineLipMarks: boolean;
  hasPrimerShear: boolean;
  hasEjectionPortMarks: boolean;
  setCaliber: (value: string) => void;
  setCaliberIsCustom: (value: boolean) => void;
  setBrand: (value: string) => void;
  setMetal: (value: string) => void;
  setMetalIsCustom: (value: boolean) => void;
  setPrimerType: (value: string) => void;
  setPrimerTypeIsCustom: (value: boolean) => void;
  setFpiShape: (value: string) => void;
  setFpiShapeIsCustom: (value: boolean) => void;
  setApertureShape: (value: string) => void;
  setApertureShapeIsCustom: (value: boolean) => void;
  setHasFpDrag: (value: boolean) => void;
  setHasExtractorMarks: (value: boolean) => void;
  setHasEjectorMarks: (value: boolean) => void;
  setHasChamberMarks: (value: boolean) => void;
  setHasMagazineLipMarks: (value: boolean) => void;
  setHasPrimerShear: (value: boolean) => void;
  setHasEjectionPortMarks: (value: boolean) => void;
}

export interface ShotshellDetailsState {
  gauge: string;
  gaugeIsCustom: boolean;
  shotSize: string;
  metal: string;
  metalIsCustom: boolean;
  brand: string;
  fpiShape: string;
  fpiShapeIsCustom: boolean;
  hasExtractorMarks: boolean;
  hasEjectorMarks: boolean;
  hasChamberMarks: boolean;
  setGauge: (value: string) => void;
  setGaugeIsCustom: (value: boolean) => void;
  setShotSize: (value: string) => void;
  setMetal: (value: string) => void;
  setMetalIsCustom: (value: boolean) => void;
  setBrand: (value: string) => void;
  setFpiShape: (value: string) => void;
  setFpiShapeIsCustom: (value: boolean) => void;
  setHasExtractorMarks: (value: boolean) => void;
  setHasEjectorMarks: (value: boolean) => void;
  setHasChamberMarks: (value: boolean) => void;
}

export const useClassDetailsState = ({
  bulletData,
  cartridgeCaseData,
  shotshellData,
}: UseClassDetailsStateParams) => {
  const [bCaliber, setBCaliber] = useState(() => bulletData?.caliber || '');
  const [bCaliberIsCustom, setBCaliberIsCustom] = useState(() => isCustomValue(bulletData?.caliber, ALL_CALIBERS));
  const [bMass, setBMass] = useState(() => bulletData?.mass || '');
  const [bDiameter, setBDiameter] = useState(() => bulletData?.diameter || '');
  const [bLgNumber, setBLgNumber] = useState(() => bulletData?.lgNumber !== undefined ? String(bulletData.lgNumber) : '');
  const [bLgDirection, setBLgDirection] = useState(() => bulletData?.lgDirection || '');
  const [bLWidths, setBLWidths] = useState<string[]>(() => bulletData?.lWidths || []);
  const [bGWidths, setBGWidths] = useState<string[]>(() => bulletData?.gWidths || []);
  const [bJacketMetal, setBJacketMetal] = useState(() => bulletData?.jacketMetal || '');
  const [bJacketMetalIsCustom, setBJacketMetalIsCustom] = useState(() => isCustomValue(bulletData?.jacketMetal, BULLET_JACKET_METAL_OPTIONS));
  const [bCoreMetal, setBCoreMetal] = useState(() => bulletData?.coreMetal || '');
  const [bCoreMetalIsCustom, setBCoreMetalIsCustom] = useState(() => isCustomValue(bulletData?.coreMetal, BULLET_CORE_METAL_OPTIONS));
  const [bBulletType, setBBulletType] = useState(() => bulletData?.bulletType || '');
  const [bBulletTypeIsCustom, setBBulletTypeIsCustom] = useState(() => isCustomValue(bulletData?.bulletType, BULLET_TYPE_OPTIONS));
  const [bBarrelType, setBBarrelType] = useState(() => bulletData?.barrelType || '');
  const [bBarrelTypeIsCustom, setBBarrelTypeIsCustom] = useState(() => isCustomValue(bulletData?.barrelType, BULLET_BARREL_TYPE_OPTIONS));

  const [cCaliber, setCCaliber] = useState(() => cartridgeCaseData?.caliber || '');
  const [cCaliberIsCustom, setCCaliberIsCustom] = useState(() => isCustomValue(cartridgeCaseData?.caliber, ALL_CALIBERS));
  const [cBrand, setCBrand] = useState(() => cartridgeCaseData?.brand || '');
  const [cMetal, setCMetal] = useState(() => cartridgeCaseData?.metal || '');
  const [cMetalIsCustom, setCMetalIsCustom] = useState(() => isCustomValue(cartridgeCaseData?.metal, CARTRIDGE_METAL_OPTIONS));
  const [cPrimerType, setCPrimerType] = useState(() => cartridgeCaseData?.primerType || '');
  const [cPrimerTypeIsCustom, setCPrimerTypeIsCustom] = useState(() => isCustomValue(cartridgeCaseData?.primerType, CARTRIDGE_PRIMER_TYPE_OPTIONS));
  const [cFpiShape, setCFpiShape] = useState(() => cartridgeCaseData?.fpiShape || '');
  const [cFpiShapeIsCustom, setCFpiShapeIsCustom] = useState(() => isCustomValue(cartridgeCaseData?.fpiShape, CARTRIDGE_FPI_SHAPE_OPTIONS));
  const [cApertureShape, setCApertureShape] = useState(() => cartridgeCaseData?.apertureShape || '');
  const [cApertureShapeIsCustom, setCApertureShapeIsCustom] = useState(() => isCustomValue(cartridgeCaseData?.apertureShape, CARTRIDGE_APERTURE_SHAPE_OPTIONS));
  const [cHasFpDrag, setCHasFpDrag] = useState(() => cartridgeCaseData?.hasFpDrag ?? false);
  const [cHasExtractorMarks, setCHasExtractorMarks] = useState(() => cartridgeCaseData?.hasExtractorMarks ?? false);
  const [cHasEjectorMarks, setCHasEjectorMarks] = useState(() => cartridgeCaseData?.hasEjectorMarks ?? false);
  const [cHasChamberMarks, setCHasChamberMarks] = useState(() => cartridgeCaseData?.hasChamberMarks ?? false);
  const [cHasMagazineLipMarks, setCHasMagazineLipMarks] = useState(() => cartridgeCaseData?.hasMagazineLipMarks ?? false);
  const [cHasPrimerShear, setCHasPrimerShear] = useState(() => cartridgeCaseData?.hasPrimerShear ?? false);
  const [cHasEjectionPortMarks, setCHasEjectionPortMarks] = useState(() => cartridgeCaseData?.hasEjectionPortMarks ?? false);

  const [sGauge, setSGauge] = useState(() => shotshellData?.gauge || '');
  const [sGaugeIsCustom, setSGaugeIsCustom] = useState(() => isCustomValue(shotshellData?.gauge, SHOTSHELL_GAUGES));
  const [sShotSize, setSShotSize] = useState(() => shotshellData?.shotSize || '');
  const [sMetal, setSMetal] = useState(() => shotshellData?.metal || '');
  const [sMetalIsCustom, setSMetalIsCustom] = useState(() => isCustomValue(shotshellData?.metal, CARTRIDGE_METAL_OPTIONS));
  const [sBrand, setSBrand] = useState(() => shotshellData?.brand || '');
  const [sFpiShape, setSFpiShape] = useState(() => shotshellData?.fpiShape || '');
  const [sFpiShapeIsCustom, setSFpiShapeIsCustom] = useState(() => isCustomValue(shotshellData?.fpiShape, CARTRIDGE_FPI_SHAPE_OPTIONS));
  const [sHasExtractorMarks, setSHasExtractorMarks] = useState(() => shotshellData?.hasExtractorMarks ?? false);
  const [sHasEjectorMarks, setSHasEjectorMarks] = useState(() => shotshellData?.hasEjectorMarks ?? false);
  const [sHasChamberMarks, setSHasChamberMarks] = useState(() => shotshellData?.hasChamberMarks ?? false);

  const [isSaving, setIsSaving] = useState(false);

  const lgCount = Math.max(0, Math.min(30, Number(bLgNumber) || 0));
  const calculatedDiameter = calculateBulletDiameter(lgCount, bLWidths, bGWidths);

  const updateLWidth = (index: number, value: string) => {
    setBLWidths((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const updateGWidth = (index: number, value: string) => {
    setBGWidths((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const buildSaveData = ({
    showBullet,
    showCartridge,
    showShotshell,
  }: BuildSaveDataParams): BuildSaveDataResult => ({
    bulletData: showBullet ? {
      caliber: bCaliber || undefined,
      mass: bMass || undefined,
      diameter: bDiameter || undefined,
      calcDiameter: calculatedDiameter !== null ? formatCalculatedDiameter(calculatedDiameter) : undefined,
      lgNumber: bLgNumber ? Number(bLgNumber) : undefined,
      lgDirection: bLgDirection || undefined,
      lWidths: bLWidths.some(Boolean) ? bLWidths : undefined,
      gWidths: bGWidths.some(Boolean) ? bGWidths : undefined,
      jacketMetal: bJacketMetal || undefined,
      coreMetal: bCoreMetal || undefined,
      bulletType: bBulletType || undefined,
      barrelType: bBarrelType || undefined,
    } : undefined,
    cartridgeCaseData: showCartridge ? {
      caliber: cCaliber || undefined,
      brand: cBrand || undefined,
      metal: cMetal || undefined,
      primerType: cPrimerType || undefined,
      fpiShape: cFpiShape || undefined,
      apertureShape: cApertureShape || undefined,
      hasFpDrag: cHasFpDrag || undefined,
      hasExtractorMarks: cHasExtractorMarks || undefined,
      hasEjectorMarks: cHasEjectorMarks || undefined,
      hasChamberMarks: cHasChamberMarks || undefined,
      hasMagazineLipMarks: cHasMagazineLipMarks || undefined,
      hasPrimerShear: cHasPrimerShear || undefined,
      hasEjectionPortMarks: cHasEjectionPortMarks || undefined,
    } : undefined,
    shotshellData: showShotshell ? {
      gauge: sGauge || undefined,
      shotSize: sShotSize || undefined,
      metal: sMetal || undefined,
      brand: sBrand || undefined,
      fpiShape: sFpiShape || undefined,
      hasExtractorMarks: sHasExtractorMarks || undefined,
      hasEjectorMarks: sHasEjectorMarks || undefined,
      hasChamberMarks: sHasChamberMarks || undefined,
    } : undefined,
  });

  const bullet: BulletDetailsState = {
    caliber: bCaliber,
    caliberIsCustom: bCaliberIsCustom,
    mass: bMass,
    diameter: bDiameter,
    lgNumber: bLgNumber,
    lgDirection: bLgDirection,
    lWidths: bLWidths,
    gWidths: bGWidths,
    jacketMetal: bJacketMetal,
    jacketMetalIsCustom: bJacketMetalIsCustom,
    coreMetal: bCoreMetal,
    coreMetalIsCustom: bCoreMetalIsCustom,
    bulletType: bBulletType,
    bulletTypeIsCustom: bBulletTypeIsCustom,
    barrelType: bBarrelType,
    barrelTypeIsCustom: bBarrelTypeIsCustom,
    lgCount,
    calculatedDiameter,
    setCaliber: setBCaliber,
    setCaliberIsCustom: setBCaliberIsCustom,
    setMass: setBMass,
    setDiameter: setBDiameter,
    setLgNumber: setBLgNumber,
    setLgDirection: setBLgDirection,
    updateLWidth,
    updateGWidth,
    setJacketMetal: setBJacketMetal,
    setJacketMetalIsCustom: setBJacketMetalIsCustom,
    setCoreMetal: setBCoreMetal,
    setCoreMetalIsCustom: setBCoreMetalIsCustom,
    setBulletType: setBBulletType,
    setBulletTypeIsCustom: setBBulletTypeIsCustom,
    setBarrelType: setBBarrelType,
    setBarrelTypeIsCustom: setBBarrelTypeIsCustom,
  };

  const cartridgeCase: CartridgeCaseDetailsState = {
    caliber: cCaliber,
    caliberIsCustom: cCaliberIsCustom,
    brand: cBrand,
    metal: cMetal,
    metalIsCustom: cMetalIsCustom,
    primerType: cPrimerType,
    primerTypeIsCustom: cPrimerTypeIsCustom,
    fpiShape: cFpiShape,
    fpiShapeIsCustom: cFpiShapeIsCustom,
    apertureShape: cApertureShape,
    apertureShapeIsCustom: cApertureShapeIsCustom,
    hasFpDrag: cHasFpDrag,
    hasExtractorMarks: cHasExtractorMarks,
    hasEjectorMarks: cHasEjectorMarks,
    hasChamberMarks: cHasChamberMarks,
    hasMagazineLipMarks: cHasMagazineLipMarks,
    hasPrimerShear: cHasPrimerShear,
    hasEjectionPortMarks: cHasEjectionPortMarks,
    setCaliber: setCCaliber,
    setCaliberIsCustom: setCCaliberIsCustom,
    setBrand: setCBrand,
    setMetal: setCMetal,
    setMetalIsCustom: setCMetalIsCustom,
    setPrimerType: setCPrimerType,
    setPrimerTypeIsCustom: setCPrimerTypeIsCustom,
    setFpiShape: setCFpiShape,
    setFpiShapeIsCustom: setCFpiShapeIsCustom,
    setApertureShape: setCApertureShape,
    setApertureShapeIsCustom: setCApertureShapeIsCustom,
    setHasFpDrag: setCHasFpDrag,
    setHasExtractorMarks: setCHasExtractorMarks,
    setHasEjectorMarks: setCHasEjectorMarks,
    setHasChamberMarks: setCHasChamberMarks,
    setHasMagazineLipMarks: setCHasMagazineLipMarks,
    setHasPrimerShear: setCHasPrimerShear,
    setHasEjectionPortMarks: setCHasEjectionPortMarks,
  };

  const shotshell: ShotshellDetailsState = {
    gauge: sGauge,
    gaugeIsCustom: sGaugeIsCustom,
    shotSize: sShotSize,
    metal: sMetal,
    metalIsCustom: sMetalIsCustom,
    brand: sBrand,
    fpiShape: sFpiShape,
    fpiShapeIsCustom: sFpiShapeIsCustom,
    hasExtractorMarks: sHasExtractorMarks,
    hasEjectorMarks: sHasEjectorMarks,
    hasChamberMarks: sHasChamberMarks,
    setGauge: setSGauge,
    setGaugeIsCustom: setSGaugeIsCustom,
    setShotSize: setSShotSize,
    setMetal: setSMetal,
    setMetalIsCustom: setSMetalIsCustom,
    setBrand: setSBrand,
    setFpiShape: setSFpiShape,
    setFpiShapeIsCustom: setSFpiShapeIsCustom,
    setHasExtractorMarks: setSHasExtractorMarks,
    setHasEjectorMarks: setSHasEjectorMarks,
    setHasChamberMarks: setSHasChamberMarks,
  };

  return {
    bullet,
    cartridgeCase,
    shotshell,
    isSaving,
    setIsSaving,
    buildSaveData,
  };
};