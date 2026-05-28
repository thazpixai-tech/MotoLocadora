import React, { useState, useEffect } from 'react';
import { getDbConfig, resetSupabaseInstance, SUPABASE_SQL_SCRIPT } from '../lib/supabaseService';
import { SupabaseConfig } from '../types';
import { Check, Clipboard, AlertCircle, Sparkles, Database, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ConfigSupabaseProps {
  onSaved: () => void;
}

export default function ConfigSupabase({ onSaved }: ConfigSupabaseProps) {
  const [config, setConfig] = useState<SupabaseConfig>({ url: '', anonKey: '', isConfigured: false });
  const [copied, setCopied] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  useEffect(() => {
    setConfig(getDbConfig());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('supabase_url', config.url.trim());
    localStorage.setItem('supabase_anon_key', config.anonKey.trim());
    resetSupabaseInstance();
    
    setSavedStatus('success');
    setTimeout(() => {
      setSavedStatus(null);
      onSaved();
    }, 1500);
  };

  const handleClear = () => {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_anon_key');
    resetSupabaseInstance();
    setConfig({ url: '', anonKey: '', isConfigured: false });
    
    setSavedStatus('cleared');
    setTimeout(() => {
      setSavedStatus(null);
      onSaved();
    }, 1500);
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8" id="config-supabase-container">
      <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Database className="w-6 h-6" id="db-icon" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900" id="db-title">Conecte seu Banco de Dados Supabase</h2>
            <p className="text-sm text-slate-500">
              Guarde todos os seus dados de forma persistente e segura na sua própria instância!
            </p>
          </div>
        </div>

        {savedStatus === 'success' && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-3 text-sm font-medium border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Configuração salva com sucesso! O sistema está conectado ao Supabase.
          </div>
        )}

        {savedStatus === 'cleared' && (
          <div className="mb-6 p-4 bg-slate-50 text-slate-800 rounded-xl flex items-center gap-3 text-sm font-medium border border-slate-200">
            <AlertCircle className="w-5 h-5 text-slate-600" />
            Credenciais limpas! O sistema voltou a usar o **Modo Experimental Local**.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2" htmlFor="supabase-url">
              SUPABASE URL
            </label>
            <input
              id="supabase-url"
              type="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://suasupabaseurl.supabase.co"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2" htmlFor="supabase-anon-key">
              SUPABASE ANON KEY
            </label>
            <textarea
              id="supabase-anon-key"
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all font-mono h-24 resize-none"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              id="btn-save-db"
              type="submit"
              className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium px-6 py-3 rounded-xl shadow-sm text-sm transition-colors text-center cursor-pointer"
            >
              Salvar Conexão do Supabase
            </button>
            {config.isConfigured && (
              <button
                id="btn-clear-db"
                type="button"
                onClick={handleClear}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl text-sm transition-all border border-slate-200 cursor-pointer"
              >
                Voltar para Modo Local
              </button>
            )}
          </div>
        </form>

        <div className="mt-6 flex gap-3 p-4 bg-amber-50/50 rounded-xl border border-amber-100 text-xs text-amber-800 leading-relaxed">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Aviso importante de segurança:</span> As chaves fornecidas são salvas exclusivamente no seu navegador (localStorage) ou integradas via variáveis locais, mantendo seu projeto 100% privado.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Passo 2: Crie as Tabelas no Supabase</h3>
              <p className="text-sm text-slate-500">Copie o script SQL abaixo e cole no editor do Supabase.</p>
            </div>
          </div>
          <button
            id="btn-copy-sql"
            onClick={copySql}
            className="flex items-center justify-center gap-2 self-start sm:self-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-4 py-2.5 rounded-lg font-semibold transition-all cursor-pointer border border-indigo-100"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" /> Copiado!
              </>
            ) : (
              <>
                <Clipboard className="w-4 h-4" /> Copiar Código SQL
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <pre className="bg-slate-950 text-slate-300 p-5 rounded-xl text-xs font-mono overflow-x-auto max-h-72 border border-slate-900 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-slate-950">
            {SUPABASE_SQL_SCRIPT}
          </pre>
          <div className="absolute bottom-3 right-3 bg-slate-950/80 px-2.5 py-1 rounded text-[10px] text-slate-400 font-mono tracking-wider">
            POSTGRESQL
          </div>
        </div>
      </div>
    </div>
  );
}
