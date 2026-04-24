import React, { useState } from 'react';
import { Card, Button } from '../App';
import { DollarSign, Copy, CheckCircle2, ChevronRight, Info, CreditCard, QrCode, Heart } from 'lucide-react';
import { TitheConfig, cn } from '../types';

export const TithesScreen = ({ config, onConfirmDonation, showMessage, currentUserData }: { config: TitheConfig | null, onConfirmDonation?: (value: number, label: string) => void, showMessage: (msg: string) => void, currentUserData: any }) => {
  const [copied, setCopied] = useState(false);
  const [donationValue, setDonationValue] = useState('');
  const [donationType, setDonationType] = useState<'Dízimo' | 'Oferta' | 'Oferta de Amor'>('Dízimo');

  const handleCopy = () => {
    if (config?.pixKey) {
      navigator.clipboard.writeText(config.pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showMessage('Chave PIX copiada!');
    }
  };

  const handleConfirm = () => {
    const val = parseFloat(donationValue);
    if (isNaN(val) || val <= 0) {
      showMessage('Por favor, insira um valor válido.');
      return;
    }
    onConfirmDonation?.(val, `${donationType} - ${currentUserData?.name || 'Membro'}`);
    setDonationValue('');
    showMessage('Contribuição registrada com sucesso!');
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Dízimos e Ofertas</h2>
        <button onClick={() => showMessage('Informações sobre dízimos em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <Info className="w-5 h-5 text-slate-600" />
        </button>
      </header>

      <Card className="bg-primary text-white p-6 space-y-4 relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <p className="text-sm font-medium opacity-80">"Cada um contribua segundo propôs no seu coração; não com tristeza, ou por necessidade; porque Deus ama ao que dá com alegria."</p>
          <p className="text-xs font-bold uppercase tracking-wider">2 Coríntios 9:7</p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </Card>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Contribuir via PIX</h3>
        <Card className="p-6 space-y-6 border-slate-100">
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-48 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-slate-200">
              <QrCode className="w-32 h-32 text-slate-300" />
            </div>
            <p className="text-xs text-slate-500 text-center">Escaneie o QR Code ou copie a chave PIX abaixo</p>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chave PIX</p>
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900 break-all">{config?.pixKey || 'igreja.renovar@exemplo.com'}</p>
                <button onClick={handleCopy} className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-colors">
                  {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Banco</p>
                <p className="font-bold text-slate-900">{config?.bankName || 'Banco Digital'}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Titular</p>
                <p className="font-bold text-slate-900">{config?.accountHolder || 'Igreja Renovar'}</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Confirmar Contribuição</h3>
        <Card className="p-6 space-y-4 border-slate-100">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Contribuição</label>
            <div className="flex gap-2">
              {['Dízimo', 'Oferta', 'Oferta de Amor'].map((type) => (
                <button
                  key={type}
                  onClick={() => setDonationType(type as any)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all border",
                    donationType === type ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-100"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase">Valor (R$)</label>
            <input 
              type="number" 
              placeholder="0,00" 
              className="w-full p-3 rounded-xl border border-slate-100 focus:ring-2 focus:ring-primary/20 outline-none"
              value={donationValue}
              onChange={e => setDonationValue(e.target.value)}
            />
          </div>
          <Button onClick={handleConfirm} className="w-full py-4">
            Confirmar Depósito/PIX
          </Button>
          <p className="text-[10px] text-slate-400 text-center italic">
            Ao clicar em confirmar, um registro será enviado para a tesouraria para conferência.
          </p>
        </Card>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Outras Opções</h3>
        <div className="space-y-3">
          {[
            { icon: Heart, label: 'Oferta de Amor', description: 'Contribuição voluntária', action: () => showMessage('Use a chave PIX acima para sua oferta') },
            { icon: CreditCard, label: 'Cartão de Crédito', description: 'Em breve', action: () => showMessage('Integração em desenvolvimento') },
            { icon: DollarSign, label: 'Boleto Bancário', description: 'Em breve', action: () => showMessage('Integração em desenvolvimento') },
          ].map((item, i) => (
            <button key={i} onClick={item.action} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all group">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-slate-700">{item.label}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
