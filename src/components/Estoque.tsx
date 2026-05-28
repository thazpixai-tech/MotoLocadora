import React, { useState } from 'react';
import { Moto } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Sparkles, 
  Search, 
  Tag, 
  Bike,
  Gauge,
  Droplet,
  Percent,
  AlertTriangle,
  RotateCw
} from 'lucide-react';

interface EstoqueProps {
  motos: Moto[];
  onAddMoto: (moto: Omit<Moto, 'id'>) => Promise<any>;
  onUpdateMoto: (moto: Moto) => Promise<any>;
  onDeleteMoto: (id: string) => Promise<boolean>;
  onNavigateToMaintenance: (moto: Moto) => void;
  onNavigateToRent: (moto: Moto) => void;
}

export default function Estoque({ 
  motos, 
  onAddMoto, 
  onUpdateMoto, 
  onDeleteMoto, 
  onNavigateToMaintenance,
  onNavigateToRent 
}: EstoqueProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMoto, setEditingMoto] = useState<Moto | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [marca, setMarca] = useState('');
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [odometroAtual, setOdometroAtual] = useState<number>(0);
  const [odometroUltimaTroca, setOdometroUltimaTroca] = useState<number>(0);
  const [valorSemanal, setValorSemanal] = useState<number>(0);
  const [status, setStatus] = useState<Moto['status']>('disponivel');

  // Filter motos based on search query
  const filteredMotos = motos.filter(moto => {
    const term = searchQuery.toLowerCase();
    return (
      moto.placa.toLowerCase().includes(term) ||
      moto.modelo.toLowerCase().includes(term) ||
      moto.marca.toLowerCase().includes(term) ||
      moto.status.toLowerCase().includes(term)
    );
  });

  const getOilPercentage = (moto: Moto) => {
    const kmRodados = moto.odometro_atual - moto.odometro_ultima_troca_oleo;
    if (kmRodados >= 1500) return 0;
    return Math.max(0, Math.min(100, Math.round(((1500 - kmRodados) / 1500) * 100)));
  };

  const getOilStatusColorHex = (percentage: number) => {
    if (percentage > 40) return 'bg-emerald-500';
    if (percentage > 10) return 'bg-amber-500';
    return 'bg-red-500 animate-pulse';
  };

  const getOilStatusTextColor = (percentage: number) => {
    if (percentage > 40) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    if (percentage > 10) return 'text-amber-700 bg-amber-50 border-amber-100';
    return 'text-red-700 bg-red-50 border-red-100 animate-pulse';
  };

  // Safe plate formatting (AAA-9999 or AAA9A99)
  const formatPlaca = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').slice(0, 7).toUpperCase();
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const handleOpenAddForm = () => {
    setPlaca('');
    setModelo('');
    setMarca('');
    setAno(new Date().getFullYear());
    setOdometroAtual(0);
    setOdometroUltimaTroca(0);
    setValorSemanal(150); // Default reasonable price
    setStatus('disponivel');
    setErrorMsg('');
    setEditingMoto(null);
    setShowAddForm(true);
  };

  const handleOpenEditForm = (moto: Moto) => {
    setPlaca(moto.placa);
    setModelo(moto.modelo);
    setMarca(moto.marca);
    setAno(moto.ano);
    setOdometroAtual(moto.odometro_atual);
    setOdometroUltimaTroca(moto.odometro_ultima_troca_oleo);
    setValorSemanal(moto.valor_semanal);
    setStatus(moto.status);
    setErrorMsg('');
    setEditingMoto(moto);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!placa.trim() || !modelo.trim() || !marca.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (odometroUltimaTroca > odometroAtual) {
      setErrorMsg('O odômetro da última troca de óleo não pode ser maior que o odômetro atual.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formatted = placa.replace('-', '').trim().toUpperCase();
      // Check duplicate plate locally (case insensitive)
      const plateConflict = motos.find(m => m.placa.replace('-', '').toUpperCase() === formatted && (!editingMoto || m.id !== editingMoto.id));
      if (plateConflict) {
        setErrorMsg('Já existe uma motocicleta cadastrada com esta placa.');
        setIsSubmitting(false);
        return;
      }

      if (editingMoto) {
        const updated: Moto = {
          ...editingMoto,
          placa: formatPlaca(placa),
          modelo: modelo.trim(),
          marca: marca.trim(),
          ano: Number(ano),
          odometro_atual: Number(odometroAtual),
          odometro_ultima_troca_oleo: Number(odometroUltimaTroca),
          valor_semanal: Number(valorSemanal),
          status
        };
        await onUpdateMoto(updated);
      } else {
        const nova = {
          placa: formatPlaca(placa),
          modelo: modelo.trim(),
          marca: marca.trim(),
          ano: Number(ano),
          odometro_atual: Number(odometroAtual),
          odometro_ultima_troca_oleo: Number(odometroUltimaTroca),
          valor_semanal: Number(valorSemanal),
          status: 'disponivel' as const
        };
        await onAddMoto(nova);
      }
      setShowAddForm(false);
      setEditingMoto(null);
    } catch (err: any) {
      setErrorMsg('Falha ao processar operação. Verifique as credenciais do banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, placa: string) => {
    const confirm = window.confirm(`Deseja mesmo remover a moto com placa ${placa}? Isso removerá também o histórico de aluguéis e manutenções desta motocicleta.`);
    if (confirm) {
      try {
        await onDeleteMoto(id);
      } catch (err) {
        alert('Erro ao excluir motocicleta do banco de dados.');
      }
    }
  };

  return (
    <div className="space-y-6" id="motos-estoque-view">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3.5 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por Placa, Modelo ou Marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-xs transition-all"
          />
        </div>
        <button
          onClick={handleOpenAddForm}
          className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-sm px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
          id="btn-add-moto"
        >
          <Plus className="w-5 h-5" /> Cadastrar Moto
        </button>
      </div>

      {/* MODAL / FORM DRAWER (ADD OR EDIT) */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingMoto ? '🔧 Editar Motocicleta' : '🏍️ Cadastrar Nova Motocicleta'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMoto(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-100">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Marca *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Honda"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Modelo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CG 160 Fan"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Placa (Formato AAA-1234) *</label>
                  <input
                    type="text"
                    required
                    placeholder="AAA-9999 ou Mercosul"
                    value={placa}
                    onChange={(e) => setPlaca(formatPlaca(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-semibold tracking-wider font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Ano de Fabricação</label>
                  <input
                    type="number"
                    value={ano}
                    onChange={(e) => setAno(Number(e.target.value))}
                    min={1980}
                    max={new Date().getFullYear() + 2}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Odômetro Atual (Km) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={odometroAtual}
                    onChange={(e) => setOdometroAtual(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-mono font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Odômetro Última Troca de Óleo (Km)</label>
                  <input
                    type="number"
                    min={0}
                    value={odometroUltimaTroca}
                    onChange={(e) => setOdometroUltimaTroca(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-mono font-semibold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Zere ou insira o km para contagem dos 1500 Km.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Valor da Locação Semanal (R$) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={valorSemanal}
                    onChange={(e) => setValorSemanal(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-bold"
                  />
                </div>
              </div>

              {editingMoto && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Status Atual</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Moto['status'])}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white text-sm font-semibold text-slate-800"
                  >
                    <option value="disponivel">🟢 Disponível</option>
                    <option value="alugada">🔵 Alugada</option>
                    <option value="manutencao">🟡 Em Manutenção</option>
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingMoto(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />{editingMoto ? 'Salvar Edição' : 'Cadastrar Moto'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVENTORY LIST */}
      {filteredMotos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="motos-cards-grid">
          {filteredMotos.map(moto => {
            const oilPercentage = getOilPercentage(moto);
            const kmRodadosDesdeTroca = moto.odometro_atual - moto.odometro_ultima_troca_oleo;
            const kmFaltantesParaTroca = 1500 - kmRodadosDesdeTroca;
            const statusBadgeColors = {
              disponivel: 'text-emerald-700 bg-emerald-50 border-emerald-100',
              alugada: 'text-blue-700 bg-blue-50 border-blue-100',
              manutencao: 'text-amber-700 bg-amber-50 border-amber-100'
            };

            return (
              <div 
                key={moto.id} 
                className="bg-white rounded-2xl border border-slate-150 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Visual Accent */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold tracking-wider px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg">
                      {moto.placa}
                    </span>
                    <span className={`text-[11px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full border ${statusBadgeColors[moto.status]}`}>
                      {moto.status === 'disponivel' && 'Disponível'}
                      {moto.status === 'alugada' && 'Alugada'}
                      {moto.status === 'manutencao' && 'Manutenção'}
                    </span>
                  </div>

                  {/* Brand & Model */}
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-50 text-slate-700 rounded-xl shrink-0 mt-0.5">
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{moto.marca} {moto.modelo}</h4>
                      <p className="text-xs text-slate-500 font-medium">Ano {moto.ano}</p>
                    </div>
                  </div>

                  {/* Pricing and Odometer details */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Percent className="w-3.5 h-3.5 text-slate-400" /> Locação
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        R$ {moto.valor_semanal}/sem
                      </div>
                    </div>

                    <div className="bg-slate-50/50 rounded-xl p-2.5 border border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                        <Gauge className="w-3.5 h-3.5 text-slate-400" /> Odômetro
                      </div>
                      <div className="text-sm font-bold text-slate-900 font-mono">
                        {moto.odometro_atual} km
                      </div>
                    </div>
                  </div>

                  {/* OIL PROGRESS TRACKER */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-55">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1 text-slate-500 font-medium">
                        <Droplet className="w-3.5 h-3.5 text-amber-500" /> Vida do Óleo:
                      </div>
                      <span className={`font-mono font-bold text-xs px-1.5 py-0.5 rounded border ${getOilStatusTextColor(oilPercentage)}`}>
                        {oilPercentage}% ({kmRodadosDesdeTroca} / 1500 km)
                      </span>
                    </div>
                    
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full ${getOilStatusColorHex(oilPercentage)} transition-all duration-500`} 
                        style={{ width: `${oilPercentage}%` }} 
                      />
                    </div>

                    {kmFaltantesParaTroca <= 0 ? (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 animate-pulse pt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> ATENÇÃO: Troca recomendada imediata!
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium">
                        Faltam <span className="font-semibold text-slate-600 font-mono">{kmFaltantesParaTroca} km</span> para a próxima troca de óleo.
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Quick Actions */}
                <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex gap-2 justify-between">
                  {/* Left Side: General Interactions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleOpenEditForm(moto)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-white border hover:border-slate-200 border-transparent rounded-lg transition-all cursor-pointer"
                      title="Editar dados da moto"
                      id={`edit-${moto.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(moto.id, moto.placa)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 border hover:border-red-100 border-transparent rounded-lg transition-all cursor-pointer"
                      title="Excluir moto"
                      id={`delete-${moto.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Right Side: Context Action Switcher */}
                  <div className="flex gap-2">
                    {moto.status === 'disponivel' && (
                      <button
                        onClick={() => onNavigateToRent(moto)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                        id={`action-rent-${moto.id}`}
                      >
                        Alugar
                      </button>
                    )}
                    <button
                      onClick={() => onNavigateToMaintenance(moto)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                      id={`action-maint-${moto.id}`}
                    >
                      Oficina
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-xl mx-auto space-y-4 shadow-xs" id="empty-estoque">
          <Bike className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-800">Seu Estoque está Vazio!</h4>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              {searchQuery 
                ? 'Nenhuma moto corresponde ao resultado da busca.' 
                : 'Não há motocicletas cadastradas no banco de dados. Cadastre sua primeira moto para iniciar o gerenciamento.'
              }
            </p>
          </div>
          {!searchQuery && (
            <button
              onClick={handleOpenAddForm}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
            >
              Adicionar Primeira Moto
            </button>
          )}
        </div>
      )}
    </div>
  );
}
