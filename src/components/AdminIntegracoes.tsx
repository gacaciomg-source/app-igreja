/**
 * INTEGRAÇÕES — tela do painel (só super admin)
 *
 * WhatsApp pela Evolution API: endereço, chave e instância, ligar/desligar,
 * conectar pelo QR Code e enviar mensagem de teste. Nada disso vai no app:
 * o WhatsApp é usado só pelo servidor. Instalação em GUIA_EVOLUTION_API.md.
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeft, MessageSquare, CheckCircle2, AlertCircle, QrCode, Send, Power } from 'lucide-react';
import { api } from '../services/apiService';

type Estado = { ativo: boolean; url: string; instancia: string; temChave: boolean; webhookUrl: string; estado: string; erro?: string };

const ROTULO: Record<string, { texto: string; cor: string }> = {
  open: { texto: 'Conectado', cor: 'bg-emerald-100 text-emerald-700' },
  connecting: { texto: 'Aguardando leitura do QR Code', cor: 'bg-amber-100 text-amber-700' },
  close: { texto: 'Desconectado', cor: 'bg-slate-200 text-slate-600' },
  inexistente: { texto: 'Instância ainda não criada', cor: 'bg-slate-200 text-slate-600' },
  desligado: { texto: 'Integração desligada', cor: 'bg-slate-200 text-slate-600' },
  erro: { texto: 'Sem acesso à Evolution API', cor: 'bg-red-100 text-red-700' },
};

export default function AdminIntegracoes({ onBack, showMessage }: { onBack: () => void; showMessage?: (m: string) => void }) {
  const [info, setInfo] = useState<Estado | null>(null);
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [instancia, setInstancia] = useState('');
  const [qr, setQr] = useState<string | null>(null);
  const [telefone, setTelefone] = useState('');
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');

  const carregar = async () => {
    try {
      const r: Estado = await api.request('/integracoes/evolution');
      setInfo(r);
      setUrl(u => u || r.url);
      setInstancia(i => i || r.instancia);
      if (r.estado === 'open') setQr(null);
    } catch (e: any) { setErro(e.message || 'Não foi possível carregar.'); }
  };
  useEffect(() => { carregar(); const t = setInterval(carregar, 5000); return () => clearInterval(t); }, []);

  const executar = async (rotulo: string, fn: () => Promise<void>) => {
    setErro(''); setOcupado(rotulo);
    try { await fn(); await carregar(); }
    catch (e: any) { setErro(e.message || 'Falhou.'); }
    finally { setOcupado(''); }
  };

  const salvar = (ativo: boolean) => executar(ativo ? 'salvar' : 'desligar', async () => {
    await api.request('/integracoes/evolution', { method: 'POST', body: JSON.stringify({ url: url.trim(), apiKey: apiKey.trim(), instancia: instancia.trim(), ativo }) });
    setApiKey('');
    showMessage?.(ativo ? 'Evolution API ligada.' : 'Voltou para o WhatsApp antigo.');
  });

  const conectar = () => executar('conectar', async () => {
    const r = await api.request('/integracoes/evolution/conectar', { method: 'POST' });
    setQr(r.qr || null);
    if (!r.qr) showMessage?.(r.mensagem || 'Já está conectado.');
  });

  const testar = () => executar('teste', async () => {
    await api.request('/integracoes/evolution/teste', { method: 'POST', body: JSON.stringify({ telefone }) });
    showMessage?.('Mensagem de teste enviada.');
  });

  const estado = info ? (info.erro ? 'erro' : info.ativo ? info.estado : 'desligado') : 'desligado';
  const campo = 'w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none';

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-6 h-6 text-slate-500" /></button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Integrações</h2>
          <p className="text-slate-500 text-sm">Serviços externos usados pelo servidor</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-emerald-600" /> WhatsApp — Evolution API</h3>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ROTULO[estado]?.cor || ROTULO.close.cor}`}>{ROTULO[estado]?.texto || estado}</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Com a integração ligada, todo o WhatsApp do sistema (Atendimento, envio em massa, lembretes e recuperação de senha)
          passa a usar a Evolution API, e o WhatsApp antigo deixa de abrir o Chrome no servidor. Como instalar: GUIA_EVOLUTION_API.md.
        </p>

        {info?.erro && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{info.erro}</p>}
        {erro && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{erro}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Endereço da Evolution API</label>
            <input className={campo} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://evolution.suaigreja.com.br" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Chave da API (AUTHENTICATION_API_KEY)</label>
            <input className={campo} type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)}
              placeholder={info?.temChave ? '•••••••• (guardada — deixe vazio para manter)' : 'Cole a chave aqui'} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Nome da instância</label>
            <input className={campo} value={instancia} onChange={e => setInstancia(e.target.value.replace(/[^a-zA-Z0-9_-]/g, '-'))} placeholder="igreja-renovar" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => salvar(true)} disabled={!!ocupado || !url || !instancia || (!apiKey && !info?.temChave)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2">
            <Power className="w-4 h-4" /> {ocupado === 'salvar' ? 'Verificando...' : info?.ativo ? 'Salvar alterações' : 'Salvar e ligar'}
          </button>
          {info?.ativo && (
            <>
              <button onClick={conectar} disabled={!!ocupado || estado === 'open'} className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2">
                <QrCode className="w-4 h-4" /> {ocupado === 'conectar' ? 'Gerando...' : 'Conectar (QR Code)'}
              </button>
              <button onClick={() => salvar(false)} disabled={!!ocupado} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold disabled:opacity-50">
                {ocupado === 'desligar' ? 'Desligando...' : 'Desligar e voltar ao WhatsApp antigo'}
              </button>
            </>
          )}
        </div>

        {qr && estado !== 'open' && (
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <img src={qr} alt="QR Code do WhatsApp" className="w-56 h-56" />
            <p className="text-xs text-slate-500 text-center">No celular da igreja: WhatsApp → Aparelhos conectados → Conectar um aparelho.</p>
          </div>
        )}
        {estado === 'open' && <p className="text-sm font-bold text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> WhatsApp conectado pela Evolution API.</p>}

        {info?.ativo && estado === 'open' && (
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Enviar teste para</label>
              <input className={campo} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="31999999999" />
            </div>
            <button onClick={testar} disabled={!!ocupado || telefone.replace(/\D/g, '').length < 10} className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              <Send className="w-4 h-4" /> {ocupado === 'teste' ? 'Enviando...' : 'Testar'}
            </button>
          </div>
        )}

        {info?.webhookUrl && (
          <p className="text-[11px] text-slate-400 break-all">Endereço que a Evolution usa para avisar mensagens recebidas (configurado sozinho): {info.webhookUrl}</p>
        )}
      </div>
    </div>
  );
}
