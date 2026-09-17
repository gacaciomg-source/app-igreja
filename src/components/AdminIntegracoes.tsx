/**
 * INTEGRAÇÕES — tela do painel (só super admin)
 *
 * WhatsApp pela Evolution API: endereço, chave e instância, ligar/desligar,
 * conectar pelo QR Code e enviar mensagem de teste. Nada disso vai no app:
 * o WhatsApp é usado só pelo servidor. Instalação em GUIA_EVOLUTION_API.md.
 */
import React, { useEffect, useState } from 'react';
import { ChevronLeft, MessageSquare, CheckCircle2, AlertCircle, QrCode, Send, Power, Volume2 } from 'lucide-react';
import { api, getAbsoluteUrl } from '../services/apiService';
import { desbloquearAudio, tocarAgora } from '../lib/leitorBiblia';

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

      <CartaoVozNeural showMessage={showMessage} />
    </div>
  );
}

/**
 * BÍBLIA FALADA COM VOZ NEURAL — Azure Speech (+ Cloudflare R2 opcional).
 * Sem R2, os áudios ficam guardados neste servidor.
 */
function CartaoVozNeural({ showMessage }: { showMessage?: (m: string) => void }) {
  type Info = { ativo: boolean; azureRegiao: string; voz: 'masculina' | 'feminina'; temAzureKey: boolean;
    r2: { accountId: string; bucket: string; urlPublica: string; temChaves: boolean } };
  const [info, setInfo] = useState<Info | null>(null);
  const [form, setForm] = useState({ azureKey: '', azureRegiao: 'brazilsouth', voz: 'masculina' as 'masculina' | 'feminina',
    accountId: '', bucket: '', urlPublica: '', accessKeyId: '', secretAccessKey: '' });
  const [ocupado, setOcupado] = useState('');
  const [erro, setErro] = useState('');
  const [audioTeste, setAudioTeste] = useState<string | null>(null);

  const carregar = async () => {
    try {
      const r: Info = await api.request('/integracoes/voz');
      setInfo(r);
      setForm(f => ({ ...f, azureRegiao: r.azureRegiao, voz: r.voz, accountId: r.r2.accountId, bucket: r.r2.bucket, urlPublica: r.r2.urlPublica }));
    } catch (e: any) { setErro(e.message || 'Não foi possível carregar.'); }
  };
  useEffect(() => { carregar(); }, []);

  const salvar = async (ativo: boolean) => {
    setErro(''); setOcupado('salvar');
    try {
      await api.request('/integracoes/voz', { method: 'POST', body: JSON.stringify({
        ativo, azureKey: form.azureKey, azureRegiao: form.azureRegiao, voz: form.voz,
        r2: { accountId: form.accountId, bucket: form.bucket, urlPublica: form.urlPublica, accessKeyId: form.accessKeyId, secretAccessKey: form.secretAccessKey },
      }) });
      setForm(f => ({ ...f, azureKey: '', accessKeyId: '', secretAccessKey: '' }));
      showMessage?.(ativo ? 'Voz neural ligada.' : 'Voz neural desligada.');
      await carregar();
    } catch (e: any) { setErro(e.message || 'Falhou.'); }
    finally { setOcupado(''); }
  };

  const testar = async () => {
    setErro(''); setOcupado('teste'); setAudioTeste(null);
    // Player criado e destravado no próprio clique: gerar o áudio leva alguns
    // segundos, e depois disso o navegador bloquearia o som.
    desbloquearAudio();
    try {
      const { url } = await api.request('/integracoes/voz/teste', { method: 'POST' });
      setAudioTeste(getAbsoluteUrl(url));
      tocarAgora(url).catch(() => undefined);
    } catch (e: any) { setErro(e.message || 'Falhou.'); }
    finally { setOcupado(''); }
  };

  const campo = 'w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none';
  const usaR2 = !!(info?.r2.bucket && info?.r2.urlPublica && info?.r2.temChaves);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Volume2 className="w-5 h-5 text-emerald-600" /> Bíblia falada — voz neural (Azure)</h3>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${info?.ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
          {info?.ativo ? `Ligada · ${usaR2 ? 'áudios no Cloudflare R2' : 'áudios neste servidor'}` : 'Desligada (usa a voz do celular)'}
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">
        Voz quase humana para o botão "Ouvir" da Bíblia. Cada capítulo é gerado uma única vez e guardado; depois toca na hora, sem custo.
        No plano gratuito (F0) da Azure cabem cerca de 130 capítulos novos por mês. Se algo falhar, o app usa a voz do celular.
      </p>
      {erro && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{erro}</p>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Chave da Azure (CHAVE 1)</label>
          <input className={campo} type="password" autoComplete="off" value={form.azureKey} onChange={e => setForm({ ...form, azureKey: e.target.value })}
            placeholder={info?.temAzureKey ? '•••••••• (guardada — deixe vazio para manter)' : 'Cole a CHAVE 1 do recurso de Fala'} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Região</label>
          <input className={campo} value={form.azureRegiao} onChange={e => setForm({ ...form, azureRegiao: e.target.value })} placeholder="brazilsouth" />
        </div>
        <div className="space-y-1 md:col-span-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Voz</label>
          <div className="flex gap-2">
            {([['masculina', 'Masculina (Antonio)'], ['feminina', 'Feminina (Francisca)']] as const).map(([v, rotulo]) => (
              <button key={v} type="button" onClick={() => setForm({ ...form, voz: v })}
                className={`px-3 py-2 rounded-xl text-sm font-bold border ${form.voz === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                {rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      <details className="rounded-xl border border-slate-100 p-3">
        <summary className="text-sm font-bold text-slate-700 cursor-pointer">Cloudflare R2 (opcional — guardar os áudios na Cloudflare)</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <input className={campo} value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })} placeholder="Account ID" />
          <input className={campo} value={form.bucket} onChange={e => setForm({ ...form, bucket: e.target.value })} placeholder="Nome do bucket (ex.: biblia-audio)" />
          <input className={campo} type="password" autoComplete="off" value={form.accessKeyId} onChange={e => setForm({ ...form, accessKeyId: e.target.value })}
            placeholder={info?.r2.temChaves ? 'Access Key ID guardada — vazio para manter' : 'Access Key ID'} />
          <input className={campo} type="password" autoComplete="off" value={form.secretAccessKey} onChange={e => setForm({ ...form, secretAccessKey: e.target.value })}
            placeholder={info?.r2.temChaves ? 'Secret guardado — vazio para manter' : 'Secret Access Key'} />
          <input className={`${campo} md:col-span-2`} value={form.urlPublica} onChange={e => setForm({ ...form, urlPublica: e.target.value })} placeholder="Endereço público (ex.: https://audio.igrejarenovar.com)" />
        </div>
      </details>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => salvar(true)} disabled={!!ocupado || (!form.azureKey && !info?.temAzureKey)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2">
          <Power className="w-4 h-4" /> {ocupado === 'salvar' ? 'Salvando...' : info?.ativo ? 'Salvar alterações' : 'Salvar e ligar'}
        </button>
        <button onClick={testar} disabled={!!ocupado || !info?.temAzureKey} className="px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold disabled:opacity-50 flex items-center gap-2">
          <Volume2 className="w-4 h-4" /> {ocupado === 'teste' ? 'Gerando...' : 'Testar voz'}
        </button>
        {info?.ativo && (
          <button onClick={() => salvar(false)} disabled={!!ocupado} className="px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold disabled:opacity-50">
            Desligar
          </button>
        )}
      </div>
      {audioTeste && <audio controls src={audioTeste} className="w-full" />}
      <p className="text-[11px] text-slate-400">Salve antes de testar: o teste usa a chave, a voz e o armazenamento já salvos.</p>
    </div>
  );
}
