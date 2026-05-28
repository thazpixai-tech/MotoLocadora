import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Moto, Aluguel, Manutencao, SupabaseConfig } from '../types';

// Helper to get configuration
export function getDbConfig(): SupabaseConfig {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  
  const localUrl = localStorage.getItem('supabase_url') || '';
  const localKey = localStorage.getItem('supabase_anon_key') || '';

  const finalUrl = envUrl || localUrl;
  const finalKey = envKey || localKey;

  return {
    url: finalUrl,
    anonKey: finalKey,
    isConfigured: !!(finalUrl && finalKey)
  };
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getDbConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });
  }
  return supabaseInstance;
}

export function resetSupabaseInstance() {
  supabaseInstance = null;
}

// Local storage default keys
const LOCAL_MOTOS_KEY = 'locadora_motos';
const LOCAL_ALUGUEIS_KEY = 'locadora_alugueis';
const LOCAL_MANUTENCOES_KEY = 'locadora_manutencoes';

// Check if we should use Supabase or fallback to LocalStorage
export function isUsingSupabase(): boolean {
  return getDbConfig().isConfigured;
}

// SQL Script template to help the user configure their Supabase database
export const SUPABASE_SQL_SCRIPT = `-- SCRIPT DE CRIAÇÃO DAS TABELAS NO SUPABASE
-- Execute este código no 'SQL Editor' do seu painel do Supabase.

-- Habilitar UUID se necessário
create extension if not exists "uuid-ossp";

-- Criar tabela de MOTOS
create table if not exists public.motos (
  id uuid primary key default uuid_generate_v4(),
  placa text unique not null,
  modelo text not null,
  marca text not null,
  ano integer not null,
  odometro_atual integer not null default 0,
  odometro_ultima_troca_oleo integer not null default 0,
  status text not null default 'disponivel' check (status in ('disponivel', 'alugada', 'manutencao')),
  valor_semanal numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ativar segurança de RLS (Row Level Security), ou desativar temporariamente para facilitar
alter table public.motos enable row level security;
create policy "Acesso público total para motos" on public.motos for all using (true) with check (true);

-- Criar tabela de ALUGUEIS
create table if not exists public.alugueis (
  id uuid primary key default uuid_generate_v4(),
  moto_id uuid references public.motos(id) on delete cascade not null,
  locatario_nome text not null,
  locatario_documento text not null,
  data_inicio date not null,
  data_fim date,
  valor_pago numeric,
  status text not null default 'ativo' check (status in ('ativo', 'finalizado')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.alugueis enable row level security;
create policy "Acesso público total para alugueis" on public.alugueis for all using (true) with check (true);

-- Criar tabela de MANUTENCOES
create table if not exists public.manutencoes (
  id uuid primary key default uuid_generate_v4(),
  moto_id uuid references public.motos(id) on delete cascade not null,
  tipo text not null check (tipo in ('Troca de Óleo', 'Peças', 'Reparo', 'Outros')),
  descricao text not null,
  custo numeric not null default 0,
  odometro integer not null default 0,
  data date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.manutencoes enable row level security;
create policy "Acesso público total para manutencoes" on public.manutencoes for all using (true) with check (true);
`;

// ============================================================================
// DATA ACCESS LAYER
// ============================================================================

// 1. MOTOS

export async function getMotos(): Promise<Moto[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('motos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao buscar motos do Supabase:', error);
      throw error;
    }
    return data || [];
  } else {
    const local = localStorage.getItem(LOCAL_MOTOS_KEY);
    return local ? JSON.parse(local) : [];
  }
}

export async function salvarMoto(moto: Omit<Moto, 'id'> & { id?: string }): Promise<Moto> {
  const client = getSupabaseClient();
  const id = moto.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9));
  const novaMoto: Moto = {
    ...moto,
    id,
    created_at: moto.created_at || new Date().toISOString()
  };

  if (client) {
    const { data, error } = await client
      .from('motos')
      .upsert(novaMoto)
      .select()
      .single();
    if (error) {
      console.error('Erro ao salvar moto no Supabase:', error);
      throw error;
    }
    return data;
  } else {
    const motos = await getMotos();
    const index = motos.findIndex(m => m.id === id);
    if (index >= 0) {
      motos[index] = novaMoto;
    } else {
      motos.unshift(novaMoto);
    }
    localStorage.setItem(LOCAL_MOTOS_KEY, JSON.stringify(motos));
    return novaMoto;
  }
}

export async function deletarMoto(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client
      .from('motos')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Erro ao deletar moto no Supabase:', error);
      throw error;
    }
    return true;
  } else {
    // Cascade delete manually in Local Storage
    const motos = await getMotos();
    const novasMotos = motos.filter(m => m.id !== id);
    localStorage.setItem(LOCAL_MOTOS_KEY, JSON.stringify(novasMotos));

    // Delete associated rentals
    const alugueis = await getAlugueis();
    const novosAlugueis = alugueis.filter(a => a.moto_id !== id);
    localStorage.setItem(LOCAL_ALUGUEIS_KEY, JSON.stringify(novosAlugueis));

    // Delete associated maintenances
    const manutencoes = await getManutencoes();
    const novasManutencoes = manutencoes.filter(m => m.moto_id !== id);
    localStorage.setItem(LOCAL_MANUTENCOES_KEY, JSON.stringify(novasManutencoes));

    return true;
  }
}

// 2. ALUGUEIS

export async function getAlugueis(): Promise<Aluguel[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('alugueis')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao buscar alugueis do Supabase:', error);
      throw error;
    }
    return data || [];
  } else {
    const local = localStorage.getItem(LOCAL_ALUGUEIS_KEY);
    return local ? JSON.parse(local) : [];
  }
}

export async function salvarAluguel(aluguel: Omit<Aluguel, 'id'> & { id?: string }): Promise<Aluguel> {
  const client = getSupabaseClient();
  const id = aluguel.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9));
  const novoAluguel: Aluguel = {
    ...aluguel,
    id,
    created_at: aluguel.created_at || new Date().toISOString()
  };

  if (client) {
    // Start transaction or just upsert and update bike status
    const { data, error } = await client
      .from('alugueis')
      .upsert(novoAluguel)
      .select()
      .single();
    if (error) {
      console.error('Erro ao salvar aluguel no Supabase:', error);
      throw error;
    }

    // Update motorcycle status to 'alugada' or 'disponivel' based on rental status
    const novoStatusMotos = novoAluguel.status === 'ativo' ? 'alugada' : 'disponivel';
    await client
      .from('motos')
      .update({ status: novoStatusMotos })
      .eq('id', novoAluguel.moto_id);

    return data;
  } else {
    const alugueis = await getAlugueis();
    const index = alugueis.findIndex(a => a.id === id);
    if (index >= 0) {
      alugueis[index] = novoAluguel;
    } else {
      alugueis.unshift(novoAluguel);
    }
    localStorage.setItem(LOCAL_ALUGUEIS_KEY, JSON.stringify(alugueis));

    // Update motorcycle status locally
    const motos = await getMotos();
    const motoIndex = motos.findIndex(m => m.id === novoAluguel.moto_id);
    if (motoIndex >= 0) {
      motos[motoIndex].status = novoAluguel.status === 'ativo' ? 'alugada' : 'disponivel';
      localStorage.setItem(LOCAL_MOTOS_KEY, JSON.stringify(motos));
    }

    return novoAluguel;
  }
}

export async function finalizarAluguel(
  aluguelId: string, 
  motoId: string, 
  odometroFinal: number, 
  dataFim: string,
  valorPago: number
): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    // Update active rental status
    const { error: rentalError } = await client
      .from('alugueis')
      .update({
        status: 'finalizado',
        data_fim: dataFim,
        valor_pago: valorPago
      })
      .eq('id', aluguelId);

    if (rentalError) {
      console.error('Erro ao encerrar aluguel no Supabase:', rentalError);
      throw rentalError;
    }

    // Update motorcycle status and odometer
    const { error: motoError } = await client
      .from('motos')
      .update({
        status: 'disponivel',
        odometro_atual: odometroFinal
      })
      .eq('id', motoId);

    if (motoError) {
      console.error('Erro ao atualizar moto ao encerrar aluguel:', motoError);
      throw motoError;
    }

    return true;
  } else {
    // Local Update
    const alugueis = await getAlugueis();
    const rentalIndex = alugueis.findIndex(a => a.id === aluguelId);
    if (rentalIndex >= 0) {
      alugueis[rentalIndex] = {
        ...alugueis[rentalIndex],
        status: 'finalizado',
        data_fim: dataFim,
        valor_pago: valorPago
      };
      localStorage.setItem(LOCAL_ALUGUEIS_KEY, JSON.stringify(alugueis));
    }

    const motos = await getMotos();
    const motoIndex = motos.findIndex(m => m.id === motoId);
    if (motoIndex >= 0) {
      motos[motoIndex] = {
        ...motos[motoIndex],
        status: 'disponivel',
        odometro_atual: odometroFinal
      };
      localStorage.setItem(LOCAL_MOTOS_KEY, JSON.stringify(motos));
    }

    return true;
  }
}

// 3. MANUTENCOES

export async function getManutencoes(): Promise<Manutencao[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client
      .from('manutencoes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erro ao buscar manutencoes do Supabase:', error);
      throw error;
    }
    return data || [];
  } else {
    const local = localStorage.getItem(LOCAL_MANUTENCOES_KEY);
    return local ? JSON.parse(local) : [];
  }
}

export async function salvarManutencao(
  manutencao: Omit<Manutencao, 'id'> & { id?: string },
  atualizarOdometroMoto: boolean = false
): Promise<Manutencao> {
  const client = getSupabaseClient();
  const id = manutencao.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9));
  const novaManutencao: Manutencao = {
    ...manutencao,
    id,
    created_at: manutencao.created_at || new Date().toISOString()
  };

  if (client) {
    // Save maintenance log
    const { data, error } = await client
      .from('manutencoes')
      .upsert(novaManutencao)
      .select()
      .single();
    if (error) {
      console.error('Erro ao salvar manutencao no Supabase:', error);
      throw error;
    }

    // Update motorcycle odometer and oil change fields if it's an oil change
    const updatePayload: Record<string, any> = {};
    if (novaManutencao.tipo === 'Troca de Óleo') {
      updatePayload.odometro_ultima_troca_oleo = novaManutencao.odometro;
    }
    if (atualizarOdometroMoto || novaManutencao.tipo === 'Troca de Óleo') {
      updatePayload.odometro_atual = novaManutencao.odometro;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: motoError } = await client
        .from('motos')
        .update(updatePayload)
        .eq('id', novaManutencao.moto_id);
      if (motoError) console.error('Erro ao atualizar odometro na moto:', motoError);
    }

    return data;
  } else {
    const manutencoes = await getManutencoes();
    const index = manutencoes.findIndex(m => m.id === id);
    if (index >= 0) {
      manutencoes[index] = novaManutencao;
    } else {
      manutencoes.unshift(novaManutencao);
    }
    localStorage.setItem(LOCAL_MANUTENCOES_KEY, JSON.stringify(manutencoes));

    // Update motorcycle locally
    const motos = await getMotos();
    const motoIndex = motos.findIndex(m => m.id === novaManutencao.moto_id);
    if (motoIndex >= 0) {
      const targetMoto = motos[motoIndex];
      if (novaManutencao.tipo === 'Troca de Óleo') {
        targetMoto.odometro_ultima_troca_oleo = novaManutencao.odometro;
      }
      if (atualizarOdometroMoto || novaManutencao.tipo === 'Troca de Óleo') {
        targetMoto.odometro_atual = Math.max(targetMoto.odometro_atual, novaManutencao.odometro);
      }
      motos[motoIndex] = targetMoto;
      localStorage.setItem(LOCAL_MOTOS_KEY, JSON.stringify(motos));
    }

    return novaManutencao;
  }
}

export async function deletarManutencao(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client
      .from('manutencoes')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('Erro ao deletar manutenção no Supabase:', error);
      throw error;
    }
    return true;
  } else {
    const manutencoes = await getManutencoes();
    const novasManutencoes = manutencoes.filter(m => m.id !== id);
    localStorage.setItem(LOCAL_MANUTENCOES_KEY, JSON.stringify(novasManutencoes));
    return true;
  }
}
