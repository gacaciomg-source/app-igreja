/**
 * VERSÕES DA BÍBLIA — tela do painel (só super admin)
 *
 * Apagar versões, importar uma Bíblia em JSON e restaurar as de fábrica.
 * O arquivo é lido aqui no navegador (src/lib/bibliaJson.ts) e só a versão
 * já organizada vai para o servidor — mais leve e com erro claro na hora.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, Trash2, Upload, RotateCcw, Globe, HardDrive, AlertCircle } from 'lucide-react';
import { api } from '../services/apiService';
import { lerBibliaJson, resumoBiblia, type TextoBiblia } from '../lib/bibliaJson';

interface Biblia { id: string; nome: string; sigla: string; fonte: 'bolls' | 'bibleapi' | 'local'; dominioPublico?: boolean }

const ORIGEM: Record<Biblia['fonte'], string> = {
  bolls: 'bolls.life (internet)',
  bibleapi: 'bible-api.com (internet)',
  local: 'Importada — guardada no servidor',
};

export default function AdminBiblias({ onBack, showMessage }: { onBack: () => void; showMessage?: (m: string) => void }) {
  const [lista, setLista] = useState<Biblia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [previa, setPrevia] = useState<{ livros: TextoBiblia; resumo: ReturnType<typeof resumoBiblia>; arquivo: string } | null>(null);
  const [nome, setNome] = useState('');
  const [sigla, setSigla] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const carregar = () => api.request('/biblias').then(setLista).catch(() => setErro('Não foi possível carregar a lista.')).finally(() => setCarregando(false));
  useEffect(() => { carregar(); }, []);

  const escolherArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    setErro('');
    try {
      let dados: unknown;
      try { dados = JSON.parse((await arq.text()).replace(/^﻿/, '')); }
      catch { throw new Error('O arquivo não é um JSON válido.'); }
      const livros = lerBibliaJson(dados);
      setPrevia({ livros, resumo: resumoBiblia(livros), arquivo: arq.name });
      const base = arq.name.replace(/\.json$/i, '');
      setNome(base);
      setSigla(base.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase());
    } catch (err: any) {
      setErro(err.message);
    }
  };

  const importar = async () => {
    if (!previa || !nome.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      await api.request('/biblias', { method: 'POST', body: JSON.stringify({ nome: nome.trim(), sigla: sigla.trim(), livros: previa.livros }) });
      setPrevia(null);
      showMessage?.('Bíblia importada!');
      carregar();
    } catch (err: any) {
      setErro(err.message || 'Falha ao importar.');
    } finally {
      setSalvando(false);
    }
  };

  const apagar = async (b: Biblia) => {
    if (lista.length <= 1) return setErro('Deixe pelo menos uma versão no app.');
    const aviso = b.fonte === 'local'
      ? `Apagar "${b.nome}"? O texto importado será removido do servidor.`
      : `Tirar "${b.nome}" do app? Dá para trazer de volta em "Restaurar versões de fábrica".`;
    if (!confirm(aviso)) return;
    try { setLista(await api.request(`/biblias/${b.id}`, { method: 'DELETE' })); }
    catch (err: any) { setErro(err.message || 'Falha ao apagar.'); }
  };

  const restaurar = async () => {
    try { setLista(await api.request('/biblias/restaurar', { method: 'POST' })); showMessage?.('Versões de fábrica restauradas.'); }
    catch (err: any) { setErro(err.message || 'Falha ao restaurar.'); }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-6 h-6 text-slate-500" /></button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Versões da Bíblia</h2>
          <p className="text-slate-500 text-sm">As versões que aparecem para os membros na tela Bíblia</p>
        </div>
      </header>

      {erro && (
        <div className="flex gap-2 items-start text-sm text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-100">
        {carregando ? <p className="p-4 text-sm text-slate-400">Carregando...</p> : lista.map(b => (
          <div key={b.id} className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-[10px] shrink-0">{b.sigla}</div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 truncate">{b.nome}</p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                {b.fonte === 'local' ? <HardDrive className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                {ORIGEM[b.fonte]}{b.dominioPublico ? ' · domínio público' : ''}
              </p>
            </div>
            <button onClick={() => apagar(b)} title="Apagar" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-600" /> Importar Bíblia (JSON)</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Aceita os formatos mais comuns do GitHub: lista de livros com capítulos, lista de versículos
          (livro, capítulo, versículo, texto) e outros parecidos. O texto fica guardado no servidor da igreja.
          Use só versões que a igreja tem direito de usar — muitas traduções têm direitos autorais da editora.
        </p>

        {!previa ? (
          <>
            <input ref={arquivoRef} type="file" accept=".json,application/json" className="hidden" onChange={escolherArquivo} />
            <button onClick={() => arquivoRef.current?.click()} className="w-full h-12 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center gap-2 hover:bg-emerald-100">
              <Upload className="w-4 h-4" /> Escolher arquivo .json
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-1">
              <p><strong>{previa.arquivo}</strong>: {previa.resumo.livros} livros, {previa.resumo.versiculos.toLocaleString('pt-BR')} versículos.</p>
              {previa.resumo.livros < 66 && <p className="text-amber-700">Atenção: faltam livros neste arquivo (o normal são 66).</p>}
              {previa.resumo.amostra && <p className="italic">Exemplo: "{previa.resumo.amostra.slice(0, 160)}"</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome (ex.: Almeida Revisada)" className="col-span-2 p-3 rounded-xl border text-sm" />
              <input value={sigla} onChange={e => setSigla(e.target.value.toUpperCase().slice(0, 10))} placeholder="Sigla" className="p-3 rounded-xl border text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPrevia(null)} className="flex-1 h-11 rounded-xl border font-bold text-slate-500">Cancelar</button>
              <button onClick={importar} disabled={salvando || !nome.trim()} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50">
                {salvando ? 'Enviando...' : 'Importar'}
              </button>
            </div>
          </div>
        )}
      </div>

      <button onClick={restaurar} className="w-full text-center text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1">
        <RotateCcw className="w-3 h-3" /> Restaurar versões de fábrica (as importadas continuam)
      </button>
    </div>
  );
}
