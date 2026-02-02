
import { GoogleGenAI, Type } from "@google/genai";
import { OzoneSystemParams, WaterQualityParams, TreatmentResult, AiAnalysis } from "../types";

export const getExpertAnalysis = async (
  system: OzoneSystemParams,
  water: WaterQualityParams,
  result: TreatmentResult
): Promise<AiAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isAop = system.h2o2Dose > 0;

  const prompt = `
    Analyze the following water ozone treatment simulation results as a senior water process engineer. 
    ${isAop ? 'The system is operating in Peroxone (O3/H2O2) Advanced Oxidation Mode.' : 'The system is operating in standard Ozonation mode.'}
    Focus on oxidation (MIB/Geosmin/DOC), disinfection inactivation, and the molar ratio balance.
    
    TREATMENT GOALS:
    - Target 4.0 Log inactivation for Viruses, Bacteria, and Cryptosporidium.
    - Bromate formation must stay below 10 µg/L.
    - Maximize MIB/Geosmin removal.

    SYSTEM CONFIGURATION:
    - Flow: ${system.flowRate} m³/h
    - Ozone Dose: ${system.ozoneDose} mg/L
    - H2O2 Dose: ${system.h2o2Dose} mg/L
    - Ozone Residual: ${result.calculatedResidual} mg/L
    - T10 Contact Time: ${result.contactTimeT10} min
    - CT Value: ${result.ctValue} mg·min/L
    
    INFLUENT WATER:
    - Temperature: ${water.temperature} °C
    - pH: ${water.ph}
    - Bromide: ${water.bromide} µg/L
    - DOC: ${water.doc} mg/L
    - MIB/Geosmin: ${water.mib}/${water.geosmin} ng/L
    
    TREATMENT RESULTS:
    - Bromate: ${result.bromate} µg/L
    - MIB Removal: ${result.removalMibPercent}%
    - Virus LRV: ${result.lrvVirus}
    - Bacteria LRV: ${result.lrvBacteria}
    - Cryptosporidium LRV: ${result.lrvProtozoa}
    
    Provide a professional analysis in JSON format addressing safety, efficiency, and regulatory risk. 
    Specifically comment on ${isAop ? 'the H2O2:O3 mass ratio (standard target is often 0.3-0.5 mg/mg)' : 'whether AOP should be considered for better taste and odor control'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            warnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "recommendations", "warnings"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      summary: "AI Analysis is currently unavailable. Please check manual calculations.",
      recommendations: ["Ensure CT is maintained for target LRVs.", "Verify bromate formation potential."],
      warnings: ["Engine connectivity issue."]
    };
  }
};
