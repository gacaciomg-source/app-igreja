
import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, BookOpen, ChevronLeft, Save } from 'lucide-react';

// Reusing styles consistent with the app's design
const Card = ({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ${className} ${onClick ? 'cursor-pointer' : ''}`}
  >
    {children}
  </div>
);

const Button = ({ children, onClick, className, variant = 'primary' }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'outline' }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 ${
      variant === 'primary' ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
    } ${className}`}
  >
    {children}
  </button>
);

const AdminVerses = ({ onBack, showMessage }: { onBack: () => void, showMessage?: (msg: string) => void }) => {
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingVerse, setEditingVerse] = useState<any>(null);
  
  const [formData, setFormData] = useState({ text: '', ref: '' });

  const fetchVerses = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/collections/verses', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      const data = await res.json();
      setVerses(Array.isArray(data) ? data : []);
    } catch (e) {
      showMessage?.('Erro ao carregar versículos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerses();
  }, []);

  const handleSave = async () => {
    if (!formData.text || !formData.ref) {
      showMessage?.('Preencha todos os campos');
      return;
    }

    try {
      const url = editingVerse ? `/api/collections/verses/${editingVerse.id}` : '/api/collections/verses';
      const method = editingVerse ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(editingVerse ? { ...editingVerse, ...formData } : { ...formData, id: Date.now().toString() })
      });

      if (res.ok) {
        showMessage?.(editingVerse ? 'Versículo atualizado' : 'Versículo adicionado');
        setIsAdding(false);
        setEditingVerse(null);
        setFormData({ text: '', ref: '' });
        fetchVerses();
      }
    } catch (e) {
      showMessage?.('Erro ao salvar versículo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este versículo?')) return;
    try {
      const res = await fetch(`/api/collections/verses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (res.ok) {
        showMessage?.('Versículo excluído');
        fetchVerses();
      }
    } catch (e) {
      showMessage?.('Erro ao excluir');
    }
  };

  const filteredVerses = verses.filter(v => 
    v.text?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.ref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Versículos do Dia</h2>
        </div>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Versículo
        </Button>
      </header>

      {(isAdding || editingVerse) && (
        <Card className="p-6 border-primary/20 bg-primary/5 space-y-4">
          <h3 className="font-bold text-lg">{editingVerse ? 'Editar Versículo' : 'Novo Versículo'}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Texto do Versículo</label>
              <textarea 
                value={formData.text}
                onChange={e => setFormData({...formData, text: e.target.value})}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                placeholder="Ex: Porque Deus amou o mundo..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referência</label>
              <input 
                value={formData.ref}
                onChange={e => setFormData({...formData, ref: e.target.value})}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Ex: João 3:16"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="w-4 h-4" />
              Salvar
            </Button>
            <Button variant="outline" onClick={() => { setIsAdding(false); setEditingVerse(null); setFormData({text: '', ref: ''}); }}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Buscar versículos..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando...</div>
        ) : filteredVerses.length > 0 ? (
          filteredVerses.slice(0, 50).map((verse, index) => (
            <Card key={verse.id || index} className="p-4 flex gap-4 items-start group">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-700 italic text-sm leading-relaxed mb-1">"{verse.text}"</p>
                <p className="text-xs font-bold text-primary">{verse.ref}</p>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => { setEditingVerse(verse); setFormData({ text: verse.text, ref: verse.ref }); }}
                  className="p-2 hover:bg-emerald-50 text-emerald-500 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(verse.id)}
                  className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-slate-500">Nenhum versículo encontrado</div>
        )}
      </div>
    </div>
  );
};

export default AdminVerses;
