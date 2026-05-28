import React, { useState } from 'react';
import { Moto, Manutencao } from '../types';
import { 
  Plus, 
  Wrench, 
  Trash2, 
  Calendar, 
  Gauge, 
  DollarSign, 
  X, 
  Check, 
  Droplet, 
  Filter, 
  CheckSquare, 
  AlertTriangle,
  Search,
  RotateCw
} from 'lucide-react';

interface ManutencaoProps {
  manutencoes: Manutencao[];
  motos: Moto[];
  onAddManutencao: (manutencao: Omit<Manutencao, 'id'>, atualizarOdo: boolean) => Promise<any>;
  onDeleteManutencao: (id: string) => Promise<boolean>;
  selectedMotoForOil?: Moto | null;
  clearSelectedMotoForOil?: () => void;
}

export default function ManutencaoComponent({
  manutencoes,
  motos,
  onAddManutencao,
  onDeleteManutencao,
  selectedMotoForOil,
  clearSelectedMotoForOil
}: ManutencaoProps) {

  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('todos');
  const [searchPlate, setSearchPlate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [motoId, setMotoId] = useState('');
  const [tipo, setTipo] = useState<Manutencao['tipo']>('Troca de Óleo');
  const [descricao, setDescricao] = useState('');
  const [custo, setCusto] = useState<number>(0);
  const [odometro, setOdometro] = useState<number>(0);
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [atualizarOdometroMoto, setAtualizarOdometroMoto] = useState(true);

  // If a motorcycle was selected for immediate quick oil change
  React.useEffect(() => {
    if (selectedMotoForOil) {
      setMotoId(selectedMotoForOil.id);
      setTipo('Troca de Óleo');
      setDescricao('Troca de óleo preventiva (Frequência recomendada a cada 1500 Km)');
      setCusto(50); // Default common oil price
      setOdometro(selectedMotoForOil.odometro_atual);
      setData(new Date().toISOString().split('T')[0]);
      setAtualizarOdometroMoto(true);
      setErrorMsg('');
      setShowForm(true);
    }
  }, [selectedMotoForOil]);

  const handleOpenForm = () => {
    setMotoId('');
    setTipo('Troca de Óleo');
    setDescricao('');
    setCusto(0);
    setOdometro(0);
    setData(new Date().toISOString().split('T')[0]);
    setAtualizarOdometroMoto(true);
    setErrorMsg('');
    setShowForm(true);
  };

  const handleSelectMoto = (id: string) => {
    setMotoId(id);
    const target = motos.find(m => m.id === id);
    if (target) {
      setOdometro(target.odometro_atual);
    }
  };

  const handleSelectTipo = (tipoSelecionado: Manutencao['tipo']) => {
    setTipo(tipoSelecionado);
    if (tipoSelecionado === 'Troca de Óleo') {
      setDescricao('Troca de óleo preventiva (Frequência recomendada a cada 1500 Km)');
      if (custo === 0) setCusto(50); // Typical cost suggestion
    } else {
      setDescricao('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!motoId) {
      setErrorMsg('Favor selecionar uma motocicleta.');
      return;
    }

    const targetMoto = motos.find(m => m.id === motoId);
    if (targetMoto && odometro < targetMoto.odometro_atual && tipo !== 'Troca de Óleo') {
      // Small check to prevent backdating odometer
      const confirm = window.confirm(`O odômetro inserido (${odometro} km) é inferior ao odômetro atual da moto no estoque (${targetMoto.odometro_atual} km). Prosseguir mesmo assim?`);
      if (!confirm) return;
    }

    if (tipo === 'Troca de Óleo' && targetMoto && odometro < targetMoto.odometro_ultima_troca_oleo) {
      setErrorMsg(`O odômetro desta troca de óleo (${odometro} Km) é menor que a última troca registrada no estoque (${targetMoto.odometro_ultima_troca_oleo} Km).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const novaManutencao = {
        moto_id: motoId,
        tipo,
        descricao: descricao.trim() || `${tipo} periódica de rotina`,
        custo: Number(custo),
        odometro: Number(odometro),
        data
      };

      await onAddManutencao(novaManutencao, atualizarOdometroMoto);
      setShowForm(false);
      if (clearSelectedMotoForOil) clearSelectedMotoForOil();
    } catch (err) {
      setErrorMsg('Erro de conexão ao salvar a manutenção no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = window.confirm('Tem certeza de que deseja remover esta ficha de manutenção? Esta alteração é permanente.');
    if (confirm) {
      try {
        await onDeleteManutencao(id);
      } catch (err) {
        alert('Erro ao excluir registro de manutenção.');
      }
    }
  };

  // Filter logs
  const filteredLogs = manutencoes.filter(m => {
    const motoInstance = motos.find(b => b.id === m.moto_id);
    const plateMatches = searchPlate 
      ? (motoInstance?.placa.toLowerCase().includes(searchPlate.toLowerCase()) || false)
      : true;
    const typeMatches = filterType === 'todos' ? true : m.tipo === filterType;
    return plateMatches && typeMatches;
  });

  return (
    <div className="space-y-6" id="maint-office-view">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
          {/* Plate Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Filtro por Placa da Moto..."
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="w-full bg-white border border-slate-250 rounded-xl py-2 px-9 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {/* Type Filter dropdown */}
          <div className="relative w-full sm:w-52">
            <Filter className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-white border border-slate-250 rounded-xl py-2 pl-9 pr-4 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none cursor-pointer"
            >
              <option value="todos">🛠️ Todas Manutenções</option>
              <option value="Troca de Óleo">🛢️ Apenas Troca de Óleo</option>
              <option value="Peças">⚙️ Apenas Peças</option>
              <option value="Reparo">🔧 Apenas Reparos</option>
              <option value="Outros">📌 Outros</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenForm}
          className="bg-slate-950 hover:bg-slate-900 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
          id="btn-add-maintenance-log"
        >
          <Plus className="w-5 h-5" /> Registrar Manutenção
        </button>
      </div>

      {/* MAINTENANCE INPUT FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-slate-700" /> Registrar Manutenção de Frota
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  if (clearSelectedMotoForOil) clearSelectedMotoForOil();
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-101 flex items-center gap-2">
                  <AlertTriangle className="w-4.5 h-4.5 text-red-650 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Moto selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Selecione a Moto *</label>
                {selectedMotoForOil ? (
                  <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedMotoForOil.marca} {selectedMotoForOil.modelo}
                      </span>
                      <p className="text-xs text-slate-500 font-mono">Placa: {selectedMotoForOil.placa} | Odo: {selectedMotoForOil.odometro_atual} km</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">
                      🚨 Troca Óleo
                    </span>
                  </div>
                ) : (
                  <select
                    required
                    value={motoId}
                    onChange={(e) => handleSelectMoto(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
                  >
                    <option value="">-- Escolha uma motocicleta --</option>
                    {motos.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.marca} {m.modelo} - Placa: {m.placa} (Odo: {m.odometro_atual} km)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Maintenance Type & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipo de Serviço *</label>
                  <select
                    value={tipo}
                    onChange={(e) => handleSelectTipo(e.target.value as Manutencao['tipo'])}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  >
                    <option value="Troca de Óleo">🛢️ Troca de Óleo</option>
                    <option value="Peças">⛓️ Troca de Peças</option>
                    <option value="Reparo">🔧 Reparos em Geral</option>
                    <option value="Outros">📌 Outros Serviços</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Data do Serviço *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      required
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cost & Odometer during service */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Custo do Serviço (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1}
                      value={custo}
                      onChange={(e) => setCusto(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Odômetro do Serviço (Km) *</label>
                  <div className="relative">
                    <Gauge className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="number"
                      required
                      min={0}
                      value={odometro}
                      onChange={(e) => setOdometro(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Description box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Descrição detalhada</label>
                <textarea
                  rows={2}
                  placeholder="Descreva as peças substituídas ou reparos efetuados..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white resize-none"
                />
              </div>

              {/* Sync settings */}
              {tipo !== 'Troca de Óleo' && (
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-150">
                  <input
                    type="checkbox"
                    id="chk-odo-sync"
                    checked={atualizarOdometroMoto}
                    onChange={(e) => setAtualizarOdometroMoto(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="chk-odo-sync" className="text-xs text-slate-600 select-none cursor-pointer">
                    Atualizar odômetro atual da moto no estoque para <strong className="font-mono">{odometro} Km</strong>
                  </label>
                </div>
              )}

              {tipo === 'Troca de Óleo' && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-[11px] text-amber-800 leading-relaxed font-semibold">
                  🌿 Nota: Por ser uma Troca de Óleo, o sistema irá atualizar automaticamente o odômetro da moto e salvará o km atual como o ponto de partida para os próximos 1500 Km.
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    if (clearSelectedMotoForOil) clearSelectedMotoForOil();
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !motoId}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Registrar Serviço
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOG HISTORY LIST */}
      {filteredLogs.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs" id="maint-table-card">
          <div className="overflow-x-auto">
            <table className="w-full text-slate-700 text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-150 font-bold text-slate-600 text-xs tracking-wider uppercase">
                <tr>
                  <th className="px-5 py-3.5 text-left">Motocicleta</th>
                  <th className="px-5 py-3.5 text-left">Tipo de Serviço</th>
                  <th className="px-5 py-3.5 text-left">Descrição / Registro</th>
                  <th className="px-5 py-3.5 text-left">Data</th>
                  <th className="px-5 py-3.5 text-right">Odômetro</th>
                  <th className="px-5 py-3.5 text-right">Custo</th>
                  <th className="px-5 py-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const moto = motos.find(m => m.id === log.moto_id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        {moto ? (
                          <div>
                            <span className="font-mono text-xs font-bold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              {moto.placa}
                            </span>
                            <div className="text-xs font-semibold text-slate-700 mt-1">{moto.marca} {moto.modelo}</div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Moto removida</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {log.tipo === 'Troca de Óleo' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-155">
                            <Droplet className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Troca de Óleo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                            {log.tipo}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 max-w-xs overflow-hidden text-ellipsis">
                        <div className="text-slate-900 font-medium font-sans">{log.descricao}</div>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500 font-mono">
                        {log.data}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                        {log.odometro} Km
                      </td>
                      <td className="px-5 py-4 text-right font-black font-sans text-slate-900">
                        R$ {log.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex"
                          id={`del-log-${log.id}`}
                          title="Remover histórico"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-sm mx-auto space-y-4 shadow-xs" id="empty-maint">
          <Wrench className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-800 font-sans">Sem Registros de Manutenção</h4>
            <p className="text-sm text-slate-500">
              {searchPlate || filterType !== 'todos' 
                ? 'Nenhum registro corresponde aos filtros atuais.' 
                : 'Não há registros de consertos, peças ou preventivas de troca de óleo cadastrados no banco de dados.'
              }
            </p>
          </div>
          {!searchPlate && filterType === 'todos' && (
            <button
              onClick={handleOpenForm}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
            >
              Adicionar Primeira Manutenção
            </button>
          )}
        </div>
      )}
    </div>
  );
}
