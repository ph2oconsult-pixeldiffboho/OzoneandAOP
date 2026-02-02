
import React, { useState, useMemo, useEffect } from 'react';
import { OzoneSystemParams, WaterQualityParams, KineticParams, AiAnalysis } from './types';
import { calculateTreatmentResults } from './utils/chemistry';
import { getExpertAnalysis } from './services/geminiService';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar
} from 'recharts';

const DEFAULT_SYSTEM_PARAMS: OzoneSystemParams = {
  flowRate: 1000,
  ozoneDose: 2.5,
  h2o2Dose: 0,
  tankLength: 15,
  tankWidth: 5,
  waterDepth: 4,
  bafflingFactor: 0.6
};

const DEFAULT_WATER_PARAMS: WaterQualityParams = {
  ph: 7.8,
  bromide: 150,
  ammonia: 0.05,
  doc: 4.5,
  mib: 40,
  geosmin: 35,
  temperature: 15
};

const DEFAULT_KINETIC_PARAMS: KineticParams = {
  mib_kO3: 0.45,
  mib_kOH: 5.0e9,
  geosmin_kO3: 0.10,
  geosmin_kOH: 7.8e9
};

const App: React.FC = () => {
  const [systemParams, setSystemParams] = useState<OzoneSystemParams>(DEFAULT_SYSTEM_PARAMS);
  const [waterParams, setWaterParams] = useState<WaterQualityParams>(DEFAULT_WATER_PARAMS);
  const [kineticParams, setKineticParams] = useState<KineticParams>(DEFAULT_KINETIC_PARAMS);
  const [useCustomKinetics, setUseCustomKinetics] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!useCustomKinetics) {
      setKineticParams(DEFAULT_KINETIC_PARAMS);
    }
  }, [useCustomKinetics]);

  const results = useMemo(() => 
    calculateTreatmentResults(systemParams, waterParams, kineticParams), 
    [systemParams, waterParams, kineticParams]
  );

  const handleSystemChange = (key: keyof OzoneSystemParams, value: number) => {
    setSystemParams(prev => ({ ...prev, [key]: value }));
  };

  const handleWaterChange = (key: keyof WaterQualityParams, value: number) => {
    setWaterParams(prev => ({ ...prev, [key]: value }));
  };

  const handleKineticChange = (key: keyof KineticParams, value: number) => {
    setKineticParams(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSystemParams(DEFAULT_SYSTEM_PARAMS);
    setWaterParams(DEFAULT_WATER_PARAMS);
    setKineticParams(DEFAULT_KINETIC_PARAMS);
    setUseCustomKinetics(false);
    setAiAnalysis(null);
  };

  const triggerAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const analysis = await getExpertAnalysis(systemParams, waterParams, results);
      setAiAnalysis(analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removalData = [
    { 
      name: 'MIB', 
      Influent: waterParams.mib, 
      Effluent: results.finalMib, 
      removal: results.removalMibPercent,
      kO3: kineticParams.mib_kO3,
      kOH: kineticParams.mib_kOH,
    },
    { 
      name: 'Geosmin', 
      Influent: waterParams.geosmin, 
      Effluent: results.finalGeosmin, 
      removal: results.removalGeosminPercent,
      kO3: kineticParams.geosmin_kO3,
      kOH: kineticParams.geosmin_kOH,
    },
  ];

  const isAopActive = systemParams.h2o2Dose > 0;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-900 text-white p-4 shadow-lg border-b border-blue-500">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <i className="fas fa-droplet text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">OzoneTreatment<span className="text-blue-400">Pro</span></h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">Advanced Oxidation Engineering Suite</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleReset} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 border border-slate-700">
              <i className="fas fa-rotate-left"></i>
              <span>Reset</span>
            </button>
            <button onClick={triggerAiAnalysis} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 shadow-lg shadow-blue-900/20">
              {isAnalyzing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-microchip"></i>}
              <span>{isAnalyzing ? "Analyzing..." : "Process Audit"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><i className="fas fa-cogs mr-2 text-blue-500"></i>System Design</h2>
            </div>
            <div className="p-4 space-y-4">
              <InputGroup label="Flow Rate" value={systemParams.flowRate} unit="m³/h" min={10} max={10000} step={10} onChange={(v) => handleSystemChange('flowRate', v)} />
              <InputGroup label="Ozone Dose" value={systemParams.ozoneDose} unit="mg/L" min={0.1} max={10} step={0.1} onChange={(v) => handleSystemChange('ozoneDose', v)} />
              <InputGroup label="H₂O₂ Dose" value={systemParams.h2o2Dose} unit="mg/L" min={0} max={10} step={0.1} onChange={(v) => handleSystemChange('h2o2Dose', v)} />
              <div className="grid grid-cols-3 gap-2">
                <InputGroup label="L (m)" value={systemParams.tankLength} unit="m" min={1} max={50} step={0.5} onChange={(v) => handleSystemChange('tankLength', v)} hideSlider />
                <InputGroup label="W (m)" value={systemParams.tankWidth} unit="m" min={1} max={50} step={0.5} onChange={(v) => handleSystemChange('tankWidth', v)} hideSlider />
                <InputGroup label="D (m)" value={systemParams.waterDepth} unit="m" min={1} max={10} step={0.5} onChange={(v) => handleSystemChange('waterDepth', v)} hideSlider />
              </div>
              <InputGroup label="Baffling Factor" value={systemParams.bafflingFactor} unit="BF" min={0.1} max={1.0} step={0.05} onChange={(v) => handleSystemChange('bafflingFactor', v)} />
              <div className={`p-2 rounded border mt-2 transition-colors ${results.calculatedResidual > 0 ? 'bg-blue-50 border-blue-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tighter mb-1">
                  <span className={results.calculatedResidual > 0 ? 'text-blue-400' : 'text-red-400'}>Ozone Residual</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className={`text-sm font-bold ${results.calculatedResidual > 0 ? 'text-blue-700' : 'text-red-700'}`}>{results.calculatedResidual} mg/L</span>
                  <span className="text-[8px] text-slate-400 italic">Net after Demand</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center"><i className="fas fa-water mr-2 text-cyan-500"></i>Pre-Ozone Water</h2>
            </div>
            <div className="p-4 space-y-5">
              <InputGroup label="Temperature" value={waterParams.temperature} unit="°C" min={0} max={40} step={1} onChange={(v) => handleWaterChange('temperature', v)} />
              <InputGroup label="pH" value={waterParams.ph} unit="pH" min={5} max={10} step={0.1} onChange={(v) => handleWaterChange('ph', v)} />
              <InputGroup label="Bromide" value={waterParams.bromide} unit="µg/L" min={0} max={1000} step={10} onChange={(v) => handleWaterChange('bromide', v)} />
              <InputGroup label="Ammonia" value={waterParams.ammonia} unit="mg/L" min={0} max={2} step={0.01} onChange={(v) => handleWaterChange('ammonia', v)} />
              <InputGroup label="DOC" value={waterParams.doc} unit="mg/L" min={0.1} max={15} step={0.1} onChange={(v) => handleWaterChange('doc', v)} />
              <InputGroup label="MIB" value={waterParams.mib} unit="ng/L" min={0} max={200} step={1} onChange={(v) => handleWaterChange('mib', v)} />
              <InputGroup label="Geosmin" value={waterParams.geosmin} unit="ng/L" min={0} max={200} step={1} onChange={(v) => handleWaterChange('geosmin', v)} />
            </div>
          </section>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Bromate" value={`${results.bromate} µg/L`} icon="fa-flask-vial" color={results.bromate > 10 ? "text-red-600" : "text-emerald-600"} status={results.bromate > 10 ? "Above Limit" : "Safe"} />
            <MetricCard label="H₂O₂:O₃ Ratio" value={systemParams.ozoneDose > 0 ? (systemParams.h2o2Dose / systemParams.ozoneDose).toFixed(2) : "0.00"} icon="fa-balance-scale" color="text-orange-600" status="Mass Ratio" />
            <MetricCard label="CT Value" value={`${results.ctValue}`} icon="fa-calculator" color="text-indigo-600" status="mg·min/L" />
            <MetricCard label="T₁₀ Time" value={`${results.contactTimeT10} min`} icon="fa-clock" color="text-slate-600" />
          </div>

          <div className={`bg-white p-6 rounded-xl shadow-sm border transition-all duration-300 ${useCustomKinetics ? 'border-purple-300 ring-1 ring-purple-100' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 border-l-4 border-indigo-500 pl-3">Fundamental Kinetic Analysis</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Manual Mode</span>
                  <button onClick={() => setUseCustomKinetics(!useCustomKinetics)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${useCustomKinetics ? 'bg-purple-600' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useCustomKinetics ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {useCustomKinetics && (
              <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start space-x-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="bg-indigo-600 text-white rounded-full p-2 shrink-0"><i className="fas fa-info-circle"></i></div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 mb-1">Advanced Kinetic Override Enabled</h4>
                  <p className="text-xs text-indigo-800 leading-relaxed">Define second-order rate constants (M⁻¹s⁻¹) for target oxidation. <strong>k<sub>O₃</sub></strong> is the direct reaction; <strong>k<sub>OH</sub></strong> is the indirect radical reaction.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 mb-8">
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-tighter italic font-serif tracking-widest">The rate law: r = -k [Oxidant] [Target]</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">MIB/Geosmin react with molecular ozone (O₃) and hydroxyl radicals (•OH). Because k<sub>OH</sub> is ≈ 10⁹ times larger than k<sub>O₃</sub>, indirect removal dominates.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {removalData.map((d) => (
                    <div key={d.name} className={`p-4 rounded-xl border transition-all ${useCustomKinetics ? 'bg-purple-50/30 border-purple-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.name}</div>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold ${useCustomKinetics ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>{useCustomKinetics ? 'EDITABLE' : 'LITERATURE'}</span>
                      </div>
                      <div className="space-y-3">
                        <KineticInput label="k_O₃" value={d.name === 'MIB' ? kineticParams.mib_kO3 : kineticParams.geosmin_kO3} isManual={useCustomKinetics} onChange={(v) => handleKineticChange(d.name === 'MIB' ? 'mib_kO3' : 'geosmin_kO3', v)} />
                        <KineticInput label="k_OH" value={d.name === 'MIB' ? kineticParams.mib_kOH : kineticParams.geosmin_kOH} isManual={useCustomKinetics} isSci onChange={(v) => handleKineticChange(d.name === 'MIB' ? 'mib_kOH' : 'geosmin_kOH', v)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-72 w-full border-t border-slate-100 pt-6">
               <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={removalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600, fill: '#475569'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} label={{ value: 'Concentration (ng/L)', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#94a3b8', fontWeight: 500} }} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="Influent" fill="#cbd5e1" barSize={35} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Effluent" fill={isAopActive ? "#f97316" : "#3b82f6"} barSize={35} radius={[6, 6, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
              <div className="mt-6 flex justify-center space-x-12 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center"><div className="w-4 h-4 bg-slate-300 rounded-sm mr-2 shadow-inner"></div> Influent</div>
                <div className="flex items-center"><div className={`w-4 h-4 ${isAopActive ? 'bg-orange-500' : 'bg-blue-500'} rounded-sm mr-2 shadow-inner`}></div> Predicted Effluent</div>
              </div>
            </div>
          </div>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800 border-l-4 border-emerald-500 pl-3">Disinfection Credits (US EPA LT2)</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Credits Capped at 4.00 Log</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InactivationCard label="Cryptosporidium" logValue={results.lrvProtozoa} target={2.0} icon="fa-bacteria" />
              <InactivationCard label="Bacteria" logValue={results.lrvBacteria} target={4.0} icon="fa-microbe" />
              <InactivationCard label="Viruses" logValue={results.lrvVirus} target={4.0} icon="fa-virus" />
            </div>
          </section>

          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4"><i className="fas fa-robot mr-2 text-indigo-500"></i>Process Engineering Audit</h3>
            {aiAnalysis ? (
              <div className="space-y-4">
                <p className="text-slate-700 text-sm bg-white/50 p-4 rounded-lg border border-white shadow-sm leading-relaxed">{aiAnalysis.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/40 p-3 rounded-lg border border-white/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center"><i className="fas fa-lightbulb mr-2 text-amber-500"></i> Recommendations</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5">{aiAnalysis.recommendations.map((rec, i) => <li key={i} className="flex items-start"><span className="mr-2 text-blue-400">•</span>{rec}</li>)}</ul>
                  </div>
                  <div className="bg-white/40 p-3 rounded-lg border border-white/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center"><i className="fas fa-triangle-exclamation mr-2 text-red-500"></i> Risks & Warnings</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5">{aiAnalysis.warnings.map((warn, i) => <li key={i} className="flex items-start"><span className="mr-2 text-red-400">•</span>{warn}</li>)}</ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="mb-4 text-slate-300"><i className="fas fa-microchip text-5xl"></i></div>
                <p className="text-slate-400 text-sm italic">Request a process audit to evaluate kinetics and regulatory compliance.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-6 mt-6 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">High-Fidelity Mechanistic Simulation Suite | MIB & Geosmin 2nd-order dynamics</p>
      </footer>
    </div>
  );
};

// --- Helper Components ---

const KineticInput: React.FC<{ label: string; value: number; isManual: boolean; isSci?: boolean; onChange: (v: number) => void }> = ({ label, value, isManual, isSci, onChange }) => (
  <div className="flex flex-col">
    <span className="text-[10px] text-slate-500 mb-1 font-bold italic">{label.split('_')[0]}<sub>{label.split('_')[1]}</sub> <span className="not-italic font-normal">(M⁻¹s⁻¹)</span></span>
    {isManual ? (
      <input type="number" step={isSci ? "1e8" : "0.01"} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="w-full bg-white border border-purple-200 rounded px-2 py-1 text-xs font-mono font-bold text-indigo-700 focus:ring-1 focus:ring-purple-400 outline-none" />
    ) : (
      <span className="font-mono font-bold text-slate-700 text-sm">{isSci ? value.toExponential(1) : value.toFixed(2)}</span>
    )}
  </div>
);

const InactivationCard: React.FC<{ label: string; logValue: number; target: number; icon: string }> = ({ label, logValue, target, icon }) => {
  const progress = Math.min(100, (logValue / target) * 100);
  const isPassing = logValue >= target;
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-2">
          <i className={`fas ${icon} text-slate-400 text-xs`}></i>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{label}</span>
        </div>
        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isPassing ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {isPassing ? 'COMPLIANT' : 'SHORTFALL'}
        </span>
      </div>
      <div className="flex items-baseline space-x-1 mb-2">
        <span className="text-2xl font-bold text-slate-800">{logValue.toFixed(2)}</span>
        <span className="text-[10px] text-slate-400 font-bold">Log Credit</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full transition-all duration-500 ${isPassing ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progress}%` }}></div>
      </div>
      <div className="flex justify-between mt-1 text-[8px] font-bold text-slate-400 uppercase">
        <span>Actual</span>
        <span>Target: {target.toFixed(1)}</span>
      </div>
    </div>
  );
};

const InputGroup: React.FC<{ label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void; hideSlider?: boolean; disabled?: boolean }> = ({ label, value, unit, min, max, step, onChange, hideSlider, disabled }) => (
  <div className={`flex flex-col space-y-1 group ${disabled ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
    <div className="flex justify-between items-center text-xs font-semibold text-slate-600 transition-colors group-hover:text-blue-600">
      <label className="truncate">{label}</label>
      <div className="flex items-center space-x-1 shrink-0">
        <input type="number" value={value} step={step} disabled={disabled} className="w-16 px-1 border border-slate-200 rounded text-right focus:ring-1 focus:ring-blue-400 outline-none text-[11px] disabled:bg-slate-50" onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
        <span className="text-slate-400 text-[10px] w-6 truncate">{unit}</span>
      </div>
    </div>
    {!hideSlider && <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all" />}
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; icon: string; color: string; status?: string }> = ({ label, value, icon, color, status }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all cursor-default group">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <i className={`fas ${icon} ${color} opacity-30 group-hover:opacity-100 transition-opacity`}></i>
    </div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    {status && <div className={`text-[10px] mt-1 font-bold ${status.includes("Above") ? "text-red-500" : "text-slate-400"}`}>{status}</div>}
  </div>
);

export default App;
