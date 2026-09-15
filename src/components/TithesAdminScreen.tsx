import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Save, Upload, X } from 'lucide-react';
import { TitheConfig } from '../types';
import { api, getAbsoluteUrl } from '../services/apiService';

export const TithesAdminScreen = ({ config, onUpdate, showMessage }: { config: TitheConfig, onUpdate: (data: TitheConfig) => void, showMessage: (msg: string) => void }) => {
  const [pixKey, setPixKey] = useState(config.pixKey);
  const [bankName, setBankName] = useState(config.bankName);
  const [accountHolder, setAccountHolder] = useState(config.accountHolder);
  const [pixQrUrl, setPixQrUrl] = useState(config.pixQrUrl || '');
  const [enviandoQr, setEnviandoQr] = useState(false);
  // O app recarrega a configuração do servidor de tempos em tempos. Enquanto
  // alguém está editando, não copiar por cima — era isso que fazia o e-mail
  // (chave PIX) "voltar" no meio da digitação.
  const [editando, setEditando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) return;
    setPixKey(config.pixKey);
    setBankName(config.bankName);
    setAccountHolder(config.accountHolder);
    setPixQrUrl(config.pixQrUrl || '');
  }, [config, editando]);

  const alterar = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditando(true);
    setter(e.target.value);
  };

  const handleSave = () => {
    onUpdate({ pixKey, bankName, accountHolder, pixQrUrl });
    setEditando(false);
  };

  const enviarQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    setEnviandoQr(true);
    try {
      const { url } = await api.upload(arquivo);
      setEditando(true);
      setPixQrUrl(url);
      showMessage('Imagem carregada. Clique em "Salvar Configurações" para confirmar.');
    } catch {
      showMessage('Não foi possível enviar a imagem do QR Code.');
    } finally {
      setEnviandoQr(false);
    }
  };

  const campo = "w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all";

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Gestão de Dízimos</h2>
        <p className="text-slate-500">Configure as informações para recebimento</p>
      </header>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900">Configuração PIX</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Chave PIX</label>
            <input type="text" value={pixKey} onChange={alterar(setPixKey)} placeholder="E-mail, CPF, CNPJ ou Chave Aleatória" className={campo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Banco</label>
            <input type="text" value={bankName} onChange={alterar(setBankName)} placeholder="Ex: Nubank, Itaú, etc." className={campo} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Titular da Conta</label>
            <input type="text" value={accountHolder} onChange={alterar(setAccountHolder)} placeholder="Nome completo do titular" className={campo} />
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">QR Code PIX</label>
            {pixQrUrl && (
              <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-100 bg-slate-50">
                <img src={getAbsoluteUrl(pixQrUrl)} alt="QR Code PIX" className="w-24 h-24 object-contain bg-white rounded-lg" />
                <p className="flex-1 text-xs text-slate-500">É esta imagem que os membros veem na tela de dízimos.</p>
                <button onClick={() => { setEditando(true); setPixQrUrl(''); }} title="Remover" className="p-2 text-slate-400 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <input ref={arquivoRef} type="file" accept="image/*" className="hidden" onChange={enviarQr} />
            <button
              onClick={() => arquivoRef.current?.click()}
              disabled={enviandoQr}
              className="w-full py-3 rounded-xl border border-dashed border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" /> {enviandoQr ? 'Enviando imagem...' : pixQrUrl ? 'Trocar imagem do QR Code' : 'Enviar imagem do QR Code'}
            </button>
            <input type="text" value={pixQrUrl} onChange={alterar(setPixQrUrl)} placeholder="...ou cole o link da imagem" className={campo + ' text-xs'} />
          </div>
        </div>

        {editando && <p className="text-xs font-bold text-amber-700">Alterações ainda não salvas.</p>}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Save className="w-5 h-5" />
          Salvar Configurações
        </button>
      </div>

      <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
        <h4 className="font-bold text-blue-900 mb-2">Dica de Gestão</h4>
        <p className="text-sm text-blue-700">
          As informações configuradas aqui aparecerão para todos os membros na tela de dízimos.
          No futuro, você poderá integrar com gateways de pagamento para conciliação automática.
        </p>
      </div>
    </div>
  );
};
