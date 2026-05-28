import React from 'react';
import { Moto, Aluguel, Manutencao } from '../types';
import { 
  DollarSign, 
  Wrench, 
  TrendingUp, 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  Activity, 
  Calendar,
  AlertOctagon,
  ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';

interface DashboardProps {
  motos: Moto[];
  alugueis: Aluguel[];
  manutencoes: Manutencao[];
  changeTab: (tab: string) => void;
  onQuickOilChange: (moto: Moto) => void;
}

export default function Dashboard({ motos, alugueis, manutencoes, changeTab, onQuickOilChange }: DashboardProps) {
  // Helper calculations
  const totalMotos = motos.length;
  const motosAlugadas = motos.filter(m => m.status === 'alugada').length;
  const motosDisponiveis = motos.filter(m => m.status === 'disponivel').length;
  const motosManutencao = motos.filter(m => m.status === 'manutencao').length;

  // Active rentals
  const alugueisAtivos = alugueis.filter(a => a.status === 'ativo');
  
  // Weekly faturamento from active rentals
  const faturamentoSemanal = alugueisAtivos.reduce((acc, curr) => {
    // Find the associated motorcycle to get its actual week rate
    const motoInstance = motos.find(m => m.id === curr.moto_id);
    return acc + (motoInstance?.valor_semanal || 0);
  }, 0);

  // Total maintenance cost accrued
  const custoTotalManutencao = manutencoes.reduce((acc, curr) => acc + (Number(curr.custo) || 0), 0);

  // Realized profit (historical) - sum of 'valor_pago' from closed rentals
  const faturamentoHistoricoRealizado = alugueis
    .filter(a => a.status === 'finalizado')
    .reduce((acc, curr) => acc + (Number(curr.valor_pago) || 0), 0);

  // Oil changes calculations: Oil changes are every 1500 Km.
  // Oil change is needed if: current_odometer - last_oil_change_odometer >= 1500
  const motosPrecisamTrocaOleo = motos.filter(moto => {
    const kmPercorridos = moto.odometro_atual - moto.odometro_ultima_troca_oleo;
    return kmPercorridos >= 1500;
  });

  const motosAlertaTrocaOleo = motos.filter(moto => {
    const kmPercorridos = moto.odometro_atual - moto.odometro_ultima_troca_oleo;
    return kmPercorridos >= 1300 && kmPercorridos < 1500;
  });

  // Calculate costs by maintenance type for the chart
  const tiposManutencao = [
    { name: 'Troca de Óleo', valor: 0, color: '#f59e0b' },
    { name: 'Peças', valor: 0, color: '#ef4444' },
    { name: 'Reparo', valor: 0, color: '#3b82f6' },
    { name: 'Outros', valor: 0, color: '#6b7280' },
  ];

  manutencoes.forEach(m => {
    const entry = tiposManutencao.find(t => t.name === m.tipo);
    if (entry) {
      entry.valor += Number(m.custo) || 0;
    }
  });

  // Filter out types with 0 cost for cleaner visualization
  const dadosGraficoTipos = tiposManutencao.filter(t => t.valor > 0);

  // Motorcycle status data for Pie Chart
  const dadosGraficoStatus = [
    { name: 'Disponível', value: motosDisponiveis, color: '#10b981' },
    { name: 'Alugada', value: motosAlugadas, color: '#3b82f6' },
    { name: 'Em Manutenção', value: motosManutencao, color: '#f59e0b' },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8" id="dashboard-view">
      {/* ⚠️ CRITICAL ALERTS: Oil Change Needed */}
      {motosPrecisamTrocaOleo.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 shadow-sm" id="urgent-oil-banners">
          <div className="flex gap-4">
            <div className="bg-red-100 text-red-700 p-3 rounded-xl self-start">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-base font-bold text-red-950">Atenção: Troca de Óleo Urgente necessária!</h3>
                <p className="text-sm text-red-700">
                  {motosPrecisamTrocaOleo.length === 1 
                    ? 'Existe 1 motocicleta que atingiu ou superou o limite de 1500 Km rodados desde a última troca de óleo:'
                    : `Existem ${motosPrecisamTrocaOleo.length} motocicletas que atingiram ou superaram o limite de 1500 Km rodados desde a última troca de óleo:`
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                {motosPrecisamTrocaOleo.map(moto => {
                  const kmPercorridos = moto.odometro_atual - moto.odometro_ultima_troca_oleo;
                  return (
                    <div key={moto.id} className="bg-white border border-red-100 p-3 rounded-xl flex items-center justify-between shadow-xs">
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-900 text-sm">
                          {moto.marca} {moto.modelo} ({moto.placa})
                        </div>
                        <div className="text-xs text-red-600 font-mono">
                          Odômetro: {moto.odometro_atual} km | Percorridos: {kmPercorridos} km (+{kmPercorridos - 1500} km)
                        </div>
                      </div>
                      <button
                        onClick={() => onQuickOilChange(moto)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                        id={`quick-oil-${moto.id}`}
                      >
                        Trocar Óleo
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 NUMERICAL METRIC WIDGETS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="summary-cards">
        {/* Weekly Revenue Estimation */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Semanal Ativo</span>
              <div className="text-2xl font-black text-slate-950 font-sans">
                R$ {faturamentoSemanal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 font-medium">Das alocações ativas atuais</p>
            </div>
            <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl">
              <TrendingUp className="w-5 h-5" id="trend-icon" />
            </div>
          </div>
        </div>

        {/* Maintenance Cost Total */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Custo de Manutenção</span>
              <div className="text-2xl font-black text-slate-950 font-sans">
                R$ {custoTotalManutencao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 font-medium">Soma total de gastos em oficina</p>
            </div>
            <div className="bg-orange-50 text-orange-600 p-2.5 rounded-xl">
              <Wrench className="w-5 h-5" id="wrench-icon" />
            </div>
          </div>
        </div>

        {/* Financial Balance */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Historico Realizado</span>
              <div className="text-2xl font-black text-slate-950 font-sans">
                R$ {faturamentoHistoricoRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 font-medium font-mono">Receitas de contratos fechados</p>
            </div>
            <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Odometer & Service Status */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status da Frota</span>
              <div className="text-2xl font-black text-slate-950">
                {motos.length} <span className="text-xs text-slate-400 font-normal">Motos</span>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <span className="text-emerald-600">{motosDisponiveis} Disp.</span>
                <span className="text-blue-600">{motosAlugadas} Alug.</span>
                <span className="text-amber-600">{motosManutencao} Manut.</span>
              </div>
            </div>
            <div className="bg-slate-50 text-slate-600 p-2.5 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* 📈 FINANCES & STATUS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="financial-charts-layout">
        
        {/* Monthly/Total Upkeep categorisation */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 border-none pb-1">Custos de Oficina por Categoria</h3>
            <p className="text-xs text-slate-500 mb-6">Veja onde estão concentrados os valores de manutenção</p>
          </div>

          <div className="h-64 flex items-center justify-center">
            {dadosGraficoTipos.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGraficoTipos} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `R$ ${v}`} tickLine={false} />
                  <Tooltip 
                    formatter={(v: any) => [`R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Gasto']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    {dadosGraficoTipos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-400 text-sm py-8 space-y-1">
                <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold">Nenhuma manutenção com custo registrada</p>
                <p className="text-xs max-w-xs mx-auto">Adicione reparos ou custos na aba Oficina para gerar os gráficos financeiros.</p>
              </div>
            )}
          </div>
        </div>

        {/* Fleet Distribution */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 pb-1">Distribuição da Frota</h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">Status de disponibilidade das motocicletas cadastradas</p>
          </div>

          <div className="h-64 flex items-center justify-center relative">
            {dadosGraficoStatus.length > 0 ? (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around gap-4">
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosGraficoStatus}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dadosGraficoStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Moto(s)`, 'Quantidade']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 font-medium text-xs sm:w-1/2">
                  {dadosGraficoStatus.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600">{item.name}:</span>
                      <strong className="text-slate-900">{item.value} ({Math.round((item.value / totalMotos) * 100)}%)</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 text-sm py-8 space-y-1">
                <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold">Nenhuma motocicleta no estoque</p>
                <p className="text-xs">Cadastre suas motos na aba Estoque para ver a distribuição.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 💡 TROCA DE ÓLEO PREVENTIVA / ADVISORIES */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm" id="fleet-advise">
        <div className="flex items-center gap-3 mb-5">
          <Activity className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-bold text-slate-900">Resumo de Alertas de Preventiva</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center gap-3.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-slate-800 font-bold text-sm">
                {motos.filter(m => (m.odometro_atual - m.odometro_ultima_troca_oleo) < 1300).length} Motos
              </div>
              <p className="text-xs text-slate-500 font-medium font-sans">Óleo Excelente (&lt; 1300 km rodados)</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100/70 flex items-center gap-3.5">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-amber-800 font-bold text-sm">
                {motosAlertaTrocaOleo.length} Motos
              </div>
              <p className="text-xs text-amber-600 font-semibold font-sans">Atenção (1300km a 1500km rodados)</p>
            </div>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex items-center gap-3.5">
            <div className="p-2 bg-red-100 text-red-700 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-red-800 font-bold text-sm">
                {motosPrecisamTrocaOleo.length} Motos
              </div>
              <p className="text-xs text-red-600 font-semibold">Urgente (Mais de 1500km rodados)</p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER CALLS TO ACTION IF EMPTY */}
      {motos.length === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto" id="get-started-card">
          <CheckCircle className="w-12 h-12 text-slate-300 mx-auto" id="started-check" />
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-slate-800">Boas-vindas ao seu Painel de Gestão!</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Para ver os relatórios financeiros, estimativas de recebimentos e alertas de manutenção, comece adicionando suas primeiras motocicletas no Estoque.
            </p>
          </div>
          <button
            onClick={() => changeTab('estoque')}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-5 rounded-xl cursor-pointer inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            Ir para Estoque <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
