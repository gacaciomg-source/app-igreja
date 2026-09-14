/**
 * ENVIO EM MASSA PELO WHATSAPP — tela do Atendimento
 *
 * Escolhe as categorias, escreve a mensagem (com {nome} e {primeiro_nome}),
 * anexa uma imagem se quiser, e envia agora ou agendado. O servidor manda uma
 * mensagem por vez, com intervalo, e esta tela acompanha o progresso.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Send, Image as ImageIcon, X, Clock, Users, AlertCircle, CheckCircle, RefreshCw, Ban } from 'lucide-react';
import { api } from '../services/apiService';

type Resumo = {
  id: string; mensagem: string; imagemUrl?: string; categorias: string[]; criadoEm: string; agendadoPara?: string;
  status: 'agendado' | 'enviando' | 'concluido' | 'cancelado'; concluidoEm?: string;
  total: number; enviados: number; falhas: number; pendentes: number; erros: { nome: string; erro?: string }[];
};

const STATUS: Record<Resumo['status'], { rotulo: string; cor: string }> = {
  agendado: { rotulo: 'Agendado', cor: 'bg-blue-100 text-blue-700' },
  enviando: { rotulo: 'Enviando', cor: 'bg-amber-100 text-amber-700' },
  concluido: { rotulo: 'Concluído', cor: 'bg-emerald-100 text-emerald-700' },
  cancelado: { rotulo: 'Cancelado', cor: 'bg-slate-200 text-slate-600' },
};

const dataHora = (iso?: string) => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

export default function EnvioEmMassa({ showMessage }: { showMessage: (m: string) => void }) {
  const [categorias, setCategorias] = useState<Record<string, string>>({});
  const [contagem, setContagem] = useState<Record<string, number>>({});
  const [escolhidas, setEscolhidas] = useState<string[]>(['visitor']);
  const [previa, setPrevia] = useState<{ total: number; semTelefone: number; naoQuerem: number; exemplo?: string } | null>(null);
  const [mensagem, setMensagem] = useState('Olá, {primeiro_nome}! ');
  const [imagemUrl, setImagemUrl] = useState('');
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [agendar, setAgendar] = useState(false);
  const [quando, setQuando] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [envios, setEnvios] = useState<Resumo[]>([]);
  const [whatsappOk, setWhatsappOk] = useState<boolean | null>(null);
  const [erro, setErro] = useState('');
  const arquivoRef = useRef<HTMLInputElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);

  const carregarEnvios = () => api.request('/whatsapp/massa').then((r: any) => { setEnvios(r.envios); setWhatsappOk(r.whatsappConectado); }).catch(() => undefined);

  useEffect(() => {
    api.request('/whatsapp/massa/categorias').then((r: any) => { setCategorias(r.categorias); setContagem(r.contagem); }).catch(() => undefined);
    carregarEnvios();
    const t = setInterval(carregarEnvios, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!escolhidas.length) return setPrevia(null);
    api.request('/whatsapp/massa/previa', { method: 'POST', body: JSON.stringify({ categorias: escolhidas, mensagem }) })
      .then(setPrevia).catch(() => setPrevia(null));
  }, [escolhidas.join(','), mensagem]);

  const alternar = (c: string) => setEscolhidas(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c]);

  const inserir = (marcador: string) => {
    const el = textoRef.current;
    if (!el) return setMensagem(m => m + marcador);
    const ini = el.selectionStart, fim = el.selectionEnd;
    setMensagem(m => m.slice(0, ini) + marcador + m.slice(fim));
    setTimeout(() => { el.focus(); el.selectionStart = el.selectionEnd = ini + marcador.length; });
  };

  const escolherImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    setEnviandoImagem(true);
    try { setImagemUrl((await api.upload(arq)).url); }
    catch { setErro('Não foi possível enviar a imagem.'); }
    finally { setEnviandoImagem(false); }
  };

  const enviar = async () => {
    setErro('');
    if (!mensagem.trim()) return setErro('Escreva a mensagem.');
    if (!previa?.total) return setErro('Nenhuma pessoa com telefone nas categorias escolhidas.');
    if (agendar && (!quando || Date.parse(quando) < Date.now())) return setErro('Escolha uma data e hora no futuro.');
    const texto = agendar
      ? `Agendar a mensagem para ${previa.total} pessoa(s) em ${new Date(quando).toLocaleString('pt-BR')}?`
      : `Enviar agora para ${previa.total} pessoa(s)? As mensagens saem uma por vez, com intervalo de alguns segundos.`;
    if (!confirm(texto)) return;
    setSalvando(true);
    try {
      await api.request('/whatsapp/massa', {
        method: 'POST',
        body: JSON.stringify({ categorias: escolhidas, mensagem, imagemUrl: imagemUrl || undefined, agendadoPara: agendar ? new Date(quando).toISOString() : undefined }),
      });
      showMessage(agendar ? 'Envio agendado!' : 'Envio iniciado!');
      setMensagem('Olá, {primeiro_nome}! ');
      setImagemUrl('');
      setAgendar(false);
      carregarEnvios();
    } catch (err: any) {
      setErro(err.message || 'Falha ao criar o envio.');
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = async (id: string) => {
    if (!confirm('Cancelar este envio? Quem já recebeu, recebeu.')) return;
    await api.request(`/whatsapp/massa/${id}/cancelar`, { method: 'POST' }).catch(() => undefined);
    carregarEnvios();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2"><Send className="w-5 h-5 text-emerald-600" /> Nova mensagem em massa</h3>

        {whatsappOk === false && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> O WhatsApp está desconectado. Você pode criar o envio: ele começa sozinho quando a conexão voltar.
          </p>
        )}

        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 uppercase">Para quem</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categorias).map(([id, rotulo]) => (
              <button key={id} onClick={() => alternar(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${escolhidas.includes(id) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {rotulo} ({contagem[id] || 0})
              </button>
            ))}
          </div>
          {previa && (
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Users className="w-3 h-3" /> <strong className="text-slate-800">{previa.total}</strong> vão receber
              {previa.semTelefone ? ` · ${previa.semTelefone} sem telefone` : ''}
              {previa.naoQuerem ? ` · ${previa.naoQuerem} pediram para não receber` : ''}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase">Mensagem</p>
            <div className="flex gap-1">
              <button onClick={() => inserir('{primeiro_nome}')} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">+ primeiro nome</button>
              <button onClick={() => inserir('{nome}')} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">+ nome completo</button>
            </div>
          </div>
          <textarea ref={textoRef} value={mensagem} onChange={e => setMensagem(e.target.value)} rows={7}
            placeholder="Escreva a mensagem. Links, emojis e *negrito* do WhatsApp funcionam."
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          {previa?.exemplo && (
            <div className="text-xs bg-[#e7fbe6] text-slate-800 p-3 rounded-xl whitespace-pre-wrap border border-emerald-100">
              <span className="block text-[10px] font-bold text-emerald-700 mb-1">Como chega para a primeira pessoa:</span>
              {previa.exemplo}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <input ref={arquivoRef} type="file" accept="image/*" className="hidden" onChange={escolherImagem} />
          {imagemUrl ? (
            <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-200">
              <img src={imagemUrl} alt="" className="w-16 h-16 object-cover rounded-lg" />
              <p className="flex-1 text-xs text-slate-500">A imagem vai junto, com a mensagem como legenda.</p>
              <button onClick={() => setImagemUrl('')} className="p-2 text-slate-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button onClick={() => arquivoRef.current?.click()} disabled={enviandoImagem}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2">
              <ImageIcon className="w-4 h-4" /> {enviandoImagem ? 'Enviando imagem...' : 'Anexar imagem (opcional)'}
            </button>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
            <input type="checkbox" checked={agendar} onChange={e => setAgendar(e.target.checked)} /> Agendar para depois
          </label>
          {agendar && <input type="datetime-local" value={quando} onChange={e => setQuando(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" />}
        </div>

        {erro && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2 rounded-lg">{erro}</p>}

        <button onClick={enviar} disabled={salvando}
          className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
          {agendar ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
          {salvando ? 'Criando...' : agendar ? 'Agendar envio' : `Enviar para ${previa?.total ?? 0} pessoa(s)`}
        </button>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Para proteger o número da igreja, o sistema manda uma mensagem a cada 8 a 20 segundos.
          100 pessoas levam cerca de 25 minutos. Evite enviar para quem não conhece a igreja: denúncias
          de spam podem fazer o WhatsApp bloquear o número.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">Envios</h3>
          <button onClick={carregarEnvios} className="p-2 text-slate-400 hover:text-emerald-600"><RefreshCw className="w-4 h-4" /></button>
        </div>
        {envios.length === 0 && <p className="text-sm text-slate-400">Nenhum envio ainda.</p>}
        {envios.map(e => {
          const feitos = e.enviados + e.falhas;
          return (
            <div key={e.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS[e.status].cor}`}>{STATUS[e.status].rotulo}</span>
                <span className="text-[11px] text-slate-400">
                  {e.status === 'agendado' && e.agendadoPara ? `para ${dataHora(e.agendadoPara)}` : dataHora(e.criadoEm)}
                </span>
              </div>
              <p className="text-sm text-slate-700 line-clamp-2 whitespace-pre-wrap">{e.mensagem}</p>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${e.total ? (feitos / e.total) * 100 : 0}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><CheckCircle className="w-3 h-3 text-emerald-600" /> {e.enviados}/{e.total}</span>
                  {e.falhas > 0 && <span className="text-red-600">{e.falhas} falha(s)</span>}
                </span>
                {(e.status === 'enviando' || e.status === 'agendado') && (
                  <button onClick={() => cancelar(e.id)} className="flex items-center gap-1 font-bold text-red-500 hover:text-red-700"><Ban className="w-3 h-3" /> Cancelar</button>
                )}
              </div>
              {e.erros.length > 0 && (
                <details className="text-[11px] text-red-700">
                  <summary className="cursor-pointer">Ver falhas</summary>
                  <ul className="mt-1 space-y-0.5">{e.erros.map((x, i) => <li key={i}>{x.nome}: {x.erro}</li>)}</ul>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
