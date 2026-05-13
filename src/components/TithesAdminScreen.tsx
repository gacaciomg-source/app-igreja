import React, { useState } from 'react';
import { DollarSign, Save, Copy, CheckCircle2 } from 'lucide-react';
import { TitheConfig } from '../types';

export const TithesAdminScreen = ({ config, onUpdate, showMessage }: { config: TitheConfig, onUpdate: (data: TitheConfig) => void, showMessage: (msg: string) => void }) => {
  const [pixKey, setPixKey] = useState(config.pixKey);
  const [bankName, setBankName] = useState(config.bankName);
  const [accountHolder, setAccountHolder] = useState(config.accountHolder);
  const [pixQrUrl, setPixQrUrl] = useState(config.pixQrUrl || '');

  const handleSave = () => {
    onUpdate({ pixKey, bankName, accountHolder, pixQrUrl });
  };

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
            <input 
              type="text" 
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="E-mail, CPF, CNPJ ou Chave Aleatória"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Banco</label>
            <input 
              type="text" 
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ex: Nubank, Itaú, etc."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Titular da Conta</label>
            <input 
              type="text" 
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="Nome completo do titular"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">URL do QR Code PIX</label>
            <input 
              type="text" 
              value={pixQrUrl}
              onChange={(e) => setPixQrUrl(e.target.value)}
              placeholder="Cole a URL da imagem aqui"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

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
