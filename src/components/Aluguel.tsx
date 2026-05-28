import React, { useState } from 'react';
import { Moto, Aluguel } from '../types';
import { 
  Plus, 
  User, 
  FileText, 
  Calendar, 
  X, 
  Check, 
  AlertCircle, 
  DollarSign, 
  CheckCircle,
  KeyRound,
  History,
  TrendingUp,
  RotateCw,
  Gauge
} from 'lucide-react';

interface AluguelProps {
  alugueis: Aluguel[];
  motos: Moto[];
  onAddAluguel: (aluguel: Omit<Aluguel, 'id'>) => Promise<any>;
  onFinalizarAluguel: (aluguelId: string, motoId: string, odometroFinal: number, dataFim: string, valorPago: number) => Promise<boolean>;
  selectedMotoForRent?: Moto | null;
  clearSelectedMotoForRent?: () => void;
}

export default function AluguelComponent({
  alugueis,
  motos,
  onAddAluguel,
  onFinalizarAluguel,
  selectedMotoForRent,
  clearSelectedMotoForRent
}: AluguelProps) {

  const [activeTab, setActiveTab] = useState<'ativos' | 'historico'>('ativos');
  const [showRentForm, setShowRentForm] = useState(false);
  const [showCheckoutForm, setShowCheckoutForm] = useState<Aluguel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Rent Form State
  const [motoId, setMotoId] = useState('');
  const [locatarioNome, setLocatarioNome] = useState('');
  const [locatarioDocumento, setLocatarioDocumento] = useState('');
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0]);
  const [valorContrato, setValorContrato] = useState<number>(0);

  // Return/Checkout Form State
  const [odometroFinal, setOdometroFinal] = useState<number>(0);
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);
  const [valorPago, setValorPago] = useState<number>(0);

  // Filter available motorcycles
  const motosDisponiveis = motos.filter(m => m.status === 'disponivel');

  // If a motorcycle was pre-selected from the Inventory tab
  React.useEffect(() => {
    if (selectedMotoForRent) {
      setMotoId(selectedMotoForRent.id);
      setValorContrato(selectedMotoForRent.valor_semanal);
      setErrorMsg('');
      setShowRentForm(true);
    }
  }, [selectedMotoForRent]);

  const handleOpenRentForm = () => {
    setMotoId('');
    setLocatarioNome('');
    setLocatarioDocumento('');
    setDataInicio(new Date().toISOString().split('T')[0]);
    setValorContrato(0);
    setErrorMsg('');
    setShowRentForm(true);
  };

  const handleSelectMoto = (id: string) => {
    setMotoId(id);
    const target = motos.find(m => m.id === id);
    if (target) {
      setValorContrato(target.valor_semanal);
    }
  };

  const calculateSuggestedValue = (rental: Aluguel, endDateStr: string) => {
    const motoInstance = motos.find(m => m.id === rental.moto_id);
    if (!motoInstance) return 0;
    
    const start = new Date(rental.data_inicio);
    const end = new Date(endDateStr);
    
    // Calculate difference in days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    
    // Calculate weeks (or partial weeks)
    const weeks = diffDays / 7;
    // Suggest payment = weeks * weekly price of contract (rounded helper)
    return Math.round(weeks * (motoInstance.valor_semanal) * 100) / 100;
  };

  const handleOpenCheckout = (rental: Aluguel) => {
    const motoInstance = motos.find(m => m.id === rental.moto_id);
    const initialOdo = motoInstance ? motoInstance.odometro_atual : 0;
    
    setOdometroFinal(initialOdo);
    const today = new Date().toISOString().split('T')[0];
    setDataFim(today);
    
    // Calculate suggested value based on duration
    const suggest = calculateSuggestedValue(rental, today);
    setValorPago(suggest);
    
    setErrorMsg('');
    setShowCheckoutForm(rental);
  };

  const handleDateFimChange = (dateValue: string) => {
    setDataFim(dateValue);
    if (showCheckoutForm) {
      const suggest = calculateSuggestedValue(showCheckoutForm, dateValue);
      setValorPago(suggest);
    }
  };

  const handleRentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!motoId) {
      setErrorMsg('Por favor, selecione uma motocicleta.');
      return;
    }
    if (!locatarioNome.trim() || !locatarioDocumento.trim()) {
      setErrorMsg('Preencha os dados do locatário.');
      return;
    }

    setIsSubmitting(true);
    try {
      const novoAluguel = {
        moto_id: motoId,
        locatario_nome: locatarioNome.trim(),
        locatario_documento: locatarioDocumento.trim(),
        data_inicio: dataInicio,
        status: 'ativo' as const
      };
      
      await onAddAluguel(novoAluguel);
      setShowRentForm(false);
      if (clearSelectedMotoForRent) clearSelectedMotoForRent();
    } catch (err) {
      setErrorMsg('Não foi possível registrar o aluguel no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!showCheckoutForm) return;

    const motoInstance = motos.find(m => m.id === showCheckoutForm.moto_id);
    const startOdo = motoInstance ? motoInstance.odometro_atual : 0;

    if (odometroFinal < startOdo) {
      setErrorMsg(`O odômetro de retorno (${odometroFinal} km) não pode ser inferior ao odômetro de saída (${startOdo} km).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onFinalizarAluguel(
        showCheckoutForm.id,
        showCheckoutForm.moto_id,
        Number(odometroFinal),
        dataFim,
        Number(valorPago)
      );
      setShowCheckoutForm(null);
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao registrar a baixa do aluguel.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRentals = alugueis.filter(a => a.status === 'ativo');
  const finishedRentals = alugueis.filter(a => a.status === 'finalizado');

  // Helper helper to get visual details
  const getDaysElapsed = (startStr: string) => {
    const start = new Date(startStr);
    const today = new Date();
    // Zero out times
    start.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diff = today.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  };

  return (
    <div className="space-y-6" id="rental-module-view">
      
      {/* MODULE HEADERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex bg-slate-100 p-1.5 rounded-xl self-start">
          <button
            onClick={() => setActiveTab('ativos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'ativos' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Aluguéis Ativos ({activeRentals.length})
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide uppercase transition-all cursor-pointer ${
              activeTab === 'historico' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" /> Histórico ({finishedRentals.length})
          </button>
        </div>

        <button
          onClick={handleOpenRentForm}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          id="btn-rent-out-start"
        >
          <Plus className="w-5 h-5" /> Alugar uma Moto
        </button>
      </div>

      {/* RENT SYSTEM WIZARD MODAL */}
      {showRentForm && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">🔑 Registrar Novo Contrato de Aluguel</h3>
              <button
                onClick={() => {
                  setShowRentForm(false);
                  if (clearSelectedMotoForRent) clearSelectedMotoForRent();
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRentSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-red-600" />
                  {errorMsg}
                </div>
              )}

              {/* Moto selector */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Selecione a Moto Disponível *</label>
                {selectedMotoForRent ? (
                  <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        {selectedMotoForRent.marca} {selectedMotoForRent.modelo}
                      </span>
                      <p className="text-xs text-slate-500 font-mono">Placa: {selectedMotoForRent.placa} | Odo: {selectedMotoForRent.odometro_atual} km</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
                      R$ {selectedMotoForRent.valor_semanal}/sem
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
                    {motosDisponiveis.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.marca} {m.modelo} - Placa: {m.placa} (R$ {m.valor_semanal}/sem)
                      </option>
                    ))}
                  </select>
                )}
                {motosDisponiveis.length === 0 && !selectedMotoForRent && (
                  <p className="mt-1.5 text-xs text-amber-600 font-semibold">
                    🚨 Nenhuma moto disponível no momento! Altere o status de alguma no estoque ou cadastre uma nova.
                  </p>
                )}
              </div>

              {/* Renter Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dados do Cliente/Locatário</h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Nome Completo *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="Nome do cliente"
                      value={locatarioNome}
                      onChange={(e) => setLocatarioNome(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">CPF ou CNH *</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: 123.456.789-00 ou CNH"
                      value={locatarioDocumento}
                      onChange={(e) => setLocatarioDocumento(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Contractual Values */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Data de Retirada *</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-3 text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      required
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Valor Semanal</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      readOnly
                      value={valorContrato}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowRentForm(false);
                    if (clearSelectedMotoForRent) clearSelectedMotoForRent();
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (!motoId && !selectedMotoForRent)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" /> Processando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Iniciar Aluguel
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT / RETURN SYSTEM CONTRACT FORM MODAL */}
      {showCheckoutForm && (() => {
        const correspondingMoto = motos.find(m => m.id === showCheckoutForm.moto_id);
        const startOdometer = correspondingMoto ? correspondingMoto.odometro_atual : 0;
        
        return (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 shadow-xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-950">🏁 Encerrar Contrato / Receber Moto</h3>
                  <p className="text-xs text-amber-700">Registre o recebimento do aluguel e atualize o odômetro.</p>
                </div>
                <button
                  onClick={() => setShowCheckoutForm(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-200/50 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold border border-red-100 flex items-center gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0" /> {errorMsg}
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
                  <div><strong>Locatário:</strong> {showCheckoutForm.locatario_nome}</div>
                  <div><strong>Moto:</strong> {correspondingMoto ? `${correspondingMoto.marca} ${correspondingMoto.modelo} (${correspondingMoto.placa})` : 'Desconhecida'}</div>
                  <div><strong>Retirada:</strong> {showCheckoutForm.data_inicio} ({getDaysElapsed(showCheckoutForm.data_inicio)} dias rodados)</div>
                  <div><strong>Odômetro de Saída:</strong> {startOdometer} km</div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Data de Devolução *</label>
                  <input
                    type="date"
                    required
                    value={dataFim}
                    onChange={(e) => handleDateFimChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Odômetro de Retorno (Km) * (Mínimo: {startOdometer} km)
                  </label>
                  <div className="relative">
                    <Gauge className="absolute left-3.5 top-3 text-slate-400 w-4.5 h-4.5" />
                    <input
                      type="number"
                      required
                      min={startOdometer}
                      value={odometroFinal}
                      onChange={(e) => setOdometroFinal(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Valor Pago / Recebido (R$)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-2.5 text-slate-400 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={1}
                      value={valorPago}
                      onChange={(e) => setValorPago(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-250 rounded-xl text-sm font-bold text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Calculado com base na taxa semanal e número de dias rodados. Você pode alterar para o valor realmente recebido.
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCheckoutForm(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm py-2.5 rounded-xl cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? 'Processando...' : 'Encerrar & Receber'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ACTIVE CONTRACTS LIST OR HISTORICAL LIST */}
      {activeTab === 'ativos' ? (
        activeRentals.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="ativos-grid-list">
            {activeRentals.map(rental => {
              const moto = motos.find(m => m.id === rental.moto_id);
              const days = getDaysElapsed(rental.data_inicio);
              
              return (
                <div 
                  key={rental.id} 
                  className="bg-white rounded-2xl border border-slate-150 shadow-xs p-6 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-150 uppercase tracking-wider">
                          Aluguel em Andamento
                        </span>
                        <h4 className="text-base font-black text-slate-900 mt-1">{rental.locatario_nome}</h4>
                        <p className="text-xs text-slate-500 font-medium font-mono">CNH/CPF: {rental.locatario_documento}</p>
                      </div>

                      {moto && (
                        <div className="text-right">
                          <span className="font-mono font-bold text-xs bg-slate-100 border px-2 py-1 rounded-lg text-slate-700">
                            {moto.placa}
                          </span>
                          <div className="text-[11px] font-bold text-slate-800 mt-1.5">{moto.marca} {moto.modelo}</div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider block">Início da Locação</span>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {rental.data_inicio}
                        </div>
                      </div>

                      <div className="space-y-0.5">
                        <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider block">Período Decorrido</span>
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                          {days === 0 ? 'Retirada Hoje' : `${days} dia(s) rodado(s)`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:items-center justify-between gap-4 border-t border-slate-100 pt-4 mt-5">
                    <div className="text-xs font-semibold text-slate-500">
                      Taxa Contratada: <strong className="text-slate-900">R$ {moto?.valor_semanal || 0}/semana</strong>
                    </div>

                    <button
                      onClick={() => handleOpenCheckout(rental)}
                      className="bg-slate-950 hover:bg-slate-900 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer transition-colors"
                      id={`btn-checkout-${rental.id}`}
                    >
                      Dar Baixa / Encerrar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-xl mx-auto space-y-4 shadow-xs" id="empty-active-rents">
            <KeyRound className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-800">Nenhum Aluguel Ativo</h4>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No momento, todas as suas motocicletas estão no estoque livres para alugar. Clique no botão de alugar para iniciar uma nova locação.
              </p>
            </div>
            <button
              onClick={handleOpenRentForm}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 px-4 rounded-xl cursor-pointer"
            >
              Registrar Primeiro Aluguel
            </button>
          </div>
        )
      ) : (
        /* HISTORICO LIST */
        finishedRentals.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-150 overflow-hidden shadow-xs" id="history-tb-card">
            <div className="overflow-x-auto">
              <table className="w-full text-slate-700 text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-150 font-bold text-slate-600 text-xs tracking-wider uppercase">
                  <tr>
                    <th className="px-5 py-3.5 text-left">Locatário</th>
                    <th className="px-5 py-3.5 text-left">Motocicleta</th>
                    <th className="px-5 py-3.5 text-left">Período de Uso</th>
                    <th className="px-5 py-3.5 text-right">Faturamento Realizado</th>
                    <th className="px-5 py-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finishedRentals.map(rental => {
                    const moto = motos.find(m => m.id === rental.moto_id);
                    return (
                      <tr key={rental.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">{rental.locatario_nome}</div>
                          <div className="text-xs text-slate-400 font-mono">Doc: {rental.locatario_documento}</div>
                        </td>
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
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                          <div>Saída: {rental.data_inicio}</div>
                          <div>Devolução: {rental.data_fim || '-'}</div>
                        </td>
                        <td className="px-5 py-4 text-right font-black font-sans text-slate-900">
                          R$ {(Number(rental.valor_pago) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-150 uppercase">
                            <CheckCircle className="w-3 h-3" /> Concluído
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center max-w-xl mx-auto space-y-4 shadow-xs" id="empty-history-rents">
            <History className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-800 font-sans">Sem histórico de locação</h4>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Após registrar o encerramento das suas primeiras locações de motocicletas, os registros fiscais detalhados aparecerão aqui.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
