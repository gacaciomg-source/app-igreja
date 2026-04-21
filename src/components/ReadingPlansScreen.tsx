import React, { useState } from 'react';
import { Card, Button } from '../App';
import { BookOpen, CheckCircle2, ChevronRight, Plus, Search } from 'lucide-react';
import { ReadingPlan, User as UserType, cn } from '../types';

export const ReadingPlansScreen = ({ plans, progress, allProgress, users, onToggleChapter, isAdmin, onAdd, onDelete, showMessage }: { plans: ReadingPlan[], progress?: Record<string, string[]>, allProgress?: Record<string, Record<string, string[]>>, users?: UserType[], onToggleChapter?: (planId: string, chapter: string) => void, isAdmin?: boolean, onAdd?: () => void, onDelete?: (id: string) => void, showMessage?: (msg: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<ReadingPlan | null>(null);

  const filteredPlans = plans.filter(plan => 
    plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plan.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgress = (planId: string) => {
    const completed = progress?.[planId]?.length || 0;
    const total = plans.find(p => p.id === planId)?.chapters?.length || 1;
    return Math.round((completed / total) * 100);
  };

  if (selectedPlan) {
    const completedChapters = progress?.[selectedPlan.id] || [];

    const usersDoingPlan = users?.filter(u => allProgress?.[u.id]?.[selectedPlan.id]?.length > 0) || [];

    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setSelectedPlan(null)} className="p-2 hover:bg-slate-100 rounded-full">
            <Plus className="w-6 h-6 rotate-45 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">{selectedPlan.title}</h2>
        </header>

        {!isAdmin && (
          <Card className="p-6 space-y-4 border-slate-100">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{completedChapters.length} de {selectedPlan.chapters.length} capítulos concluídos</p>
              <span className="text-lg font-bold text-primary">{getProgress(selectedPlan.id)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div className="bg-primary h-full transition-all duration-500" style={{ width: `${getProgress(selectedPlan.id)}%` }}></div>
            </div>
          </Card>
        )}

        {isAdmin ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Membros Participando</h3>
            {usersDoingPlan.length > 0 ? (
              <div className="grid gap-3">
                {usersDoingPlan.map(u => {
                  const userCompleted = allProgress?.[u.id]?.[selectedPlan.id]?.length || 0;
                  const userTotal = selectedPlan.chapters.length;
                  const userPercent = Math.round((userCompleted / userTotal) * 100);
                  return (
                    <Card key={u.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar || `https://picsum.photos/seed/${u.id}/100/100`} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <h4 className="font-bold text-slate-900">{u.name}</h4>
                          <p className="text-xs text-slate-500">{userCompleted} de {userTotal} capítulos</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-primary">{userPercent}%</span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">Nenhum membro iniciou este plano ainda.</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              const durationDays = parseInt(selectedPlan.duration) || 1;
              const chaptersPerDay = Math.ceil(selectedPlan.chapters.length / durationDays);
              const days = Array.from({ length: durationDays }, (_, i) => {
                return selectedPlan.chapters.slice(i * chaptersPerDay, (i + 1) * chaptersPerDay);
              }).filter(day => day.length > 0);

              return days.map((dayChapters, dayIdx) => {
                const dayNumber = dayIdx + 1;
                const allCompleted = dayChapters.every(ch => completedChapters.includes(ch));
                
                return (
                  <div key={dayIdx} className="space-y-3">
                    <div className="flex items-center justify-between px-2">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        Dia {dayNumber}
                        {allCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {dayChapters.length} {dayChapters.length === 1 ? 'Capítulo' : 'Capítulos'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {dayChapters.map((chapter, i) => (
                        <button 
                          key={i}
                          onClick={() => onToggleChapter?.(selectedPlan.id, chapter)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border transition-all",
                            completedChapters.includes(chapter) 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                              : "bg-white border-slate-100 text-slate-700 hover:border-primary/20"
                          )}
                        >
                          <span className="font-bold">{chapter}</span>
                          {completedChapters.includes(chapter) ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Planos de Leitura</h2>
        <div className="flex gap-2">
          <button onClick={() => showMessage?.('Pesquisa em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
            <Search className="w-5 h-5 text-slate-600" />
          </button>
          {isAdmin && (
            <Button className="rounded-xl w-10 h-10 p-0" onClick={onAdd}>
              <Plus className="w-6 h-6" />
            </Button>
          )}
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          placeholder="Buscar planos..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {filteredPlans.map(plan => (
          <Card key={plan.id} onClick={() => setSelectedPlan(plan)} className="p-0 overflow-hidden border-slate-100 hover:border-primary/20 transition-all cursor-pointer group">
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  {plan.duration}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{plan.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{plan.description}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${getProgress(plan.id)}%` }}></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">{getProgress(plan.id)}%</span>
                  {isAdmin && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Tem certeza que deseja excluir este plano?')) {
                          onDelete?.(plan.id);
                        }
                      }}
                      className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Card>
        ))}

        {filteredPlans.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <BookOpen className="w-8 h-8" />
            </div>
            <p className="text-slate-500">Nenhum plano encontrado</p>
          </div>
        )}
      </div>
    </div>
  );
};
