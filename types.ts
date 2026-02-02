
export interface OzoneSystemParams {
  flowRate: number; // m³/h
  ozoneDose: number; // mg/L
  h2o2Dose: number; // mg/L
  tankLength: number; // m
  tankWidth: number; // m
  waterDepth: number; // m
  bafflingFactor: number; // Dimensionless (0.1 - 1.0)
}

export interface WaterQualityParams {
  ph: number;
  bromide: number; // µg/L
  ammonia: number; // mg/L
  doc: number; // mg/L
  mib: number; // ng/L
  geosmin: number; // ng/L
  temperature: number; // °C
}

export interface TreatmentResult {
  bromate: number; // µg/L
  finalPh: number;
  finalMib: number; // ng/L
  finalGeosmin: number; // ng/L
  finalDoc: number; // mg/L
  removalMibPercent: number;
  removalGeosminPercent: number;
  removalDocPercent: number;
  contactTimeT10: number; // min
  ctValue: number; // mg·min/L
  lrvVirus: number;
  lrvBacteria: number;
  lrvProtozoa: number;
  calculatedResidual: number; // mg/L
}

export interface AiAnalysis {
  summary: string;
  recommendations: string[];
  warnings: string[];
}
