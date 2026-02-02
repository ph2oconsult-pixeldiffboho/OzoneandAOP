
import { OzoneSystemParams, WaterQualityParams, TreatmentResult } from '../types';

/**
 * Advanced deterministic model for Ozone + H2O2 (Peroxone) water treatment.
 * 
 * BASIS OF MODEL:
 * 1. Ozone Demand: DOC is treated as the primary ozone sink. ~0.55 mg-O3/mg-DOC.
 * 2. Scavenging: High DOC increases radical scavenging, reducing MIB/Geosmin removal.
 * 3. DOC Removal: Mineralization capped at 20%, reflecting transformation vs full oxidation.
 * 4. Bromate: Models the Br- -> HOBr -> BrO3- pathway, with NH3 sequestration and H2O2 suppression.
 */
export const calculateTreatmentResults = (
  system: OzoneSystemParams,
  water: WaterQualityParams
): TreatmentResult => {
  // 0. Ozone Residual Calculation (Demand Model)
  const tempCorrectionDemand = 1 + (water.temperature - 20) * 0.02;
  const ozoneDemand = ((water.doc * 0.55) + 0.25) * tempCorrectionDemand;
  const h2o2Consumption = system.h2o2Dose * 0.7; 
  const calculatedResidual = Math.max(0, system.ozoneDose - ozoneDemand - h2o2Consumption);

  // Hydraulics
  const volume = system.tankLength * system.tankWidth * system.waterDepth;
  const hrt = (volume / system.flowRate) * 60; // Minutes
  const t10 = hrt * system.bafflingFactor;

  // CT Calculation
  const ctValue = calculatedResidual * t10;

  // 1. MIB and Geosmin Removal
  const baseRateMib = 0.65;
  const baseRateGeosmin = 0.82; 
  const aopEnhancement = 1 + (Math.min(2.0, system.h2o2Dose / (system.ozoneDose || 1)) * 1.5);
  const doseCt = system.ozoneDose * t10;
  const phFactor = 1 + (water.ph - 7.0) * 0.4; 
  const tempFactorOx = Math.pow(1.04, water.temperature - 20); 
  const docScavengingFactor = 1 / (1 + (water.doc * 0.15)); 

  const effectiveK_Mib = baseRateMib * phFactor * tempFactorOx * docScavengingFactor * aopEnhancement;
  const effectiveK_Geosmin = baseRateGeosmin * phFactor * tempFactorOx * docScavengingFactor * aopEnhancement;

  const mibRemainingFrac = Math.exp(-effectiveK_Mib * (doseCt / 10));
  const geosminRemainingFrac = Math.exp(-effectiveK_Geosmin * (doseCt / 10));

  const finalMib = water.mib * mibRemainingFrac;
  const finalGeosmin = water.geosmin * geosminRemainingFrac;

  // 2. Bromate Formation & Ammonia Inhibition
  // H2O2 suppresses Bromate by reducing HOBr back to Br-.
  const bromateSuppressionH2O2 = 1 / (1 + system.h2o2Dose * 0.8);
  
  // Ammonia inhibits bromate by sequestering HOBr as Bromamines.
  // This is more effective at lower pH where HOBr dominates over OBr-.
  const ammoniaEffectiveness = 6.0 / (1 + Math.exp(water.ph - 8.5)); 
  const ammoniaInhibition = Math.max(0.02, 1 / (1 + (water.ammonia * ammoniaEffectiveness)));

  let bromate = 0.005 * water.bromide * system.ozoneDose * Math.pow(1.6, water.ph - 7) * (t10 / 10) * tempFactorOx;
  bromate = bromate * bromateSuppressionH2O2 * ammoniaInhibition;

  // 3. DOC Mineralization
  const docRemovalEfficiency = 0.015 * system.ozoneDose * (1 + (system.h2o2Dose > 0 ? 0.2 : 0)); 
  const finalDoc = water.doc * (1 - Math.min(0.20, docRemovalEfficiency));

  // 4. pH Change
  const finalPh = water.ph - (0.05 * system.ozoneDose);

  // 5. Disinfection LRVs
  const tempFactorDis = Math.pow(1.07, water.temperature - 20);
  const ctFor1LogCrypto = 12.0 / tempFactorDis;
  const lrvProtozoa = Math.min(4.0, Math.max(0, (ctValue / (ctFor1LogCrypto || 1))));
  const ctFor4LogVirus = 1.0 / tempFactorDis;
  const lrvVirus = Math.min(4.0, Math.max(0, (ctValue / (ctFor4LogVirus || 1)) * 4));
  const lrvBacteria = Math.min(4.0, lrvVirus * 1.5);

  return {
    bromate: parseFloat(bromate.toFixed(2)),
    finalPh: parseFloat(finalPh.toFixed(2)),
    finalMib: parseFloat(finalMib.toFixed(2)),
    finalGeosmin: parseFloat(finalGeosmin.toFixed(2)),
    finalDoc: parseFloat(finalDoc.toFixed(2)),
    removalMibPercent: parseFloat(((1 - mibRemainingFrac) * 100).toFixed(1)),
    removalGeosminPercent: parseFloat(((1 - geosminRemainingFrac) * 100).toFixed(1)),
    removalDocPercent: parseFloat(((1 - (finalDoc / water.doc)) * 100).toFixed(1)),
    contactTimeT10: parseFloat(t10.toFixed(1)),
    ctValue: parseFloat(ctValue.toFixed(2)),
    lrvVirus: parseFloat(lrvVirus.toFixed(2)),
    lrvBacteria: parseFloat(lrvBacteria.toFixed(2)),
    lrvProtozoa: parseFloat(lrvProtozoa.toFixed(2)),
    calculatedResidual: parseFloat(calculatedResidual.toFixed(2))
  };
};
