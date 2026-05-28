export interface Moto {
  id: string; // UUID or local temporary ID
  placa: string;
  modelo: string;
  marca: string;
  ano: number;
  odometro_atual: number;
  odometro_ultima_troca_oleo: number;
  status: 'disponivel' | 'alugada' | 'manutencao';
  valor_semanal: number;
  created_at?: string;
}

export interface Aluguel {
  id: string;
  moto_id: string;
  locatario_nome: string;
  locatario_documento: string;
  data_inicio: string;
  data_fim?: string | null;
  valor_pago?: number;
  status: 'ativo' | 'finalizado';
  created_at?: string;
}

export interface Manutencao {
  id: string;
  moto_id: string;
  tipo: 'Troca de Óleo' | 'Peças' | 'Reparo' | 'Outros';
  descricao: string;
  custo: number;
  odometro: number;
  data: string;
  created_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}
