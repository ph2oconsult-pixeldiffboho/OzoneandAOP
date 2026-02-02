
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OzoneSystemParams, WaterQualityParams, TreatmentResult, AiAnalysis } from './types';
import { calculateTreatmentResults } from './utils/chemistry';
import { getExpertAnalysis } from './services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Cell
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

const App: React.FC = () => {
  const [systemParams, setSystemParams] = useState<OzoneSystemParams>(DEFAULT_SYSTEM_PARAMS);
  const [waterParams, setWaterParams] = useState<WaterQualityParams>(DEFAULT_WATER_PARAMS);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const results = useMemo(() => calculateTreatmentResults(systemParams, waterParams), [systemParams, waterParams]);

  const handleSystemChange = (key: keyof OzoneSystemParams, value: number) => {
    setSystemParams(prev => ({ ...prev, [key]: value }));
  };

  const handleWaterChange = (key: keyof WaterQualityParams, value: number) => {
    setWaterParams(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setSystemParams(DEFAULT_SYSTEM_PARAMS);
    setWaterParams(DEFAULT_WATER_PARAMS);
    setAiAnalysis(null);
  };

  const triggerAiAnalysis = async () => {
    setIsAnalyzing(true);
    const analysis = await getExpertAnalysis(systemParams, waterParams, results);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const removalData = [
    { 
      name: 'MIB', 
      Influent: waterParams.mib, 
      Effluent: results.finalMib, 
      removal: results.removalMibPercent,
      icon: 'fa-nose-slash'
    },
    { 
      name: 'Geosmin', 
      Influent: waterParams.geosmin, 
      Effluent: results.finalGeosmin, 
      removal: results.removalGeosminPercent,
      icon: 'fa-wind'
    },
  ];

  const isAopActive = systemParams.h2o2Dose > 0;
  const isAmmoniaInhibiting = waterParams.ammonia > 0.01;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
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
            <button 
              onClick={handleReset}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 border border-slate-700"
            >
              <i className="fas fa-rotate-left"></i>
              <span>Reset</span>
            </button>
            <button 
              onClick={triggerAiAnalysis}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center space-x-2 shadow-lg shadow-blue-900/20"
            >
              {isAnalyzing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-microchip"></i>}
              <span>{isAnalyzing ? "Analyzing..." : "Process Audit"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Inputs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Ozone System Configuration */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <i className="fas fa-cogs mr-2 text-blue-500"></i>
                System Design
              </h2>
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

          {/* Influent Water Quality */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <i className="fas fa-water mr-2 text-cyan-500"></i>
                Pre-Ozone Water
              </h2>
            </div>
            <div className="p-4 space-y-4">
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

        {/* Right Column: Dashboard */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Top Row: General Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label="Bromate" 
              value={`${results.bromate} µg/L`} 
              icon="fa-flask-vial" 
              color={results.bromate > 10 ? "text-red-600" : "text-emerald-600"} 
              status={results.bromate > 10 ? "Above Limit" : (isAmmoniaInhibiting ? "Ammonia Inhibited" : "Safe")} 
            />
            <MetricCard label="H₂O₂:O₃ Ratio" value={systemParams.ozoneDose > 0 ? (systemParams.h2o2Dose / systemParams.ozoneDose).toFixed(2) : "0.00"} icon="fa-balance-scale" color="text-orange-600" status="Mass Ratio" />
            <MetricCard label="CT Value" value={`${results.ctValue}`} icon="fa-calculator" color="text-indigo-600" status="mg·min/L" />
            <MetricCard label="T₁₀ Time" value={`${results.contactTimeT10} min`} icon="fa-clock" color="text-slate-600" />
          </div>

          {/* Section: Disinfection LRVs */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <i className="fas fa-shield-virus mr-2 text-indigo-500"></i>
                Disinfection Performance (LRV)
              </h2>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
               <LrvProgress label="Virus" value={results.lrvVirus} target={4.0} icon="fa-virus" color="bg-red-500" />
               <LrvProgress label="Bacteria" value={results.lrvBacteria} target={4.0} icon="fa-bacteria" color="bg-emerald-500" />
               <LrvProgress label="Cryptosporidium" value={results.lrvProtozoa} target={4.0} icon="fa-bug" color="bg-blue-500" />
            </div>
          </section>

          {/* Oxidation Performance Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 border-l-4 border-blue-500 pl-3">
                Oxidation Results
              </h3>
              <div className="bg-blue-50 border border-blue-100 rounded px-2 py-1 flex items-center space-x-2">
                <i className="fas fa-vial text-blue-500 text-[10px]"></i>
                <span className="text-[10px] font-bold text-blue-600 uppercase">First-Order Kinetic Model</span>
              </div>
            </div>

            {/* Removal Performance Table */}
            <div className="mb-6 overflow-hidden border border-slate-100 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-[10px] text-slate-500 bg-slate-50 font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 uppercase">Target Molecule</th>
                    <th className="px-4 py-3">INFLUENT (ng/L)</th>
                    <th className="px-4 py-3">EFFLUENT (ng/L)</th>
                    <th className="px-4 py-3 text-right uppercase">Removal Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {removalData.map((row) => (
                    <tr key={row.name}>
                      <td className="px-4 py-3 font-semibold text-slate-700 flex items-center">
                        <i className={`fas ${row.icon} mr-2 text-slate-400 w-4`}></i>
                        {row.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.Influent} ng/L</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.Effluent.toFixed(2)} ng/L</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end">
                           <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">{row.removal}%</span>
                           <span className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-tighter">Dose Dependent</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chart Area */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={removalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'ng/L', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#94a3b8'} }} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="Influent" name="Influent" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={40} />
                  <Bar dataKey="Effluent" name="Effluent" fill={isAopActive ? "#f97316" : "#3b82f6"} radius={[4, 4, 0, 0]} barSize={40} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Kinetic Validation Panel */}
            <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm mt-1">
                  <i className="fas fa-wave-square text-sm"></i>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight mb-2 flex items-center">
                    Kinetic Validation Insight
                    <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Process Fact</span>
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Notice that as you adjust the Influent concentration of MIB or Geosmin, the <strong>% Removal remains stable</strong>. 
                    This is because trace organics follow <strong>First-Order Kinetics</strong>. Their removal efficiency is driven exclusively by the 
                    <span className="font-bold text-blue-700 italic"> Ozone Dose</span> and 
                    <span className="font-bold text-blue-700 italic"> Contact Time</span>, not by the amount of contaminant present.
                  </p>
                  <div className="mt-3 flex space-x-4">
                    <div className="text-[10px] flex items-center">
                      <i className="fas fa-check text-emerald-500 mr-1"></i>
                      <span className="text-slate-500 font-medium">Mass Removed scales with concentration</span>
                    </div>
                    <div className="text-[10px] flex items-center">
                      <i className="fas fa-check text-emerald-500 mr-1"></i>
                      <span className="text-slate-500 font-medium">% Removal scales with Ozone Dose</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* DOC Mineralization Section */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="bg-slate-100 p-2 rounded-lg text-emerald-500 shadow-sm">
                    <i className="fas fa-leaf text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Bulk DOC Mineralization (mg/L)</h4>
                  </div>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100">
                    {results.removalDocPercent}% Mineralized
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Influent DOC</span>
                    <span className="text-lg font-bold text-slate-600">{waterParams.doc} mg/L</span>
                  </div>
                  <div className="h-8 w-px bg-slate-100 mx-4"></div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Effluent DOC</span>
                    <span className="text-lg font-bold text-blue-700">{results.finalDoc.toFixed(2)} mg/L</span>
                  </div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-tight flex items-center">
                  <i className="fas fa-info-circle mr-3 text-blue-300 text-lg"></i>
                  <span>
                    <strong>Engineering Note:</strong> Mineralization (to CO₂) is lower than T&O removal because it requires breaking 
                    every carbon bond, while MIB removal only requires molecular transformation.
                  </span>
                </div>
              </div>
            </div>

            {/* Bromate Control Strategy Note */}
            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 leading-tight flex items-center">
              <i className="fas fa-shield-halved mr-3 text-indigo-400 text-lg"></i>
              <span>
                <strong>Bromate Control:</strong> Influent Ammonia ({waterParams.ammonia} mg/L) is currently sequestering HOBr intermediates 
                into bromamines, effectively blocking the $BrO_3^-$ formation pathway. Control is optimized at pH &lt; 8.0.
              </span>
            </div>
          </div>

          {/* AI Insights */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4">
              <i className="fas fa-robot mr-2 text-indigo-500"></i>
              Process Audit & Strategy
            </h3>

            {aiAnalysis ? (
              <div className="space-y-4">
                <p className="text-slate-700 leading-relaxed text-sm bg-white/50 p-3 rounded-lg border border-white shadow-sm">
                  {aiAnalysis.summary}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center">
                      <i className="fas fa-check-circle mr-2 text-emerald-500"></i>
                      Optimization
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {aiAnalysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2 text-blue-400">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center">
                      <i className="fas fa-exclamation-triangle mr-2 text-amber-500"></i>
                      Risks
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {aiAnalysis.warnings.map((warn, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2 text-red-400">•</span>
                          {warn}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm italic">Generate a detailed technical audit of performance.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 mt-6">
        <div className="container mx-auto text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Data models derived from USEPA SWTR & AOP Research
          </p>
        </div>
      </footer>
    </div>
  );
};

// --- Helper Components ---

interface LrvProgressProps {
  label: string;
  value: number;
  target: number;
  icon: string;
  color: string;
}

const LrvProgress: React.FC<LrvProgressProps> = ({ label, value, target, icon, color }) => {
  const percent = Math.min(100, (value / target) * 100);
  const isPassing = value >= target;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div className="flex items-center space-x-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPassing ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            <i className={`fas ${icon}`}></i>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-700">{label}</div>
            <div className="text-[10px] text-slate-400">Target: {target.toFixed(1)} Log</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-lg font-bold ${isPassing ? 'text-emerald-600' : 'text-slate-700'}`}>{value.toFixed(2)}</div>
          <div className={`text-[8px] uppercase font-bold px-1 rounded ${isPassing ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            {isPassing ? 'Passing' : 'Partial'}
          </div>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full transition-all duration-700 ${isPassing ? 'bg-emerald-500' : color}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

interface InputGroupProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  hideSlider?: boolean;
}

const InputGroup: React.FC<InputGroupProps> = ({ label, value, unit, min, max, step, onChange, hideSlider }) => {
  return (
    <div className="flex flex-col space-y-1">
      <div className="flex justify-between items-center text-xs">
        <label className="font-semibold text-slate-600">{label}</label>
        <div className="flex items-center space-x-1">
          <input 
            type="number" 
            value={value} 
            step={step}
            className="w-16 px-1 py-0.5 border border-slate-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          />
          <span className="text-slate-400 text-[10px] w-8">{unit}</span>
        </div>
      </div>
      {!hideSlider && (
        <input 
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer transition-all accent-blue-500 hover:accent-blue-400"
        />
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: string;
  icon: string;
  color: string;
  status?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, color, status }) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-all hover:shadow-md cursor-default group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        <i className={`fas ${icon} ${color} opacity-40 group-hover:opacity-100 transition-opacity`}></i>
      </div>
      <div>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
        {status && (
          <div className={`text-[10px] mt-1 font-bold ${status.includes("Inhibited") ? "text-blue-500" : (status === "Safe" ? "text-emerald-500" : "text-slate-400")}`}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
