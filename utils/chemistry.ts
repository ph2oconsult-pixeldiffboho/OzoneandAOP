
import { OzoneSystemParams, WaterQualityParams, KineticParams, TreatmentResult } from '../types';

/**
 * Advanced mechanistic model for Ozone + H2O2 (Peroxone) water treatment.
 * 
 * CORE KINETICS:
 * 1. MIB/Geosmin: Modeled via literature second-order rate constants (k_O3 and k_OH).
 * 2. Radical Production: Peroxone increases •OH flux significantly.
 * 3. Scavenging: DOC, pH, and Temperature adjust the radical lifetime.
 */
export const calculateTreatmentResults = (
  system: OzoneSystemParams,
  water: WaterQualityParams,
  kinetics: KineticParams
): TreatmentResult => {
  // 0. Ozone Residual & Radical Context
  const tempCorrection = 1 + (water.temperature - 20) * 0.02;
  const ozoneDemand = ((water.doc * 0.55) + 0.2) * tempCorrection;
  const h2o2Consumption = system.h2o2Dose * 0.8; 
  const calculatedResidual = Math.max(0, system.ozoneDose - ozoneDemand - h2o2Consumption);

  // Hydraulics
  const volume = system.tankLength * system.tankWidth * system.waterDepth;
  const hrt = (volume / system.flowRate) * 60; // Minutes
  const t10 = hrt * system.bafflingFactor;
  const ctValue = calculatedResidual * t10;

  // 1. Oxidation Kinetics (Second Order Basis)
  // Radical exposure (R_ct) calculation - simplified approximation for simulation
  const aopFactor = system.h2o2Dose > 0 ? (1 + (system.h2o2Dose / (system.ozoneDose || 1)) * 2) : 1;
  const phRadicalFactor = 1 + (water.ph - 7.0) * 0.5; // High pH = more OH radicals
  const scavengingImpact = 1 / (1 + (water.doc * 0.2)); 
  
  // Exposure calculation linked to hydraulic contact time
  const exposure = (system.ozoneDose * t10) / 10;
  
  // Base multipliers derived from user-defined constants
  // We use the OH constant as the primary driver since OH scavenging/radical pathway dominates for MIB/Geosmin
  // Reference base: kOH = 5e9 corresponds to ~0.65 base factor in the model
  const mibBaseFactor = (kinetics.mib_kOH / 5e9) * 0.65 + (kinetics.mib_kO3 * 0.01);
  const geosminBaseFactor = (kinetics.geosmin_kOH / 7.8e9) * 0.78 + (kinetics.geosmin_kO3 * 0.01);

  const k_eff_mib = mibBaseFactor * aopFactor * phRadicalFactor * scavengingImpact * Math.pow(1.04, water.temperature - 20);
  const k_eff_geosmin = geosminBaseFactor * aopFactor * phRadicalFactor * scavengingImpact * Math.pow(1.04, water.temperature - 20);

  const mibFrac = Math.exp(-k_eff_mib * exposure);
  const geosminFrac = Math.exp(-k_eff_geosmin * exposure);

  const finalMib = water.mib * mibFrac;
  const finalGeosmin = water.geosmin * geosminFrac;

  // 2. Bromate Formation
  const bromateSuppressionH2O2 = 1 / (1 + system.h2o2Dose * 1.5);
  const ammoniaInhibition = 1 / (1 + (water.ammonia * 5));
  let bromate = 0.004 * water.bromide * system.ozoneDose * Math.pow(1.5, water.ph - 7) * (t10 / 10);
  bromate = bromate * bromateSuppressionH2O2 * ammoniaInhibition;

  // 3. DOC
  const docMineralization = 0.018 * system.ozoneDose * (system.h2o2Dose > 0 ? 1.25 : 1);
  const finalDoc = water.doc * (1 - Math.min(0.25, docMineralization));

  // 4. Disinfection
  const tempFactorDis = Math.pow(1.07, water.temperature - 20);
  const lrvProtozoa = Math.min(4.0, (ctValue / (12.0 / tempFactorDis)));
  const lrvVirus = Math.min(4.0, (ctValue / (1.0 / tempFactorDis)) * 4);

  return {
    bromate: parseFloat(bromate.toFixed(2)),
    finalPh: parseFloat((water.ph - 0.03 * system.ozoneDose).toFixed(2)),
    finalMib: parseFloat(finalMib.toFixed(2)),
    finalGeosmin: parseFloat(finalGeosmin.toFixed(2)),
    finalDoc: parseFloat(finalDoc.toFixed(2)),
    removalMibPercent: parseFloat(((1 - mibFrac) * 100).toFixed(1)),
    removalGeosminPercent: parseFloat(((1 - geosminFrac) * 100).toFixed(1)),
    removalDocPercent: parseFloat(((1 - (finalDoc / water.doc)) * 100).toFixed(1)),
    contactTimeT10: parseFloat(t10.toFixed(1)),
    ctValue: parseFloat(ctValue.toFixed(2)),
    lrvVirus: parseFloat(lrvVirus.toFixed(2)),
    lrvBacteria: parseFloat(Math.min(4, lrvVirus * 1.2).toFixed(2)),
    lrvProtozoa: parseFloat(lrvProtozoa.toFixed(2)),
    calculatedResidual: parseFloat(calculatedResidual.toFixed(2))
  };
};

