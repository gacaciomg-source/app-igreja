import React, { useState } from 'react';
import { Plus, Users, Search, Target, LogOut, FileText, ChevronRight } from 'lucide-react';
import { ServiceReport, User as UserType } from '../types';
import { Card } from '../App';
import { Modal } from '../App';
import { Button } from '../App';

export const ServiceReportsScreen = ({ 
  reports, 
  users,
  onAdd, 
  onDelete, 
  isAdmin 
}: { 
  reports: ServiceReport[], 
  users: UserType[],
  onAdd: (data: Partial<ServiceReport>) => void, 
  onDelete: (id: string) => void, 
  isAdmin: boolean 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newReport, setNewReport] = useState<Partial<ServiceReport>>({
    date: new Date().toISOString().split('T')[0],
    serviceName: 'Culto da Família',
    adultsCount: 0,
    childrenCount: 0,
    visitorsCount: 0,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adults = Number(newReport.adultsCount) || 0;
    const children = Number(newReport.childrenCount) || 0;
    const visitors = Number(newReport.visitorsCount) || 0;
    const totalCount = adults + children + visitors;

    onAdd({
      ...newReport,
      adultsCount: adults,
      childrenCount: children,
      visitorsCount: visitors,
      totalCount
    });
    setShowAdd(false);
    setNewReport({
      date: new Date().toISOString().split('T')[0],
      serviceName: 'Culto da Família',
      adultsCount: 0,
      childrenCount: 0,
      visitorsCount: 0,
      notes: ''
    });
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Relatórios de Culto</h2>
          <p className="text-sm text-slate-500">Acompanhe a frequência nos cultos</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-primary text-white p-3 rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <div className="grid gap-4">
        {reports.length > 0 ? (
          [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(report => {
            const author = users.find(u => u.id === report.authorId);
            return (
              <Card key={report.id} className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{report.serviceName}</h3>
                    <p className="text-xs text-slate-500">{new Date(report.date).toLocaleDateString('pt-BR')} &bull; Registrado por {author?.name || 'Desconhecido'}</p>
                  </div>
                  {isAdmin && (
                    <button onClick={() => {
                      if (window.confirm('Excluir este relatório?')) onDelete(report.id);
                    }} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                      <LogOut className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-sm pt-2 border-t border-slate-100">
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Membros</p>
                    <p className="font-bold text-slate-800">{report.adultsCount}</p>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Crianças</p>
                    <p className="font-bold text-slate-800">{report.childrenCount}</p>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-xl">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Visitantes</p>
                    <p className="font-bold text-emerald-700">{report.visitorsCount}</p>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <p className="text-[10px] text-primary font-bold uppercase">Total</p>
                    <p className="font-bold text-primary">{report.totalCount}</p>
                  </div>
                </div>

                {report.notes && (
                  <p className="text-xs text-slate-600 bg-amber-50 p-3 rounded-xl italic">
                    "{report.notes}"
                  </p>
                )}
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100 border-dashed">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Nenhum relatório cadastrado.</p>
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Novo Relatório de Culto" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                <input 
                  type="date" 
                  required
                  className="w-full p-3 rounded-xl border border-slate-200"
                  value={newReport.date}
                  onChange={e => setNewReport({...newReport, date: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Culto/Evento</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Culto da Família"
                  className="w-full p-3 rounded-xl border border-slate-200"
                  value={newReport.serviceName}
                  onChange={e => setNewReport({...newReport, serviceName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <h4 className="text-sm font-bold text-slate-800">Contagem</h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Membros</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 rounded-xl border border-slate-200 text-center font-bold text-lg"
                    value={newReport.adultsCount || ''}
                    onChange={e => setNewReport({...newReport, adultsCount: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Crianças</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 rounded-xl border border-slate-200 text-center font-bold text-lg"
                    value={newReport.childrenCount || ''}
                    onChange={e => setNewReport({...newReport, childrenCount: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-600 uppercase">Visitantes</label>
                  <input 
                    type="number" 
                    min="0"
                    className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-center font-bold text-lg text-emerald-700"
                    value={newReport.visitorsCount || ''}
                    onChange={e => setNewReport({...newReport, visitorsCount: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Observações (opcional)</label>
              <textarea 
                className="w-full p-3 rounded-xl border border-slate-200 min-h-[80px]"
                placeholder="Detalhes, ocorrências, número de conversões..."
                value={newReport.notes}
                onChange={e => setNewReport({...newReport, notes: e.target.value})}
              />
            </div>

            <Button type="submit" className="w-full py-4 text-lg">
              Salvar Relatório
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
};