
import React, { useState, useMemo } from 'react';
import { OzoneSystemParams, WaterQualityParams, KineticParams, AiAnalysis } from './types';
import { calculateTreatmentResults } from './utils/chemistry';
import { getExpertAnalysis } from './services/geminiService';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Bar, PieChart, Pie, Cell
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

const PATHWAY_COLORS = ['#3b82f6', '#f97316'];

const App: React.FC = () => {
  const [systemParams, setSystemParams] = useState<OzoneSystemParams>(DEFAULT_SYSTEM_PARAMS);
  const [waterParams, setWaterParams] = useState<WaterQualityParams>(DEFAULT_WATER_PARAMS);
  const [kineticParams, setKineticParams] = useState<KineticParams>(DEFAULT_KINETIC_PARAMS);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvancedKinetics, setShowAdvancedKinetics] = useState(false);

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
      kO3: kineticParams.mib_kO3.toFixed(2),
      kOH: kineticParams.mib_kOH.toExponential(1),
      icon: 'fa-nose-slash'
    },
    { 
      name: 'Geosmin', 
      Influent: waterParams.geosmin, 
      Effluent: results.finalGeosmin, 
      removal: results.removalGeosminPercent,
      kO3: kineticParams.geosmin_kO3.toFixed(2),
      kOH: kineticParams.geosmin_kOH.toExponential(1),
      icon: 'fa-wind'
    },
  ];

  const pathwayData = [
    { name: 'Direct (O3)', value: systemParams.h2o2Dose > 0 ? 5 : 15 },
    { name: 'Indirect (•OH)', value: systemParams.h2o2Dose > 0 ? 95 : 85 }
  ];

  const isAopActive = systemParams.h2o2Dose > 0;
  const isAmmoniaInhibiting = waterParams.ammonia > 0.01;

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

          {/* Advanced Reaction Constants Section */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <button 
              onClick={() => setShowAdvancedKinetics(!showAdvancedKinetics)}
              className="w-full bg-slate-50 border-b border-slate-200 px-4 py-3 flex justify-between items-center group"
            >
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center">
                <i className="fas fa-flask mr-2 text-purple-500"></i>
                Reaction Constants
              </h2>
              <i className={`fas fa-chevron-right transition-transform text-slate-400 ${showAdvancedKinetics ? 'rotate-90' : ''}`}></i>
            </button>
            {showAdvancedKinetics && (
              <div className="p-4 space-y-6">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-purple-600 uppercase tracking-widest border-b border-purple-100 pb-1 flex justify-between">
                    <span>MIB (2-Methylisoborneol)</span>
                    <span>M⁻¹s⁻¹</span>
                  </div>
                  <InputGroup label="kO3 (Direct)" value={kineticParams.mib_kO3} unit="" min={0} max={10} step={0.01} onChange={(v) => handleKineticChange('mib_kO3', v)} hideSlider />
                  <InputGroup label="kOH (Radical)" value={kineticParams.mib_kOH} unit="" min={1e8} max={1e10} step={1e8} onChange={(v) => handleKineticChange('mib_kOH', v)} hideSlider />
                </div>
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-purple-600 uppercase tracking-widest border-b border-purple-100 pb-1 flex justify-between">
                    <span>Geosmin</span>
                    <span>M⁻¹s⁻¹</span>
                  </div>
                  <InputGroup label="kO3 (Direct)" value={kineticParams.geosmin_kO3} unit="" min={0} max={10} step={0.01} onChange={(v) => handleKineticChange('geosmin_kO3', v)} hideSlider />
                  <InputGroup label="kOH (Radical)" value={kineticParams.geosmin_kOH} unit="" min={1e8} max={1e10} step={1e8} onChange={(v) => handleKineticChange('geosmin_kOH', v)} hideSlider />
                </div>
                <p className="text-[9px] text-slate-400 italic leading-tight">
                  Values reflect second-order kinetics at 20°C. Typical range for kOH is 10⁹ M⁻¹s⁻¹.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Dashboard */}
        <div className="lg:col-span-8 space-y-6">
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard 
              label="Bromate" 
              value={`${results.bromate} µg/L`} 
              icon="fa-flask-vial" 
              color={results.bromate > 10 ? "text-red-600" : "text-emerald-600"} 
              status={results.bromate > 10 ? "Above Limit" : (isAopActive ? "Peroxide Inhibited" : (isAmmoniaInhibiting ? "Ammonia Inhibited" : "Safe"))} 
            />
            <MetricCard label="H₂O₂:O₃ Ratio" value={systemParams.ozoneDose > 0 ? (systemParams.h2o2Dose / systemParams.ozoneDose).toFixed(2) : "0.00"} icon="fa-balance-scale" color="text-orange-600" status="Mass Ratio" />
            <MetricCard label="CT Value" value={`${results.ctValue}`} icon="fa-calculator" color="text-indigo-600" status="mg·min/L" />
            <MetricCard label="T₁₀ Time" value={`${results.contactTimeT10} min`} icon="fa-clock" color="text-slate-600" />
          </div>

          {/* Kinetic & Mechanistic Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 border-l-4 border-indigo-500 pl-3">
                Fundamental Kinetic Analysis
              </h3>
              <div className="bg-indigo-50 border border-indigo-100 rounded px-2 py-1 flex items-center space-x-2">
                <i className="fas fa-atom text-indigo-500 text-[10px]"></i>
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">Second-Order Model</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Educational Explanation */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">The Rate Law: r = -k [Oxidant] [Target]</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    While removal percentages appear constant (First-Order), the underlying chemistry is <strong>Second-Order</strong>. 
                    MIB and Geosmin react with both molecular ozone (O<sub>3</sub>) and hydroxyl radicals (•OH). 
                    Because k<sub>OH</sub> is ≈ 10<sup>9</sup> times larger than k<sub>O3</sub>, these compounds are almost entirely 
                    removed via the <strong>Indirect Pathway</strong>.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {removalData.map((d) => (
                    <div key={d.name} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">{d.name} Applied Constants</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">k<sub>O3</sub> (Direct)</span>
                          <span className="font-mono font-bold">{d.kO3} M⁻¹s⁻¹</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500">k<sub>OH</sub> (Radical)</span>
                          <span className="font-mono font-bold text-indigo-600">{d.kOH} M⁻¹s⁻¹</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pathway Contribution Chart */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase mb-4 text-center w-full">Mechanistic Split</h4>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pathwayData}
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pathwayData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PATHWAY_COLORS[index % PATHWAY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1 w-full">
                  {pathwayData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: PATHWAY_COLORS[i] }}></div>
                        <span className="text-slate-500">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-700">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Visualization */}
            <div className="h-64 w-full border-t border-slate-100 pt-6">
               <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={removalData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} label={{ value: 'Concentration (ng/L)', angle: -90, position: 'insideLeft', style: {fontSize: 10, fill: '#94a3b8'} }} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="Influent" fill="#cbd5e1" barSize={30} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Effluent" fill={isAopActive ? "#f97316" : "#3b82f6"} barSize={30} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex justify-center space-x-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <div className="flex items-center"><div className="w-3 h-3 bg-slate-300 rounded mr-2"></div> Influent</div>
              <div className="flex items-center"><div className={`w-3 h-3 ${isAopActive ? 'bg-orange-500' : 'bg-blue-500'} rounded mr-2`}></div> Predicted Effluent</div>
            </div>
          </div>

          {/* AI Insights & Audit */}
          <section className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 flex items-center mb-4">
              <i className="fas fa-robot mr-2 text-indigo-500"></i>
              Process Engineering Audit
            </h3>
            {aiAnalysis ? (
              <div className="space-y-4">
                <p className="text-slate-700 text-sm bg-white/50 p-4 rounded-lg border border-white shadow-sm leading-relaxed">{aiAnalysis.summary}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/40 p-3 rounded-lg border border-white/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                      <i className="fas fa-lightbulb mr-2 text-amber-500"></i> Recommendations
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                      {aiAnalysis.recommendations.map((rec, i) => <li key={i} className="flex items-start"><span className="mr-2 text-blue-400">•</span>{rec}</li>)}
                    </ul>
                  </div>
                  <div className="bg-white/40 p-3 rounded-lg border border-white/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
                      <i className="fas fa-triangle-exclamation mr-2 text-red-500"></i> Risks & Warnings
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1.5">
                      {aiAnalysis.warnings.map((warn, i) => <li key={i} className="flex items-start"><span className="mr-2 text-red-400">•</span>{warn}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mb-4 text-slate-300"><i className="fas fa-microchip text-4xl"></i></div>
                <p className="text-slate-400 text-sm italic">Request a process audit to evaluate kinetics and regulatory compliance.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 p-4 mt-6 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          High-Fidelity Mechanistic Simulation Suite | MIB & Geosmin 2nd-Order Dynamics
        </p>
      </footer>
    </div>
  );
};

// --- Helper Components ---

const InputGroup: React.FC<{ label: string; value: number; unit: string; min: number; max: number; step: number; onChange: (v: number) => void; hideSlider?: boolean }> = ({ label, value, unit, min, max, step, onChange, hideSlider }) => (
  <div className="flex flex-col space-y-1 group">
    <div className="flex justify-between items-center text-xs font-semibold text-slate-600 transition-colors group-hover:text-blue-600">
      <label>{label}</label>
      <div className="flex items-center space-x-1">
        <input 
          type="number" 
          value={value} 
          step={step} 
          className="w-20 px-1 border border-slate-200 rounded text-right focus:ring-1 focus:ring-blue-400 outline-none text-[11px]" 
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)} 
        />
        <span className="text-slate-400 text-[10px] w-8">{unit}</span>
      </div>
    </div>
    {!hideSlider && <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all" />}
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; icon: string; color: string; status?: string }> = ({ label, value, icon, color, status }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all cursor-default group">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
      <i className={`fas ${icon} ${color} opacity-30 group-hover:opacity-100 transition-opacity`}></i>
    </div>
    <div className={`text-xl font-bold ${color}`}>{value}</div>
    {status && <div className={`text-[10px] mt-1 font-bold ${status.includes("Inhibited") ? "text-blue-500" : (status === "Safe" ? "text-emerald-500" : "text-slate-400")}`}>{status}</div>}
  </div>
);

export default App;
