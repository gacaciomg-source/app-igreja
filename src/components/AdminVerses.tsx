import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, BookOpen, ChevronLeft, Save, Globe, RefreshCcw, Upload, FileText, AlertCircle } from 'lucide-react';
import { fetchVerseText, BIBLE_TRANSLATIONS } from '../lib/bible';
import { BIBLE_BOOKS } from '../constants';

// Reusing styles consistent with the app's design
const Card = ({ children, className, onClick, ...props }: { children: React.ReactNode, className?: string, onClick?: () => void, [key: string]: any }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-4 ${className} ${onClick ? 'cursor-pointer' : ''}`}
    {...props}
  >
    {children}
  </div>
);

const AdminVerseRow = ({ verse, index, onEdit, onDelete }: { verse: any, index: number, onEdit: () => void, onDelete: () => void }) => {
  const [displayText, setDisplayText] = useState(verse.text);

  useEffect(() => {
    if (verse.text?.startsWith('Carregando') || verse.text?.startsWith('Texto será')) {
      fetchVerseText(verse.ref, 'acf').then(fetched => {
        if (fetched) setDisplayText(fetched);
      });
    } else {
      setDisplayText(verse.text);
    }
  }, [verse.text, verse.ref]);

  return (
    <Card className="p-4 flex gap-4 items-start group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${verse.isPlaceholder ? 'bg-slate-50 text-slate-300' : 'bg-primary/10 text-primary'}`}>
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-700 italic text-sm leading-relaxed mb-1">"{displayText}"</p>
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold text-primary">{verse.ref}</p>
          {verse.isPlaceholder && (
            <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase font-bold">Sugestão</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </Card>
  );
};

const Button = ({ children, onClick, className, variant = 'primary', disabled = false, loading = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: 'primary' | 'outline' | 'ghost', disabled?: boolean, loading?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`px-4 py-2 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      variant === 'primary' ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90' : 
      variant === 'outline' ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' :
      'bg-transparent text-slate-500 hover:bg-slate-100'
    } ${className}`}
  >
    {loading && <RefreshCcw className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

const AdminVerses = ({ onBack, showMessage, isSuperAdmin = false }: { onBack: () => void, showMessage?: (msg: string) => void, isSuperAdmin?: boolean }) => {
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingVerse, setEditingVerse] = useState<any>(null);
  const [fetchingText, setFetchingText] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState('almeida');
  const [isImporting, setIsImporting] = useState(false);
  const [importedVerses, setImportedVerses] = useState<{ text: string, ref: string }[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [refMode, setRefMode] = useState<'select' | 'manual'>('select');
  const [selBook, setSelBook] = useState(BIBLE_BOOKS[0].name);
  const [selChapter, setSelChapter] = useState('1');
  const [selVerse, setSelVerse] = useState('');
  
  const [formData, setFormData] = useState({ text: '', ref: '' });

  useEffect(() => {
    if (refMode === 'select' && selBook && selChapter && selVerse) {
      setFormData(prev => ({ ...prev, ref: `${selBook} ${selChapter}:${selVerse}` }));
    }
  }, [selBook, selChapter, selVerse, refMode]);

  useEffect(() => {
    if (editingVerse) {
      // Try to parse the reference
      const match = editingVerse.ref?.match(/^((?:\d\s)?[^0-9:]+)\s(\d+):(\d+(?:-\d+)?)$/i);
      if (match) {
        const [, book, chapter, verse] = match;
        const exists = BIBLE_BOOKS.find(b => b.name.toLowerCase() === book.trim().toLowerCase());
        if (exists) {
          setRefMode('select');
          setSelBook(exists.name);
          setSelChapter(chapter);
          setSelVerse(verse);
        } else {
          setRefMode('manual');
        }
      } else {
        setRefMode('manual');
      }
    } else {
      // Reset when not editing
      if (!isAdding) {
         setRefMode('select');
         setSelBook(BIBLE_BOOKS[0].name);
         setSelChapter('1');
         setSelVerse('');
      }
    }
  }, [editingVerse, isAdding]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleFetchText = async () => {
    if (!formData.ref) {
      showMessage?.('Informe a referência primeiro (Ex: João 3:16)');
      return;
    }
    setFetchingText(true);
    try {
      const text = await fetchVerseText(formData.ref, selectedTranslation);
      if (text) {
        setFormData(prev => ({ ...prev, text }));
        showMessage?.('Texto recuperado da Bíblia Online');
      } else {
        showMessage?.('Não foi possível encontrar este versículo na versão selecionada');
      }
    } catch (e) {
      showMessage?.('Erro ao conectar com API da Bíblia');
    } finally {
      setFetchingText(false);
    }
  };

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
        body: JSON.stringify(editingVerse ? { ...editingVerse, ...formData } : { ...formData, id: Date.now().toString(), createdAt: new Date().toISOString() })
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

  const handleDeleteAll = async () => {
    if (!isSuperAdmin) return;
    if (!confirm('⚠️ ATENÇÃO: Isso apagará TODOS os versículos cadastrados permanentemente. Esta ação não pode ser desfeita. Tem certeza?')) return;
    
    setLoading(true);
    try {
      // We'll delete them one by one if the API doesn't support bulk delete
      // Or if the API supports it, we'd use that. 
      // Optimized way: concurrently delete
      const deletePromises = verses.map(v => 
        fetch(`/api/collections/verses/${v.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
      );
      
      await Promise.all(deletePromises);
      showMessage?.('Todos os versículos foram apagados');
      fetchVerses();
    } catch (e) {
      showMessage?.('Erro ao apagar versículos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      showMessage?.('Por favor, selecione um arquivo .txt');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.replace(/\r/g, '').split('\n').filter(line => line.trim().length > 0);
      
      const parsed = lines.map(line => {
        // Try to match "Reference - Text" or "Reference: Text"
        let ref = '';
        let text = '';
        
        const separators = [' - ', ': ', ' – '];
        for (const sep of separators) {
          if (line.includes(sep) && !line.match(/^((?:\d\s)?[a-zA-Záéíóúâêôãõç]+)\s+\d+\s+\d+(?:-\d+)?$/i)) {
            const parts = line.split(sep);
            ref = parts[0].trim();
            text = parts.slice(1).join(sep).trim();
            break;
          }
        }
        
        // If no separator found, or if it matched "Book Chapter Verse" directly
        if (!ref) {
          ref = line.trim();
          // Fix format like "Gênesis 1 1" or "1 João 1 5"
          const match = ref.match(/^((?:\d\s)?[a-zA-Záéíóúâêôãõç]+)\s+(\d+)\s+(\d+(?:-\d+)?)$/i);
          if (match) {
            ref = `${match[1].trim()} ${match[2]}:${match[3]}`;
          }
        }
        
        return { ref, text };
      });

      setImportedVerses(parsed);
      setIsImporting(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleBulkSave = async () => {
    if (importedVerses.length === 0) return;
    setIsBulkSaving(true);
    
    try {
      const formattedItems = importedVerses.filter(v => v.ref).map((v, index) => {
        let textToSave = v.text;
        if (!textToSave) {
          textToSave = 'Texto será buscado na Bíblia no momento da visualização.';
        }
        return {
          ref: v.ref,
          text: textToSave,
          id: `${Date.now()}-${index}`,
          createdAt: new Date().toISOString()
        };
      });

      if (formattedItems.length > 0) {
        const response = await fetch('/api/collections/verses/batch', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify({ items: formattedItems })
        });
        
        if (response.ok) {
          const result = await response.json();
          showMessage?.(`${result.count} versículos importados com sucesso`);
        } else {
          showMessage?.('Erro durante salvamento em massa na API');
        }
      }
      
      setIsImporting(false);
      setImportedVerses([]);
      fetchVerses();
    } catch (e) {
      showMessage?.('Erro durante a salvamento em massa');
    } finally {
      setIsBulkSaving(false);
    }
  };

  const filteredVerses = verses.filter(v => 
    v.text?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.ref?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Versículos do Dia</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && verses.length > 0 && (
            <Button variant="outline" onClick={handleDeleteAll} className="text-red-500 hover:bg-red-50 border-red-100">
              <Trash2 className="w-4 h-4" />
              Apagar Todos
            </Button>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".txt" 
            className="hidden" 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="bg-white">
            <Upload className="w-4 h-4" />
            Importar TXT
          </Button>
          <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Versículo
          </Button>
        </div>
      </header>

      {isImporting && (
        <Card className="p-6 border-amber-200 bg-amber-50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700">
              <FileText className="w-5 h-5" />
              <h3 className="font-bold text-lg">Visualização da Importação</h3>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
              {importedVerses.length} versículos detectados
            </span>
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {importedVerses.map((v, i) => (
              <div key={i} className="text-xs bg-white/50 p-2 rounded border border-amber-100 flex justify-between gap-4">
                <span className="font-bold shrink-0">{v.ref || `Linha ${i+1}`}</span>
                <span className="text-slate-500 italic truncate">{v.text || '(Texto será buscado na Bíblia)'}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleBulkSave} loading={isBulkSaving} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none">
              Confirmar e Salvar Tudo
            </Button>
            <Button variant="ghost" onClick={() => { setIsImporting(false); setImportedVerses([]); }} className="text-amber-700">
              Cancelar
            </Button>
          </div>
          <div className="flex items-start gap-2 text-[10px] text-amber-600 italic">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <p>Dica: O arquivo deve estar no formato "Referência - Texto" ou apenas a relação de referências.</p>
          </div>
        </Card>
      )}

      {(isAdding || editingVerse) && (
        <Card className="p-6 border-primary/20 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">{editingVerse ? 'Editar Versículo' : 'Novo Versículo'}</h3>
            <div className="flex items-center gap-2">
               <Globe className="w-3.5 h-3.5 text-slate-400" />
               <select 
                 value={selectedTranslation}
                 onChange={e => setSelectedTranslation(e.target.value)}
                 className="text-xs bg-white border border-slate-200 rounded px-2 py-1 outline-none font-medium"
               >
                 {BIBLE_TRANSLATIONS.map(t => (
                   <option key={t.id} value={t.id}>{t.name}</option>
                 ))}
               </select>
            </div>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex flex-wrap gap-2 items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Referência</label>
                <div className="flex gap-1 text-xs font-medium bg-slate-200/50 p-1 rounded-lg">
                  <button onClick={() => setRefMode('select')} className={`px-3 py-1 rounded transition-colors ${refMode === 'select' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Bíblia</button>
                  <button onClick={() => setRefMode('manual')} className={`px-3 py-1 rounded transition-colors ${refMode === 'manual' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Manual</button>
                </div>
              </div>

              {refMode === 'select' ? (
                <div className="flex gap-2">
                  <select 
                    value={selBook}
                    onChange={e => { setSelBook(e.target.value); setSelChapter('1'); setSelVerse(''); }}
                    className="flex-[2] p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none w-1/3"
                  >
                    {BIBLE_BOOKS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <select 
                    value={selChapter}
                    onChange={e => setSelChapter(e.target.value)}
                    className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {Array.from({ length: BIBLE_BOOKS.find(b => b.name === selBook)?.chapters || 1 }, (_, i) => i + 1).map(c => (
                      <option key={c} value={c}>Cap. {c}</option>
                    ))}
                  </select>
                  <input 
                    type="text"
                    value={selVerse}
                    onChange={e => setSelVerse(e.target.value.replace(/[^0-9-]/g, ''))}
                    placeholder="Vers."
                    className="flex-1 w-20 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-slate-400"
                  />
                  <Button variant="outline" onClick={handleFetchText} loading={fetchingText} className="shrink-0 bg-white" disabled={!selVerse}>
                    Buscar
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    value={formData.ref}
                    onChange={e => setFormData({...formData, ref: e.target.value})}
                    className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Ex: João 3:16"
                  />
                  <Button variant="outline" onClick={handleFetchText} loading={fetchingText} className="shrink-0 bg-white">
                    Buscar Texto
                  </Button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Texto do Versículo</label>
              <textarea 
                value={formData.text}
                onChange={e => setFormData({...formData, text: e.target.value})}
                className="w-full mt-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 outline-none min-h-[100px]"
                placeholder="Clique em 'Buscar Texto' ou digite manualmente..."
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1 gap-2">
              <Save className="w-4 h-4" />
              Salvar
            </Button>
            <Button variant="outline" onClick={() => { setIsAdding(false); setEditingVerse(null); setFormData({text: '', ref: ''}); }} className="bg-white">
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Buscar nos versículos cadastrados..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500">Carregando lista...</div>
        ) : filteredVerses.length > 0 ? (
          filteredVerses.slice(0, 50).map((verse, index) => (
            <AdminVerseRow 
              key={verse.id || index} 
              verse={verse} 
              index={index} 
              onEdit={() => { setEditingVerse(verse); setFormData({ text: verse.text, ref: verse.ref }); }}
              onDelete={() => handleDelete(verse.id)} 
            />
          ))
        ) : (
          <div className="text-center py-12 text-slate-500">Nenhum versículo encontrado</div>
        )}
      </div>
    </div>
  );
};

export default AdminVerses;
