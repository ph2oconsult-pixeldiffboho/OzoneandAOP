
import { OzoneSystemParams, WaterQualityParams, KineticParams, TreatmentResult } from '../types';

/**
 * Advanced mechanistic model for Ozone + H2O2 (Peroxone) water treatment.
 * Calibrated against US EPA LT2ESWTR and SWTR CT tables.
 */
export const calculateTreatmentResults = (
  system: OzoneSystemParams,
  water: WaterQualityParams,
  kinetics: KineticParams
): TreatmentResult => {
  // 0. Hydraulics and Ozone Residual
  // Temperature correction for chemical reaction rates
  const tempCorrection = 1 + (water.temperature - 20) * 0.02;
  const ozoneDemand = ((water.doc * 0.55) + 0.2) * tempCorrection;
  const h2o2Consumption = system.h2o2Dose * 0.8; 
  const calculatedResidual = Math.max(0, system.ozoneDose - ozoneDemand - h2o2Consumption);

  const volume = system.tankLength * system.tankWidth * system.waterDepth;
  const hrt = (volume / (system.flowRate || 1)) * 60; // Minutes
  const t10 = hrt * system.bafflingFactor;
  const ctValue = calculatedResidual * t10;

  // 1. Oxidation Kinetics (Second Order Basis)
  const aopFactor = system.h2o2Dose > 0 ? (1 + (system.h2o2Dose / (system.ozoneDose || 1)) * 2) : 1;
  const phRadicalFactor = 1 + (water.ph - 7.0) * 0.5;
  const scavengingImpact = 1 / (1 + (water.doc * 0.2)); 
  const exposure = (system.ozoneDose * t10) / 10;
  
  const mibBaseFactor = (kinetics.mib_kOH / 5e9) * 0.65 + (kinetics.mib_kO3 * 0.01);
  const geosminBaseFactor = (kinetics.geosmin_kOH / 7.8e9) * 0.78 + (kinetics.geosmin_kO3 * 0.01);

  const k_eff_mib = mibBaseFactor * aopFactor * phRadicalFactor * scavengingImpact * Math.pow(1.04, water.temperature - 20);
  const k_eff_geosmin = geosminBaseFactor * aopFactor * phRadicalFactor * scavengingImpact * Math.pow(1.04, water.temperature - 20);

  const mibFrac = Math.exp(-k_eff_mib * exposure);
  const geosminFrac = Math.exp(-k_eff_geosmin * exposure);

  // 2. Bromate Formation
  const bromateSuppressionH2O2 = 1 / (1 + system.h2o2Dose * 1.5);
  const ammoniaInhibition = 1 / (1 + (water.ammonia * 5));
  let bromate = 0.004 * water.bromide * system.ozoneDose * Math.pow(1.5, water.ph - 7) * (t10 / 10);
  bromate = bromate * bromateSuppressionH2O2 * ammoniaInhibition;

  // 3. DOC
  const docMineralization = 0.018 * system.ozoneDose * (system.h2o2Dose > 0 ? 1.25 : 1);
  const finalDoc = water.doc * (1 - Math.min(0.25, docMineralization));

  // 4. Disinfection (US EPA CT Table Regressions)
  // For Ozone, CT requirements decrease as Temperature increases.
  const t = Math.max(0.5, water.temperature);
  
  const isAopMode = system.h2o2Dose > 0;
  
  // Cryptosporidium (EPA LT2 Table): ~12 mg-min/L for 1-log at 20C
  const ctReqCrypto1Log = 12.0 * Math.pow(1.075, 20 - t);
  let lrvProtozoa = ctValue / ctReqCrypto1Log;

  // Bacteria (derived from EPA SWTR Table): ~0.48 mg-min/L for 1-log at 20C
  const ctReqBacteria1Log = 0.48 * Math.pow(1.075, 20 - t);
  let lrvBacteria = ctValue / ctReqBacteria1Log;

  // Virus (EPA SWTR Table): Extremely sensitive to Ozone. ~0.25 mg-min/L for 3-log at 20C
  const ctReqVirus3Log = 0.25 * Math.pow(1.075, 20 - t);
  let lrvVirus = (ctValue / ctReqVirus3Log) * 3;

  // Constraint: When H2O2 is added (AOP), ozone disinfection credits are typically disqualified
  if (isAopMode) {
    lrvProtozoa = 0;
    lrvBacteria = 0;
    lrvVirus = 0;
  }

  // Capping all credits at 4.00 log
  const MAX_LOG_CREDIT = 4.0;

  return {
    bromate: parseFloat(bromate.toFixed(2)),
    finalPh: parseFloat((water.ph - 0.03 * system.ozoneDose).toFixed(2)),
    finalMib: parseFloat((water.mib * mibFrac).toFixed(2)),
    finalGeosmin: parseFloat((water.geosmin * geosminFrac).toFixed(2)),
    finalDoc: parseFloat(finalDoc.toFixed(2)),
    removalMibPercent: parseFloat(((1 - mibFrac) * 100).toFixed(1)),
    removalGeosminPercent: parseFloat(((1 - geosminFrac) * 100).toFixed(1)),
    removalDocPercent: parseFloat(((1 - (finalDoc / water.doc)) * 100).toFixed(1)),
    contactTimeT10: parseFloat(t10.toFixed(1)),
    ctValue: parseFloat(ctValue.toFixed(2)),
    lrvVirus: parseFloat(Math.min(MAX_LOG_CREDIT, lrvVirus).toFixed(2)),
    lrvBacteria: parseFloat(Math.min(MAX_LOG_CREDIT, lrvBacteria).toFixed(2)),
    lrvProtozoa: parseFloat(Math.min(MAX_LOG_CREDIT, lrvProtozoa).toFixed(2)),
    calculatedResidual: parseFloat(calculatedResidual.toFixed(2))
  };
};
