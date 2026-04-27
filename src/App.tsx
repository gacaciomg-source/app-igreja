import React, { useState, useEffect, useCallback, useRef, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  Users, 
  BookOpen, 
  Play, 
  User, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Bell, 
  Search, 
  Plus, 
  Heart, 
  Share2, 
  ChevronRight, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  MapPin, 
  Clock, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  CheckSquare,
  History,
  AlertCircle,
  Mail,
  Lock,
  ArrowLeft,
  LayoutDashboard,
  Eye,
  Grid,
  Mic,
  Video,
  Music,
  Phone,
  FileText,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { cn, UserRole, User as UserType, Event, PrayerRequest, PrayerComment, CellGroup, Announcement, ReadingPlan, TitheConfig, Attendance, VerseHighlight, Sermon, PastoralVisit, WhatsAppConfig } from './types';
import { BIBLE_BOOKS, READING_PLAN_TEMPLATES } from './constants';
import { api } from './services/apiService';
import { ReadingPlansScreen } from './components/ReadingPlansScreen';
import { TithesScreen } from './components/TithesScreen';
import { TithesAdminScreen } from './components/TithesAdminScreen';

// --- Error Handling ---
let setGlobalErrorRef: (msg: string | null) => void = () => {};
let setGlobalSuccessRef: (msg: string | null) => void = () => {};

function handleApiError(error: unknown, context: string) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`API Error [${context}]: `, message);
  
  setGlobalErrorRef(`Erro: ${message} (em ${context})`);
  setTimeout(() => setGlobalErrorRef(null), 6000);
}

function handleApiSuccess(message: string) {
  setGlobalSuccessRef(message);
  setTimeout(() => setGlobalSuccessRef(null), 3000);
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState;
  props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || "Ocorreu um erro inesperado.";

      return (
        <div className="min-h-screen flex items-center justify-center bg-secondary p-6">
          <Card className="max-w-md w-full text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Ops! Algo deu errado</h2>
            <p className="text-slate-600">{message}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Recarregar Aplicativo
            </Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Mock Data ---
const currentUser: UserType = {
  id: '1',
  name: 'Gustavo Acácio',
  email: 'gustavo@example.com',
  role: 'member',
  avatar: 'https://picsum.photos/seed/gustavo/100/100'
};

const mockEvents: Event[] = [
  { id: '1', title: 'Culto de Celebração', date: 'Dom, 22 Mar', time: '19:00', location: 'Templo Principal', image: 'https://picsum.photos/seed/church1/400/200', category: 'Culto' },
  { id: '2', title: 'Conferência de Jovens', date: 'Sáb, 28 Mar', time: '14:00', location: 'Auditório', image: 'https://picsum.photos/seed/youth/400/200', category: 'Conferência' },
  { id: '3', title: 'Estudo Bíblico', date: 'Qua, 25 Mar', time: '20:00', location: 'Sala 04', image: 'https://picsum.photos/seed/bible/400/200', category: 'Estudo' },
];

const mockPrayers: PrayerRequest[] = [
  { id: '1', user: 'Maria Silva', content: 'Peço oração pela saúde da minha mãe que está no hospital.', date: 'Há 2 horas', likes: 12, comments: 3 },
  { id: '2', user: 'João Santos', content: 'Agradeço por uma porta de emprego que se abriu esta semana!', date: 'Há 5 horas', likes: 25, comments: 8 },
  { id: '3', user: 'Ana Oliveira', content: 'Oração pela minha família e pela paz em nosso lar.', date: 'Há 1 dia', likes: 18, comments: 5 },
];

const mockCells: CellGroup[] = [
  { id: '1', name: 'Célula Renascer', leader: 'Marcos Paulo', day: 'Terça-feira', time: '20:00', location: 'Bairro Centro', members: 12 },
  { id: '2', name: 'Célula Esperança', leader: 'Carla Dias', day: 'Quinta-feira', time: '19:30', location: 'Bairro Jardim', members: 8 },
  { id: '3', name: 'Célula Vida', leader: 'Ricardo Lima', day: 'Sexta-feira', time: '20:00', location: 'Bairro Novo', members: 15 },
];

// --- Components ---

export const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; key?: React.Key; onClick?: () => void }) => (
  <div 
    className={cn("bg-white rounded-2xl p-4 shadow-sm border border-slate-100", className)}
    onClick={onClick}
  >
    {children}
  </div>
);

export const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  onClick, 
  type = 'button', 
  disabled 
}: { 
  children: React.ReactNode; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'; 
  className?: string; 
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}) => {
  const variants = {
    primary: "bg-primary text-white hover:bg-primary/90 disabled:opacity-50",
    secondary: "bg-primary-light text-primary hover:bg-primary-light/80 disabled:opacity-50",
    outline: "border border-primary text-primary hover:bg-primary-light disabled:opacity-50",
    ghost: "text-slate-500 hover:bg-slate-100 disabled:opacity-50",
  };
  return (
    <button 
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={cn("px-4 py-2 rounded-xl font-medium transition-all active:scale-95 flex items-center justify-center gap-2", variants[variant], className)}
    >
      {children}
    </button>
  );
};

// --- Screens ---

const LoginScreen = ({ onAuthSuccess }: { onAuthSuccess: (user: UserType) => void }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const { user: loggedUser } = await api.login(email, password);
        console.log('Login successful:', loggedUser.email);
        localStorage.setItem('auth_user', JSON.stringify(loggedUser));
        onAuthSuccess(loggedUser);
      } else if (mode === 'signup') {
        if (!phone) throw new Error("O número de WhatsApp é obrigatório.");
        const { user: newUser } = await api.register({
          name,
          email,
          password,
          age,
          address,
          phone
        });
        console.log('Register successful:', newUser.email);
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        onAuthSuccess(newUser);
      } else if (mode === 'reset') {
        setMessage('A funcionalidade de recuperação de senha não está disponível para arquivos locais.');
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-secondary">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-primary/20">
            <Home className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Igreja Renovar</h1>
          <p className="text-slate-500">
            {mode === 'login' && 'Bem-vindo à nossa comunidade'}
            {mode === 'signup' && 'Crie sua conta para participar'}
            {mode === 'reset' && 'Recupere o acesso à sua conta'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">WhatsApp (Obrigatório)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel" 
                    required
                    placeholder="Ex: 5511999999999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Idade</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="number" 
                    required
                    placeholder="Sua idade"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">WhatsApp (Obrigatório)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="tel" 
                    required
                    placeholder="Ex: 5511999999999"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Endereço</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="Seu endereço completo"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="email" 
                required
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-500 rounded-xl text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-500 rounded-xl text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              {message}
            </div>
          )}

          {mode === 'login' && (
            <button 
              type="button"
              onClick={() => setMode('reset')}
              className="text-sm text-primary font-medium hover:underline"
            >
              Esqueceu a senha?
            </button>
          )}

          <Button 
            type="submit" 
            className="w-full py-4 text-lg" 
            disabled={loading}
          >
            {loading ? 'Carregando...' : (
              mode === 'login' ? 'Entrar' : 
              mode === 'signup' ? 'Criar Conta' : 'Enviar E-mail'
            )}
          </Button>
        </form>

        <div className="text-center space-y-4">
          {mode === 'login' ? (
            <p className="text-slate-500">
              Não tem uma conta? <button onClick={() => setMode('signup')} className="text-primary font-bold">Cadastre-se</button>
            </p>
          ) : (
            <button 
              onClick={() => setMode('login')} 
              className="flex items-center gap-2 text-slate-500 mx-auto hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const DAILY_VERSES = [
  { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", ref: "João 3:16" },
  { text: "O Senhor é o meu pastor, nada me faltará.", ref: "Salmos 23:1" },
  { text: "Posso todas as coisas naquele que me fortalece.", ref: "Filipenses 4:13" },
  { text: "O Senhor é a minha luz e a minha salvação; a quem temerei?", ref: "Salmos 27:1" },
  { text: "Buscai primeiro o Reino de Deus e a sua justiça, e todas estas coisas vos serão acrescentadas.", ref: "Mateus 6:33" },
  { text: "Não fui eu que lhe ordenei? Seja forte e corajoso! Não se apavore nem desanime, pois o Senhor, o seu Deus, estará com você por onde você andar.", ref: "Josué 1:9" },
  { text: "Confie no Senhor de todo o seu coração e não se apoie em seu próprio entendimento.", ref: "Provérbios 3:5" },
  { text: "Alegrem-se sempre no Senhor. Novamente direi: Alegrem-se!", ref: "Filipenses 4:4" },
  { text: "O meu Deus suprirá todas as necessidades de vocês, de acordo com as suas gloriosas riquezas em Cristo Jesus.", ref: "Filipenses 4:19" }
];

const Dashboard = ({ events, user, announcements, onTabChange, onShowDonation, onShowReadingPlans, onRequestPastoralVisit, isAdmin, onSwitchToAdmin, showMessage }: { events: Event[], user: UserType | null, announcements: Announcement[], onTabChange: (tab: string) => void, onShowDonation: () => void, onShowReadingPlans: () => void, onRequestPastoralVisit: () => void, isAdmin?: boolean, onSwitchToAdmin?: () => void, showMessage?: (msg: string) => void }) => {
  const dailyVerse = React.useMemo(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return DAILY_VERSES[seed % DAILY_VERSES.length];
  }, []);

  return (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Olá, {user?.name?.split(' ')[0] || 'Irmão'}!</h2>
        <p className="text-slate-500">Bom ver você hoje.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => showMessage?.('Nenhuma nova notificação')} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 relative">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full border-2 border-white"></span>
        </button>
        <img src={user?.avatar || 'https://picsum.photos/seed/user/100/100'} className="w-10 h-10 rounded-full border-2 border-primary shadow-sm" alt="Avatar" />
      </div>
    </header>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Ações Rápidas</h3>
        <button className="text-primary text-sm font-bold">Ver todas</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen, label: 'Planos', color: 'bg-emerald-500', action: onShowReadingPlans },
          { icon: Mic, label: 'Sermões', color: 'bg-orange-500', action: () => onTabChange('sermons') },
          { icon: Calendar, label: 'Agenda', color: 'bg-blue-500', action: () => onTabChange('events') },
          { icon: Home, label: 'PGs', color: 'bg-purple-500', action: () => onTabChange('groups') },
          { icon: Heart, label: 'Visita', color: 'bg-rose-500', action: onRequestPastoralVisit },
          isAdmin && { icon: LayoutDashboard, label: 'Gerenciar', color: 'bg-slate-800', action: onSwitchToAdmin },
        ].filter(Boolean).map((action: any, i) => (
          <button key={i} onClick={action.action} className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", action.color)}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </section>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Avisos</h3>
        <button onClick={() => onTabChange('announcements')} className="text-primary text-sm font-bold">Ver todos</button>
      </div>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="min-w-[280px] snap-start overflow-hidden border-slate-100 p-0">
              {announcement.imageUrl && (
                <img src={announcement.imageUrl} alt={announcement.title} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="p-4 space-y-2">
                <h4 className="font-bold text-slate-900">{announcement.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{announcement.content}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

    <section className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Versículo do Dia</h3>
      <Card className="bg-primary text-white relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <p className="text-lg italic font-medium leading-relaxed">
            "{dailyVerse.text}"
          </p>
          <div className="flex justify-between items-center">
            <span className="font-bold">{dailyVerse.ref}</span>
            <Button variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">
              <Share2 className="w-4 h-4" />
              Compartilhar
            </Button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      </Card>
    </section>

      <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Próximos Eventos</h3>
        <button onClick={() => onTabChange('events')} className="text-primary text-sm font-bold">Ver todos</button>
      </div>
      <div className="space-y-4">
        {events.slice(0, 2).map(event => (
          <Card key={event.id} className="p-0 overflow-hidden">
            <img src={event.image} className="w-full h-40 object-cover" alt={event.title} />
            <div className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <span className="px-2 py-1 bg-primary-light text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">{event.category}</span>
                <div className="flex items-center text-slate-400 text-xs gap-1">
                  <Clock className="w-3 h-3" />
                  {event.time}
                </div>
              </div>
              <h4 className="font-bold text-slate-900">{event.title}</h4>
              <div className="flex items-center text-slate-500 text-sm gap-1">
                <MapPin className="w-4 h-4" />
                {event.location}
              </div>
              <div className="flex items-center text-primary text-sm font-semibold gap-1">
                <Calendar className="w-4 h-4" />
                {event.date}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  </div>
);
}

const AnnouncementsScreen = ({ announcements, isAdmin, onDelete, showMessage }: { announcements: Announcement[], isAdmin?: boolean, onDelete?: (id: string) => void, showMessage?: (msg: string) => void }) => (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-900">Avisos</h2>
      <button onClick={() => showMessage?.('Filtro em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
        <Filter className="w-5 h-5 text-slate-600" />
      </button>
    </header>

    <div className="space-y-4">
      {announcements.map(announcement => (
        <Card key={announcement.id} className="p-0 overflow-hidden border-slate-100">
          {announcement.imageUrl && (
            <img src={announcement.imageUrl} alt={announcement.title} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
          )}
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-lg text-slate-900">{announcement.title}</h4>
              {isAdmin && (
                <button 
                  onClick={() => onDelete?.(announcement.id)}
                  className="p-1.5 bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              )}
            </div>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Publicado em {announcement.date || 'Recente'}</p>
          </div>
        </Card>
      ))}
      {announcements.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
            <MessageSquare className="w-8 h-8" />
          </div>
          <p className="text-slate-500">Nenhum aviso encontrado</p>
        </div>
      )}
    </div>
  </div>
);
const EventsScreen = ({ events, isAdmin, onDelete, onEdit, onShowMural, showMessage }: { events: Event[], isAdmin?: boolean, onDelete?: (id: string) => void, onEdit?: (e: Event) => void, onShowMural?: () => void, showMessage?: (msg: string) => void }) => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const filteredEvents = selectedCategory === 'Todos' ? events : events.filter(e => e.category === selectedCategory);

  return (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-900">Agenda</h2>
      <div className="flex gap-2">
        <button onClick={() => showMessage?.('Funcionalidade em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <Filter className="w-5 h-5 text-slate-600" />
        </button>
        {!isAdmin && (
          <button onClick={onShowMural} className="p-2 bg-primary-light text-primary rounded-xl shadow-sm border border-primary/10">
            <Heart className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>

    <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-100 overflow-x-auto">
      {['Todos', 'Cultos', 'Jovens', 'Estudos', 'Social'].map((tab, i) => (
        <button key={i} onClick={() => setSelectedCategory(tab)} className={cn("flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap", selectedCategory === tab ? "bg-primary text-white shadow-sm" : "text-slate-500 hover:bg-slate-50")}>
          {tab}
        </button>
      ))}
    </div>

    <div className="space-y-4">
      {filteredEvents.map(event => (
        <Card key={event.id} className="flex gap-4 p-3">
          <img src={event.image} className="w-24 h-24 rounded-xl object-cover" alt={event.title} />
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <h4 className="font-bold text-slate-900 leading-tight">{event.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{event.location}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-primary text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {event.date}
              </div>
              {isAdmin && (
                <div className="flex gap-1">
                  <button 
                    onClick={() => onEdit?.(event)}
                    className="p-1.5 bg-slate-50 text-slate-400 hover:text-primary rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete?.(event.id)}
                    className="p-1.5 bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  </div>
  );
};

const PrayerWall = ({ prayers, cells, onAdd, onDelete, onTogglePrayed, onAddComment, currentUserId, currentUser, isAdmin, isSuperAdmin, showMessage }: { prayers: PrayerRequest[], cells: CellGroup[], onAdd: () => void, onDelete?: (id: string) => void, onTogglePrayed?: (id: string) => void, onAddComment?: (id: string, content: string) => void, currentUserId?: string, currentUser?: UserType | null, isAdmin?: boolean, isSuperAdmin?: boolean, showMessage?: (msg: string) => void }) => {
  // Only Admin, SuperAdmin, Owner or PG Leader (if member is in their PG) can see private requests
  const visiblePrayers = prayers.filter(p => {
    if (p.privacy !== 'private' || isAdmin || isSuperAdmin || p.uid === currentUserId) return true;
    
    if (currentUser?.role === 'leader' && currentUser.leaderOf) {
      // Check if the prayer was posted while the author was in the leader's cell
      if (p.cellIds?.includes(currentUser.leaderOf)) return true;
      
      // Fallback to current membersList if cellIds is not on the prayer (for old prayers)
      const leaderCell = cells.find(c => c.id === currentUser.leaderOf);
      return leaderCell?.membersList?.includes(p.uid || '');
    }
    
    return false;
  });
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const handleAddComment = async (id: string) => {
    if (!commentText.trim()) return;
    await onAddComment?.(id, commentText);
    setCommentText('');
    setCommentingId(null);
  };

  return (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-900">Mural de Pedidos</h2>
      <Button className="rounded-full w-10 h-10 p-0" onClick={onAdd}>
        <Plus className="w-6 h-6" />
      </Button>
    </header>

    <div className="space-y-4">
      {visiblePrayers.length > 0 ? (
        visiblePrayers.map(prayer => (
          <Card key={prayer.id} className="space-y-4 relative">
            {prayer.privacy === 'private' && (
              <span className="absolute top-4 right-4 text-xs font-semibold text-red-500 bg-red-50 px-2 py-1 rounded">Privado</span>
            )}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary font-bold">
                {prayer.user.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{prayer.user}</h4>
                <p className="text-[10px] text-slate-400">{prayer.date}</p>
              </div>
              {(isAdmin || (currentUserId && prayer.uid === currentUserId)) && (
                <button 
                  onClick={() => onDelete?.(prayer.id)}
                  className="ml-auto p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Plus className="w-4 h-4 rotate-45" />
                </button>
              )}
            </div>
            <p className="text-slate-700 leading-relaxed">
              {prayer.content}
            </p>
            <div className="flex items-center gap-6 pt-2 border-t border-slate-50">
              <button 
                onClick={() => onTogglePrayed?.(prayer.id)} 
                className={cn(
                  "flex items-center gap-1.5 transition-colors",
                  prayer.prayedBy?.includes(currentUserId || '') ? "text-accent" : "text-slate-500 hover:text-accent"
                )}
              >
                <Heart className={cn("w-4 h-4", prayer.prayedBy?.includes(currentUserId || '') && "fill-current")} />
                <span className="text-xs font-medium">{prayer.likes} Oreis</span>
              </button>
              <button 
                onClick={() => setCommentingId(commentingId === prayer.id ? null : prayer.id)} 
                className="flex items-center gap-1.5 text-slate-500 hover:text-primary transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium">{prayer.comments} Comentários</span>
              </button>
            </div>

            {commentingId === prayer.id && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input 
                    placeholder="Escreva um comentário..." 
                    className="flex-1 p-2 bg-slate-50 border border-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />
                  <Button onClick={() => handleAddComment(prayer.id)} className="px-3 py-1 text-xs">Enviar</Button>
                </div>
                {prayer.commentsList && prayer.commentsList.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {prayer.commentsList.map((comment: any) => (
                      <div key={comment.id} className="bg-slate-50 p-2 rounded-lg">
                        <p className="text-[10px] font-bold text-slate-900">{comment.user}</p>
                        <p className="text-xs text-slate-600">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))
      ) : (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500">Nenhum pedido de oração ainda. Seja o primeiro!</p>
          <Button variant="outline" onClick={onAdd}>Publicar Pedido</Button>
        </div>
      )}
    </div>
  </div>
  );
};

const BibleScreen = ({ onTabChange, showMessage, readingPlans, progress, highlights, onToggleHighlight }: { onTabChange?: (tab: string) => void, showMessage?: (msg: string) => void, readingPlans: ReadingPlan[], progress?: Record<string, string[]>, highlights?: VerseHighlight[], onToggleHighlight?: (book: string, chapter: number, verse: number, text: string, color: string) => void }) => {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [verses, setVerses] = useState<{verse: number, text: string}[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  
  const colors = [
    { name: 'Amarelo', value: 'bg-yellow-200' },
    { name: 'Verde', value: 'bg-green-200' },
    { name: 'Azul', value: 'bg-blue-200' },
    { name: 'Rosa', value: 'bg-pink-200' },
    { name: 'Laranja', value: 'bg-orange-200' },
  ];

  const lastReadBook = localStorage.getItem('lastReadBook') || 'Gênesis';
  const lastReadChapter = parseInt(localStorage.getItem('lastReadChapter') || '1', 10);

  const handleSelectChapter = async (book: string, chapter: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    localStorage.setItem('lastReadBook', book);
    localStorage.setItem('lastReadChapter', chapter.toString());
    
    setLoadingVerses(true);
    setVerses([]);
    try {
      const response = await fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=almeida`);
      if (response.ok) {
        const data = await response.json();
        setVerses(data.verses);
      } else {
        setVerses([{ verse: 1, text: 'Erro ao carregar o texto bíblico. Tente novamente mais tarde.' }]);
      }
    } catch (error) {
      setVerses([{ verse: 1, text: 'Erro ao carregar o texto bíblico. Verifique sua conexão.' }]);
    } finally {
      setLoadingVerses(false);
    }
  };

  const filteredBooks = BIBLE_BOOKS.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (selectedChapter) {
    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setSelectedChapter(null)} className="p-2 hover:bg-slate-100 rounded-full">
            <Plus className="w-6 h-6 rotate-45 text-slate-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{selectedBook} {selectedChapter}</h2>
            <p className="text-xs text-slate-500">Almeida Revista e Atualizada</p>
          </div>
        </header>
        <Card className="p-6 space-y-4">
          {loadingVerses ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : verses.length > 0 ? (
            <div className="space-y-4">
              {verses.map(v => {
                const highlight = highlights?.find(h => h.book === selectedBook && h.chapter === selectedChapter && h.verse === v.verse);
                return (
                  <div key={v.verse} className="relative group">
                    <p 
                      className={cn(
                        "text-slate-700 leading-relaxed p-1 rounded transition-colors cursor-pointer hover:bg-slate-50",
                        highlight?.color
                      )}
                      onClick={() => setSelectedVerse(selectedVerse === v.verse ? null : v.verse)}
                    >
                      <span className="font-bold text-primary mr-2 text-xs">{v.verse}</span>
                      {v.text}
                    </p>
                    {selectedVerse === v.verse && (
                      <div className="absolute top-full left-0 z-20 mt-2 p-2 bg-white rounded-xl shadow-xl border border-slate-100 flex gap-2 animate-in fade-in slide-in-from-top-1">
                        {colors.map(c => (
                          <button
                            key={c.value}
                            onClick={() => {
                              onToggleHighlight?.(selectedBook!, selectedChapter!, v.verse, v.text, c.value);
                              setSelectedVerse(null);
                            }}
                            className={cn("w-8 h-8 rounded-full border border-slate-200", c.value)}
                            title={c.name}
                          />
                        ))}
                        <button
                          onClick={() => {
                            if (highlight) {
                              onToggleHighlight?.(selectedBook!, selectedChapter!, v.verse, v.text, highlight.color);
                            }
                            setSelectedVerse(null);
                          }}
                          className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-red-500"
                          title="Remover"
                        >
                          <Plus className="w-4 h-4 rotate-45" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">Nenhum versículo encontrado.</p>
          )}
        </Card>
      </div>
    );
  }

  if (selectedBook) {
    const book = BIBLE_BOOKS.find(b => b.name === selectedBook);
    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setSelectedBook(null)} className="p-2 hover:bg-slate-100 rounded-full">
            <Plus className="w-6 h-6 rotate-45 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">{selectedBook}</h2>
        </header>
        <div className="grid grid-cols-5 gap-3">
          {Array.from({ length: book?.chapters || 0 }, (_, i) => i + 1).map(ch => (
            <button 
              key={ch} 
              onClick={() => handleSelectChapter(selectedBook, ch)}
              className="aspect-square flex items-center justify-center bg-white rounded-xl border border-slate-100 font-bold text-slate-700 hover:bg-primary hover:text-white transition-all shadow-sm"
            >
              {ch}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const activePlans = readingPlans.filter(plan => progress?.[plan.id]?.length);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Bíblia Sagrada</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder="Buscar livro..." 
              className="pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {activePlans.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Seu Progresso</h3>
          <div className="flex gap-4 overflow-x-auto pb-2 snap-x no-scrollbar">
            {activePlans.map(plan => {
              const completed = progress?.[plan.id]?.length || 0;
              const total = plan.chapters.length;
              const percent = Math.round((completed / total) * 100);
              return (
                <Card key={plan.id} className="min-w-[240px] snap-start p-4 space-y-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => onTabChange?.('readingPlans')}>
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm truncate pr-2">{plan.title}</h4>
                    <span className="text-xs font-bold text-primary">{percent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{completed} de {total} capítulos</p>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-4">
        <Card className="flex flex-col p-4 gap-4 bg-primary text-white border-none relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <span className="font-bold">Planos de Leitura</span>
            </div>
            <p className="text-xs text-white/80">Acompanhe sua jornada bíblica com planos personalizados.</p>
            <Button 
              variant="secondary"
              onClick={() => onTabChange?.('readingPlans')}
              className="w-full bg-white text-primary hover:bg-white/90 border-none mt-2"
            >
              Ver Todos os Planos
            </Button>
          </div>
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </Card>
      </div>

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Continuar Lendo</h3>
        <Card className="flex items-center justify-between p-4 border-l-4 border-l-primary cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSelectChapter(lastReadBook, lastReadChapter)}>
          <div>
            <h4 className="font-bold text-slate-900">{lastReadBook} {lastReadChapter}</h4>
            <p className="text-sm text-slate-500">Última leitura</p>
          </div>
          <button className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary">
            <ChevronRight className="w-6 h-6" />
          </button>
        </Card>
      </section>

      {highlights && highlights.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-slate-900">Minhas Marcações</h3>
          <div className="grid gap-3">
            {highlights.slice(0, 5).map(h => (
              <Card key={h.id} className="p-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => handleSelectChapter(h.book, h.chapter)}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn("w-2 h-2 rounded-full", h.color)}></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{h.book} {h.chapter}:{h.verse}</span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 italic">"{h.text}"</p>
              </Card>
            ))}
            {highlights.length > 5 && (
              <p className="text-center text-[10px] font-bold text-slate-400 uppercase">E mais {highlights.length - 5} marcações...</p>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">{searchQuery ? 'Resultados da Busca' : 'Livros'}</h3>
        <div className="grid grid-cols-2 gap-4">
          {filteredBooks.map((book, i) => (
            <Card 
              key={i} 
              className="p-4 text-center font-bold text-slate-700 hover:bg-primary-light hover:text-primary transition-all cursor-pointer"
              onClick={() => setSelectedBook(book.name)}
            >
              {book.name}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

const AdminPastoralVisits = ({ visits, onUpdateStatus }: { visits: PastoralVisit[], onUpdateStatus: (id: string, status: PastoralVisit['status']) => void }) => {
  const getStatusColor = (status: PastoralVisit['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-600';
      case 'scheduled': return 'bg-blue-50 text-blue-600';
      case 'completed': return 'bg-emerald-50 text-emerald-600';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  const getStatusLabel = (status: PastoralVisit['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'scheduled': return 'Agendado';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Visitas Pastorais</h2>
        <p className="text-sm text-slate-500">Gerenciar solicitações de visitas</p>
      </header>

      <div className="space-y-4">
        {visits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(visit => (
          <Card key={visit.id} className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{visit.userName}</h4>
                  <p className="text-[10px] text-slate-500">{new Date(visit.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", getStatusColor(visit.status))}>
                {getStatusLabel(visit.status)}
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2">
              <p className="text-sm text-slate-700 font-medium">Motivo: {visit.reason}</p>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Calendar className="w-4 h-4" />
                Data Sugerida: {new Date(visit.preferredDate).toLocaleDateString('pt-BR')}
              </div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <MapPin className="w-4 h-4" />
                Endereço: {visit.userAddress}
              </div>
              {visit.userPhone && (
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Phone className="w-4 h-4" />
                  Telefone: {visit.userPhone}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {visit.status === 'pending' && (
                <Button className="flex-1 py-2 text-xs h-auto" onClick={() => onUpdateStatus(visit.id, 'scheduled')}>
                  Agendar
                </Button>
              )}
              {visit.status === 'scheduled' && (
                <Button className="flex-1 py-2 text-xs h-auto bg-emerald-600 hover:bg-emerald-700" onClick={() => onUpdateStatus(visit.id, 'completed')}>
                  Concluir
                </Button>
              )}
              {visit.status !== 'completed' && visit.status !== 'cancelled' && (
                <Button variant="outline" className="flex-1 py-2 text-xs h-auto border-red-100 text-red-500" onClick={() => onUpdateStatus(visit.id, 'cancelled')}>
                  Cancelar
                </Button>
              )}
            </div>
          </Card>
        ))}
        {visits.length === 0 && (
          <div className="text-center py-12 text-slate-500">Nenhuma solicitação encontrada</div>
        )}
      </div>
    </div>
  );
};

const UserPastoralVisitsScreen = ({ visits, onAddRequest }: { visits: PastoralVisit[], onAddRequest: () => void }) => {
  const getStatusColor = (status: PastoralVisit['status']) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-600';
      case 'scheduled': return 'bg-blue-50 text-blue-600';
      case 'completed': return 'bg-emerald-50 text-emerald-600';
      case 'cancelled': return 'bg-red-50 text-red-600';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Minhas Visitas</h2>
          <p className="text-sm text-slate-500">Acompanhe suas solicitações</p>
        </div>
        <Button className="rounded-full w-10 h-10 p-0" onClick={onAddRequest}>
          <Plus className="w-6 h-6" />
        </Button>
      </header>

      <div className="space-y-4">
        {visits.map(visit => (
          <Card key={visit.id} className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400">{new Date(visit.createdAt).toLocaleDateString('pt-BR')}</span>
              <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", getStatusColor(visit.status))}>
                {visit.status}
              </span>
            </div>
            <p className="text-slate-700 font-medium">{visit.reason}</p>
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Calendar className="w-4 h-4" />
              Sugerido para: {new Date(visit.preferredDate).toLocaleDateString('pt-BR')}
            </div>
          </Card>
        ))}
        {visits.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Heart className="w-8 h-8" />
            </div>
            <p className="text-slate-500">Você ainda não solicitou nenhuma visita.</p>
            <Button variant="outline" onClick={onAddRequest}>Solicitar Visita</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = ({ stats, users, onAddEvent, onAddAnnouncement, onAddReadingPlan, onAddTransaction, onSwitchToMember, onTabChange, showMessage }: { stats: any, users: UserType[], onAddEvent: () => void, onAddAnnouncement: () => void, onAddReadingPlan: () => void, onAddTransaction: () => void, onSwitchToMember?: () => void, onTabChange?: (tab: string) => void, showMessage?: (msg: string) => void }) => {
  const [showBirthdays, setShowBirthdays] = useState<'today' | 'month' | null>(null);

  const birthdays = React.useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const monthBirthdays = users.filter(u => {
      if (!u.birthDate) return false;
      const [year, month, day] = u.birthDate.split('-').map(Number);
      return month === currentMonth;
    });

    const todayBirthdays = monthBirthdays.filter(u => {
      const [year, month, day] = u.birthDate!.split('-').map(Number);
      return day === currentDay;
    });

    return { today: todayBirthdays, month: monthBirthdays };
  }, [users]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Painel Admin</h2>
        <p className="text-slate-500">Gestão da Igreja Renovar</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onSwitchToMember} className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors">
          <Eye className="w-4 h-4" />
          Ver como Membro
        </button>
        <button onClick={() => showMessage?.('Configurações do sistema em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <Settings className="w-5 h-5 text-slate-600" />
        </button>
      </div>
    </header>

    <div className="grid grid-cols-2 gap-4">
      <Card className="bg-emerald-50 border-emerald-100 p-4 space-y-2">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Membros</p>
          <p className="text-2xl font-bold text-slate-900">{stats.members}</p>
        </div>
        <p className="text-[10px] text-emerald-600 font-medium">+12 este mês</p>
      </Card>
      <Card className="bg-blue-50 border-blue-100 p-4 space-y-2">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
          <Home className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">PGs</p>
          <p className="text-2xl font-bold text-slate-900">{stats.cells}</p>
        </div>
        <p className="text-[10px] text-blue-600 font-medium">Ativas</p>
      </Card>
      <Card className="bg-amber-50 border-amber-100 p-4 space-y-2">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">Caixa</p>
          <p className="text-xl font-bold text-slate-900">R$ {stats.balance.toLocaleString()}</p>
        </div>
        <p className="text-[10px] text-amber-600 font-medium">Saldo Real</p>
      </Card>
      <Card className="bg-purple-50 border-purple-100 p-4 space-y-2">
        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Eventos</p>
          <p className="text-2xl font-bold text-slate-900">{stats.events}</p>
        </div>
        <p className="text-[10px] text-purple-600 font-medium">Agendados</p>
      </Card>
    </div>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Todas as Telas</h3>
        <button onClick={() => onTabChange?.('all_screens')} className="text-primary text-sm font-bold">Gerenciar tudo</button>
      </div>
      <Card className="p-4 bg-slate-900 text-white flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors" onClick={() => onTabChange?.('all_screens')}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
            <Grid className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold">Central de Gestão</p>
            <p className="text-xs text-white/60">Acesse todas as áreas do sistema</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/40" />
      </Card>
    </section>

    {/* Birthdays Section */}
    <section className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Aniversariantes</h3>
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-white border-slate-100 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => setShowBirthdays('today')}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Hoje</p>
          <div className="space-y-2">
            {birthdays.today.length > 0 ? (
              birthdays.today.slice(0, 3).map(u => (
                <div key={u.id} className="flex items-center gap-2">
                  <img src={u.avatar || `https://picsum.photos/seed/${u.id}/100/100`} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-xs font-medium text-slate-700 truncate">{u.name}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Ninguém hoje</p>
            )}
            {birthdays.today.length > 3 && (
              <p className="text-xs text-primary font-medium">+{birthdays.today.length - 3} outros</p>
            )}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-100 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => setShowBirthdays('month')}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Este Mês</p>
          <p className="text-2xl font-bold text-primary">{birthdays.month.length}</p>
          <p className="text-[10px] text-slate-500">Total de celebrações</p>
        </Card>
      </div>
    </section>

    {showBirthdays && (
      <Modal title={showBirthdays === 'today' ? "Aniversariantes de Hoje" : "Aniversariantes do Mês"} onClose={() => setShowBirthdays(null)}>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {birthdays[showBirthdays].length > 0 ? (
            birthdays[showBirthdays].map(u => (
              <div key={u.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                <img src={u.avatar || `https://picsum.photos/seed/${u.id}/100/100`} alt={u.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                <div>
                  <h4 className="font-bold text-slate-900">{u.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(u.birthDate)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">Nenhum aniversariante encontrado.</p>
            </div>
          )}
        </div>
      </Modal>
    )}

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Ações Rápidas</h3>
        <button onClick={() => onTabChange?.('all_screens')} className="text-primary text-sm font-bold">Ver todas</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Plus, label: 'Evento', color: 'bg-primary', action: onAddEvent },
          { icon: MessageSquare, label: 'Aviso', color: 'bg-blue-500', action: onAddAnnouncement },
          { icon: Mic, label: 'Sermão', color: 'bg-orange-500', action: () => onTabChange?.('sermons') },
          { icon: BookOpen, label: 'Plano', color: 'bg-emerald-500', action: onAddReadingPlan },
          { icon: DollarSign, label: 'Caixa', color: 'bg-amber-500', action: onAddTransaction },
        ].map((action, i) => (
          <button key={i} onClick={action.action} className="flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", action.color)}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-slate-700 text-center">{action.label}</span>
          </button>
        ))}
      </div>
    </section>

    <section className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Atividade Recente</h3>
      <Card className="divide-y divide-slate-50 p-0 overflow-hidden">
        {stats.events > 0 ? (
          <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50" onClick={() => onTabChange?.('events')}>
            <div className="w-8 h-8 bg-purple-50 text-purple-500 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900">Eventos Atualizados</p>
              <p className="text-xs text-slate-500">{stats.events} eventos na agenda</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </div>
        ) : null}
        <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50" onClick={() => onTabChange?.('financial')}>
          <div className="w-8 h-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-900">Fluxo de Caixa</p>
            <p className="text-xs text-slate-500">Saldo: R$ {stats.balance.toLocaleString()}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </Card>
    </section>
  </div>
  );
};

const AdminAllScreens = ({ onTabChange }: { onTabChange: (tab: string) => void }) => {
  const screens = [
    { id: 'home', label: 'Dashboard Principal', icon: PieChart, color: 'bg-slate-800' },
    { id: 'financial', label: 'Gestão Financeira', icon: DollarSign, color: 'bg-amber-500' },
    { id: 'prayer', label: 'Mural de Orações', icon: Heart, color: 'bg-red-500' },
    { id: 'members', label: 'Gestão de Membros', icon: Users, color: 'bg-blue-500' },
    { id: 'readingPlans', label: 'Planos de Leitura', icon: TrendingUp, color: 'bg-emerald-500' },
    { id: 'events', label: 'Agenda de Eventos', icon: Calendar, color: 'bg-purple-500' },
    { id: 'announcements', label: 'Avisos e Notícias', icon: Bell, color: 'bg-orange-500' },
    { id: 'groups', label: 'Pequenos Grupos', icon: Home, color: 'bg-indigo-500' },
    { id: 'pastoral', label: 'Visitas Pastorais', icon: Heart, color: 'bg-rose-500' },
    { id: 'sermons', label: 'Gerenciar Sermões', icon: Mic, color: 'bg-orange-600' },
    { id: 'tithes', label: 'Configuração de Dízimos', icon: DollarSign, color: 'bg-emerald-600' },
  ];

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h2 className="text-2xl font-bold text-slate-900">Todas as Telas</h2>
        <p className="text-slate-500">Acesse todas as áreas de gestão</p>
      </header>

      <div className="grid grid-cols-1 gap-3">
        {screens.map((screen) => (
          <button
            key={screen.id}
            onClick={() => onTabChange(screen.id)}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all group"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg", screen.color)}>
              <screen.icon className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="font-bold text-slate-900 block">{screen.label}</span>
              <span className="text-xs text-slate-400">Gerenciar {screen.label.toLowerCase()}</span>
            </div>
            <ChevronRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};

const AdminFinancial = ({ transactions, balance, onAdd, onDelete, showMessage }: { transactions: any[], balance: number, onAdd: () => void, onDelete: (id: string) => void, showMessage?: (msg: string) => void }) => (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-900">Financeiro</h2>
      <Button className="rounded-full w-10 h-10 p-0" onClick={onAdd}>
        <Plus className="w-6 h-6" />
      </Button>
    </header>

    <Card className="bg-primary text-white p-6 space-y-4">
      <p className="text-sm font-medium opacity-80">Saldo Total em Caixa</p>
      <h3 className="text-3xl font-bold">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
      <div className="flex gap-4 pt-4 border-t border-white/20">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase opacity-70">Entradas</p>
          <p className="text-sm font-bold text-emerald-300">+ R$ {transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.value, 0).toLocaleString()}</p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase opacity-70">Saídas</p>
          <p className="text-sm font-bold text-red-300">- R$ {transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.value, 0).toLocaleString()}</p>
        </div>
      </div>
    </Card>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Últimas Transações</h3>
        <button onClick={() => showMessage?.('Funcionalidade em desenvolvimento')} className="text-primary text-sm font-bold">Ver tudo</button>
      </div>
      <div className="space-y-3">
        {transactions.map((t, i) => (
          <div key={t.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-50 group">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", t.type === 'in' ? "bg-emerald-50 text-emerald-500" : "bg-red-50 text-red-500")}>
              {t.type === 'in' ? <Plus className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900 text-sm">{t.label}</p>
              <p className="text-[10px] text-slate-400">{t.date}</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <p className={cn("font-bold text-sm whitespace-nowrap", t.type === 'in' ? "text-emerald-500" : "text-red-500")}>
                {t.type === 'in' ? '+' : '-'} R$ {t.value.toLocaleString()}
              </p>
              <button 
                onClick={() => onDelete(t.id)}
                className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const NotificationSettingsScreen = ({ settings, onUpdate, onClose, showMessage }: { settings: any, onUpdate: (data: any) => Promise<void>, onClose: () => void, showMessage: (msg: string) => void }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = async () => {
    try {
      await onUpdate(localSettings);
      showMessage('Configurações salvas!');
      onClose();
    } catch (e) {
      showMessage('Erro ao salvar configurações.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
          <div>
            <h4 className="font-bold text-slate-900">Silenciar Todas</h4>
            <p className="text-xs text-slate-500">Desativa todas as notificações</p>
          </div>
          <button 
            onClick={() => setLocalSettings({...localSettings, allMuted: !localSettings.allMuted})}
            className={cn("w-12 h-6 rounded-full transition-colors relative", localSettings.allMuted ? "bg-red-500" : "bg-slate-200")}
          >
            <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", localSettings.allMuted ? "right-1" : "left-1")} />
          </button>
        </div>

        <div className="space-y-3 opacity-100 transition-opacity disabled:opacity-50">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase ml-1">Personalizar</h5>
          
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-sm">Palavra do Dia</p>
                  <p className="text-[10px] text-slate-500">Receba o versículo diário</p>
                </div>
              </div>
              <button 
                disabled={localSettings.allMuted}
                onClick={() => setLocalSettings({...localSettings, wordOfDayEnabled: !localSettings.wordOfDayEnabled})}
                className={cn("w-10 h-5 rounded-full transition-colors relative", localSettings.wordOfDayEnabled && !localSettings.allMuted ? "bg-primary" : "bg-slate-200")}
              >
                <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", localSettings.wordOfDayEnabled && !localSettings.allMuted ? "right-0.5" : "left-0.5")} />
              </button>
            </div>

            {localSettings.wordOfDayEnabled && !localSettings.allMuted && (
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Horário escolhido:
                </p>
                <input 
                  type="time" 
                  value={localSettings.wordOfDayTime}
                  onChange={(e) => setLocalSettings({...localSettings, wordOfDayTime: e.target.value})}
                  className="bg-slate-50 border-none rounded-lg text-sm font-bold text-primary p-2 focus:ring-0"
                />
              </div>
            )}
          </Card>

          <Card className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">Novos Sermões</p>
                <p className="text-[10px] text-slate-500">Avisar quando um sermão for publicado</p>
              </div>
            </div>
            <button 
              disabled={localSettings.allMuted}
              onClick={() => setLocalSettings({...localSettings, newSermonEnabled: !localSettings.newSermonEnabled})}
              className={cn("w-10 h-5 rounded-full transition-colors relative", localSettings.newSermonEnabled && !localSettings.allMuted ? "bg-primary" : "bg-slate-200")}
            >
              <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", localSettings.newSermonEnabled && !localSettings.allMuted ? "right-0.5" : "left-0.5")} />
            </button>
          </Card>
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1" onClick={handleSave}>Salvar</Button>
      </div>
    </div>
  );
};

const WhatsAppAdminConfig = ({ config, onUpdate, showMessage }: { config: WhatsAppConfig, onUpdate: (data: WhatsAppConfig) => void, showMessage: (msg: string) => void }) => {
  const [formData, setFormData] = useState(config);
  const [statusData, setStatusData] = useState<{ status: string, hasQr: boolean, qr: string | null }>({ status: 'DISCONNECTED', hasQr: false, qr: null });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getWhatsAppStatus();
      setStatusData(data);
    } catch (err) {
      console.error('Failed to fetch WhatsApp status:', err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = () => {
    onUpdate(formData);
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await api.logoutWhatsApp();
      showMessage('Desconectado com sucesso!');
      fetchStatus();
    } catch (err) {
      showMessage('Erro ao desconectar');
    }
    setLoading(false);
  };

  const handleReconnect = async () => {
    setLoading(true);
    try {
      await api.reconnectWhatsApp();
      showMessage('Iniciando reconexão...');
      fetchStatus();
    } catch (err) {
      showMessage('Erro ao reconectar');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 pt-4">
      <header className="space-y-1">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
            <MessageSquare className="w-4 h-4" />
          </div>
          WhatsApp (Não Oficial)
        </h3>
        <p className="text-xs text-slate-500">Conecte sua conta para notificações automáticas</p>
      </header>

      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl space-y-6 text-center">
        {statusData.status === 'READY' ? (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-slate-900">Conectado!</h4>
              <p className="text-sm text-slate-500">Seu WhatsApp está pronto para enviar notificações.</p>
            </div>
            <Button variant="outline" className="text-red-500 border-red-100 hover:bg-red-50" onClick={handleLogout} disabled={loading}>
              Desconectar WhatsApp
            </Button>
          </div>
        ) : statusData.qr ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-slate-900">Escaneie o QR Code</h4>
              <p className="text-xs text-slate-500">Abra o WhatsApp no seu celular {'>'} Configurações {'>'} Dispositivos Conectados</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl inline-block border-2 border-slate-200">
              <img src={statusData.qr} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto" />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[10px] text-slate-400 animate-pulse font-bold uppercase tracking-wider">Aguardando leitura...</p>
              <Button variant="ghost" className="text-slate-400 text-xs" onClick={fetchStatus}>Atualizar QR Code</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-8">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <p className="text-sm text-slate-500">Iniciando conexão com o WhatsApp...</p>
            <Button onClick={handleReconnect} disabled={loading}>Tentar Conectar</Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase">Gerenciar Telefones de Administradores</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              id="new-phone-input"
              placeholder="Ex: 5511999999999"
              className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
            <Button 
                onClick={() => {
                    const input = document.getElementById('new-phone-input') as HTMLInputElement;
                    const phone = input.value.trim();
                    if (phone) {
                        setFormData({...formData, adminPhones: [...(formData.adminPhones || []), phone]});
                        input.value = '';
                        // Explicitly trigger update for the state change
                        setTimeout(() => handleUpdate(), 0);
                    }
                }}
            >
                Adicionar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.adminPhones?.map((phone, index) => (
                <div key={index} className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full text-xs text-slate-700">
                    {phone}
                    <button 
                        onClick={() => {
                            setFormData({...formData, adminPhones: formData.adminPhones?.filter((_, i) => i !== index)});
                            setTimeout(() => handleUpdate(), 0);
                        }}
                        className="text-slate-400 hover:text-red-500"
                    >
                        &times;
                    </button>
                </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 italic px-1">Números que receberão avisos sobre novos pedidos de oração e visitas.</p>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="space-y-0.5">
            <span className="text-sm font-bold text-slate-700">Status Geral</span>
            <p className="text-[10px] text-slate-400 uppercase font-bold">Ativar serviço de avisos</p>
          </div>
          <button 
            onClick={() => {
              const newVal = !formData.isEnabled;
              setFormData({...formData, isEnabled: newVal});
              onUpdate({...formData, isEnabled: newVal});
            }}
            className={cn("w-12 h-6 rounded-full transition-colors relative", formData.isEnabled ? "bg-emerald-500" : "bg-slate-200")}
          >
            <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm", formData.isEnabled ? "right-1" : "left-1")} />
          </button>
        </div>

        <Button 
          variant="outline" 
          className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
          onClick={() => {
            if (!formData.destinationPhone) {
              showMessage('Informe o número do administrador para testar.');
              return;
            }
            if (statusData.status !== 'READY') {
              showMessage('WhatsApp não está conectado.');
              return;
            }
            api.request('/whatsapp/test', { method: 'POST' });
            showMessage('Mensagem de teste enviada para todos os administradores!');
          }}
        >
          Enviar Mensagem de Teste
        </Button>
      </div>
    </div>
  );
};

const ProfileScreen = ({ onLogout, user, onUpdateProfile, stats, prayers, pastoralVisits, whatsappConfig, onUpdateWhatsApp, isAdmin, onSwitchToAdmin, onSwitchToMember, showMessage, onOpenNotifications }: { onLogout: () => void, user: UserType | null, onUpdateProfile: (data: Partial<UserType>) => Promise<void>, stats: { cells: number, prayers: number }, prayers?: PrayerRequest[], pastoralVisits?: PastoralVisit[], whatsappConfig?: WhatsAppConfig, onUpdateWhatsApp?: (data: WhatsAppConfig) => void, isAdmin?: boolean, onSwitchToAdmin?: () => void, onSwitchToMember?: () => void, showMessage: (msg: string) => void, onOpenNotifications?: () => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    birthDate: user?.birthDate || '',
    phone: user?.phone || '',
    avatar: user?.avatar || ''
  });
  const [showMyPrayers, setShowMyPrayers] = useState(false);
  const [showMyVisits, setShowMyVisits] = useState(false);

  const handleUpdate = async () => {
    try {
      await onUpdateProfile(form);
      setIsEditing(false);
      showMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      showMessage('Erro ao atualizar perfil.');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        setForm(prev => ({ ...prev, avatar: base64 }));
        try {
          await onUpdateProfile({ avatar: base64 });
          showMessage('Foto de perfil atualizada!');
        } catch (err) {
          showMessage('Erro ao salvar foto.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        birthDate: user.birthDate || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  if (showMyPrayers) {
    const myPrayers = prayers?.filter(p => p.uid === user?.id) || [];
    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setShowMyPrayers(false)} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Minhas Orações</h2>
        </header>

        <div className="space-y-4">
          {myPrayers.length > 0 ? (
            myPrayers.map(prayer => (
              <Card key={prayer.id} className="space-y-2 relative">
                {prayer.privacy === 'private' && (
                  <span className="absolute top-4 right-4 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase">Privado</span>
                )}
                <p className="text-slate-700 text-sm leading-relaxed">{prayer.content}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400">{prayer.date}</span>
                  <div className="flex items-center gap-1 text-primary">
                    <Heart className="w-3 h-3 fill-current" />
                    <span className="text-[10px] font-bold">{prayer.likes}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Heart className="w-8 h-8" />
              </div>
              <p className="text-slate-500">Você ainda não postou nenhum pedido.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showMyVisits) {
    const myVisits = pastoralVisits?.filter(v => v.uid === user?.id) || [];
    const getStatusColor = (status: PastoralVisit['status']) => {
      switch (status) {
        case 'pending': return 'bg-amber-50 text-amber-600';
        case 'scheduled': return 'bg-blue-50 text-blue-600';
        case 'completed': return 'bg-emerald-50 text-emerald-600';
        case 'cancelled': return 'bg-red-50 text-red-600';
        default: return 'bg-slate-50 text-slate-600';
      }
    };

    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setShowMyVisits(false)} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Minhas Visitas</h2>
        </header>

        <div className="space-y-4">
          {myVisits.length > 0 ? (
            myVisits.map(visit => (
              <Card key={visit.id} className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">{new Date(visit.createdAt).toLocaleDateString('pt-BR')}</span>
                  <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", getStatusColor(visit.status))}>
                    {visit.status === 'pending' ? 'Pendente' : 
                     visit.status === 'scheduled' ? 'Agendada' :
                     visit.status === 'completed' ? 'Concluída' : 'Cancelada'}
                  </span>
                </div>
                <p className="text-slate-700 font-medium">{visit.reason}</p>
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Calendar className="w-4 h-4" />
                  Sugerido para: {new Date(visit.preferredDate).toLocaleDateString('pt-BR')}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Heart className="w-8 h-8" />
              </div>
              <p className="text-slate-500">Você ainda não solicitou nenhuma visita.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showWhatsAppConfig && user?.role === 'superadmin') {
    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center gap-4">
          <button onClick={() => setShowWhatsAppConfig(false)} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Gestão WhatsApp</h2>
        </header>

        {whatsappConfig && onUpdateWhatsApp && (
          <WhatsAppAdminConfig 
            config={whatsappConfig} 
            onUpdate={onUpdateWhatsApp} 
            showMessage={showMessage} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <header className="text-center pt-8 space-y-4">
        <div className="relative inline-block">
          <img src={form.avatar || user?.avatar || 'https://picsum.photos/seed/user/100/100'} className="w-32 h-32 rounded-full border-4 border-white shadow-xl mx-auto object-cover" alt="Profile" />
          <label className="absolute bottom-1 right-1 p-2 bg-primary text-white rounded-full shadow-lg border-2 border-white cursor-pointer">
            <Settings className="w-5 h-5" />
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>
        <div className="space-y-1">
          {isEditing ? (
            <div className="flex flex-col items-center gap-3 max-w-[240px] mx-auto">
              <div className="w-full space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase text-left block">Nome Completo</label>
                <input 
                  type="text" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  className="w-full text-center text-lg font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="w-full space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase text-left block">Data de Nascimento</label>
                <input 
                  type="date" 
                  value={form.birthDate} 
                  onChange={(e) => setForm({...form, birthDate: e.target.value})}
                  className="w-full text-center text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="w-full space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase text-left block">WhatsApp / Telefone</label>
                <input 
                  type="tel" 
                  value={form.phone} 
                  onChange={(e) => setForm({...form, phone: e.target.value})}
                  placeholder="Ex: 5511999999999"
                  className="w-full text-center text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2 w-full">
                <button onClick={handleUpdate} className="flex-1 text-sm font-bold text-white px-4 py-2 bg-primary rounded-xl shadow-sm">Salvar</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 text-sm font-bold text-slate-400 px-4 py-2 bg-slate-50 rounded-xl">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{user?.name || 'Membro'}</h2>
              <button onClick={() => setIsEditing(true)} className="p-1 text-slate-300 hover:text-primary transition-colors">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-slate-500">{user?.email || ''}</p>
          <span className={cn(
            "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2",
            user?.role === 'superadmin' ? "bg-purple-50 text-purple-600" :
            user?.role === 'admin' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
          )}>
            {user?.role || 'Membro'}
          </span>
        </div>
        <div className="flex justify-center gap-4">
          <div className="text-center px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xl font-bold text-primary">{stats.cells}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">PGs</p>
          </div>
          <div className="text-center px-6 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-xl font-bold text-primary">{stats.prayers}</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Orações</p>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        {[
          isAdmin && onSwitchToAdmin && { icon: LayoutDashboard, label: 'Painel de Gerenciamento', action: onSwitchToAdmin },
          isAdmin && onSwitchToMember && { icon: Eye, label: 'Ver como Membro', action: onSwitchToMember },
          { icon: User, label: 'Dados Pessoais', action: () => setIsEditing(true) },
          { icon: Bell, label: 'Notificações', action: onOpenNotifications },
          user?.role === 'superadmin' && { icon: MessageSquare, label: 'Configurar WhatsApp', action: () => setShowWhatsAppConfig(true) },
          { icon: Heart, label: 'Meus Pedidos de Oração', action: () => setShowMyPrayers(true) },
          { icon: Heart, label: 'Minhas Solicitações de Visita', action: () => setShowMyVisits(true) },
          { icon: Settings, label: 'Privacidade', action: () => showMessage?.('Configurações de privacidade em breve') },
        ].filter(Boolean).map((item: any, i) => (
          <button key={i} onClick={item.action} className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:bg-slate-50 transition-all group">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
              <item.icon className="w-5 h-5" />
            </div>
            <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{item.label}</span>
            <ChevronRight className="ml-auto w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
          </button>
        ))}
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-4 bg-red-50 rounded-2xl border border-red-100 shadow-sm hover:bg-red-100 transition-all text-red-500 group mt-4"
        >
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-bold">Sair do Aplicativo</span>
        </button>
      </div>
    </div>
  );
};

const MembersScreen = ({ users, cells, currentUserRole, onUpdateRole, showMessage }: { users: UserType[], cells: CellGroup[], currentUserRole: UserRole, onUpdateRole?: (userId: string, newRole: UserRole, leaderOf?: string) => void, showMessage?: (msg: string) => void }) => {
  const filteredUsers = users.filter(user => {
    // Superadmins are only visible to other superadmins
    if (user.role === 'superadmin') {
      return currentUserRole === 'superadmin';
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Membros</h2>
        <button onClick={() => showMessage?.('Funcionalidade em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <Search className="w-5 h-5 text-slate-600" />
        </button>
      </header>

      <div className="space-y-4">
        {filteredUsers.map(user => (
          <Card key={user.id} className="flex items-center gap-4 p-3">
            <img src={user.avatar || `https://picsum.photos/seed/${user.id}/100/100`} className="w-12 h-12 rounded-full object-cover" alt={user.name} />
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">{user.name}</h4>
              <p className="text-xs text-slate-500">{user.email}</p>
              {user.role === 'leader' && user.leaderOf && (
                <p className="text-[10px] text-primary font-bold uppercase mt-1">
                  Líder: {cells.find(c => c.id === user.leaderOf)?.name || 'PG não encontrado'}
                </p>
              )}
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className={cn(
                "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                user.role === 'superadmin' ? "bg-purple-50 text-purple-600" :
                user.role === 'admin' ? "bg-amber-50 text-amber-600" : 
                user.role === 'leader' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
              )}>
                {user.role === 'leader' ? 'Líder de PG' : user.role}
              </span>
              {(currentUserRole === 'superadmin' || currentUserRole === 'admin') && user.role !== 'superadmin' && (
                <div className="flex flex-col gap-1">
                  <select 
                    className="text-[10px] bg-slate-50 border border-slate-200 rounded p-1"
                    value={user.role}
                    onChange={(e) => onUpdateRole?.(user.id, e.target.value as UserRole, user.leaderOf)}
                  >
                    <option value="member">Membro</option>
                    <option value="leader">Líder de PG</option>
                    <option value="admin">Admin</option>
                    {currentUserRole === 'superadmin' && <option value="superadmin">Super Admin</option>}
                  </select>
                  {user.role === 'leader' && (
                    <select
                      className="text-[10px] bg-slate-50 border border-slate-200 rounded p-1"
                      value={user.leaderOf || ''}
                      onChange={(e) => onUpdateRole?.(user.id, 'leader', e.target.value)}
                    >
                      <option value="">Selecionar PG...</option>
                      {cells.map(cell => (
                        <option key={cell.id} value={cell.id}>{cell.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const GroupsScreen = ({ cells, users, isAdmin, currentUser, onAdd, onDelete, onEdit, onJoin, onLeave, onAttendance, attendanceHistory, onShowRecordDetail, showMessage }: { cells: CellGroup[], users: UserType[], isAdmin?: boolean, currentUser?: UserType | null, onAdd?: () => void, onDelete?: (id: string) => void, onEdit?: (c: CellGroup) => void, onJoin?: (id: string) => void, onLeave?: (id: string) => void, onAttendance?: (cell: CellGroup) => void, attendanceHistory?: Attendance[], onShowRecordDetail?: (record: Attendance) => void, showMessage?: (msg: string) => void }) => {
  const [showHistory, setShowHistory] = useState<string | null>(null);

  const isLeaderOf = (cellId: string) => (currentUser?.role === 'leader' || currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && currentUser?.leaderOf === cellId;
  const canSeeAttendance = (cellId: string) => isAdmin || isLeaderOf(cellId);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">PGs</h2>
        <div className="flex gap-2">
          <button onClick={() => showMessage?.('Funcionalidade em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
            <Search className="w-5 h-5 text-slate-600" />
          </button>
          {isAdmin && (
            <Button className="rounded-xl w-10 h-10 p-0" onClick={onAdd}>
              <Plus className="w-6 h-6" />
            </Button>
          )}
        </div>
      </header>

      <div className="space-y-4">
        {cells.map(cell => (
          <Card key={cell.id} className="space-y-3 relative group">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-lg text-slate-900">{cell.name}</h4>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-primary-light text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">{cell.members} Membros</span>
                {isAdmin && (
                  <div className="flex gap-1">
                    <button 
                      onClick={() => onEdit?.(cell)}
                      className="p-1 text-slate-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete?.(cell.id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-slate-500 text-sm gap-2">
                <User className="w-4 h-4" />
                Líder: {cell.leader}
              </div>
              <div className="flex items-center text-slate-500 text-sm gap-2">
                <Calendar className="w-4 h-4" />
                {cell.day} às {cell.time}
              </div>
              <div className="flex items-center text-slate-500 text-sm gap-2">
                <MapPin className="w-4 h-4" />
                {cell.location}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              {canSeeAttendance(cell.id) && (
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2"
                    onClick={() => onAttendance?.(cell)}
                  >
                    <CheckSquare className="w-4 h-4" />
                    Chamada
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex items-center justify-center gap-2"
                    onClick={() => setShowHistory(showHistory === cell.id ? null : cell.id)}
                  >
                    <History className="w-4 h-4" />
                    Histórico
                  </Button>
                </div>
              )}

              {showHistory === cell.id && (
                <div className="mt-4 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-top-2">
                  <h5 className="font-bold text-sm text-slate-700 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Histórico de Presença
                  </h5>
                  {attendanceHistory?.filter(a => a.cellId === cell.id).length ? (
                    <div className="space-y-2">
                      {attendanceHistory.filter(a => a.cellId === cell.id).map(record => (
                        <button 
                          key={record.id} 
                          onClick={() => onShowRecordDetail?.(record)}
                          className="w-full text-left bg-white p-3 rounded-lg border border-slate-100 hover:border-primary transition-all text-xs space-y-2 group"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 flex items-center gap-2">
                              {record.date}
                              <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-primary transition-colors" />
                            </span>
                            <div className="flex gap-2 text-[10px]">
                              <span className="text-emerald-600 font-bold">{record.presentMembers.length} presentes</span>
                              {record.visitorsCount ? <span className="text-blue-500 font-bold">+{record.visitorsCount} vist.</span> : null}
                            </div>
                          </div>
                          {record.notes && <p className="text-slate-500 italic truncate italic">"{record.notes}"</p>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhuma chamada registrada.</p>
                  )}
                </div>
              )}

              {!isAdmin && (
                cell.membersList?.includes(currentUser?.id || '') ? (
                  <Button 
                    variant="outline" 
                    className="w-full text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => onLeave?.(cell.id)}
                  >
                    Sair do PG
                  </Button>
                ) : (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onJoin?.(cell.id)}
                  >
                    Quero Participar
                  </Button>
                )
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

const AttendanceForm = ({ cell, users, onSubmit, onCancel }: { cell: CellGroup, users: UserType[], onSubmit: (attendance: Omit<Attendance, 'id' | 'createdAt'>) => void, onCancel: () => void }) => {
  const [presentMembers, setPresentMembers] = useState<string[]>([]);
  const [visitorsCount, setVisitorsCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const cellMembers = users.filter(u => cell.membersList?.includes(u.id));

  const toggleMember = (uid: string) => {
    setPresentMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const absentMembers = cellMembers.filter(m => !presentMembers.includes(m.id)).map(m => m.id);
    onSubmit({
      cellId: cell.id,
      date,
      presentMembers,
      absentMembers,
      visitorsCount,
      notes
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-xl font-bold text-slate-900">Chamada: {cell.name}</h3>
        <p className="text-sm text-slate-500">Marque os membros presentes hoje</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Data</label>
          <input 
            type="date" 
            required
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Visitantes</label>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-700">Quantidade de Visitantes</p>
              <p className="text-xs text-slate-500 text-slate-500">Pessoas que não são membros ainda</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => setVisitorsCount(Math.max(0, visitorsCount - 1))}
                className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
              >
                -
              </button>
              <span className="font-bold text-lg w-8 text-center">{visitorsCount}</span>
              <button 
                type="button"
                onClick={() => setVisitorsCount(visitorsCount + 1)}
                className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase">Membros ({presentMembers.length}/{cellMembers.length})</label>
          <div className="grid gap-2">
            {cellMembers.length > 0 ? cellMembers.map(member => (
              <button
                key={member.id}
                type="button"
                onClick={() => toggleMember(member.id)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  presentMembers.includes(member.id)
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700"
                    : "bg-white border-slate-100 text-slate-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <img src={member.avatar || `https://picsum.photos/seed/${member.id}/100/100`} className="w-8 h-8 rounded-full" alt="" />
                  <span className="font-bold text-sm">{member.name}</span>
                </div>
                {presentMembers.includes(member.id) ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
                )}
              </button>
            )) : (
              <p className="text-center py-4 text-slate-400 text-sm italic">Nenhum membro vinculado a este PG.</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Observações</label>
          <textarea 
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[100px]"
            placeholder="Alguma observação sobre o encontro?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-4 sticky bottom-0 bg-white/80 backdrop-blur-md pb-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="flex-1">Salvar Chamada</Button>
        </div>
      </form>
    </div>
  );
};

const PastoralVisitForm = ({ user, onSubmit, onCancel }: { user: UserType | null, onSubmit: (visit: Omit<PastoralVisit, 'id' | 'createdAt'>) => void, onCancel: () => void }) => {
  const [reason, setReason] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    onSubmit({
      uid: user.id || '',
      userName: user.name || '',
      userAddress: user.address || '',
      userPhone: phone,
      reason,
      preferredDate,
      status: 'pending'
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-xl font-bold text-slate-900">Solicitar Visita Pastoral</h3>
        <p className="text-sm text-slate-500">Preencha os dados abaixo para agendar</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto max-h-[70vh] px-1">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Motivo da Visita</label>
          <textarea 
            required
            rows={3}
            placeholder="Ex: Aconselhamento, oração por enfermidade, etc."
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Data Sugerida</label>
          <input 
            type="date" 
            required
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Telefone para Contato</label>
          <input 
            type="tel" 
            placeholder="(00) 00000-0000"
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-xs text-blue-700 leading-relaxed">
          <p><strong>Atenção:</strong> A visita será realizada no endereço cadastrado no seu perfil: <span className="font-bold underline">{user?.address || 'Endereço não informado'}</span></p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" className="flex-1">Enviar Solicitação</Button>
        </div>
      </form>
    </div>
  );
};

const SermonsScreen = ({ sermons }: { sermons: Sermon[] }) => {
  const [selectedSermon, setSelectedSermon] = useState<Sermon | null>(null);

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSermonClick = (sermon: Sermon) => {
    setSelectedSermon(sermon);
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Sermões</h2>
        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-400">
          <Mic className="w-5 h-5" />
        </div>
      </header>

      <div className="space-y-4">
        {sermons.length > 0 ? sermons.map(sermon => (
          <Card 
            key={sermon.id} 
            onClick={() => handleSermonClick(sermon)}
            className="p-0 overflow-hidden border-slate-100 hover:border-primary/20 transition-all cursor-pointer group"
          >
            <div className="relative aspect-video bg-slate-200">
              {sermon.thumbnail ? (
                <img src={sermon.thumbnail} className="w-full h-full object-cover" alt={sermon.title} referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Play className="w-12 h-12" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                 <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white scale-90 group-hover:scale-100 transition-transform">
                  <Play className="w-6 h-6 fill-current" />
                </div>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">{sermon.preacher}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{sermon.date}</span>
              </div>
              <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors">{sermon.title}</h4>
              <p className="text-xs text-slate-500 line-clamp-2">{sermon.description}</p>
              <div className="flex gap-4 pt-2">
                {sermon.videoUrl && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Video className="w-3 h-3" /> Vídeo disponível
                  </span>
                )}
                {sermon.audioUrl && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <Music className="w-3 h-3" /> Áudio disponível
                  </span>
                )}
                {sermon.pdfUrl && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    <FileText className="w-3 h-3" /> PDF disponível
                  </span>
                )}
              </div>
            </div>
          </Card>
        )) : (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Mic className="w-8 h-8" />
            </div>
            <p className="text-slate-500 italic">Nenhum sermão disponível ainda.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedSermon && (
          <Modal title={selectedSermon.title} onClose={() => setSelectedSermon(null)}>
            <div className="space-y-6">
              <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-lg">
                {selectedSermon.videoUrl && getYouTubeId(selectedSermon.videoUrl) ? (
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${getYouTubeId(selectedSermon.videoUrl)}`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  ></iframe>
                ) : selectedSermon.thumbnail ? (
                  <img src={selectedSermon.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Play className="w-16 h-16" />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">{selectedSermon.preacher}</h3>
                    <p className="text-xs text-slate-500">{selectedSermon.date}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedSermon.videoUrl && (
                      <a 
                        href={selectedSermon.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
                      >
                        <Video className="w-5 h-5" />
                      </a>
                    )}
                    {selectedSermon.audioUrl && (
                      <a 
                        href={selectedSermon.audioUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform"
                      >
                        <Music className="w-5 h-5" />
                      </a>
                    )}
                    {selectedSermon.pdfUrl && (
                      <a 
                        href={selectedSermon.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 hover:scale-105 transition-transform"
                        title="Baixar PDF de Estudo"
                      >
                        <FileText className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {selectedSermon.description}
                  </p>
                </div>

                <Button variant="outline" className="w-full py-4 rounded-2xl" onClick={() => setSelectedSermon(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminSermonsScreen = ({ sermons, onAdd, onDelete }: { sermons: Sermon[], onAdd: (data: any) => void, onDelete: (id: string) => void }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    preacher: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    videoUrl: '',
    audioUrl: '',
    pdfUrl: '',
    thumbnail: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setShowAdd(false);
    setFormData({ title: '', preacher: '', date: new Date().toISOString().split('T')[0], description: '', videoUrl: '', audioUrl: '', pdfUrl: '', thumbnail: '' });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Gerenciar Sermões</h2>
        <Button onClick={() => setShowAdd(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </header>

      {showAdd && (
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-lg">Novo Sermão</h3>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Título</label>
                <input required className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Pregador</label>
                <input required className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm" value={formData.preacher} onChange={e => setFormData({...formData, preacher: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data</label>
                <input type="date" required className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Thumbnail URL</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm" value={formData.thumbnail} onChange={e => setFormData({...formData, thumbnail: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição</label>
              <textarea required className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm min-h-[80px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">URL do Vídeo</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm" value={formData.videoUrl} onChange={e => setFormData({...formData, videoUrl: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">URL do Áudio</label>
                <input className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm" value={formData.audioUrl} onChange={e => setFormData({...formData, audioUrl: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">URL do PDF (Material de Estudo)</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl border-none text-sm" value={formData.pdfUrl} onChange={e => setFormData({...formData, pdfUrl: e.target.value})} />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button type="submit">Salvar Sermão</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {sermons.map(sermon => (
          <Card key={sermon.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                {sermon.thumbnail ? <img src={sermon.thumbnail} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" /> : <Mic className="w-6 h-6 text-slate-300" />}
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{sermon.title}</h4>
                <p className="text-xs text-slate-500">{sermon.preacher} • {sermon.date}</p>
              </div>
            </div>
            <button onClick={() => window.confirm('Excluir sermão?') && onDelete(sermon.id)} className="p-2 text-slate-300 hover:text-red-500">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
};

const MediaScreen = ({ showMessage }: { showMessage: (msg: string) => void }) => (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-900">Conteúdo Digital</h2>
      <button onClick={() => showMessage('Funcionalidade em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
        <Search className="w-5 h-5 text-slate-600" />
      </button>
    </header>

    <div className="grid grid-cols-2 gap-4">
      {[
        { title: 'Cultos Gravados', icon: Play, count: 124 },
        { title: 'Podcasts', icon: MessageSquare, count: 42 },
        { title: 'E-books', icon: BookOpen, count: 15 },
        { title: 'Músicas', icon: Play, count: 88 },
      ].map((item, i) => (
        <Card key={i} onClick={() => showMessage('Funcionalidade em desenvolvimento')} className="flex flex-col items-center justify-center p-6 gap-2 hover:border-primary transition-colors cursor-pointer">
          <div className="w-12 h-12 bg-primary-light rounded-2xl flex items-center justify-center text-primary">
            <item.icon className="w-6 h-6" />
          </div>
          <span className="font-bold text-slate-900 text-center">{item.title}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{item.count} Itens</span>
        </Card>
      ))}
    </div>

    <section className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Últimos Vídeos</h3>
      <div className="space-y-4">
        {[1, 2].map(i => (
          <Card key={i} onClick={() => showMessage('Funcionalidade em desenvolvimento')} className="p-0 overflow-hidden relative group cursor-pointer">
            <img src={`https://picsum.photos/seed/video${i}/400/200`} className="w-full h-48 object-cover" alt="Video" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                <Play className="w-8 h-8 fill-current" />
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-bold text-slate-900">Culto de Celebração - {i === 1 ? 'Manhã' : 'Noite'}</h4>
              <p className="text-xs text-slate-500">Publicado há {i * 2} dias</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  </div>
);

// --- Main App ---

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [currentUserData, setCurrentUserData] = useState<UserType | null>(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [loading, setLoading] = useState(true);

  // Dynamic State
  const [events, setEvents] = useState<Event[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [cells, setCells] = useState<CellGroup[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [verseHighlights, setVerseHighlights] = useState<VerseHighlight[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [pastoralVisits, setPastoralVisits] = useState<PastoralVisit[]>([]);
  const [userReadingProgress, setUserReadingProgress] = useState<Record<string, string[]>>({});
  const [allUserProgress, setAllUserProgress] = useState<Record<string, Record<string, string[]>>>({});
  const [titheConfig, setTitheConfig] = useState<TitheConfig>({ pixKey: '', bankName: '', accountHolder: '' });
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppConfig>({ phoneNumberId: '', isEnabled: false });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddCell, setShowAddCell] = useState(false);
  const [showAddPrayer, setShowAddPrayer] = useState(false);
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [showAddReadingPlan, setShowAddReadingPlan] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const [selectedAttendanceCell, setSelectedAttendanceCell] = useState<CellGroup | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingCell, setEditingCell] = useState<CellGroup | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [showAddPastoralVisit, setShowAddPastoralVisit] = useState(false);

  const showMessage = (msg: string) => {
    setGlobalMessage(msg);
    setTimeout(() => setGlobalMessage(null), 3000);
  };

  useEffect(() => {
    setGlobalErrorRef = setGlobalError;
    setGlobalSuccessRef = setGlobalMessage;
  }, []);

  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const sermonsRef = useRef<Sermon[]>([]);
  const totalBalance = transactions.reduce((acc, t) => t.type === 'in' ? acc + t.value : acc - t.value, 0);

  // Function to request notification permissions and show a sample
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      showMessage('Este navegador não suporta notificações.');
      return false;
    }
    
    if (Notification.permission === "granted") return true;
    
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("Igreja Renovar", {
        body: "Notificações ativadas com sucesso!",
        icon: "/favicon.ico"
      });
      return true;
    }
    return false;
  };

  const showWebNotification = (title: string, body: string) => {
    if (Notification.permission === "granted" && !currentUserData?.notificationSettings?.allMuted) {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  const notifyViaWhatsApp = async (to: string, message: string) => {
    if (!whatsappConfig.isEnabled || !whatsappConfig.phoneNumberId) return;
    try {
      await api.sendWhatsApp(to, message);
    } catch (err) {
      console.error("Failed to send WhatsApp notification:", err);
    }
  };

  // Logic for New Sermon Notification
  useEffect(() => {
    if (sermons.length > sermonsRef.current.length && sermonsRef.current.length > 0) {
      const newSermon = sermons[0]; // Assuming sorted by date descending
      if (currentUserData?.notificationSettings?.newSermonEnabled && !currentUserData?.notificationSettings?.allMuted) {
        showWebNotification("Novo Sermão Disponível!", `${newSermon.title} - por ${newSermon.preacher}`);
      }
    }
    sermonsRef.current = sermons;
  }, [sermons, currentUserData]);

  // Logic for Word of the Day Notification (Local Check)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentUserData?.notificationSettings?.wordOfDayEnabled || currentUserData?.notificationSettings?.allMuted) return;

      const now = new Date();
      const currentDayStr = now.toISOString().split('T')[0];
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const lastNotified = localStorage.getItem('last_word_notification_day');
      
      if (currentTimeStr === currentUserData.notificationSettings.wordOfDayTime && lastNotified !== currentDayStr) {
        const dailyVerse = DAILY_VERSES[now.getDate() % DAILY_VERSES.length];
        showWebNotification("Palavra do Dia", `"${dailyVerse.text}" - ${dailyVerse.ref}`);
        localStorage.setItem('last_word_notification_day', currentDayStr);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [currentUserData]);

  useEffect(() => {
    // Session restoration - only run once
    try {
      const savedUser = localStorage.getItem('auth_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        if (user && user.id) {
          setCurrentUserData(user);
          setIsLoggedIn(true);
          setUserRole(user.role);
        }
      }
    } catch (e) {
      console.error("Failed to restore session:", e);
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setEvents([]);
      setPrayers([]);
      setCells([]);
      setTransactions([]);
      setUsers([]);
      setAnnouncements([]);
      setReadingPlans([]);
      setSermons([]);
      setVerseHighlights([]);
      setPastoralVisits([]);
      return;
    }

    // Dynamic polling based on roles
    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(api.subscribe('events', setEvents, 2000));
    unsubscribes.push(api.subscribe('prayers', (data) => {
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPrayers(data);
    }, 2000));
    unsubscribes.push(api.subscribe('cells', setCells, 2000));
    unsubscribes.push(api.subscribe('users', setUsers, 2000));
    unsubscribes.push(api.subscribe('announcements', setAnnouncements, 2000));
    unsubscribes.push(api.subscribe('readingPlans', setReadingPlans, 2000));
    unsubscribes.push(api.subscribe('sermons', setSermons, 2000));
    unsubscribes.push(api.subscribe('verseHighlights', (data) => {
      setVerseHighlights(data.filter((h: any) => h.uid === currentUserData?.id));
    }, 2000));
    unsubscribes.push(api.subscribe('attendance', setAttendanceHistory, 2000));
    unsubscribes.push(api.subscribe('pastoralVisits', setPastoralVisits, 2000));
    unsubscribes.push(api.subscribe('config', (data) => {
      const tConfig = data.find((c: any) => c.id === 'tithes');
      if (tConfig) setTitheConfig(tConfig);
      
      const wConfig = data.find((c: any) => c.id === 'whatsapp');
      if (wConfig) setWhatsappConfig(wConfig);
    }, 2000));

    if (userRole === 'admin' || userRole === 'superadmin') {
      unsubscribes.push(api.subscribe('transactions', setTransactions, 2000));
    }

    return () => unsubscribes.forEach(unsub => unsub());
  }, [isLoggedIn, userRole, currentUserData?.id]);

  const deleteReadingPlan = async (id: string) => {
    try {
      await api.delete('readingPlans', id);
      showMessage('Plano excluído com sucesso!');
    } catch (err) {
      handleApiError(err, 'deleteReadingPlan');
    }
  };

  const toggleVerseHighlight = async (book: string, chapter: number, verse: number, text: string, color: string) => {
    if (!currentUserData) return;
    
    const existing = verseHighlights.find(h => h.book === book && h.chapter === chapter && h.verse === verse);
    
    // Optimistic update
    let newHighlights;
    if (existing) {
      if (existing.color === color) {
        newHighlights = verseHighlights.filter(h => h.id !== existing.id);
      } else {
        newHighlights = verseHighlights.map(h => h.id === existing.id ? { ...h, color } : h);
      }
    } else {
      const tempHighlight = {
        id: 'temp-' + Date.now(),
        uid: currentUserData.id,
        book,
        chapter,
        verse,
        text,
        color
      };
      newHighlights = [...verseHighlights, tempHighlight];
    }
    setVerseHighlights(newHighlights);

    try {
      if (existing) {
        if (existing.color === color) {
          await api.delete('verseHighlights', existing.id);
        } else {
          await api.update('verseHighlights', existing.id, { color });
        }
      } else {
        await api.create('verseHighlights', {
          uid: currentUserData.id,
          book,
          chapter,
          verse,
          text,
          color
        });
      }
      handleApiSuccess('Destaque atualizado!');
    } catch (err) {
      // Revert on error
      const highlights = await api.list('verseHighlights');
      setVerseHighlights(highlights.filter((h: any) => h.uid === currentUserData.id));
      handleApiError(err, 'toggleVerseHighlight');
    }
  };

  const updateUserProfile = async (data: Partial<UserType>) => {
    if (!currentUserData) return;
    const originalUser = { ...currentUserData };
    const updatedUser = { ...currentUserData, ...data };
    
    setCurrentUserData(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    
    try {
      await api.update('users', currentUserData.id, data);
      handleApiSuccess('Perfil atualizado!');
    } catch (err) {
      setCurrentUserData(originalUser);
      setUsers(prev => prev.map(u => u.id === originalUser.id ? originalUser : u));
      handleApiError(err, 'updateUserProfile');
    }
  };

  const addAnnouncement = async (data: Omit<Announcement, 'id' | 'date' | 'author'>) => {
    const tempAnnouncement = {
      ...data,
      id: 'temp-' + Date.now(),
      date: new Date().toLocaleDateString('pt-BR'),
      author: currentUserData?.name || 'Admin'
    };
    setAnnouncements(prev => [tempAnnouncement, ...prev]);
    
    try {
      await api.create('announcements', {
        ...data,
        date: new Date().toISOString(),
        author: currentUserData?.name || 'Admin'
      });
      setShowAddAnnouncement(false);
      handleApiSuccess('Aviso criado com sucesso!');
    } catch (err) {
      setAnnouncements(prev => prev.filter(a => a.id !== tempAnnouncement.id));
      handleApiError(err, 'addAnnouncement');
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const original = [...announcements];
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    try {
      await api.delete('announcements', id);
      handleApiSuccess('Aviso removido com sucesso!');
    } catch (err) {
      setAnnouncements(original);
      handleApiError(err, 'deleteAnnouncement');
    }
  };

  const addReadingPlan = async (data: Omit<ReadingPlan, 'id'>) => {
    const tempPlan = { ...data, id: 'temp-' + Date.now() } as ReadingPlan;
    setReadingPlans(prev => [...prev, tempPlan]);
    try {
      await api.create('readingPlans', data);
      setShowAddReadingPlan(false);
      handleApiSuccess('Plano de leitura criado com sucesso!');
    } catch (err) {
      setReadingPlans(prev => prev.filter(p => p.id !== tempPlan.id));
      handleApiError(err, 'addReadingPlan');
    }
  };

  const addSermon = async (data: Omit<Sermon, 'id' | 'createdAt'>) => {
    const tempSermon = { ...data, id: 'temp-' + Date.now(), createdAt: new Date().toISOString() } as Sermon;
    setSermons(prev => [tempSermon, ...prev]);
    try {
      await api.create('sermons', {
        ...data,
      });
      handleApiSuccess('Sermão adicionado com sucesso!');

      // WhatsApp Notification (to all users with phone)
      if (whatsappConfig.isEnabled) {
        users.forEach(u => {
          if (u.phone && u.notificationSettings?.newSermonEnabled) {
            notifyViaWhatsApp(
              u.phone,
              `✨ *Novo Sermão Disponível!*\n\n"${data.title}"\nPregador: ${data.preacher}\nAssista agora no App da Igreja Renovando Vidas!`
            );
          }
        });
      }
    } catch (err) {
      setSermons(prev => prev.filter(s => s.id !== tempSermon.id));
      handleApiError(err, 'addSermon');
    }
  };

  const deleteSermon = async (id: string) => {
    try {
      await api.delete('sermons', id);
      showMessage('Sermão excluído!');
    } catch (err) {
      handleApiError(err, 'deleteSermon');
    }
  };

  const updateTitheConfig = async (data: TitheConfig) => {
    try {
      const config = await api.list('config');
      const tithes = config.find((c: any) => c.id === 'tithes');
      if (tithes) {
        await api.update('config', tithes.id, data);
      } else {
        await api.create('config', { ...data, id: 'tithes' });
      }
      showMessage('Configurações de dízimo atualizadas!');
    } catch (err) {
      handleApiError(err, 'updateTitheConfig');
    }
  };

  const updateWhatsAppConfig = async (data: WhatsAppConfig) => {
    try {
      const configs = await api.list('config');
      const whatsapp = configs.find((c: any) => c.id === 'whatsapp');
      if (whatsapp) {
        await api.update('config', whatsapp.id, data);
      } else {
        await api.create('config', { ...data, id: 'whatsapp' });
      }
      showMessage('Configurações do WhatsApp atualizadas!');
    } catch (err) {
      handleApiError(err, 'updateWhatsAppConfig');
    }
  };

  const handleLogout = async () => {
    try {
      api.logout();
      localStorage.removeItem('auth_user');
      setIsLoggedIn(false);
      setCurrentUserData(null);
      window.location.reload();
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  };

  const addEvent = async (newEvent: Omit<Event, 'id'>) => {
    const original = [...events];
    if (!editingEvent) {
      const tempEvent = { ...newEvent, id: 'temp-' + Date.now() } as Event;
      setEvents(prev => [...prev, tempEvent]);
    }

    try {
      if (editingEvent) {
        await api.update('events', editingEvent.id, newEvent);
        setEditingEvent(null);
        handleApiSuccess('Evento atualizado!');
      } else {
        await api.create('events', {
          ...newEvent,
        });
        handleApiSuccess('Evento criado!');
      }
      setShowAddEvent(false);
    } catch (err) {
      setEvents(original);
      handleApiError(err, 'addEvent');
    }
  };

  const deleteEvent = async (id: string) => {
    const original = [...events];
    setEvents(prev => prev.filter(e => e.id !== id));
    try {
      await api.delete('events', id);
      handleApiSuccess('Evento removido!');
    } catch (err) {
      setEvents(original);
      handleApiError(err, 'deleteEvent');
    }
  };

  const addTransaction = async (t: { label: string, value: number, type: 'in' | 'out' }) => {
    const tempT = {
      ...t,
      id: 'temp-' + Date.now(),
      date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    };
    setTransactions(prev => [tempT, ...prev]);
    try {
      await api.create('transactions', {
        ...t,
        date: new Date().toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      });
      setShowAddTransaction(false);
      handleApiSuccess('Transação registrada!');
    } catch (err) {
      setTransactions(prev => prev.filter(item => item.id !== tempT.id));
      handleApiError(err, 'addTransaction');
    }
  };

  const deleteTransaction = async (id: string) => {
    const original = [...transactions];
    setTransactions(prev => prev.filter(t => t.id !== id));
    try {
      await api.delete('transactions', id);
      handleApiSuccess('Transação removida!');
    } catch (err) {
      setTransactions(original);
      handleApiError(err, 'deleteTransaction');
    }
  };

  const addCell = async (newCell: Omit<CellGroup, 'id'>) => {
    const original = [...cells];
    if (!editingCell) {
      const tempCell = { ...newCell, id: 'temp-' + Date.now() } as CellGroup;
      setCells(prev => [...prev, tempCell]);
    }
    try {
      if (editingCell) {
        await api.update('cells', editingCell.id, newCell);
        setEditingCell(null);
        handleApiSuccess('PG atualizado!');
      } else {
        await api.create('cells', {
          ...newCell,
        });
        handleApiSuccess('PG criado com sucesso!');
      }
      setShowAddCell(false);
    } catch (err) {
      setCells(original);
      handleApiError(err, 'addCell');
    }
  };

  const deleteCell = async (id: string) => {
    const original = [...cells];
    setCells(prev => prev.filter(c => c.id !== id));
    try {
      await api.delete('cells', id);
      handleApiSuccess('PG removido!');
    } catch (err) {
      setCells(original);
      handleApiError(err, 'deleteCell');
    }
  };

  const addPrayer = async (content: string, privacy: 'public' | 'private') => {
    if (!currentUserData) {
      setGlobalError('Você precisa estar logado para publicar um pedido.');
      return;
    }
    
    setLoading(true);
    const tempPrayer: PrayerRequest = {
      id: 'temp-' + Date.now(),
      uid: currentUserData.id,
      user: currentUserData.name || 'Usuário',
      content,
      privacy,
      date: 'Agora',
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setPrayers(prev => [tempPrayer, ...prev]);
    setShowAddPrayer(false);

    try {
      await api.create('prayers', {
        uid: currentUserData.id,
        user: currentUserData.name || 'Usuário',
        content,
        privacy,
        cellIds: currentUserData.cellIds || [],
        date: new Date().toLocaleDateString('pt-BR'),
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString()
      });
      handleApiSuccess('Pedido de oração enviado!');

      // WhatsApp Notification to Admin
      if (whatsappConfig.isEnabled && whatsappConfig.destinationPhone) {
        notifyViaWhatsApp(
          whatsappConfig.destinationPhone,
          `🙏 *Novo Pedido de Oração*\n\n*Membro:* ${currentUserData?.name}\n*Privacidade:* ${privacy}\n*Mensagem:* ${content}`
        );
      }
    } catch (err) {
      // Revert optimistic update
      setPrayers(prev => prev.filter(p => p.id !== tempPrayer.id));
      handleApiError(err, 'addPrayer');
    } finally {
      setLoading(false);
    }
  };

  const deletePrayer = async (id: string) => {
    try {
      await api.delete('prayers', id);
      showMessage('Pedido de oração removido!');
    } catch (err) {
      handleApiError(err, 'deletePrayer');
    }
  };

  const togglePrayed = async (prayerId: string) => {
    if (!currentUserData) return;
    const prayer = prayers.find(p => p.id === prayerId);
    if (!prayer) return;

    const prayedBy = prayer.prayedBy || [];
    const userId = currentUserData.id;
    const isPraying = prayedBy.includes(userId);
    const newPrayedBy = isPraying ? prayedBy.filter(id => id !== userId) : [...prayedBy, userId];

    try {
      await api.update('prayers', prayerId, {
        prayedBy: newPrayedBy,
        likes: isPraying ? Math.max(0, (prayer.likes || 0) - 1) : (prayer.likes || 0) + 1
      });
    } catch (err) {
      handleApiError(err, 'togglePrayed');
    }
  };

  const addComment = async (prayerId: string, content: string) => {
    if (!currentUserData || !content.trim()) return;
    const prayer = prayers.find(p => p.id === prayerId);
    if (!prayer) return;

    const newComment: PrayerComment = {
      id: Math.random().toString(36).substr(2, 9),
      uid: currentUserData.id,
      userName: currentUserData.name || 'Usuário',
      content,
      date: new Date().toLocaleDateString('pt-BR'),
      createdAt: new Date().toISOString()
    };

    try {
      await api.update('prayers', prayerId, {
        commentsList: [...(prayer.commentsList || []), newComment],
        comments: (prayer.comments || 0) + 1
      });
    } catch (err) {
      handleApiError(err, 'addComment');
    }
  };

  useEffect(() => {
    if (!currentUserData) return;

    return api.subscribe('userProgress', (history) => {
      const myProgress = history.find((h: any) => h.id === currentUserData.id);
      if (myProgress) {
        setUserReadingProgress(myProgress.readingPlans || {});
      }
    }, 2000);
  }, [isLoggedIn, currentUserData]);

  const toggleChapter = async (planId: string, chapter: string) => {
    if (!currentUserData) return;
    const currentProgress = userReadingProgress[planId] || [];
    const isAdding = !currentProgress.includes(chapter);
    const newProgress = isAdding
      ? [...currentProgress, chapter]
      : currentProgress.filter(c => c !== chapter);
    
    // Optimistic update
    const newReadingPlans = {
      ...userReadingProgress,
      [planId]: newProgress
    };
    setUserReadingProgress(newReadingPlans);

    try {
      const allProgress = await api.list('userProgress');
      const myProgress = allProgress.find((p: any) => p.id === currentUserData.id);
      
      if (myProgress) {
        await api.update('userProgress', myProgress.id, { readingPlans: newReadingPlans });
      } else {
        await api.create('userProgress', { id: currentUserData.id, readingPlans: newReadingPlans });
      }
      
      handleApiSuccess(isAdding ? 'Capítulo concluído!' : 'Capítulo desmarcado');
    } catch (err) {
      // Revert on error
      const history = await api.list('userProgress');
      const myProgress = history.find((h: any) => h.id === currentUserData.id);
      setUserReadingProgress(myProgress?.readingPlans || {});
      handleApiError(err, 'toggleChapter');
    }
  };

const joinCell = async (cellId: string) => {
    if (!currentUserData) return;
    const originalCells = [...cells];
    const originalUser = { ...currentUserData };
    
    try {
      const cell = cells.find(c => c.id === cellId);
      if (!cell) return;
      
      const updatedCell = {
        ...cell,
        membersList: [...(cell.membersList || []), currentUserData.id],
        members: (cell.members || 0) + 1
      };
      const updatedUser = {
        ...currentUserData,
        cellIds: [...(currentUserData.cellIds || []), cellId]
      };
      
      setCells(prev => prev.map(c => c.id === cellId ? updatedCell : c));
      setCurrentUserData(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

      await api.update('cells', cellId, {
        membersList: updatedCell.membersList,
        members: updatedCell.members
      });
      await api.update('users', currentUserData.id, {
        cellIds: updatedUser.cellIds
      });
      handleApiSuccess('Você agora faz parte deste PG!');
    } catch (err) {
      setCells(originalCells);
      setCurrentUserData(originalUser);
      setUsers(prev => prev.map(u => u.id === originalUser.id ? originalUser : u));
      handleApiError(err, 'joinCell');
    }
  };

  const leaveCell = async (cellId: string) => {
    if (!currentUserData) return;
    const originalCells = [...cells];
    const originalUser = { ...currentUserData };
    
    try {
      const cell = cells.find(c => c.id === cellId);
      if (!cell) return;

      const updatedCell = {
        ...cell,
        membersList: (cell.membersList || []).filter(uid => uid !== currentUserData.id),
        members: Math.max(0, (cell.members || 0) - 1)
      };
      const updatedUser = {
        ...currentUserData,
        cellIds: (currentUserData.cellIds || []).filter(id => id !== cellId)
      };

      setCells(prev => prev.map(c => c.id === cellId ? updatedCell : c));
      setCurrentUserData(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));

      await api.update('cells', cellId, {
        membersList: updatedCell.membersList,
        members: updatedCell.members
      });
      await api.update('users', currentUserData.id, {
        cellIds: updatedUser.cellIds
      });
      handleApiSuccess('Você saiu deste PG.');
    } catch (err) {
      setCells(originalCells);
      setCurrentUserData(originalUser);
      setUsers(prev => prev.map(u => u.id === originalUser.id ? originalUser : u));
      handleApiError(err, 'leaveCell');
    }
  };

  const updateMemberRole = async (userId: string, newRole: UserRole, leaderOf?: string) => {
    try {
      const userToUpdate = users.find(u => u.id === userId);
      if ((newRole === 'admin' || newRole === 'superadmin') && userToUpdate && !userToUpdate.email.endsWith('@igrejarenovar.com')) {
        setGlobalError('Apenas usuários com e-mail @igrejarenovar.com podem ser promovidos a Admin.');
        return;
      }
      await api.update('users', userId, { 
        role: newRole,
        leaderOf: newRole === 'leader' ? (leaderOf || null) : null
      });
      showMessage('Cargo atualizado com sucesso!');
    } catch (err) {
      handleApiError(err, 'updateMemberRole');
    }
  };

  const handleAttendanceSubmit = async (data: Omit<Attendance, 'id' | 'createdAt'>) => {
    try {
      await api.create('attendance', {
        ...data,
      });
      setShowAttendance(false);
      setSelectedAttendanceCell(null);
      showMessage('Chamada salva com sucesso!');
    } catch (err) {
      handleApiError(err, 'handleAttendanceSubmit');
    }
  };

  const handlePastoralVisitSubmit = async (data: Omit<PastoralVisit, 'id' | 'createdAt'>) => {
    const tempVisit = {
      ...data,
      id: 'temp-' + Date.now(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    } as PastoralVisit;
    setPastoralVisits(prev => [tempVisit, ...prev]);

    try {
      await api.create('pastoralVisits', {
        ...data,
        createdAt: new Date().toISOString()
      });
      setShowAddPastoralVisit(false);
      handleApiSuccess('Solicitação de visita enviada com sucesso!');
      
      // WhatsApp Notification to Admin
      if (whatsappConfig.isEnabled && whatsappConfig.destinationPhone) {
        notifyViaWhatsApp(
          whatsappConfig.destinationPhone,
          `📖 *Nova Solicitação de Visita*\n\n*Membro:* ${data.userName}\n*Motivo:* ${data.reason}\n*Data Preferencial:* ${new Date(data.preferredDate).toLocaleDateString('pt-BR')}\n*Telefone:* ${data.userPhone || 'Não informado'}`
        );
      }
    } catch (err) {
      setPastoralVisits(prev => prev.filter(v => v.id !== tempVisit.id));
      handleApiError(err, 'handlePastoralVisitSubmit');
    }
  };

  const updatePastoralVisitStatus = async (id: string, status: PastoralVisit['status']) => {
    const original = [...pastoralVisits];
    setPastoralVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    try {
      await api.update('pastoralVisits', id, { status });
      handleApiSuccess('Status da visita atualizado!');
    } catch (err) {
      setPastoralVisits(original);
      handleApiError(err, 'updatePastoralVisitStatus');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <LoginScreen onAuthSuccess={(u) => {
      setCurrentUserData(u);
      setIsLoggedIn(true);
      setUserRole(u.role);
    }} />;
  }

  const renderContent = () => {
    const isAdmin = userRole === 'admin' || userRole === 'superadmin';
    const isRootAdmin = location.pathname.startsWith('/admin');
    
    if (isAdmin && isRootAdmin) {
      const visibleUsers = users.filter(u => u.role !== 'superadmin' || userRole === 'superadmin');
      const stats = { 
        members: visibleUsers.length, 
        cells: cells.length, 
        events: events.length, 
        balance: totalBalance 
      };

      switch (currentTab) {
        case 'home': return <AdminDashboard stats={stats} users={visibleUsers} onAddEvent={() => setShowAddEvent(true)} onAddAnnouncement={() => setShowAddAnnouncement(true)} onAddReadingPlan={() => setShowAddReadingPlan(true)} onAddTransaction={() => setShowAddTransaction(true)} onSwitchToMember={() => navigate('/')} onTabChange={setCurrentTab} showMessage={showMessage} />;
        case 'all_screens': return <AdminAllScreens onTabChange={setCurrentTab} />;
        case 'financial': return <AdminFinancial transactions={transactions} balance={totalBalance} onAdd={() => setShowAddTransaction(true)} onDelete={deleteTransaction} showMessage={showMessage} />;
        case 'tithes': return <TithesAdminScreen config={titheConfig} onUpdate={updateTitheConfig} showMessage={showMessage} />;
        case 'events': return <EventsScreen events={events} isAdmin onDelete={deleteEvent} onEdit={(e) => { setEditingEvent(e); setShowAddEvent(true); }} showMessage={showMessage} />;
        case 'announcements': return <AnnouncementsScreen announcements={announcements} isAdmin onDelete={deleteAnnouncement} showMessage={showMessage} />;
        case 'groups': return <GroupsScreen cells={cells} users={users} isAdmin currentUser={currentUserData} onAdd={() => setShowAddCell(true)} onDelete={deleteCell} onEdit={(c) => { setEditingCell(c); setShowAddCell(true); }} onLeave={leaveCell} onAttendance={(c) => { setSelectedAttendanceCell(c); setShowAttendance(true); }} attendanceHistory={attendanceHistory} onShowRecordDetail={setSelectedRecord} showMessage={showMessage} />;
        case 'members': return <MembersScreen users={users} cells={cells} currentUserRole={userRole} onUpdateRole={updateMemberRole} showMessage={showMessage} />;
        case 'prayer': return <PrayerWall prayers={prayers} cells={cells} onAdd={() => setShowAddPrayer(true)} onDelete={deletePrayer} onTogglePrayed={togglePrayed} onAddComment={addComment} currentUserId={currentUserData?.id} currentUser={currentUserData} isAdmin={true} isSuperAdmin={userRole === 'superadmin'} showMessage={showMessage} />;
        case 'readingPlans': return <ReadingPlansScreen plans={readingPlans} allProgress={allUserProgress} users={users} isAdmin={true} onAdd={() => setShowAddReadingPlan(true)} onDelete={deleteReadingPlan} showMessage={showMessage} />;
        case 'sermons': return <AdminSermonsScreen sermons={sermons} onAdd={addSermon} onDelete={deleteSermon} />;
        case 'pastoral': return <AdminPastoralVisits visits={pastoralVisits} onUpdateStatus={updatePastoralVisitStatus} />;
        case 'bible': return <BibleScreen onTabChange={setCurrentTab} showMessage={showMessage} readingPlans={readingPlans} progress={userReadingProgress} highlights={verseHighlights} onToggleHighlight={toggleVerseHighlight} />;
        case 'profile': {
          const userCells = cells.filter(c => c.membersList?.includes(currentUserData?.id || ''));
          const userPrayers = prayers.filter(p => p.uid === currentUserData?.id);
          return (
            <ProfileScreen 
              onLogout={handleLogout} 
              user={currentUserData} 
              onUpdateProfile={updateUserProfile} 
              stats={{ cells: userCells.length, prayers: userPrayers.length }} 
              prayers={prayers} 
              pastoralVisits={pastoralVisits}
              whatsappConfig={whatsappConfig}
              onUpdateWhatsApp={updateWhatsAppConfig}
              isAdmin={isAdmin} 
              onSwitchToMember={() => navigate('/')} 
              showMessage={showMessage} 
              onOpenNotifications={async () => {
                setShowNotificationSettings(true);
                // Also request permission in background
                requestNotificationPermission();
              }}
            />
          );
        }
        default: return <AdminDashboard stats={stats} users={users} onAddEvent={() => setShowAddEvent(true)} onAddAnnouncement={() => setShowAddAnnouncement(true)} onAddReadingPlan={() => setShowAddReadingPlan(true)} onAddTransaction={() => setShowAddTransaction(true)} onSwitchToMember={() => navigate('/')} onTabChange={setCurrentTab} showMessage={showMessage} />;
      }
    }

    switch (currentTab) {
      case 'home': return <Dashboard events={events} user={currentUserData} announcements={announcements} onTabChange={setCurrentTab} onShowDonation={() => setShowDonationModal(true)} onShowReadingPlans={() => setCurrentTab('readingPlans')} onRequestPastoralVisit={() => setShowAddPastoralVisit(true)} isAdmin={isAdmin} onSwitchToAdmin={() => navigate('/admin')} showMessage={showMessage} />;
      case 'events': return <EventsScreen events={events} onShowMural={() => setCurrentTab('prayer')} showMessage={showMessage} />;
      case 'prayer': return <PrayerWall prayers={prayers} cells={cells} onAdd={() => setShowAddPrayer(true)} onDelete={deletePrayer} onTogglePrayed={togglePrayed} onAddComment={addComment} currentUserId={currentUserData?.id} currentUser={currentUserData} isAdmin={isAdmin} isSuperAdmin={userRole === 'superadmin'} showMessage={showMessage} />;
      case 'announcements': return <AnnouncementsScreen announcements={announcements} isAdmin={isAdmin} onDelete={deleteAnnouncement} showMessage={showMessage} />;
      case 'readingPlans': return <ReadingPlansScreen plans={readingPlans} progress={userReadingProgress} onToggleChapter={toggleChapter} isAdmin={false} showMessage={showMessage} />;
      case 'bible': return <BibleScreen onTabChange={setCurrentTab} showMessage={showMessage} readingPlans={readingPlans} progress={userReadingProgress} highlights={verseHighlights} onToggleHighlight={toggleVerseHighlight} />;
      case 'sermons': return <SermonsScreen sermons={sermons} />;
      case 'tithes': return <TithesScreen config={titheConfig} onConfirmDonation={(val, label) => addTransaction({ label, value: val, type: 'in' })} showMessage={showMessage} currentUserData={currentUserData} />;
      case 'groups': return <GroupsScreen cells={cells} users={users} currentUser={currentUserData} onJoin={joinCell} onLeave={leaveCell} onAttendance={(c) => { setSelectedAttendanceCell(c); setShowAttendance(true); }} attendanceHistory={attendanceHistory} onShowRecordDetail={setSelectedRecord} showMessage={showMessage} />;
      case 'media': return <MediaScreen showMessage={showMessage} />;
      case 'pastoral': return <UserPastoralVisitsScreen visits={pastoralVisits.filter(v => v.uid === currentUserData?.id)} onAddRequest={() => setShowAddPastoralVisit(true)} />;
      case 'profile': {
        const userCells = cells.filter(c => c.membersList?.includes(currentUserData?.id || ''));
        const userPrayers = prayers.filter(p => p.uid === currentUserData?.id);
        return (
          <ProfileScreen 
            onLogout={handleLogout} 
            user={currentUserData} 
            onUpdateProfile={updateUserProfile} 
            stats={{ cells: userCells.length, prayers: userPrayers.length }} 
            prayers={prayers} 
            pastoralVisits={pastoralVisits}
            whatsappConfig={whatsappConfig}
            onUpdateWhatsApp={updateWhatsAppConfig}
            isAdmin={isAdmin} 
            onSwitchToAdmin={() => navigate('/admin')} 
            showMessage={showMessage} 
            onOpenNotifications={async () => {
              setShowNotificationSettings(true);
              // Also request permission in background
              requestNotificationPermission();
            }}
          />
        );
      }
      default: return <Dashboard events={events} user={currentUserData} announcements={announcements} onTabChange={setCurrentTab} onShowDonation={() => setCurrentTab('tithes')} onShowReadingPlans={() => setCurrentTab('readingPlans')} onRequestPastoralVisit={() => setShowAddPastoralVisit(true)} isAdmin={isAdmin} onSwitchToAdmin={() => navigate('/admin')} showMessage={showMessage} />;
    }
  };

  const memberTabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'prayer', icon: Heart, label: 'Mural' },
    { id: 'bible', icon: BookOpen, label: 'Bíblia' },
    { id: 'sermons', icon: Mic, label: 'Sermões' },
    { id: 'tithes', icon: DollarSign, label: 'Dízimos' },
    (userRole === 'admin' || userRole === 'superadmin') && { id: 'admin_switch', icon: LayoutDashboard, label: 'Gestão' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ].filter(Boolean) as { id: string, icon: any, label: string }[];

  const adminTabs = [
    { id: 'home', icon: PieChart, label: 'Dashboard' },
    { id: 'all_screens', icon: Grid, label: 'Telas' },
    { id: 'financial', icon: DollarSign, label: 'Financeiro' },
    { id: 'pastoral', icon: Heart, label: 'Visitas' },
    { id: 'sermons', icon: Mic, label: 'Sermões' },
    { id: 'prayer', icon: Heart, label: 'Mural' },
    { id: 'members', icon: Users, label: 'Membros' },
    { id: 'profile', icon: Settings, label: 'Perfil' },
  ];

  const isAdminPanel = location.pathname.startsWith('/admin');
  const tabs = (userRole === 'admin' || userRole === 'superadmin') && isAdminPanel ? adminTabs : memberTabs;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-secondary max-w-md mx-auto relative shadow-2xl overflow-hidden">
        <Routes>
          <Route path="/" element={
            <main className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </main>
          } />
          <Route path="/admin" element={
            (userRole === 'admin' || userRole === 'superadmin') ? (
              <main className="p-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </main>
            ) : <Navigate to="/" />
          } />
        </Routes>

        {/* Modals */}

        {/* Modals */}
        <AnimatePresence>
          {showAddEvent && (
            <Modal title={editingEvent ? "Editar Evento" : "Novo Evento"} onClose={() => { setShowAddEvent(false); setEditingEvent(null); }}>
              <EventForm onSubmit={addEvent} initialData={editingEvent || undefined} />
            </Modal>
          )}
          {showAddTransaction && (
            <Modal title="Nova Transação" onClose={() => setShowAddTransaction(false)}>
              <TransactionForm onSubmit={addTransaction} />
            </Modal>
          )}
          {showAddCell && (
            <Modal title={editingCell ? "Editar PG" : "Novo PG"} onClose={() => { setShowAddCell(false); setEditingCell(null); }}>
              <CellForm onSubmit={addCell} initialData={editingCell || undefined} />
            </Modal>
          )}
          {showAddPrayer && (
            <Modal title="Pedido de Oração" onClose={() => setShowAddPrayer(false)}>
              <PrayerForm onSubmit={addPrayer} />
            </Modal>
          )}
          {showAddAnnouncement && (
            <Modal title="Novo Aviso" onClose={() => setShowAddAnnouncement(false)}>
              <AnnouncementForm onSubmit={addAnnouncement} />
            </Modal>
          )}
          {showAddReadingPlan && (
            <Modal title="Novo Plano de Leitura" onClose={() => setShowAddReadingPlan(false)}>
              <ReadingPlanForm onSubmit={addReadingPlan} />
            </Modal>
          )}
          {showAddPastoralVisit && (
            <Modal title="Agendamento Pastoral" onClose={() => setShowAddPastoralVisit(false)}>
              <PastoralVisitForm user={currentUserData} onSubmit={handlePastoralVisitSubmit} onCancel={() => setShowAddPastoralVisit(false)} />
            </Modal>
          )}
          {showDonationModal && (
            <Modal title="Dízimos e Ofertas" onClose={() => setShowDonationModal(false)}>
              <TithesScreen config={titheConfig} showMessage={showMessage} currentUserData={currentUserData} />
            </Modal>
          )}
          {showAttendance && selectedAttendanceCell && (
            <Modal title="Chamada do PG" onClose={() => { setShowAttendance(false); setSelectedAttendanceCell(null); }}>
              <AttendanceForm cell={selectedAttendanceCell} users={users} onSubmit={handleAttendanceSubmit} onCancel={() => { setShowAttendance(false); setSelectedAttendanceCell(null); }} />
            </Modal>
          )}
          {selectedRecord && (
            <Modal title={`Detalhes da Chamada - ${selectedRecord.date}`} onClose={() => setSelectedRecord(null)}>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                    <p className="text-sm font-bold text-emerald-700">{selectedRecord.presentMembers.length}</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Presentes</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-center">
                    <p className="text-sm font-bold text-red-700">{selectedRecord.absentMembers.length}</p>
                    <p className="text-[10px] text-red-600 font-bold uppercase">Ausentes</p>
                  </div>
                  {selectedRecord.visitorsCount ? (
                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center col-span-2">
                      <p className="text-base font-bold text-blue-700">{selectedRecord.visitorsCount}</p>
                      <p className="text-[10px] text-blue-600 font-bold uppercase">Visitantes</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase ml-1">Presentes</h5>
                  <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-2">
                    {selectedRecord.presentMembers.length > 0 ? selectedRecord.presentMembers.map(uid => {
                      const user = users.find(u => u.id === uid);
                      return (
                        <div key={uid} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
                          <img src={user?.avatar || `https://picsum.photos/seed/${uid}/100/100`} className="w-8 h-8 rounded-full" alt="" />
                          <span className="text-sm font-bold text-slate-700">{user?.name || 'Membro removido'}</span>
                          <CheckCircle2 className="ml-auto w-4 h-4 text-emerald-500" />
                        </div>
                      );
                    }) : <p className="text-xs text-slate-400 text-center py-2">Nenhum membro presente</p>}
                  </div>
                </div>

                {selectedRecord.notes && (
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase ml-1">Observações</h5>
                    <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed italic border border-slate-100">
                      "{selectedRecord.notes}"
                    </div>
                  </div>
                )}

                <Button onClick={() => setSelectedRecord(null)} className="w-full">Fechar</Button>
              </div>
            </Modal>
          )}
          {showNotificationSettings && currentUserData && (
            <Modal title="Configurações de Notificação" onClose={() => setShowNotificationSettings(false)}>
              <NotificationSettingsScreen 
                settings={currentUserData.notificationSettings}
                showMessage={showMessage}
                onClose={() => setShowNotificationSettings(false)}
                onUpdate={async (newSettings) => {
                  await updateUserProfile({ notificationSettings: newSettings });
                }}
              />
            </Modal>
          )}
        </AnimatePresence>

        {/* Global Error Toast */}
        <AnimatePresence>
          {globalError && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-4 right-4 z-[200] bg-red-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3"
            >
              <div className="p-2 bg-white/20 rounded-lg">
                <Plus className="w-5 h-5 rotate-45" />
              </div>
              <p className="text-sm font-medium">{globalError}</p>
            </motion.div>
          )}
          {globalMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-4 right-4 z-[200] bg-primary text-white p-4 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-3"
            >
              <div className="p-2 bg-white/20 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium">{globalMessage}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'admin_switch') {
                  navigate('/admin');
                  setCurrentTab('home');
                } else {
                  setCurrentTab(tab.id);
                }
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                currentTab === tab.id ? "text-primary" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                currentTab === tab.id ? "bg-primary-light" : "bg-transparent"
              )}>
                <tab.icon className={cn("w-6 h-6", currentTab === tab.id ? "stroke-[2.5px]" : "stroke-[2px]")} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </ErrorBoundary>
  );
}

// --- Helper Components ---

const Modal = ({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm"
    onClick={onClose}
  >
    <motion.div 
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-6 shadow-2xl"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">{title}</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
          <Plus className="w-6 h-6 rotate-45 text-slate-400" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

const EventForm = ({ onSubmit, initialData }: { onSubmit: (e: any) => void, initialData?: Event }) => {
  const [form, setForm] = useState(initialData || { title: '', date: '', time: '', location: '', category: 'Culto', image: 'https://picsum.photos/seed/newevent/400/200' });
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase">Imagem do Evento</label>
        <div className="flex gap-4 items-center">
          <img src={form.image} className="w-20 h-20 rounded-xl object-cover border" alt="Preview" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
        </div>
      </div>
      <input placeholder="Título do Evento" className="w-full p-3 rounded-xl border" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
      <div className="flex gap-2">
        <input placeholder="Ex: Dom, 22 Mar" className="flex-1 p-3 rounded-xl border" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
        <input placeholder="Ex: 19:00" className="flex-1 p-3 rounded-xl border" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
      </div>
      <input placeholder="Local" className="w-full p-3 rounded-xl border" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
      <select className="w-full p-3 rounded-xl border" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
        <option>Cultos</option>
        <option>Jovens</option>
        <option>Estudos</option>
        <option>Social</option>
      </select>
      <Button className="w-full py-4" onClick={() => onSubmit(form)}>{initialData ? 'Salvar Alterações' : 'Criar Evento'}</Button>
    </div>
  );
};

const CellForm = ({ onSubmit, initialData }: { onSubmit: (c: any) => void, initialData?: CellGroup }) => {
  const [form, setForm] = useState(initialData || { name: '', leader: '', day: 'Terça-feira', time: '20:00', location: '', members: 0 });
  return (
    <div className="space-y-4">
      <input placeholder="Nome do PG" className="w-full p-3 rounded-xl border" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
      <input placeholder="Líder" className="w-full p-3 rounded-xl border" value={form.leader} onChange={e => setForm({...form, leader: e.target.value})} />
      <div className="flex gap-2">
        <select className="flex-1 p-3 rounded-xl border" value={form.day} onChange={e => setForm({...form, day: e.target.value})}>
          <option>Segunda-feira</option>
          <option>Terça-feira</option>
          <option>Quarta-feira</option>
          <option>Quinta-feira</option>
          <option>Sexta-feira</option>
          <option>Sábado</option>
          <option>Domingo</option>
        </select>
        <input placeholder="Horário" className="flex-1 p-3 rounded-xl border" value={form.time} onChange={e => setForm({...form, time: e.target.value})} />
      </div>
      <input placeholder="Bairro/Local" className="w-full p-3 rounded-xl border" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
      <Button className="w-full py-4" onClick={() => onSubmit(form)}>{initialData ? 'Salvar Alterações' : 'Criar PG'}</Button>
    </div>
  );
};

const PrayerForm = ({ onSubmit }: { onSubmit: (content: string, privacy: 'public' | 'private') => Promise<void> }) => {
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('public');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    try {
      await onSubmit(content, privacy);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea 
        placeholder="Escreva seu pedido ou agradecimento..." 
        className="w-full p-4 rounded-xl border min-h-[120px] resize-none focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
        value={content} 
        onChange={e => setContent(e.target.value)} 
      />
      <div className="flex gap-2">
        <button 
          className={cn("flex-1 py-3 rounded-xl border font-bold text-sm", privacy === 'public' ? "bg-primary text-white border-primary" : "bg-white text-slate-400")}
          onClick={() => setPrivacy('public')}
        >
          Público
        </button>
        <button 
          className={cn("flex-1 py-3 rounded-xl border font-bold text-sm", privacy === 'private' ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-400")}
          onClick={() => setPrivacy('private')}
        >
          Privado (Só Liderança)
        </button>
      </div>
      <Button 
        className="w-full py-4" 
        onClick={handleSubmit}
        disabled={loading || !content.trim()}
      >
        {loading ? 'Publicando...' : 'Publicar Pedido'}
      </Button>
    </div>
  );
};

const TransactionForm = ({ onSubmit }: { onSubmit: (t: any) => void }) => {
  const [form, setForm] = useState({ label: '', value: '', type: 'in' as 'in' | 'out' });
  return (
    <div className="space-y-4">
      <input placeholder="Descrição (ex: Dízimo Maria)" className="w-full p-3 rounded-xl border" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
      <input type="number" placeholder="Valor (R$)" className="w-full p-3 rounded-xl border" value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
      <div className="flex gap-2">
        <button 
          className={cn("flex-1 py-3 rounded-xl border font-bold", form.type === 'in' ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-400")}
          onClick={() => setForm({...form, type: 'in'})}
        >
          Entrada (+)
        </button>
        <button 
          className={cn("flex-1 py-3 rounded-xl border font-bold", form.type === 'out' ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400")}
          onClick={() => setForm({...form, type: 'out'})}
        >
          Saída (-)
        </button>
      </div>
      <Button className="w-full py-4" onClick={() => onSubmit({ ...form, value: Number(form.value) })}>Lançar no Caixa</Button>
    </div>
  );
};

const AnnouncementForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [form, setForm] = useState({ title: '', content: '', imageUrl: '' });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <input placeholder="Título do Aviso" className="w-full p-3 rounded-xl border" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
      <textarea placeholder="Conteúdo" className="w-full p-3 rounded-xl border min-h-[100px]" value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase">Imagem (opcional)</label>
        <div className="flex gap-4 items-center">
          {form.imageUrl && <img src={form.imageUrl} className="w-16 h-16 rounded-xl object-cover border" alt="Preview" />}
          <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs" />
        </div>
      </div>
      <Button className="w-full py-4" onClick={() => onSubmit(form)}>Criar Aviso</Button>
    </div>
  );
};

const ReadingPlanForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [form, setForm] = useState({ title: '', description: '', duration: '', imageUrl: '', chapters: [] as string[] });
  const [selectedBook, setSelectedBook] = useState(BIBLE_BOOKS[0].name);
  const [selectedChapter, setSelectedChapter] = useState('1');

  const addChapter = () => {
    const chapterStr = `${selectedBook} ${selectedChapter}`;
    if (!form.chapters.includes(chapterStr)) {
      setForm({ ...form, chapters: [...form.chapters, chapterStr] });
    }
  };

  const applyTemplate = (template: typeof READING_PLAN_TEMPLATES[0]) => {
    setForm({
      ...form,
      title: template.title,
      description: template.description,
      duration: template.duration,
      imageUrl: template.imageUrl,
      chapters: template.chapters
    });
  };

  const book = BIBLE_BOOKS.find(b => b.name === selectedBook);

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase">Modelos Prontos</label>
        <div className="grid grid-cols-1 gap-2">
          {READING_PLAN_TEMPLATES.map((template, i) => (
            <button 
              key={i}
              onClick={() => applyTemplate(template)}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-primary-light hover:border-primary/20 transition-all text-left"
            >
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{template.title}</p>
                <p className="text-[10px] text-slate-500">{template.duration}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-slate-100"></div>

      <section className="space-y-4">
        <label className="text-xs font-bold text-slate-500 uppercase">Informações do Plano</label>
        <input placeholder="Título do Plano" className="w-full p-3 rounded-xl border" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
        <input placeholder="Descrição" className="w-full p-3 rounded-xl border" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
        <input placeholder="Duração (ex: 30 dias)" className="w-full p-3 rounded-xl border" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
        <input placeholder="URL da Imagem" className="w-full p-3 rounded-xl border" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} />
      </section>
      
      <section className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase">Adicionar Capítulos</label>
        <div className="flex gap-2">
          <select 
            className="flex-1 p-3 rounded-xl border text-sm" 
            value={selectedBook} 
            onChange={e => {
              setSelectedBook(e.target.value);
              setSelectedChapter('1');
            }}
          >
            {BIBLE_BOOKS.map(b => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          <select 
            className="w-24 p-3 rounded-xl border text-sm" 
            value={selectedChapter} 
            onChange={e => setSelectedChapter(e.target.value)}
          >
            {Array.from({ length: book?.chapters || 0 }, (_, i) => i + 1).map(ch => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
          <Button onClick={addChapter} variant="outline" className="px-3"><Plus className="w-5 h-5" /></Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {form.chapters.map((ch, i) => (
            <span key={i} className="px-2 py-1 bg-slate-100 rounded-lg text-xs flex items-center gap-1">
              {ch}
              <button onClick={() => setForm({...form, chapters: form.chapters.filter((_, idx) => idx !== i)})}>
                <Plus className="w-3 h-3 rotate-45" />
              </button>
            </span>
          ))}
        </div>
      </section>

      <Button className="w-full py-4 mt-4" onClick={() => onSubmit(form)}>Criar Plano</Button>
    </div>
  );
};
