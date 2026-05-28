import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, UserCheck, Clock, CheckCircle, MessageSquare, ListTodo, Paperclip, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { CRMTicket, CRMMessage, User as UserType } from '../types';
import { Card, Button } from '../App';
import { api } from '../services/apiService';
import { cn } from '../types';

export const CRMScreen = ({ 
  users,
  currentUser,
  showMessage 
}: { 
  users: UserType[],
  currentUser: UserType | null,
  showMessage: (msg: string) => void
}) => {
  const [tickets, setTickets] = useState<CRMTicket[]>([]);
  const [messages, setMessages] = useState<Record<string, CRMMessage[]>>({});
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine' | 'open'>('open');
  const [search, setSearch] = useState('');
  
  const [inputText, setInputText] = useState('');
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollText, setPollText] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeTicket = tickets.find(t => t.id === activeTicketId);
  const activeMessages = activeTicketId ? (messages[activeTicketId] || []) : [];

  const loadData = async () => {
    try {
      const dbTickets = await api.request('/whatsapp/crm/tickets');
      setTickets(dbTickets);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTicketId) {
      loadMessages(activeTicketId);
    }
  }, [activeTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages]);

  const loadMessages = async (ticketId: string) => {
    try {
      const msgs = await api.request(`/whatsapp/crm/tickets/${ticketId}/messages`);
      setMessages(prev => ({ ...prev, [ticketId]: msgs }));
      
      // If we open a ticket with unread messages, we should mark it read locally
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, unreadCount: 0 } : t));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!activeTicketId || !inputText.trim()) return;
    try {
      setSending(true);
      const newMsg = await api.request(`/whatsapp/crm/tickets/${activeTicketId}/send`, {
        method: 'POST',
        body: JSON.stringify({ text: inputText })
      });
      setMessages(prev => ({
        ...prev,
        [activeTicketId]: [...(prev[activeTicketId] || []), newMsg]
      }));
      setInputText('');
      loadData();
    } catch (e: any) {
      showMessage(e.message || 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const handleSendPoll = async () => {
    if (!activeTicketId || !pollText.trim() || pollOptions.some(o => !o.trim())) {
      showMessage('Preencha a pergunta e todas as opções.');
      return;
    }
    try {
      setSending(true);
      const newMsg = await api.request(`/whatsapp/crm/tickets/${activeTicketId}/send`, {
        method: 'POST',
        body: JSON.stringify({
          text: pollText,
          isPoll: true,
          pollOptions: pollOptions.filter(o => o.trim() !== '')
        })
      });
      setMessages(prev => ({
        ...prev,
        [activeTicketId]: [...(prev[activeTicketId] || []), newMsg]
      }));
      setShowPollForm(false);
      setPollText('');
      setPollOptions(['', '']);
      loadData();
    } catch (e: any) {
      showMessage(e.message || 'Erro ao enviar enquete');
    } finally {
      setSending(false);
    }
  };

  const updateTicketData = async (ticketId: string, updates: Partial<CRMTicket>) => {
    try {
      await api.request(`/whatsapp/crm/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
    } catch (e) {
      showMessage('Erro ao atualizar ticket');
    }
  };

  const handleAssignToMe = () => {
    if (activeTicketId && currentUser) {
      updateTicketData(activeTicketId, { assignedTo: currentUser.id, status: 'open' });
    }
  };

  const handleCloseTicket = () => {
    if (activeTicketId) {
      updateTicketData(activeTicketId, { status: 'closed' });
      setActiveTicketId(null);
    }
  };

  const handleReopenTicket = () => {
    if (activeTicketId) {
      updateTicketData(activeTicketId, { status: 'open' });
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (search && !t.contactName.toLowerCase().includes(search.toLowerCase()) && !t.phoneNumber.includes(search)) return false;
    if (filter === 'open') return t.status === 'open' && !t.assignedTo;
    if (filter === 'mine') return t.assignedTo === currentUser?.id;
    return true; // all
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // Find linked user for active ticket
  const linkedUser = activeTicket ? users.find(u => {
    if (!u.phone) return false;
    const justNumbers = u.phone.replace(/\D/g, '');
    const ticketNumbers = activeTicket.phoneNumber.replace(/\D/g, '');
    return ticketNumbers.includes(justNumbers) || justNumbers.includes(ticketNumbers);
  }) : null;

  return (
    <div className="flex h-[calc(100vh-160px)] min-h-[600px] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
      
      {/* Left Sidebar - Ticket List */}
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-900">Atendimentos</h2>
            <button onClick={loadData} className="p-2 text-slate-400 hover:text-primary transition-colors">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar contatos..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-colors", filter === 'open' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700')}
              onClick={() => setFilter('open')}
            >
              Abertos
            </button>
            <button 
              className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-colors", filter === 'mine' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700')}
              onClick={() => setFilter('mine')}
            >
              Meus
            </button>
            <button 
              className={cn("flex-1 py-1.5 text-xs font-bold rounded-md transition-colors", filter === 'all' ? 'bg-white shadow text-primary' : 'text-slate-500 hover:text-slate-700')}
              onClick={() => setFilter('all')}
            >
              Todos
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTickets.map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTicketId(t.id)}
              className={cn(
                "w-full text-left p-4 border-b border-slate-100 transition-colors hover:bg-slate-50 flex flex-col gap-1 relative",
                activeTicketId === t.id && "bg-slate-50 border-l-4 border-l-primary"
              )}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-sm text-slate-900 truncate pr-2">{t.contactName}</span>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {new Date(t.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">{t.lastMessage || 'Nenhuma mensagem'}</p>
              
              <div className="flex items-center justify-between mt-1">
                {t.assignedTo ? (
                   <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                     <UserCheck className="w-3 h-3" />
                     {users.find(u => u.id === t.assignedTo)?.name || 'Atribuído'}
                   </span>
                ) : (
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pendente
                  </span>
                )}
                
                {t.unreadCount ? t.unreadCount > 0 && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 rounded-full min-w-[18px] text-center">
                    {t.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          ))}
          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhum ticket encontrado.
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Chat & Details */}
      <div className="flex-1 flex flex-col h-full relative bg-slate-50">
        {activeTicket ? (
          <>
            {/* Chat Header */}
            <header className="bg-white p-4 border-b border-slate-200 flex justify-between items-center z-10 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{activeTicket.contactName}</h3>
                  <p className="text-xs text-slate-500">{activeTicket.phoneNumber}</p>
                </div>
                {linkedUser && (
                  <div className="ml-4 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100">
                    Membro: {linkedUser.name}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {activeTicket.status === 'open' ? (
                  <>
                    {!activeTicket.assignedTo ? (
                      <Button variant="outline" className="h-8 text-xs bg-white" onClick={handleAssignToMe}>
                        Assumir Atendimento
                      </Button>
                    ) : (
                      activeTicket.assignedTo !== currentUser?.id && (
                        <div className="text-xs px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg whitespace-nowrap">
                          Atribuído a: {users.find(u => u.id === activeTicket.assignedTo)?.name || 'Outro'}
                        </div>
                      )
                    )}
                    <Button variant="outline" className="h-8 text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={handleCloseTicket}>
                      Finalizar
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="h-8 text-xs" onClick={handleReopenTicket}>
                    Reabrir Ticket
                  </Button>
                )}
              </div>
            </header>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
              {activeMessages.map(msg => {
                const isSystemAuthor = msg.fromMe;
                const authorName = isSystemAuthor && msg.authorId ? users.find(u => u.id === msg.authorId)?.name : null;
                
                return (
                  <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isSystemAuthor ? "ml-auto items-end" : "mr-auto items-start")}>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-sm",
                      isSystemAuthor ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-slate-100 rounded-tl-sm text-slate-800"
                    )}>
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-1 mt-1 px-1">
                      <span className="text-[10px] text-slate-400">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {authorName && (
                        <span className="text-[10px] text-slate-500 font-bold bg-slate-200 px-1.5 rounded">
                          por {authorName}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-50 border-t border-slate-200">
              {activeTicket.status === 'closed' ? (
                <div className="text-center p-3 bg-slate-200 text-slate-600 rounded-xl text-sm">
                  Este atendimento foi finalizado. Reabra para enviar mensagens.
                </div>
              ) : showPollForm ? (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-sm text-slate-800">Enviar Enquete (Botões Interativos)</h4>
                    <button onClick={() => setShowPollForm(false)} className="text-slate-400 hover:text-red-500">
                       <LogOut className="w-4 h-4 rotate-45" /> {/* Just an X icon roughly */}
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Sua pergunta..." 
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                    value={pollText}
                    onChange={e => setPollText(e.target.value)}
                  />
                  {pollOptions.map((opt, idx) => (
                    <input 
                      key={idx}
                      type="text" 
                      placeholder={`Opção ${idx + 1}`} 
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...pollOptions];
                        newOpts[idx] = e.target.value;
                        setPollOptions(newOpts);
                      }}
                    />
                  ))}
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      + Adicionar Opção
                    </button>
                    <Button onClick={handleSendPoll} disabled={sending} className="py-1.5 px-4 h-auto text-sm">
                      {sending ? 'Enviando...' : 'Enviar Enquete'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-end">
                  <button 
                    onClick={() => setShowPollForm(true)}
                    className="p-3 bg-white text-slate-500 hover:text-primary rounded-xl border border-slate-200 transition-colors tooltip"
                    title="Enviar Enquete (Substitui botões)"
                  >
                     <ListTodo className="w-5 h-5" />
                  </button>
                  <textarea 
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Digite sua mensagem responsiva..."
                    className="flex-1 max-h-32 min-h-[44px] p-3 rounded-xl border border-slate-200 resize-none outline-none focus:border-primary/50 text-sm"
                    rows={1}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={sending || !inputText.trim()}
                    className="p-3 bg-primary text-white rounded-xl shadow-md disabled:bg-slate-300 disabled:shadow-none hover:bg-primary-dark transition-all"
                  >
                    <Send className={cn("w-5 h-5", sending && "animate-pulse")} />
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
              <MessageSquare className="w-10 h-10 text-slate-300" />
            </div>
            <div>
              <p className="font-bold text-slate-600">Central de Atendimento (CRM)</p>
              <p className="text-sm">Selecione um contato ao lado para iniciar o atendimento integrado via WhatsApp.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
