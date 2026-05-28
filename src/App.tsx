import { useState, useEffect } from 'react';
import { Moto, Aluguel, Manutencao } from './types';
import { 
  getMotos, 
  salvarMoto, 
  deletarMoto, 
  getAlugueis, 
  salvarAluguel, 
  finalizarAluguel, 
  getManutencoes, 
  salvarManutencao, 
  deletarManutencao,
  isUsingSupabase 
} from './lib/supabaseService';

// Import components
import Dashboard from './components/Dashboard';
import Estoque from './components/Estoque';
import AluguelComponent from './components/Aluguel';
import ManutencaoComponent from './components/Manutencao';
import ConfigSupabase from './components/ConfigSupabase';

// Icons
import { 
  Bike, 
  Layers, 
  KeyRound, 
  Wrench, 
  Database, 
  AlertTriangle,
  Server,
  CloudLightning,
  RefreshCw,
  Cpu
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Data State
  const [motos, setMotos] = useState<Moto[]>([]);
  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  
  // Status State
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dbMode, setDbMode] = useState<boolean>(false);

  // Quick navigation helpers
  const [selectedMotoForRent, setSelectedMotoForRent] = useState<Moto | null>(null);
  const [selectedMotoForOil, setSelectedMotoForOil] = useState<Moto | null>(null);

  // Load all data
  const loadData = async () => {
    setIsLoading(true);
    setDbError(null);
    setDbMode(isUsingSupabase());
    
    try {
      const allMotos = await getMotos();
      const allAlugueis = await getAlugueis();
      const allManutencoes = await getManutencoes();
      
      setMotos(allMotos);
      setAlugueis(allAlugueis);
      setManutencoes(allManutencoes);
    } catch (err: any) {
      console.error('Erro de carregamento:', err);
      setDbError(
        'Falha ao carregar informações do Supabase. Verifique se as credenciais estão corretas e se as tabelas foram devidamente criadas (verifique a aba Banco de Dados).'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handler functions
  const handleAddMoto = async (novaMotoData: Omit<Moto, 'id'>) => {
    try {
      const saved = await salvarMoto(novaMotoData);
      setMotos(prev => [saved, ...prev]);
      return saved;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleUpdateMoto = async (motoEditada: Moto) => {
    try {
      const saved = await salvarMoto(motoEditada);
      setMotos(prev => prev.map(m => m.id === saved.id ? saved : m));
      return saved;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleDeleteMoto = async (id: string) => {
    try {
      await deletarMoto(id);
      // Update state locally
      setMotos(prev => prev.filter(m => m.id !== id));
      setAlugueis(prev => prev.filter(a => a.moto_id !== id));
      setManutencoes(prev => prev.filter(m => m.moto_id !== id));
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleAddAluguel = async (novoAluguelData: Omit<Aluguel, 'id'>) => {
    try {
      const saved = await salvarAluguel(novoAluguelData);
      setAlugueis(prev => [saved, ...prev]);
      // Update moto status state directly
      setMotos(prev => prev.map(m => m.id === saved.moto_id ? { ...m, status: 'alugada' } : m));
      return saved;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleFinalizarAluguel = async (
    aluguelId: string, 
    motoId: string, 
    odometroFinal: number, 
    dataFim: string,
    valorPago: number
  ) => {
    try {
      await finalizarAluguel(aluguelId, motoId, odometroFinal, dataFim, valorPago);
      
      // Update local states
      setAlugueis(prev => prev.map(a => a.id === aluguelId ? { ...a, status: 'finalizado', data_fim: dataFim, valor_pago: valorPago } : a));
      setMotos(prev => prev.map(m => m.id === motoId ? { ...m, status: 'disponivel', odometro_atual: odometroFinal } : m));
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleAddManutencao = async (novaManutencaoData: Omit<Manutencao, 'id'>, atualizarOdo: boolean) => {
    try {
      const saved = await salvarManutencao(novaManutencaoData, atualizarOdo);
      setManutencoes(prev => [saved, ...prev]);
      
      // Update moto state locally
      setMotos(prev => prev.map(m => {
        if (m.id === saved.moto_id) {
          const updated = { ...m };
          if (saved.tipo === 'Troca de Óleo') {
            updated.odometro_ultima_troca_oleo = saved.odometro;
          }
          if (atualizarOdo || saved.tipo === 'Troca de Óleo') {
            updated.odometro_atual = Math.max(updated.odometro_atual, saved.odometro);
          }
          return updated;
        }
        return m;
      }));
      return saved;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const handleDeleteManutencao = async (id: string) => {
    try {
      await deletarManutencao(id);
      setManutencoes(prev => prev.filter(m => m.id !== id));
      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // Quick navigation shortcuts
  const handleQuickOilChange = (moto: Moto) => {
    setSelectedMotoForOil(moto);
    setActiveTab('manutencao');
  };

  const handleQuickRent = (moto: Moto) => {
    setSelectedMotoForRent(moto);
    setActiveTab('aluguel');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col" id="motos-app-root">
      
      {/* 🧭 DATABASE TYPE BANNER / NOTIFIER */}
      <div className="bg-slate-900 text-white py-2.5 px-4 text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {dbMode ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Banco de Dados: Supabase Ativo (Sincronizado)
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Modo de Demonstração (Salvo Localmente)
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {!dbMode && (
            <button
              onClick={() => setActiveTab('config_db')}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-colors"
            >
              Conectar ao Supabase
            </button>
          )}
          <button
            onClick={loadData}
            id="btn-app-refresh"
            className="flex items-center gap-1.5 hover:text-slate-300 transition-colors text-slate-400 bg-transparent border-none cursor-pointer"
            title="Recarregar Dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* 🗺️ MAIN HEADER / BRANDINGBAR */}
      <header className="bg-white border-b border-slate-100 py-5 px-6 md:px-12 sticky top-0 z-40 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
            <Bike className="w-6 h-6" id="app-logo-motos" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">MOTO Locadora</h1>
            <p className="text-xs text-slate-400 font-bold font-mono">Painel Administrativo v1.1</p>
          </div>
        </div>

        {/* TOP VIEW TABS */}
        <nav className="hidden lg:flex items-center gap-1" id="desktop-tabs-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" /> Geral
          </button>
          <button
            onClick={() => setActiveTab('estoque')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'estoque' 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" /> Estoque ({motos.length})
          </button>
          <button
            onClick={() => setActiveTab('aluguel')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'aluguel' 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Alugadas ({alugueis.filter(a => a.status === 'ativo').length})
          </button>
          <button
            onClick={() => setActiveTab('manutencao')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'manutencao' 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" /> Oficina
          </button>
          <button
            onClick={() => setActiveTab('config_db')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'config_db' 
                ? 'bg-slate-100 text-slate-900' 
                : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            <Database className="w-4 h-4" /> Banco Supabase
          </button>
        </nav>
      </header>

      {/* ⚠️ EXCEPTION DISPLAY: ERRORS */}
      {dbError && (
        <div className="mx-6 md:mx-12 mt-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-center justify-between gap-4 text-xs font-medium">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p>{dbError}</p>
          </div>
          <button
            onClick={() => setActiveTab('config_db')}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition-colors"
          >
            Configurar Conexão
          </button>
        </div>
      )}

      {/* 📦 CONTENT CONTAINER */}
      <main className="flex-1 p-6 md:p-12 max-w-7xl w-full mx-auto" id="app-main-viewport">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3" id="main-loader">
            <RefreshCw className="w-9 h-9 text-blue-600 animate-spin" />
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Conectando ao banco de dados...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'dashboard' && (
              <Dashboard 
                motos={motos} 
                alugueis={alugueis} 
                manutencoes={manutencoes} 
                changeTab={setActiveTab}
                onQuickOilChange={handleQuickOilChange}
              />
            )}

            {activeTab === 'estoque' && (
              <Estoque 
                motos={motos} 
                onAddMoto={handleAddMoto}
                onUpdateMoto={handleUpdateMoto}
                onDeleteMoto={handleDeleteMoto}
                onNavigateToMaintenance={handleQuickOilChange}
                onNavigateToRent={handleQuickRent}
              />
            )}

            {activeTab === 'aluguel' && (
              <AluguelComponent 
                alugueis={alugueis}
                motos={motos}
                onAddAluguel={handleAddAluguel}
                onFinalizarAluguel={handleFinalizarAluguel}
                selectedMotoForRent={selectedMotoForRent}
                clearSelectedMotoForRent={() => setSelectedMotoForRent(null)}
              />
            )}

            {activeTab === 'manutencao' && (
              <ManutencaoComponent 
                manutencoes={manutencoes}
                motos={motos}
                onAddManutencao={handleAddManutencao}
                onDeleteManutencao={handleDeleteManutencao}
                selectedMotoForOil={selectedMotoForOil}
                clearSelectedMotoForOil={() => setSelectedMotoForOil(null)}
              />
            )}

            {activeTab === 'config_db' && (
              <ConfigSupabase 
                onSaved={() => loadData()}
              />
            )}
          </div>
        )}
      </main>

      {/* MOBILE TAB BAR NAVIGATION (sticky at bottom for mobile-first support) */}
      <footer className="footer-nav lg:hidden bg-white border-t border-slate-200 sticky bottom-0 left-0 right-0 py-2.5 px-4 flex items-center justify-around text-[10px] font-bold text-slate-500 z-55 shadow-lg">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'dashboard' ? 'text-blue-600' : ''}`}
        >
          <Cpu className="w-5 h-5" />
          <span>Geral</span>
        </button>
        <button
          onClick={() => setActiveTab('estoque')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'estoque' ? 'text-blue-600' : ''}`}
        >
          <Layers className="w-5 h-5" />
          <span>Estoque</span>
        </button>
        <button
          onClick={() => setActiveTab('aluguel')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'aluguel' ? 'text-blue-600' : ''}`}
        >
          <KeyRound className="w-5 h-5" />
          <span>Alugueis</span>
        </button>
        <button
          onClick={() => setActiveTab('manutencao')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'manutencao' ? 'text-blue-600' : ''}`}
        >
          <Wrench className="w-5 h-5" />
          <span>Oficina</span>
        </button>
        <button
          onClick={() => setActiveTab('config_db')}
          className={`flex flex-col items-center gap-1 cursor-pointer ${activeTab === 'config_db' ? 'text-blue-600' : ''}`}
        >
          <Database className="w-5 h-5" />
          <span>Banco</span>
        </button>
      </footer>
    </div>
  );
}
