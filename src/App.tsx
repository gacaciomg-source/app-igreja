import React, { useState, useEffect, useCallback, useRef, Component, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from 'react-router-dom';
import { toPng } from 'html-to-image';
import { fetchVerseText, BIBLE_TRANSLATIONS } from './lib/bible';
import AdminVerses from './components/AdminVerses';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
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
  Sun,
  Moon,
  Type,
  Heart, 
  Check,
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
  Archive,
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
  XCircle,
  Database,
  RefreshCw,
  Server,
  Shield,
  Download,
  Upload,
  Send,
  Cpu,
  HardDrive,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Cake,
  Image,
  CreditCard,
  FileUp,
  Layers,
  Table,
  BarChart as BarChartIcon,
  GitCompare,
  Edit2
} from 'lucide-react';
import Papa from 'papaparse';
import { 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as ReTooltip, 
  Legend as ReLegend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { cn, UserRole, User as UserType, MemberStatus, Ministry, MinistrySchedule, Event, PrayerRequest, PrayerComment, CellGroup, Announcement, ReadingPlan, TitheConfig, Attendance, VerseHighlight, Sermon, PastoralVisit, WhatsAppConfig, AdminRole, FinancialFund, FinancialTransaction, FinancialRule } from './types';
import { BIBLE_BOOKS, READING_PLAN_TEMPLATES } from './constants';
import { api, getApiUrl } from './services/apiService';

const DEFAULT_AVATAR = "https://renovar.warpserver.com.br/avatar.png";

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${d} ${months[parseInt(m) - 1]}`;
  }
  return dateStr;
};

const isPastDate = (dateStr: string) => {
  if (!dateStr) return false;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Supondo que dateStr seja YYYY-MM-DD
    const eventDate = new Date(dateStr + 'T00:00:00');
    return eventDate < today;
  } catch (e) {
    return false;
  }
};

// --- Cache Buster ---
const getCacheBustedUrl = (url: string | undefined, version: number) => {
  if (!url) return url;
  if (!url.startsWith('http')) return url; // local icons don't need buster
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
};
import { ReadingPlansScreen } from './components/ReadingPlansScreen';
import { TithesScreen } from './components/TithesScreen';
import { TithesAdminScreen } from './components/TithesAdminScreen';
import { APP_CONFIG } from './themeConfig';

// --- Error Handling ---
let setGlobalErrorRef: (msg: string | null) => void = () => {};
let setGlobalSuccessRef: (msg: string | null) => void = () => {};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push notifications not supported on this device/browser');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Request permission if not already granted
    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;
      } catch (err) {
        console.log('Notification permission request failed or denied:', err);
        return;
      }
    }

    if (Notification.permission === 'denied') {
      console.log('Push notifications are denied.');
      return;
    }

    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      const response = await fetch(getApiUrl('/push/public-key'));
      const { publicKey } = await response.json();
      
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    const token = localStorage.getItem('auth_token');
    if (!token) return;

    await fetch(getApiUrl('/push/subscribe'), {
      method: 'POST',
      body: JSON.stringify(subscription),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Unidade de Notificação Push registrada!');
  } catch (error) {
    console.error('Error during push registration:', error);
  }
}

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
  avatar: DEFAULT_AVATAR
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

const TreeLogo = ({ className = "w-20 h-20" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="100" cy="100" r="98" fill="#064e3b" />
    <circle cx="100" cy="100" r="92" stroke="#D4AF37" strokeWidth="2" />
    <path d="M100 160V70" stroke="white" strokeWidth="8" strokeLinecap="round" />
    <path d="M100 70C100 70 140 100 140 130" stroke="white" strokeWidth="6" strokeLinecap="round" />
    <path d="M100 70C100 70 60 100 60 130" stroke="white" strokeWidth="6" strokeLinecap="round" />
    <path d="M100 90C100 90 125 110 125 125" stroke="#D4AF37" strokeWidth="5" strokeLinecap="round" />
    <path d="M100 90C100 90 75 110 75 125" stroke="#D4AF37" strokeWidth="5" strokeLinecap="round" />
    <circle cx="100" cy="55" r="10" fill="white" />
    <circle cx="140" cy="115" r="7" fill="white" />
    <circle cx="60" cy="115" r="7" fill="white" />
    <circle cx="120" cy="85" r="6" fill="white" />
    <circle cx="80" cy="85" r="6" fill="white" />
  </svg>
);

const LoginScreen = ({ onAuthSuccess, cacheVersion }: { onAuthSuccess: (user: UserType) => void, cacheVersion: number }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
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

    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      if (mode === 'login') {
        const { user: loggedUser } = await api.login(normalizedEmail, password);
        console.log('Login successful:', loggedUser.email);
        localStorage.setItem('auth_user', JSON.stringify(loggedUser));
        onAuthSuccess(loggedUser);
      } else if (mode === 'signup') {
        if (!phone) throw new Error("O número de WhatsApp é obrigatório.");
        if (!birthDate) throw new Error("A data de nascimento é obrigatória.");
        const { user: newUser } = await api.register({
          name,
          email: normalizedEmail,
          password,
          birthDate,
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
          <div className="w-24 h-24 bg-white rounded-3xl mx-auto flex items-center justify-center p-4 shadow-xl shadow-primary/5 mb-4 overflow-hidden">
            <img src={getCacheBustedUrl(APP_CONFIG.logos.icon, cacheVersion)} className="w-full h-full object-contain" alt="Logo" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">{APP_CONFIG.name}</h1>
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
                <label className="text-sm font-medium text-slate-700">Data de Nascimento (Obrigatório)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="date" 
                    required
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
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
            <label className="text-sm font-medium text-slate-700">
              {mode === 'login' ? "E-mail ou Usuário" : "E-mail"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type={mode === 'login' ? "text" : "email"}
                autoCapitalize="none"
                autoCorrect="off"
                required
                placeholder={mode === 'login' ? "E-mail ou usuário" : "seu@email.com"}
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

const SHARE_BACKGROUNDS = [
  { id: 'gradient-blue', gradient: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)', name: 'Azul Moderno' },
  { id: 'gradient-purple', gradient: 'linear-gradient(135deg, #a855f7 0%, #db2777 100%)', name: 'Roxo Vibrante' },
  { id: 'gradient-orange', gradient: 'linear-gradient(135deg, #fb923c 0%, #f43f5e 100%)', name: 'Pôr do Sol' },
  { id: 'nature-1', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=100&w=1080', name: 'Floresta' },
  { id: 'nature-2', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=100&w=1080', name: 'Montanha' },
  { id: 'nature-3', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&q=100&w=1080', name: 'Lago' },
  { id: 'nature-4', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=100&w=1080', name: 'Praia' },
  { id: 'nature-5', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=100&w=1080', name: 'Pico' },
  { id: 'nature-6', url: 'https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&q=100&w=1080', name: 'Céu' },
  { id: 'bible-1', url: 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&q=100&w=1080', name: 'Escrituras' },
  { id: 'bible-2', url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?auto=format&fit=crop&q=100&w=1080', name: 'Oração' },
  { id: 'bible-3', url: 'https://images.unsplash.com/photo-1544427928-142ec22736bc?auto=format&fit=crop&q=100&w=1080', name: 'Luz' },
  { id: 'abstract-1', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=100&w=1080', name: 'Abstrato' },
];

const VerseShareModal = ({ verse, onClose }: { verse: { text: string, ref: string }, onClose: () => void }) => {
  const [selectedBg, setSelectedBg] = useState(SHARE_BACKGROUNDS[0]);
  const verseCardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const [currentText, setCurrentText] = useState(verse.text);
  const [selectedTranslation, setSelectedTranslation] = useState('almeida');
  const [isFetchingText, setIsFetchingText] = useState(false);

  useEffect(() => {
    // If the version changes, fetch the new text
    const updateText = async () => {
      if (selectedTranslation === 'almeida' && verse.text && !verse.text.startsWith('Carregando') && !verse.text.startsWith('Texto será')) {
        setCurrentText(verse.text);
        return;
      }
      
      setIsFetchingText(true);
      try {
        const text = await fetchVerseText(verse.ref, selectedTranslation);
        if (text) setCurrentText(text);
      } catch (err) {
        console.error('Failed to fetch translation:', err);
      } finally {
        setIsFetchingText(false);
      }
    };
    updateText();
  }, [selectedTranslation, verse.ref, verse.text]);

  const handleShare = async () => {
    if (!verseCardRef.current) return;
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(verseCardRef.current, { 
        quality: 1, 
        pixelRatio: 2, 
        cacheBust: true,
        skipFonts: false,
        backgroundColor: '#1e293b',
        style: {
          borderRadius: '0',
        }
      });
      
      setGeneratedImage(dataUrl);
      
      // Auto-trigger share for Native Apps (Capacitor) because they don't have the user gesture constraint
      const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor;
      if (isNative) {
        setTimeout(() => handleDirectShareWithUrl(dataUrl), 100);
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDirectShareWithUrl = async (urlToShare: string) => {
    const fileName = `versiculo-${verse.ref.replace(/[:\s]/g, '-')}.png`;
    const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor;

    if (isNative) {
        try {
          const base64Data = urlToShare.split(',')[1];
          await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
          });
          const savedFile = await Filesystem.getUri({
            path: fileName,
            directory: Directory.Cache
          });
          await Share.share({
            title: 'Versículo do Dia',
            text: `"${currentText}" - ${verse.ref}`,
            url: savedFile.uri,
            dialogTitle: 'Compartilhar Versículo'
          });
        } catch (capacitorErr) {
          console.error("Capacitor Share Error:", capacitorErr);
        }
    } else {
      try {
        const blob = await (await fetch(urlToShare)).blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.share && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Versículo do Dia',
            text: `"${currentText}" - ${verse.ref}`
          });
        } else {
           downloadImage(urlToShare);
        }
      } catch (err) {
        console.warn('Share error:', err);
      }
    }
  };

  const handleDirectShare = () => {
    if (generatedImage) {
      handleDirectShareWithUrl(generatedImage);
    }
  };

  const downloadImage = (dataUrl?: string, name?: string) => {
    const finalUrl = dataUrl || generatedImage;
    if (!finalUrl) return;
    const finalName = name || `versiculo-${verse.ref.replace(/[:\s]/g, '-')}.png`;
    const link = document.createElement('a');
    link.download = finalName;
    link.href = finalUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        {generatedImage ? (
           <div className="space-y-4 w-full flex flex-col items-center">
             <p className="text-[10px] text-center uppercase font-bold text-slate-400">Pronto! Clique abaixo para compartilhar.</p>
             <img src={generatedImage} alt="Versículo Gerado" className="w-[280px] rounded-2xl shadow-2xl" />
             <div className="flex flex-col w-full max-w-[280px] gap-2">
               <Button onClick={handleDirectShare} className="w-full flex gap-2 items-center justify-center">
                 <Share2 className="w-4 h-4" />
                 Compartilhar Agora
               </Button>
               <Button onClick={() => downloadImage()} variant="outline" className="w-full">
                 Baixar Imagem Manualmente
               </Button>
             </div>
           </div>
        ) : (
          <div className="bg-slate-50 p-4 rounded-3xl border-2 border-slate-100 shadow-inner">
            <div 
              ref={verseCardRef}
            className="w-[280px] h-[497px] rounded-2xl flex flex-col items-center justify-center p-8 text-center relative overflow-hidden shadow-2xl"
            style={{
              backgroundColor: '#1e293b',
            }}
          >
            {/* Renderiza o background */}
            {(selectedBg as any).url && (
              <>
                <img 
                  src={(selectedBg as any).url} 
                  crossOrigin="anonymous" 
                  alt="background" 
                  className="absolute inset-0 w-full h-full object-cover z-0" 
                />
                <div className="absolute inset-0 bg-black/40 z-0" />
              </>
            )}
            {(selectedBg as any).gradient && (
              <div 
                className="absolute inset-0 z-0" 
                style={{ background: (selectedBg as any).gradient }} 
              />
            )}

            {!logoError && (
              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-32 h-32 flex items-center justify-center p-3 z-10 overflow-hidden">
                <img 
                  src="https://renovar.warpserver.com.br/icon1024.png" 
                  className="w-full h-full object-contain" 
                  alt="Logo" 
                  onError={() => setLogoError(true)}
                />
              </div>
            )}
            
            <div className="space-y-6 z-10 pt-16">
              <p className={cn(
                "text-white font-medium italic leading-relaxed drop-shadow-lg",
                currentText.length > 300 ? "text-xs" : 
                currentText.length > 200 ? "text-sm" : 
                currentText.length > 120 ? "text-base" : 
                currentText.length > 60 ? "text-lg" : "text-xl"
              )}>
                "{currentText}"
              </p>
              <div className="h-0.5 w-12 bg-white/40 mx-auto rounded-full"></div>
              <p className="text-white font-bold text-lg drop-shadow-md">
                {verse.ref}
              </p>
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center flex flex-col items-center">
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">{APP_CONFIG.name}</p>
              <p className="text-white/40 text-[9px] font-medium tracking-[0.1em] mt-0.5">{APP_CONFIG.social.instagram.replace('https://instagram.com/', '@')}</p>
              <p className="text-white/30 text-[8px] font-bold uppercase tracking-[0.15em] mt-1.5">{BIBLE_TRANSLATIONS.find(t => t.id === selectedTranslation)?.bollsStr || selectedTranslation.toUpperCase()}</p>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
          </div>
          </div>
        )}
      </div>

      {!generatedImage && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Versão da Bíblia</label>
            <select 
              value={selectedTranslation}
              onChange={e => setSelectedTranslation(e.target.value)}
              className="w-full p-3 bg-white border border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
              disabled={isFetchingText}
            >
              {BIBLE_TRANSLATIONS.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Escolha o Fundo</label>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {SHARE_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBg(bg)}
                  className={cn(
                    "min-w-16 h-16 rounded-xl border-2 transition-all overflow-hidden relative",
                    selectedBg.id === bg.id ? "border-primary scale-105" : "border-transparent opacity-70 hover:opacity-100"
                  )}
                >
                  <div 
                    className="w-full h-full"
                    style={{ 
                      backgroundImage: (bg as any).gradient || (bg.url ? `url(${bg.url})` : 'none'),
                      backgroundColor: '#f1f5f9',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                  <div className="absolute inset-0 flex items-end p-1">
                    <span className="text-[8px] font-bold text-white leading-none whitespace-nowrap bg-black/40 px-1 rounded truncate w-full">
                      {bg.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1 py-4">Cancelar</Button>
        {!generatedImage && (
          <Button 
            onClick={handleShare} 
            className="flex-3 py-4 text-lg font-bold" 
            disabled={isGenerating || isFetchingText}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Gerando...
              </>
            ) : isFetchingText ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Buscando...
              </>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                Gerar Imagem
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const MinistriesScreen = ({ ministries, users, currentUser, adminRoles = [], onJoinRequest, onManageRequest, onAddSchedule, schedules, onAdd, onUpdate, isAdmin, showMessage }: { 
  ministries: Ministry[], 
  users: UserType[], 
  currentUser: UserType | null, 
  adminRoles?: AdminRole[],
  onJoinRequest: (ministryId: string) => void,
  onManageRequest: (ministryId: string, userId: string, action: 'approve' | 'reject') => void,
  onAddSchedule: (schedule: Partial<MinistrySchedule>) => void,
  schedules: MinistrySchedule[],
  onAdd: (data: Partial<Ministry>) => void,
  onUpdate: (id: string, data: Partial<Ministry>) => void,
  isAdmin: boolean,
  showMessage?: (msg: string) => void 
}) => {
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(null);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [showMinistryForm, setShowMinistryForm] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  
  const [newMinistry, setNewMinistry] = useState<Partial<Ministry>>({
    name: '', description: '', category: 'Geral', imageUrl: ''
  });

  const [newSchedule, setNewSchedule] = useState<Partial<MinistrySchedule>>({
    title: '', 
    date: new Date().toISOString().split('T')[0], 
    time: '19:00', 
    location: '', 
    assignedUserIds: []
  });

  const isLeader = (m: Ministry) => currentUser?.id && (m.leaderIds.includes(currentUser.id) || isAdmin);
  const isMember = (m: Ministry) => currentUser?.id && m.memberIds.includes(currentUser.id);
  const isPending = (m: Ministry) => currentUser?.id && m.pendingRequestIds.includes(currentUser.id);

  const handleEditMinistry = (m: Ministry) => {
    setEditingMinistry(m);
    setNewMinistry(m);
    setShowMinistryForm(true);
  };

  const handleSaveMinistry = () => {
    if (!newMinistry.name || !newMinistry.description) {
      showMessage?.('Nome e descrição são obrigatórios');
      return;
    }

    if (editingMinistry) {
      onUpdate(editingMinistry.id, newMinistry);
    } else {
      onAdd(newMinistry);
    }
    
    setShowMinistryForm(false);
    setEditingMinistry(null);
    setNewMinistry({ name: '', description: '', category: 'Geral', imageUrl: '' });
  };

  const [selectedMemberForRole, setSelectedMemberForRole] = useState<UserType | null>(null);

  const handleUpdateMemberRole = (userId: string, roleId: string) => {
    if (!selectedMinistry) return;
    const memberRoles = { ...(selectedMinistry.memberRoles || {}) };
    if (roleId === 'none') {
      delete memberRoles[userId];
    } else {
      memberRoles[userId] = roleId;
    }
    onUpdate(selectedMinistry.id, { memberRoles });
    setSelectedMemberForRole(null);
  };

  if (selectedMinistry) {
    const ministrySchedules = schedules.filter(s => s.ministryId === selectedMinistry.id);
    const ministryMembers = users.filter(u => selectedMinistry.memberIds.includes(u.id));
    const pendingUsers = users.filter(u => selectedMinistry.pendingRequestIds.includes(u.id));

    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedMinistry(null)} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <h2 className="text-xl font-bold text-slate-900">{selectedMinistry.name}</h2>
          </div>
          {isAdmin && (
            <button onClick={() => handleEditMinistry(selectedMinistry)} className="p-2 bg-slate-50 text-slate-400 rounded-full">
              <Settings className="w-5 h-5" />
            </button>
          )}
        </header>

        <div className="relative h-48 rounded-3xl overflow-hidden">
          <img src={selectedMinistry.imageUrl || 'https://picsum.photos/seed/ministry/800/400'} className="w-full h-full object-cover" alt={selectedMinistry.name} />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent flex items-end p-6">
            <p className="text-white text-sm leading-relaxed">{selectedMinistry.description}</p>
          </div>
        </div>

        {isLeader(selectedMinistry) && pendingUsers.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Solicitações Pendentes
            </h3>
            {pendingUsers.map(user => (
              <Card key={user.id} className="flex items-center gap-4">
                <img src={user.avatar || DEFAULT_AVATAR} className="w-10 h-10 rounded-full" alt={user.name} />
                <div className="flex-1">
                  <p className="font-bold text-sm">{user.name}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onManageRequest(selectedMinistry.id, user.id, 'approve')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                  <button onClick={() => onManageRequest(selectedMinistry.id, user.id, 'reject')} className="p-2 bg-red-50 text-red-600 rounded-lg"><LogOut className="w-4 h-4 rotate-180" /></button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Escalas e Atividades</h3>
            {isLeader(selectedMinistry) && (
              <button onClick={() => setShowAddSchedule(true)} className="text-primary text-sm font-bold flex items-center gap-1">
                <Plus className="w-4 h-4" /> Nova Escala
              </button>
            )}
          </div>

          <div className="space-y-3">
            {ministrySchedules.length > 0 ? (
              ministrySchedules.map(sch => (
                <Card key={sch.id} className="border-l-4 border-l-primary">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900">{sch.title}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" /> {formatDate(sch.date)} às {sch.time}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {sch.location}
                      </p>
                    </div>
                  </div>
            <div className="mt-3 flex -space-x-2">
                    {sch.assignedUserIds.map(uid => {
                      const u = users.find(user => user.id === uid);
                      const status = sch.confirmations?.[uid];
                      return (
                        <div key={uid} className="relative">
                          <img src={u?.avatar || DEFAULT_AVATAR} className="w-8 h-8 rounded-full border-2 border-white object-cover" title={u?.name} />
                          {status && (
                            <div className={cn(
                              "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                              status === 'confirmed' ? "bg-emerald-500" : "bg-red-500"
                            )}>
                              {status === 'confirmed' ? <CheckCircle className="w-2 h-2 text-white" /> : <XCircle className="w-2 h-2 text-white" />}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-slate-400 py-6 text-sm">Nenhuma escala agendada.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Equipe ({ministryMembers.length})</h3>
          <div className="grid grid-cols-2 gap-3">
            {ministryMembers.map(member => {
              const roleId = selectedMinistry.memberRoles?.[member.id];
              const role = adminRoles.find(r => r.id === roleId);
              const isLead = selectedMinistry.leaderIds.includes(member.id);

              return (
                <div 
                  key={member.id} 
                  onClick={() => isLeader(selectedMinistry) && !isLead && setSelectedMemberForRole(member)}
                  className={cn(
                    "flex flex-col gap-2 p-3 bg-white border border-slate-100 rounded-xl transition-all",
                    isLeader(selectedMinistry) && !isLead && "hover:border-primary/30 cursor-pointer active:scale-95"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <img src={member.avatar || DEFAULT_AVATAR} className="w-8 h-8 rounded-full" alt={member.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">{member.name}</p>
                      {isLead ? (
                        <p className="text-[8px] font-bold text-primary uppercase">Líder</p>
                      ) : role ? (
                        <p className="text-[8px] font-bold text-amber-500 uppercase">{role.name}</p>
                      ) : (
                        <p className="text-[8px] font-medium text-slate-400 uppercase">Voluntário</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selectedMemberForRole && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-in fade-in">
            <Card className="w-full rounded-t-3xl rounded-b-none p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <header className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Perfil de Acesso</h3>
                    <p className="text-xs text-slate-500">Definir permissões para {selectedMemberForRole.name}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMemberForRole(null)} className="p-2 bg-slate-100 rounded-full"><LogOut className="w-5 h-5 rotate-180" /></button>
              </header>

              <div className="space-y-2">
                <button 
                  onClick={() => handleUpdateMemberRole(selectedMemberForRole.id, 'none')}
                  className={cn(
                    "w-full p-4 rounded-2xl text-left border transition-all",
                    !selectedMinistry.memberRoles?.[selectedMemberForRole.id] ? "bg-primary/5 border-primary" : "bg-slate-50 border-slate-100"
                  )}
                >
                  <p className="text-sm font-bold">Sem perfil especial</p>
                  <p className="text-[10px] text-slate-500">Acesso padrão de voluntário do ministério</p>
                </button>

                {(selectedMinistry.allowedRoleIds || []).map(roleId => {
                  const role = adminRoles.find(r => r.id === roleId);
                  if (!role) return null;
                  const isSelected = selectedMinistry.memberRoles?.[selectedMemberForRole.id] === roleId;

                  return (
                    <button 
                      key={roleId}
                      onClick={() => handleUpdateMemberRole(selectedMemberForRole.id, roleId)}
                      className={cn(
                        "w-full p-4 rounded-2xl text-left border transition-all",
                        isSelected ? "bg-primary/5 border-primary text-primary" : "bg-slate-50 border-slate-100"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-bold">{role.name}</p>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Permissões: {role.permissions.join(', ')}</p>
                    </button>
                  );
                })}

                {(!selectedMinistry.allowedRoleIds || selectedMinistry.allowedRoleIds.length === 0) && (
                  <p className="text-center text-xs text-slate-400 py-4 italic">
                    Nenhum perfil de acesso foi disponibilizado para este ministério pelo administrador.
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {showAddSchedule && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-in fade-in">
            <Card className="w-full rounded-t-3xl rounded-b-none p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <header className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Nova Escala</h3>
                <button onClick={() => setShowAddSchedule(false)} className="p-2 bg-slate-100 rounded-full"><LogOut className="w-5 h-5 rotate-180" /></button>
              </header>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Título da Atividade</label>
                  <input type="text" placeholder="Ex: Recepção, Louvor..." value={newSchedule.title} onChange={e => setNewSchedule({...newSchedule, title: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input 
                        type="date" 
                        value={newSchedule.date} 
                        onChange={e => setNewSchedule({...newSchedule, date: e.target.value})} 
                        className="w-full pl-10 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horário</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input 
                        type="time" 
                        value={newSchedule.time} 
                        onChange={e => setNewSchedule({...newSchedule, time: e.target.value})} 
                        className="w-full pl-10 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Local</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      type="text" 
                      placeholder="Ex: Templo Principal" 
                      value={newSchedule.location} 
                      onChange={e => setNewSchedule({...newSchedule, location: e.target.value})} 
                      className="w-full pl-10 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium" 
                    />
                  </div>
                </div>
                
                <p className="text-xs font-bold text-slate-400 mt-4 uppercase">Escalar Membros</p>
                <div className="grid grid-cols-2 gap-2">
                  {ministryMembers.map(m => (
                    <button 
                      key={m.id} 
                      onClick={() => {
                        const current = newSchedule.assignedUserIds || [];
                        const next = current.includes(m.id) ? current.filter(id => id !== m.id) : [...current, m.id];
                        setNewSchedule({...newSchedule, assignedUserIds: next});
                      }}
                      className={cn("p-2 rounded-xl text-xs flex items-center gap-2 border transition-all", newSchedule.assignedUserIds?.includes(m.id) ? "bg-primary text-white border-primary" : "bg-slate-50 text-slate-600 border-slate-100")}
                    >
                      <img src={m.avatar || DEFAULT_AVATAR} className="w-5 h-5 rounded-full" />
                      <span className="truncate">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={() => { 
                onAddSchedule({...newSchedule, ministryId: selectedMinistry.id}); 
                setShowAddSchedule(false);
                setNewSchedule({ 
                  title: '', 
                  date: new Date().toISOString().split('T')[0], 
                  time: '19:00', 
                  location: '', 
                  assignedUserIds: [] 
                });
              }}>Salvar Escala</Button>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Ministérios</h2>
          <p className="text-slate-500">Descubra onde você pode servir.</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditingMinistry(null); setNewMinistry({ name: '', description: '', category: 'Geral', imageUrl: '' }); setShowMinistryForm(true); }} className="p-2 bg-primary text-white rounded-full shadow-lg">
            <Plus className="w-6 h-6" />
          </button>
        )}
      </header>

      <div className="grid gap-4">
        {ministries.map(m => (
          <Card key={m.id} className="overflow-hidden p-0 group" onClick={() => setSelectedMinistry(m)}>
            <div className="flex h-32">
              <div className="w-1/3 h-full overflow-hidden relative">
                <img src={m.imageUrl || 'https://picsum.photos/seed/ministry/200/200'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={m.name} />
                {isAdmin && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditMinistry(m); }}
                    className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Settings className="w-3 h-3 text-slate-600" />
                  </button>
                )}
              </div>
              <div className="w-2/3 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-900 leading-tight">{m.name}</h4>
                    <span className="bg-primary/10 text-primary text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">{m.category}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{m.description}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Users className="w-3 h-3" />
                    <span>{m.memberIds.length} membros</span>
                  </div>
                  {isMember(m) ? (
                    <span className="text-emerald-500 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Já faz parte
                    </span>
                  ) : isPending(m) ? (
                    <span className="text-amber-500 text-[10px] font-bold">Solicitado</span>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onJoinRequest(m.id); }}
                      className="text-primary text-[10px] font-bold hover:underline"
                    >
                      Quero Participar
                    </button>
                  ) }
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showMinistryForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-in fade-in">
          <Card className="w-full rounded-t-3xl rounded-b-none p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <header className="flex justify-between items-center">
              <h3 className="text-xl font-bold">{editingMinistry ? 'Editar Ministério' : 'Novo Ministério'}</h3>
              <button onClick={() => setShowMinistryForm(false)} className="p-2 bg-slate-100 rounded-full"><LogOut className="w-5 h-5 rotate-180" /></button>
            </header>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Nome do Ministério</label>
                <input 
                  type="text" 
                  value={newMinistry.name} 
                  onChange={e => setNewMinistry({...newMinistry, name: e.target.value})} 
                  placeholder="Ex: Louvor, Mídia, etc"
                  className="w-full p-3 bg-slate-50 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Categoria</label>
                <select 
                  value={newMinistry.category} 
                  onChange={e => setNewMinistry({...newMinistry, category: e.target.value})}
                  className="w-full p-3 bg-slate-50 rounded-xl"
                >
                  <option value="Celebração">Celebração</option>
                  <option value="Suporte">Suporte</option>
                  <option value="Espiritual">Espiritual</option>
                  <option value="Social">Social</option>
                  <option value="Geral">Geral</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Descrição</label>
                <textarea 
                  value={newMinistry.description} 
                  onChange={e => setNewMinistry({...newMinistry, description: e.target.value})} 
                  placeholder="O que este ministério faz?"
                  className="w-full p-3 bg-slate-50 rounded-xl h-24 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">URL da Imagem</label>
                <input 
                  type="text" 
                  value={newMinistry.imageUrl} 
                  onChange={e => setNewMinistry({...newMinistry, imageUrl: e.target.value})} 
                  placeholder="https://exemplo.com/foto.jpg"
                  className="w-full p-3 bg-slate-50 rounded-xl"
                />
                {newMinistry.imageUrl && (
                  <div className="mt-2 h-32 rounded-xl overflow-hidden shadow-inner">
                    <img src={newMinistry.imageUrl} className="w-full h-full object-cover" alt="Preview" onError={(e) => { (e.target as any).src = 'https://picsum.photos/seed/error/400/200'; }} />
                  </div>
                )}
              </div>

              {isAdmin && adminRoles.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Perfis de Acesso permitidos para este Ministério</label>
                  <div className="grid grid-cols-2 gap-2">
                    {adminRoles.map(role => (
                      <button 
                        key={role.id}
                        onClick={() => {
                          const current = newMinistry.allowedRoleIds || [];
                          const next = current.includes(role.id) ? current.filter(id => id !== role.id) : [...current, role.id];
                          setNewMinistry({...newMinistry, allowedRoleIds: next});
                        }}
                        className={cn(
                          "p-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between",
                          newMinistry.allowedRoleIds?.includes(role.id) 
                            ? "bg-primary/5 border-primary text-primary" 
                            : "bg-slate-50 border-slate-100 text-slate-500"
                        )}
                      >
                        {role.name}
                        {newMinistry.allowedRoleIds?.includes(role.id) && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button className="w-full" onClick={handleSaveMinistry}>
              {editingMinistry ? 'Salvar Alterações' : 'Criar Ministério'}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

const UserManagementScreen = ({ users, cells, ministries, adminRoles = [], currentUserRole, onUpdateUser, onAddUser, onUpdateRole, onUpdateMinistryLeaders, showMessage, initialTab = 'members' }: { users: UserType[], cells: CellGroup[], ministries: Ministry[], adminRoles?: AdminRole[], currentUserRole: UserRole, onUpdateUser: (userId: string, updates: Partial<UserType>) => void, onAddUser: (user: Partial<UserType>) => void, onUpdateRole?: (userId: string, newRole: UserRole, leaderOf?: string, adminRoleId?: string) => void, onUpdateMinistryLeaders?: (userId: string, ministryIds: string[]) => void, showMessage?: (msg: string) => void, initialTab?: 'members' | 'integration' }) => {
  const [activeTab, setActiveTab] = useState<'members' | 'integration'>(initialTab);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [newNote, setNewNote] = useState('');
  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserType & { ledMinistryIds?: string[] }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [visitorForm, setVisitorForm] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    address: ''
  });

  const membersList = users.filter(user => {
    if (user.role === 'superadmin' && currentUserRole !== 'superadmin') return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return user.name?.toLowerCase().includes(search) || user.email?.toLowerCase().includes(search) || user.phone?.includes(searchTerm);
    }
    return true;
  });

  const integrationList = users.filter(u => (u.memberStatus === 'new_member' || u.memberStatus === 'visitor') && 
    (searchTerm ? (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase())) : true)
  );

  const displayUsers = activeTab === 'members' ? membersList : integrationList;

  const handleAddVisitor = () => {
    if (!visitorForm.name || (!visitorForm.email && !visitorForm.phone)) {
      showMessage?.('Nome e e-mail/telefone são obrigatórios');
      return;
    }

    onAddUser({
      ...visitorForm,
      memberStatus: 'visitor',
      joinedAt: new Date().toISOString(),
      role: 'member',
      isPreRegistered: true,
      integrationNotes: [`${new Date().toLocaleDateString('pt-BR')}: Visitante criado pelo administrador.`]
    });

    setShowAddVisitor(false);
    setVisitorForm({ name: '', email: '', phone: '', birthDate: '', address: '' });
  };

  const handleUpdateStatus = (userId: string, status: MemberStatus) => {
    onUpdateUser(userId, { memberStatus: status });
    if (selectedUser?.id === userId) {
      setSelectedUser({ ...selectedUser, memberStatus: status });
    }
    showMessage?.(`Status atualizado para ${status}`);
  };

  const handleAddNote = () => {
    if (!selectedUser || !newNote.trim()) return;
    const notes = [...(selectedUser.integrationNotes || []), `${new Date().toLocaleDateString('pt-BR')}: ${newNote}`];
    onUpdateUser(selectedUser.id, { integrationNotes: notes });
    setSelectedUser({ ...selectedUser, integrationNotes: notes });
    setNewNote('');
    showMessage?.('Observação adicionada');
  };

  const handleStartEdit = (user: UserType) => {
    setSelectedUser(user);
    const ledMinistryIds = ministries.filter(m => m.leaderIds.includes(user.id)).map(m => m.id);
    setEditForm({ ...user, ledMinistryIds });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedUser) return;
    const { ledMinistryIds, ...userUpdates } = editForm;
    onUpdateUser(selectedUser.id, userUpdates);
    if (onUpdateMinistryLeaders && ledMinistryIds) {
      onUpdateMinistryLeaders(selectedUser.id, ledMinistryIds);
    }
    setSelectedUser({ ...selectedUser, ...userUpdates });
    setIsEditing(false);
    showMessage?.('Dados atualizados');
  };

  const getStatusColor = (status?: MemberStatus) => {
    switch (status) {
      case 'new_member': return 'bg-amber-50 text-amber-600';
      case 'visitor': return 'bg-blue-50 text-blue-600';
      case 'integrated': return 'bg-emerald-50 text-emerald-600';
      case 'active': return 'bg-primary-light text-primary';
      case 'inactive': return 'bg-slate-50 text-slate-400';
      default: return 'bg-slate-50 text-slate-600';
    }
  };

  if (selectedUser && !isEditing && activeTab === 'integration') {
    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-slate-100 rounded-full">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </button>
            <h2 className="text-xl font-bold text-slate-900">{selectedUser.name}</h2>
          </div>
          <button 
            onClick={() => { setEditForm(selectedUser); setIsEditing(true); }} 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <User className="w-4 h-4" />
            Completar Cadastro
          </button>
        </header>

        <Card className="space-y-4">
          <div className="flex justify-between items-center">
            <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider", getStatusColor(selectedUser.memberStatus))}>
              {selectedUser.memberStatus === 'new_member' ? 'Novo Membro' : 
               selectedUser.memberStatus === 'visitor' ? 'Visitante' :
               selectedUser.memberStatus === 'integrated' ? 'Integrado' : 
               selectedUser.memberStatus === 'active' ? 'Ativo' : 'Inativo'}
            </span>
            <span className="text-xs text-slate-400">Entrou em: {selectedUser.joinedAt ? new Date(selectedUser.joinedAt).toLocaleDateString('pt-BR') : 'N/A'}</span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase">Contato</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-700 font-medium">{selectedUser.phone || 'N/A'}</p>
                <div className="flex items-center gap-2">
                  <p className="text-slate-500 text-sm">{selectedUser.email}</p>
                  {selectedUser.birthDate && (
                    <span className="text-xs text-primary font-bold flex items-center gap-1">
                      <Cake className="w-3 h-3" />
                      {selectedUser.birthDate.split('-').reverse().join('/')}
                    </span>
                  )}
                </div>
              </div>
              {selectedUser.phone && (
                <a href={`https://wa.me/${selectedUser.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-3 bg-emerald-500 text-white rounded-full">
                  <MessageSquare className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-50">
            <p className="text-xs font-bold text-slate-400 uppercase">Ações de Integração</p>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleUpdateStatus(selectedUser.id, 'integrated')}
                className="py-2 px-3 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100"
              >
                Marcar como Integrado
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedUser.id, 'active')}
                className="py-2 px-3 bg-primary-light text-primary rounded-xl text-xs font-bold border border-primary/10"
              >
                Marcar como Ativo
              </button>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Observações</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Adicionar nota..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm"
            />
            <button onClick={handleAddNote} className="p-2 bg-primary text-white rounded-xl">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {selectedUser.integrationNotes?.slice().reverse().map((note, i) => (
              <div key={i} className="p-3 bg-white border border-slate-100 rounded-xl text-sm text-slate-600 shadow-sm">
                {note}
              </div>
            )) || <p className="text-center text-slate-400 text-sm py-4">Nenhuma observação ainda.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Gestão de Pessoas</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddVisitor(true)}
              className="p-2 bg-primary text-white rounded-full shadow-lg"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
          <button 
            onClick={() => { setActiveTab('members'); setSelectedUser(null); setIsEditing(false); }}
            className={cn("flex-1 py-3 rounded-xl text-sm font-bold transition-all", activeTab === 'members' ? "bg-white text-primary shadow-sm" : "text-slate-500")}
          >
            Membros ({membersList.length})
          </button>
          <button 
            onClick={() => { setActiveTab('integration'); setSelectedUser(null); setIsEditing(false); }}
            className={cn("flex-1 py-3 rounded-xl text-sm font-bold transition-all relative", activeTab === 'integration' ? "bg-white text-primary shadow-sm" : "text-slate-500")}
          >
            Consolidação ({integrationList.length})
            {integrationList.length > 0 && activeTab !== 'integration' && (
              <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </header>

      <div className="space-y-4">
        {displayUsers.map(user => (
          <Card key={user.id} className="flex items-center gap-4 p-3 hover:border-primary/30 cursor-pointer transition-all" onClick={() => {
            if (activeTab === 'integration') setSelectedUser(user);
            else handleStartEdit(user);
          }}>
            <img src={user.avatar || DEFAULT_AVATAR} className="w-12 h-12 rounded-full object-cover shadow-sm" alt={user.name} />
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">{user.name}</h4>
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-400">{user.email}</p>
                {user.birthDate && (
                  <span className="text-[9px] text-primary flex items-center gap-0.5 font-bold">
                    <Cake className="w-2.5 h-2.5" />
                    {user.birthDate.split('-').reverse().slice(0, 2).join('/')}
                  </span>
                )}
              </div>
              {activeTab === 'members' && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.role === 'leader' && user.leaderOf && (
                    <span className="text-[7px] bg-primary/10 text-primary px-1 py-0.5 rounded font-bold uppercase">
                      Líder: {cells.find(c => c.id === user.leaderOf)?.name}
                    </span>
                  )}
                  {ministries.filter(m => m.leaderIds.includes(user.id)).map(m => (
                    <span key={m.id} className="text-[7px] bg-teal-50 text-teal-600 px-1 py-0.5 rounded font-bold uppercase">
                      Ministério: {m.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className={cn("px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider", getStatusColor(user.memberStatus))}>
                {user.memberStatus === 'new_member' ? 'Novo' : 
                 user.memberStatus === 'visitor' ? 'Visitante' :
                 user.memberStatus === 'integrated' ? 'Integrado' : 
                 user.memberStatus === 'active' ? 'Ativo' : 'Inativo'}
              </span>
              {activeTab === 'members' && (
                <span className="text-[8px] text-slate-400 font-bold uppercase">{user.role}</span>
              )}
            </div>
          </Card>
        ))}
        {displayUsers.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-slate-500">Nenhum registro encontrado.</p>
          </div>
        )}
      </div>

      {showAddVisitor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in p-4">
          <Card className="w-full max-w-md rounded-3xl p-6 space-y-4">
            <header className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Novo Visitante</h3>
              <button onClick={() => setShowAddVisitor(false)} className="p-2 bg-slate-100 rounded-full"><LogOut className="w-5 h-5 rotate-180" /></button>
            </header>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nome</label>
                <input type="text" placeholder="Nome" value={visitorForm.name} onChange={e => setVisitorForm({...visitorForm, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data de Nascimento (Opcional)</label>
                <input type="date" value={visitorForm.birthDate} onChange={e => setVisitorForm({...visitorForm, birthDate: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">WhatsApp</label>
                <input type="tel" placeholder="Telefone" value={visitorForm.phone} onChange={e => setVisitorForm({...visitorForm, phone: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">E-mail</label>
                <input type="email" placeholder="E-mail" value={visitorForm.email} onChange={e => setVisitorForm({...visitorForm, email: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <Button className="w-full" onClick={handleAddVisitor}>Salvar</Button>
            </div>
          </Card>
        </div>
      )}

      {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in p-4">
          <Card className="w-full max-w-md rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <header className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Editar Usuário</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 bg-slate-100 rounded-full"><LogOut className="w-5 h-5 rotate-180" /></button>
            </header>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nome</label>
                <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Perfil (Cargo)</label>
                  <select 
                    value={editForm.role} 
                    onChange={e => {
                      const newRole = e.target.value as UserRole;
                      setEditForm({...editForm, role: newRole});
                      onUpdateRole?.(selectedUser!.id, newRole, editForm.leaderOf);
                    }}
                    disabled={currentUserRole !== 'superadmin' && editForm.role === 'superadmin'}
                    className="w-full p-3 bg-slate-50 rounded-xl"
                  >
                    <option value="member">Membro</option>
                    <option value="leader">Líder</option>
                    {(currentUserRole === 'superadmin' || currentUserRole === 'admin') && <option value="admin">Admin</option>}
                    {currentUserRole === 'superadmin' && <option value="superadmin">Super Admin</option>}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Status Eclesiástico</label>
                  <select 
                    value={editForm.memberStatus} 
                    onChange={e => setEditForm({...editForm, memberStatus: e.target.value as MemberStatus})}
                    className="w-full p-3 bg-slate-50 rounded-xl"
                  >
                    <option value="visitor">Visitante</option>
                    <option value="new_member">Novo Membro</option>
                    <option value="integrated">Integrado</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
              {editForm.role === 'leader' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Líder do PG</label>
                  <select 
                    value={editForm.leaderOf || ''} 
                    onChange={e => {
                      const cellId = e.target.value;
                      setEditForm({...editForm, leaderOf: cellId});
                      onUpdateRole?.(selectedUser!.id, 'leader', cellId);
                    }}
                    className="w-full p-3 bg-slate-50 rounded-xl"
                  >
                    <option value="">Nenhum</option>
                    {cells.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {editForm.role === 'admin' && adminRoles && adminRoles.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Perfil de Acesso do Admin</label>
                  <select 
                    value={editForm.adminRoleId || ''} 
                    onChange={e => {
                      const adminRoleId = e.target.value;
                      setEditForm({...editForm, adminRoleId});
                      onUpdateRole?.(selectedUser!.id, 'admin', undefined, adminRoleId);
                    }}
                    className="w-full p-3 bg-slate-50 rounded-xl"
                  >
                    <option value="">Acesso Completo</option>
                    {adminRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}
              {(editForm.role === 'leader' || editForm.role === 'admin' || editForm.role === 'superadmin') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Ministérios que Lidera</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ministries.map(m => (
                      <button
                        key={m.id}
                        onClick={() => {
                          const current = editForm.ledMinistryIds || [];
                          const updated = current.includes(m.id) 
                            ? current.filter(id => id !== m.id)
                            : [...current, m.id];
                          setEditForm({ ...editForm, ledMinistryIds: updated });
                        }}
                        className={cn(
                          "p-2 text-[10px] font-bold rounded-lg border text-left flex items-center justify-between",
                          editForm.ledMinistryIds?.includes(m.id)
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-slate-50 border-slate-200 text-slate-500"
                        )}
                      >
                        {m.name}
                        {editForm.ledMinistryIds?.includes(m.id) && <CheckCircle className="w-3 h-3" />}
                      </button>
                    ))}
                    {ministries.length === 0 && <p className="text-[10px] text-slate-400 col-span-2">Nenhum ministério cadastrado.</p>}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Data de Nascimento</label>
                <input type="date" value={editForm.birthDate || ''} onChange={e => setEditForm({...editForm, birthDate: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Telefone</label>
                <input type="tel" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">E-mail</label>
                <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl" />
              </div>
              <Button className="w-full" onClick={handleSaveEdit}>Salvar Alterações</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};


const Dashboard = ({ events, user, announcements, onTabChange, onShowDonation, onShowReadingPlans, onRequestPastoralVisit, onShareVerse, dailyVerse, isAdmin, onSwitchToAdmin, showMessage, onRefresh, cacheVersion }: { events: Event[], user: UserType | null, announcements: Announcement[], onTabChange: (tab: string) => void, onShowDonation: () => void, onShowReadingPlans: () => void, onRequestPastoralVisit: () => void, onShareVerse: (v: any) => void, dailyVerse: any, isAdmin?: boolean, onSwitchToAdmin?: () => void, showMessage?: (msg: string) => void, onRefresh?: () => Promise<void>, cacheVersion: number }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentVerseText, setCurrentVerseText] = useState(dailyVerse?.text || '');

  useEffect(() => {
    if (dailyVerse) {
      if (dailyVerse.text && !dailyVerse.text.startsWith('Carregando') && !dailyVerse.text.startsWith('Texto será')) {
        setCurrentVerseText(dailyVerse.text);
      } else {
        // Fetch text
        setCurrentVerseText('Carregando...');
        fetchVerseText(dailyVerse.ref, 'acf').then(text => {
          if (text) setCurrentVerseText(text);
        });
      }
    }
  }, [dailyVerse]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const verseDisplay = { 
    text: currentVerseText || ((dailyVerse?.text?.startsWith('Carregando') || dailyVerse?.text?.startsWith('Texto será')) ? dailyVerse?.text : "Carregando palavra do dia..."), 
    ref: dailyVerse?.ref || "..." 
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">Olá, {user?.name?.split(' ')[0] || 'Irmão'}!</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{APP_CONFIG.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRefresh}
            className={cn(
              "p-2 bg-white rounded-xl shadow-sm border border-slate-100 transition-all active:scale-95",
              isRefreshing && "animate-spin"
            )}
          >
            <RefreshCw className="w-5 h-5 text-slate-400" />
          </button>
          <button onClick={() => onTabChange('profile')} className="p-0.5 bg-white rounded-full shadow-sm border-2 border-primary/20">
            <img 
              src={user?.avatar || DEFAULT_AVATAR} 
              className="w-9 h-9 rounded-full object-cover" 
              alt="Perfil" 
            />
          </button>
        </div>
      </header>
      
      {user?.memberStatus === 'new_member' && (
      <Card className="bg-amber-50 border-amber-200 border-2 relative overflow-hidden group">
        <div className="relative z-10 flex gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
            <Heart className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900">Seja bem-vindo à {APP_CONFIG.shortName}!</h4>
            <p className="text-sm text-amber-700 leading-tight">Ficamos muito felizes em ter você aqui. Queremos te conhecer melhor!</p>
            <button 
              onClick={() => onTabChange('profile-edit')}
              className="text-[10px] font-bold text-amber-800 bg-white px-3 py-1.5 rounded-lg border border-amber-200 mt-2 shadow-sm hover:bg-amber-50 transition-colors uppercase tracking-wider"
            >
              Completar Cadastro
            </button>
          </div>
        </div>
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-100/50 rounded-full blur-2xl group-hover:bg-amber-100 transition-all"></div>
      </Card>
    )}

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Ações Rápidas</h3>
        <button className="text-primary text-sm font-bold">Ver todas</button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
        {[
          { icon: BookOpen, label: 'Planos', color: 'bg-emerald-500', action: onShowReadingPlans },
          { icon: Mic, label: 'Sermões', color: 'bg-orange-500', action: () => onTabChange('sermons') },
          { icon: Music, label: 'Ministérios', color: 'bg-teal-500', action: () => onTabChange('ministries') },
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
        <div className="flex gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 snap-x no-scrollbar">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="min-w-[280px] md:min-w-0 snap-start overflow-hidden border-slate-100 p-0">
              {announcement.imageUrl && (
                <img src={getCacheBustedUrl(announcement.imageUrl, cacheVersion)} alt={announcement.title} className="w-full h-32 object-cover" referrerPolicy="no-referrer" />
              )}
              <div className="p-4 space-y-2">
                <h4 className="font-bold text-slate-900">{announcement.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{announcement.content}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

    <div className="grid md:grid-cols-2 gap-6">
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Versículo do Dia</h3>
        <Card className="bg-primary text-white h-full relative overflow-hidden">
          <div className="relative z-10 space-y-4 flex flex-col justify-between h-full">
            <p className="text-lg italic font-medium leading-relaxed">
              "{verseDisplay.text}"
            </p>
            <div className="flex justify-between items-center mt-auto">
              <span className="font-bold">{verseDisplay.ref}</span>
              <Button 
                variant="secondary" 
                className="bg-white/20 text-white hover:bg-white/30 border-none"
                onClick={() => onShareVerse(verseDisplay)}
              >
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
        <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {events
            .filter(event => !isPastDate(event.date))
            .sort((a, b) => new Date(a.date + 'T00:00:00').getTime() - new Date(b.date + 'T00:00:00').getTime())
            .slice(0, 2)
            .map(event => (
            <Card key={event.id} className="p-0 overflow-hidden h-full relative">
              <img src={getCacheBustedUrl(event.image, cacheVersion)} className="w-full h-40 object-cover" alt={event.title} />
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
  </div>
);
}

const AnnouncementsScreen = ({ announcements, isAdmin, onDelete, onAdd, showMessage, cacheVersion }: { announcements: Announcement[], isAdmin?: boolean, onDelete?: (id: string) => void, onAdd?: () => void, showMessage?: (msg: string) => void, cacheVersion: number }) => (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-slate-900">Avisos</h2>
      <div className="flex gap-2">
        <button onClick={() => showMessage?.('Filtro em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <Filter className="w-5 h-5 text-slate-600" />
        </button>
        {isAdmin && (
          <button onClick={onAdd} className="p-2 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>

    <div className="space-y-4">
      {announcements.map(announcement => (
        <Card key={announcement.id} className="p-0 overflow-hidden border-slate-100">
          {announcement.imageUrl && (
            <img src={getCacheBustedUrl(announcement.imageUrl, cacheVersion)} alt={announcement.title} className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
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
const PrayingHands = ({ className = "w-6 h-6", active = false, cacheVersion = new Date().getTime() }: { className?: string, active?: boolean, cacheVersion?: number }) => {
  const iconSrc = active 
    ? (APP_CONFIG.customIcons?.prayerActive || "/icons/logo_oracao_active.png")
    : (APP_CONFIG.customIcons?.prayer || "/icons/logo_oracao.png");

  return (
    <img 
      src={getCacheBustedUrl(iconSrc, cacheVersion)} 
      alt="Oração" 
      className={cn("object-contain", className)} 
      onError={(e) => {
        // Fallback: se a imagem não existir, usa um ícone padrão de mãos dadas
        (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/2906/2906232.png';
        (e.target as HTMLImageElement).onerror = null; 
      }}
    />
  );
};

const EventsScreen = ({ events, isAdmin, onDelete, onEdit, onAdd, onShowOrações, showMessage, cacheVersion }: { events: Event[], isAdmin?: boolean, onDelete?: (id: string) => void, onEdit?: (e: Event) => void, onAdd?: () => void, onShowOrações?: () => void, showMessage?: (msg: string) => void, cacheVersion: number }) => {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [showArchived, setShowArchived] = useState(false);

  const filteredEvents = events.filter(e => {
    const matchesCategory = selectedCategory === 'Todos' || e.category === selectedCategory;
    const isPast = isPastDate(e.date);
    
    if (isAdmin) {
      if (showArchived) return matchesCategory && isPast;
      return matchesCategory && !isPast;
    }
    
    return matchesCategory && !isPast;
  }).sort((a, b) => {
    const dateA = new Date(a.date + 'T00:00:00').getTime();
    const dateB = new Date(b.date + 'T00:00:00').getTime();
    return showArchived ? dateB - dateA : dateA - dateB;
  });

  return (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <div className="flex flex-col">
        <h2 className="text-2xl font-bold text-slate-900">Agenda</h2>
        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl mt-2 w-fit">
            <button 
              onClick={() => setShowArchived(false)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-1.5",
                !showArchived ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 font-medium"
              )}
            >
              <Calendar className="w-3 h-3" />
              Atuais
            </button>
            <button 
              onClick={() => setShowArchived(true)}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center gap-1.5",
                showArchived ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700 font-medium"
              )}
            >
              <Archive className="w-3 h-3" />
              Arquivados
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={() => showMessage?.('Funcionalidade em desenvolvimento')} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">
          <Filter className="w-5 h-5 text-slate-600" />
        </button>
        {isAdmin ? (
          <button onClick={onAdd} className="p-2 bg-primary text-white rounded-xl shadow-lg flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        ) : (
          <button onClick={onShowOrações} className="p-2 bg-primary-light text-primary rounded-xl shadow-sm border border-primary/10">
            <PrayingHands className="w-5 h-5 text-primary" />
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

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredEvents.map(event => (
        <Card key={event.id} className={cn(
          "flex gap-4 p-3 h-full relative",
          isPastDate(event.date) && "opacity-75 grayscale-[0.3] bg-slate-50"
        )}>
          {isPastDate(event.date) && (
            <div className="absolute top-2 right-2 bg-slate-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest z-10">
              Arquivado
            </div>
          )}
          <img src={getCacheBustedUrl(event.image, cacheVersion)} className="w-24 h-24 rounded-xl object-cover" alt={event.title} />
          <div className="flex-1 flex flex-col justify-between py-1">
            <div>
              <h4 className="font-bold text-slate-900 leading-tight">{event.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{event.location}</p>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-primary text-xs font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(event.date)} {event.time ? `• ${event.time}` : ''}
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
      <h2 className="text-2xl font-bold text-slate-900">Orações</h2>
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

const stripHtml = (text: string) => {
  if (!text) return "";
  return text
    .replace(/<br\s*[\/]?>/gi, ' ')
    .replace(/<\/br>/gi, ' ')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

const BibleScreen = ({ onTabChange, showMessage, readingPlans, progress, highlights, onToggleHighlight, onShareVerse, fontSize }: { onTabChange?: (tab: string) => void, showMessage?: (msg: string) => void, readingPlans: ReadingPlan[], progress?: Record<string, string[]>, highlights?: VerseHighlight[], onToggleHighlight?: (book: string, chapter: number, verse: number, text: string, color: string) => void, onShareVerse?: (v: {text: string, ref: string}) => void, fontSize?: 'small' | 'normal' | 'large' | 'xl' }) => {
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [translation, setTranslation] = useState<string>(localStorage.getItem('bibleTranslation') || 'naa');
  const [verses, setVerses] = useState<{verse: number, text: string}[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState<'books' | 'verses'>('books');
  const [searchResults, setSearchResults] = useState<{book: string, chapter: number, verse: number, text: string}[]>([]);
  const [searching, setSearching] = useState(false);
  const [comparingVerse, setComparingVerse] = useState<{book: string, chapter: number, verse: number, text: string} | null>(null);
  const [comparingTexts, setComparingTexts] = useState<Record<string, string>>({});
  const [loadingCompare, setLoadingCompare] = useState(false);

  const verseFontSizeClasses = {
    small: 'text-[0.9rem]',
    normal: 'text-[1.05rem]',
    large: 'text-[1.3rem]',
    xl: 'text-[2.2rem]'
  };

  const currentVerseSize = verseFontSizeClasses[fontSize || 'normal'];

  const currentTranslation = BIBLE_TRANSLATIONS.find(t => t.id === translation) || BIBLE_TRANSLATIONS[0];

  const colors = [
    { name: 'Amarelo', value: 'bg-yellow-200' },
    { name: 'Verde', value: 'bg-green-200' },
    { name: 'Azul', value: 'bg-blue-200' },
    { name: 'Rosa', value: 'bg-pink-200' },
    { name: 'Laranja', value: 'bg-orange-200' },
  ];

  const lastReadBook = localStorage.getItem('lastReadBook') || 'Gênesis';
  const lastReadChapter = parseInt(localStorage.getItem('lastReadChapter') || '1', 10);

  const handleSelectChapter = async (book: string, chapter: number, transId?: string) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const tId = transId || translation;
    const t = BIBLE_TRANSLATIONS.find(tr => tr.id === tId) || BIBLE_TRANSLATIONS[0];
    
    setSelectedBook(book);
    setSelectedChapter(chapter);
    localStorage.setItem('lastReadBook', book);
    localStorage.setItem('lastReadChapter', chapter.toString());
    
    setLoadingVerses(true);
    setVerses([]);
    try {
      if (t.api === 'bolls') {
        const bookId = BIBLE_BOOKS.findIndex(b => b.name === book) + 1;
        const response = await fetch(`https://bolls.life/get-text/${t.bollsStr}/${bookId}/${chapter}/`, { signal });
        if (response.ok) {
          const data = await response.json();
          if (!signal.aborted) {
            setVerses(data.map((v: any) => ({ verse: v.verse, text: stripHtml(v.text) })));
          }
        } else {
          throw new Error('Fallback logic');
        }
      } else {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=${t.translation || 'almeida'}`, { signal });
        if (response.ok) {
          const data = await response.json();
          if (!signal.aborted) {
            setVerses(data.verses.map((v: any) => ({ ...v, text: stripHtml(v.text) })));
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      // Fallback
      try {
        const response = await fetch(`https://bible-api.com/${encodeURIComponent(book)}+${chapter}?translation=almeida`, { signal });
        const data = await response.json();
        if (!signal.aborted) {
          setVerses(data.verses.map((v: any) => ({ ...v, text: stripHtml(v.text) })));
        }
      } catch (e) {
        if (!signal.aborted) {
          setVerses([{ verse: 1, text: 'Erro ao carregar o texto bíblico. Verifique sua conexão.' }]);
        }
      }
    } finally {
      if (!signal.aborted) {
        setLoadingVerses(false);
      }
    }
  };

  const handleSearchVerses = async () => {
    if (!searchQuery || searchQuery.length < 3) {
      showMessage?.('Digite pelo menos 3 caracteres para buscar.');
      return;
    }
    setSearching(true);
    setSearchMode('verses');
    setSearchResults([]);
    
    try {
      const t = currentTranslation;
      let results: any[] = [];
      
      if (t.api === 'bolls') {
        const response = await fetch(`https://bolls.life/search/${t.bollsStr}/?search=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          results = data.map((r: any) => ({
            book: BIBLE_BOOKS[r.book - 1]?.name || `Livro ${r.book}`,
            chapter: r.chapter,
            verse: r.verse,
            text: stripHtml(r.text)
          }));
        }
      } else {
        // Fallback or another search API if needed
        // Since bible-api doesn't support search well, we use bolls ARA as fallback for search
        const response = await fetch(`https://bolls.life/search/ARA/?search=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        results = data.map((r: any) => ({
          book: BIBLE_BOOKS[r.book - 1]?.name || `Livro ${r.book}`,
          chapter: r.chapter,
          verse: r.verse,
          text: stripHtml(r.text)
        }));
      }
      
      setSearchResults(results);
      if (results.length === 0) showMessage?.('Nenhum resultado encontrado.');
    } catch (error) {
      showMessage?.('Erro ao realizar busca de versículos.');
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (selectedBook && selectedChapter) {
      handleSelectChapter(selectedBook, selectedChapter);
    }
  }, [translation, selectedBook, selectedChapter]);

  useEffect(() => {
    const fetchComparisons = async () => {
      if (!comparingVerse) return;
      setLoadingCompare(true);
      setComparingTexts({}); // clear old
      const newTexts: Record<string, string> = {};
      const chapterQuery = comparingVerse.chapter;
      const verseQuery = comparingVerse.verse;
      const actBook = comparingVerse.book;
      
      await Promise.all(BIBLE_TRANSLATIONS.map(async (t) => {
        try {
          if (t.api === 'bolls') {
            const bookId = BIBLE_BOOKS.findIndex(b => b.name === actBook) + 1;
            const res = await fetch(`https://bolls.life/get-text/${t.bollsStr}/${bookId}/${chapterQuery}/`);
            if (res.ok) {
              const data = await res.json();
              const verseData = data.find((v: any) => v.verse === verseQuery);
              if (verseData) {
                newTexts[t.id] = stripHtml(verseData.text);
              }
            }
          } else {
            const res = await fetch(`https://bible-api.com/${encodeURIComponent(actBook)}+${chapterQuery}:${verseQuery}?translation=${t.translation || 'almeida'}`);
            if (res.ok) {
              const data = await res.json();
              const verseData = data.verses?.[0];
              if (verseData) {
                newTexts[t.id] = stripHtml(verseData.text);
              } else {
                newTexts[t.id] = stripHtml(data.text);
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }));
      setComparingTexts(newTexts);
      setLoadingCompare(false);
    };
    fetchComparisons();
  }, [comparingVerse]);

  const filteredBooks = BIBLE_BOOKS.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const compareModal = (
    <AnimatePresence>
      {comparingVerse && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md md:max-w-xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm z-10">
              <h3 className="font-bold text-slate-900 flex-1">
                Comparar Traduções <br/><span className="text-sm font-normal text-slate-500">{comparingVerse.book} {comparingVerse.chapter}:{comparingVerse.verse}</span>
              </h3>
              <button
                onClick={() => setComparingVerse(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4">
              {BIBLE_TRANSLATIONS.map(t => (
                <Card key={t.id} className="p-4 bg-slate-50 border-none shadow-none space-y-2 relative">
                  <div className="absolute -top-3 left-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {t.id}
                  </div>
                  {loadingCompare && !comparingTexts[t.id] ? (
                    <div className="h-10 flex items-center pt-2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-700 pt-2 leading-relaxed font-serif">
                      {comparingTexts[t.id] || "Tradução não disponível."}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (selectedChapter) {
    return (
      <div className="space-y-6 pb-24">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedChapter(null)} className="p-2 hover:bg-slate-100 rounded-full">
              <Plus className="w-6 h-6 rotate-45 text-slate-400" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{selectedBook} {selectedChapter}</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase">{currentTranslation.name}</p>
            </div>
          </div>
          <select 
            value={translation}
            onChange={(e) => {
              setTranslation(e.target.value);
              localStorage.setItem('bibleTranslation', e.target.value);
            }}
            className="text-[10px] font-bold bg-slate-50 border-none rounded-lg py-2 px-3 focus:ring-0"
          >
            {BIBLE_TRANSLATIONS.map(t => (
              <option key={t.id} value={t.id}>{t.id.toUpperCase()}</option>
            ))}
          </select>
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
                        "text-slate-700 leading-relaxed p-1 rounded transition-all cursor-pointer hover:bg-slate-50",
                        currentVerseSize,
                        highlight?.color
                      )}
                      onClick={() => setSelectedVerse(selectedVerse === v.verse ? null : v.verse)}
                    >
                      <span className="font-bold text-primary mr-2 text-[0.8em]">{v.verse}</span>
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
                        <div className="w-px h-6 bg-slate-100 mx-1 self-center"></div>
                        <button
                          onClick={() => {
                            onShareVerse?.({ 
                              text: v.text, 
                              ref: `${selectedBook} ${selectedChapter}:${v.verse}` 
                            });
                            setSelectedVerse(null);
                          }}
                          className="w-8 h-8 rounded-full border border-slate-200 bg-sky-50 flex items-center justify-center text-sky-600 hover:bg-sky-100 transition-colors"
                          title="Gerar Arte"
                        >
                          <Image className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setComparingVerse({
                              book: selectedBook!,
                              chapter: selectedChapter!,
                              verse: v.verse,
                              text: v.text
                            });
                            setSelectedVerse(null);
                          }}
                          className="w-8 h-8 rounded-full border border-slate-200 bg-amber-50 flex items-center justify-center text-amber-600 hover:bg-amber-100 transition-colors"
                          title="Comparar Traduções"
                        >
                          <GitCompare className="w-4 h-4" />
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
        {compareModal}
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
        {compareModal}
      </div>
    );
  }

  const activePlans = readingPlans.filter(plan => progress?.[plan.id]?.length);

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Bíblia Sagrada</h2>
          <select 
            value={translation}
            onChange={(e) => {
              setTranslation(e.target.value);
              localStorage.setItem('bibleTranslation', e.target.value);
            }}
            className="text-[10px] font-bold bg-white border border-slate-100 rounded-lg py-2 px-3 focus:ring-0 shadow-sm"
          >
            {BIBLE_TRANSLATIONS.map(t => (
              <option key={t.id} value={t.id}>{t.id.toUpperCase()}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              placeholder={searchMode === 'books' ? "Buscar livro ou trecho..." : "Buscar nos versículos..."}
              className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                if (searchMode === 'verses' && e.target.value === '') setSearchMode('books');
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (filteredBooks.length === 1 && searchQuery.toLowerCase() === filteredBooks[0].name.toLowerCase()) {
                    setSelectedBook(filteredBooks[0].name);
                  } else {
                    handleSearchVerses();
                  }
                }
              }}
            />
          </div>
          <button 
            onClick={() => searchMode === 'verses' ? setSearchMode('books') : handleSearchVerses()}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-colors",
              searchMode === 'verses' ? "bg-slate-100 text-slate-600" : "bg-primary text-white"
            )}
          >
            {searching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : searchMode === 'verses' ? 'Limpar' : 'Buscar'}
          </button>
        </div>
      </header>

      {searchMode === 'verses' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Resultados da Busca</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase">{searchResults.length} encontrados</span>
          </div>
          <div className="space-y-3">
            {searchResults.map((res, i) => (
              <Card key={i} className="p-4 space-y-2 cursor-pointer hover:bg-slate-50" onClick={() => handleSelectChapter(res.book, res.chapter)}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-primary uppercase">{res.book} {res.chapter}:{res.verse}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setComparingVerse({ book: res.book, chapter: res.chapter, verse: res.verse, text: res.text });
                      }}
                      className="p-1.5 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                      title="Comparar Traduções"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareVerse?.({ text: res.text, ref: `${res.book} ${res.chapter}:${res.verse}` });
                      }}
                      className="p-1.5 hover:bg-sky-50 text-sky-600 rounded-lg transition-colors"
                      title="Gerar Arte"
                    >
                      <Image className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-tight">{res.text}</p>
              </Card>
            ))}
            {searchResults.length === 0 && !searching && (
              <div className="text-center py-12 space-y-2">
                <Search className="w-8 h-8 text-slate-200 mx-auto" />
                <p className="text-slate-400 text-sm">Nenhum versículo encontrado para "{searchQuery}"</p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
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
        </>
      )}

      {searchMode === 'books' && (
        <>
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
            {searchQuery && searchQuery.length >= 3 && (
              <Card 
                className="p-4 flex items-center justify-between bg-primary/5 border-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={handleSearchVerses}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Pesquisar nos versículos</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Procurar por "{searchQuery}" em toda a Bíblia</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary" />
              </Card>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
        </>
      )}

      {compareModal}
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

const AdminDashboard = ({ stats, users = [], verseStats, onAddEvent, onAddAnnouncement, onAddReadingPlan, onAddTransaction, onSwitchToMember, onTabChange, showMessage }: { stats: any, users: UserType[], verseStats: any, onAddEvent: () => void, onAddAnnouncement: () => void, onAddReadingPlan: () => void, onAddTransaction: () => void, onSwitchToMember?: () => void, onTabChange?: (tab: string) => void, showMessage?: (msg: string) => void }) => {
  const [showBirthdays, setShowBirthdays] = useState<'today' | 'month' | null>(null);

  const birthdays = React.useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const monthBirthdays = (users || []).filter(u => {
      if (!u.birthDate || typeof u.birthDate !== 'string') return false;
      const parts = u.birthDate.split('-');
      if (parts.length < 3) return false;
      const month = parseInt(parts[1]);
      return month === currentMonth;
    });

    const todayBirthdays = monthBirthdays.filter(u => {
      const parts = u.birthDate!.split('-');
      const day = parseInt(parts[2]);
      return day === currentDay;
    });

    return { today: todayBirthdays, month: monthBirthdays };
  }, [users]);

  const formatDate = (dateString?: string) => {
    if (!dateString || typeof dateString !== 'string') return '';
    const parts = dateString.split('-');
    if (parts.length < 3) return dateString;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
  <div className="space-y-6 pb-24">
    <header className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">GESTÃO</h2>
        <p className="text-slate-500">Gestão da {APP_CONFIG.name}</p>
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

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <Card className="bg-emerald-50 border-emerald-100 p-4 space-y-2 cursor-pointer hover:bg-emerald-100 transition-all" onClick={() => onTabChange?.('users_members')}>
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Membros</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.members || 0}</p>
        </div>
      </Card>
      
      <Card className="bg-amber-50 border-amber-100 p-4 space-y-2 cursor-pointer hover:bg-amber-100 transition-all" onClick={() => onTabChange?.('users_integration')}>
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white relative">
          <Users className="w-6 h-6" />
          {users.filter(u => u.memberStatus === 'new_member' || u.memberStatus === 'visitor').length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce">
              {users.filter(u => u.memberStatus === 'new_member' || u.memberStatus === 'visitor').length}
            </span>
          )}
        </div>
        <div>
          <p className="text-xs text-amber-600 font-bold uppercase tracking-widest">Consolidação</p>
          <p className="text-2xl font-bold text-slate-900">{users.filter(u => u.memberStatus === 'new_member' || u.memberStatus === 'visitor').length}</p>
        </div>
      </Card>

      <Card className="bg-blue-50 border-blue-100 p-4 space-y-2 cursor-pointer hover:bg-blue-100 transition-all" onClick={() => onTabChange?.('financial')}>
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white">
          <DollarSign className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Financeiro</p>
          <p className="text-xl font-bold text-slate-900">R$ {(stats?.balance || 0).toLocaleString()}</p>
        </div>
      </Card>

      <Card className="bg-purple-50 border-purple-100 p-4 space-y-2 cursor-pointer hover:bg-purple-100 transition-all" onClick={() => onTabChange?.('events')}>
        <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Agenda</p>
          <p className="text-2xl font-bold text-slate-900">{stats?.events || 0}</p>
        </div>
      </Card>

      <Card className="bg-indigo-50 border-indigo-100 p-4 space-y-2 cursor-pointer hover:bg-indigo-100 transition-all" onClick={() => onTabChange?.('bible')}>
        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Versículos</p>
          <p className="text-2xl font-bold text-slate-900">{verseStats?.total || 0}</p>
          {verseStats?.today && (
            <p className="text-[10px] text-indigo-400 font-medium truncate">Hoje: {verseStats.today.ref}</p>
          )}
        </div>
      </Card>
    </div>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Próximo Versículo</h3>
        <button onClick={() => onTabChange?.('bible')} className="text-primary text-sm font-bold">Gerenciar Bíblia</button>
      </div>
      <Card className="p-5 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
        {verseStats?.tomorrow ? (
          <div className="flex justify-between items-center gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Programado para amanhã</p>
              <h4 className="text-xl font-bold text-slate-900">{verseStats.tomorrow.ref}</h4>
              <p className="text-sm text-slate-500 italic line-clamp-1">"{verseStats.tomorrow.text}"</p>
            </div>
            <button onClick={() => onTabChange?.('bible')} className="shrink-0 p-3 bg-white shadow-sm border border-indigo-100 rounded-xl text-indigo-500 hover:text-indigo-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-2 text-center space-y-2">
            <p className="text-sm text-slate-500">Nenhum versículo programado para amanhã.</p>
            <button onClick={() => onTabChange?.('bible')} className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">Cadastrar Agora</button>
          </div>
        )}
      </Card>
    </section>

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
            {(birthdays.today || []).length > 0 ? (
              birthdays.today.slice(0, 3).map(u => (
                <div key={u.id} className="flex items-center gap-2">
                  <img src={u.avatar || DEFAULT_AVATAR} alt={u.name} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-xs font-medium text-slate-700 truncate">{u.name}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Ninguém hoje</p>
            )}
            {(birthdays.today || []).length > 3 && (
              <p className="text-xs text-primary font-medium">+{(birthdays.today || []).length - 3} outros</p>
            )}
          </div>
        </Card>
        <Card className="p-4 bg-white border-slate-100 cursor-pointer hover:border-primary/20 transition-colors" onClick={() => setShowBirthdays('month')}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Este Mês</p>
          <p className="text-2xl font-bold text-primary">{(birthdays.month || []).length}</p>
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
                <img src={u.avatar || DEFAULT_AVATAR} alt={u.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
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
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-5 gap-3">
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
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Palavra do Dia</h3>
          <button onClick={() => onTabChange?.('bible')} className="text-xs font-bold text-primary px-3 py-1 bg-primary/10 rounded-lg">Gerenciar Todos</button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
           <Card className="p-4 border-slate-100 space-y-2">
             <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">De Hoje</span>
             </div>
             <p className="text-sm font-medium text-slate-700 italic">"{verseStats?.today?.text || 'Não definido'}"</p>
             <p className="text-xs font-bold text-slate-400">{verseStats?.today?.ref}</p>
           </Card>
           <Card className="p-4 border-slate-100 space-y-2 group relative">
             <div className="flex items-center gap-2 mb-1">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">De Amanhã</span>
             </div>
             <p className="text-sm font-medium text-slate-700 italic">"{verseStats?.tomorrow?.text || 'Não definido'}"</p>
             <p className="text-xs font-bold text-slate-400">{verseStats?.tomorrow?.ref}</p>
             <button 
               onClick={() => showMessage?.('Para trocar o versículo de amanhã, edite-o na lista de versículos ou adicione um novo para alterar a ordem.')}
               className="absolute top-2 right-2 p-1.5 bg-slate-50 text-slate-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:text-primary"
             >
               <Edit2 className="w-3.5 h-3.5" />
             </button>
           </Card>
        </div>
      </section>

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
            <p className="text-xs text-slate-500">Saldo: R$ {(stats.balance || 0).toLocaleString()}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </div>
      </Card>
    </section>
  </div>
  );
};

const AdminHostingScreen = () => {
  const [sysInfo, setSysInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    const fetchInfo = async () => {
      try {
        const info = await api.getSysInfo();
        if (mounted) {
          setSysInfo(info);
          setLoading(false);
        }
      } catch (e) {
        console.error("Erro ao buscar sysinfo", e);
        if (mounted) setLoading(false);
      }
    };
    fetchInfo();
    const interval = setInterval(fetchInfo, 5000); // refresh every 5s
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const response = await fetch(getApiUrl('/backup/zip'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Falha ao baixar backup');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      a.download = `backup-dia${day}-as-${hour}hrs.zip`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Erro ao fazer backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: Importar um backup irá SUBSTITUIR TODOS os dados atuais (usuários, eventos, etc). Esta ação não pode ser desfeita. Deseja continuar?')) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(getApiUrl('/backup/import'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Erro ao importar');
      
      alert('Bakup importado com sucesso! O sistema irá recarregar para aplicar as mudanças.');
      window.location.reload();
    } catch (e) {
      alert('Erro ao importar arquivo');
      console.error(e);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hrs = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days > 0 ? days + 'd ' : ''}${hrs}h ${mins}m`;
  };

  const [isUpdating, setIsUpdating] = useState(false);
  const [cloudConfig, setCloudConfig] = useState<any>({
    id: 'cloudBackup',
    telegramEnabled: false,
    telegramToken: '',
    telegramChatId: ''
  });
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchCloudConfig = async () => {
      try {
        const configs = await api.list('config');
        const cloud = configs.find((c: any) => c.id === 'cloudBackup');
        if (mounted && cloud) {
          setCloudConfig(cloud);
        }
      } catch (e) {
        console.error("Erro ao buscar cloud backup config", e);
      }
    };
    fetchCloudConfig();
    return () => { mounted = false; };
  }, []);

  const handleSaveCloudConfig = async () => {
    setIsSavingCloud(true);
    try {
      const configs = await api.list('config');
      const cloud = configs.find((c: any) => c.id === 'cloudBackup');
      if (cloud) {
        await api.update('config', cloud.id, cloudConfig);
      } else {
        await api.create('config', cloudConfig);
      }
      alert('Configuração de nuvem salva com sucesso!');
    } catch (e) {
      alert('Erro ao salvar configuração');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!cloudConfig.telegramToken || !cloudConfig.telegramChatId) {
      alert('Preencha os campos do Telegram primeiro.');
      return;
    }
    alert('Tentando enviar o backup atual para o seu Telegram. Aguarde alguns segundos...');
    try {
      // Usaremos o endpoint que já existe de gerar backup diário, mas modificado ou um novo
      // Por simplicidade, vamos apenas avisar que o próximo backup diário usará essas configs
      // Ou melhor, podemos criar um endpoint /api/backup/test-cloud
      await api.request('/backup/test-cloud', { method: 'POST' });
      alert('Teste concluído! Verifique seu Telegram.');
    } catch (e) {
      alert('Erro no teste. Verifique o Token e o Chat ID.');
    }
  };

  const handleResetWhatsApp = async () => {
    if (!confirm('Deseja realmente reiniciar a conexão do WhatsApp? Isso pode levar um minuto.')) return;
    try {
      await api.request('/whatsapp/reset', { method: 'POST' });
      alert('Comando enviado! O servidor está reiniciando a conexão. Verifique o status na tela de Configuração do WhatsApp em instantes.');
    } catch (e) {
      alert('Erro ao enviar comando de reinicialização');
    }
  };

  const handleGitUpdate = async () => {
    if (!confirm('Deseja puxar as últimas atualizações do Git? O servidor pode ficar instável por alguns segundos.')) return;
    setIsUpdating(true);
    try {
      const response = await api.request('/system/update', { method: 'POST' });
      alert('Código sincronizado com sucesso!\n\nO servidor está reiniciando agora para aplicar as mudanças. Aguarde cerca de 10 segundos e atualize a página.');
      window.location.reload();
    } catch (e: any) {
      alert('Erro ao atualizar: ' + (e.message || 'Falha na conexão'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Servidor</h2>
          <p className="text-sm font-medium text-slate-500">Métricas de saúde e backups</p>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".zip" 
            className="hidden" 
          />
          <Button onClick={handleBackup} disabled={isBackingUp} className="flex items-center gap-2">
            {isBackingUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download Backup ZIP
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-slate-800 text-white border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Cpu className="w-16 h-16" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Carga da CPU (1m)</h3>
            <div className="text-3xl font-black mb-2">
              {loading ? '--' : (sysInfo?.loadAvg?.[0]?.toFixed(2) || 'N/A')}
            </div>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", (sysInfo?.loadAvg?.[0] || 0) > 2 ? 'bg-red-500' : 'bg-primary')} 
                style={{ width: `${Math.min((sysInfo?.loadAvg?.[0] || 0) * 10, 100)}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 text-white border-none relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <HardDrive className="w-16 h-16" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Uso de RAM</h3>
            <div className="text-3xl font-black mb-2">
              {loading ? '--' : `${sysInfo?.memoryUsage || 0}%`}
            </div>
            <p className="text-xs text-slate-400 mb-2">
              {loading ? '--' : `${formatBytes((sysInfo?.totalMemory || 0) - (sysInfo?.freeMemory || 0))} / ${formatBytes(sysInfo?.totalMemory || 0)}`}
            </p>
            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-500", (sysInfo?.memoryUsage || 0) > 85 ? 'bg-red-500' : ((sysInfo?.memoryUsage || 0) > 70 ? 'bg-amber-500' : 'bg-green-500'))} 
                style={{ width: `${sysInfo?.memoryUsage || 0}%` }}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-slate-800 text-white border-none relative overflow-hidden flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Server className="w-16 h-16" />
          </div>
          <div className="relative z-10">
            <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Status do Sistema</h3>
            <div className="text-2xl font-black text-amber-400">
              {loading ? '--' : (sysInfo?.uptime ? formatUptime(sysInfo.uptime) : 'Online')}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">Tempo Online (OS)</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
               <h3 className="font-black text-slate-900 tracking-tight text-lg">Controle de Serviços</h3>
               <p className="text-xs text-slate-500 font-medium">Reinicialização de módulos</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Use esta opção se a conexão do WhatsApp travar ou o QR Code não aparecer.
            </p>
            <Button onClick={handleResetWhatsApp} variant="secondary" className="w-full flex items-center justify-center gap-2 bg-amber-50 text-amber-700 border-amber-200 h-12 rounded-xl">
              <RefreshCw className="w-4 h-4" />
              Resetar Conexão WhatsApp
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
               <h3 className="font-black text-slate-900 tracking-tight text-lg">Gestão de Código</h3>
               <p className="text-xs text-slate-500 font-medium">Atualização via GitHub</p>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Sincroniza o servidor com a última versão do seu repositório Git.
            </p>
            <Button 
              onClick={handleGitUpdate} 
              disabled={isUpdating}
              variant="secondary" 
              className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 h-12 rounded-xl"
            >
              {isUpdating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
              {isUpdating ? 'Atualizando...' : 'Puxar Atualizações (Git)'}
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
             <h3 className="font-black text-slate-900 tracking-tight text-lg">Documentação do Sistema</h3>
             <p className="text-xs text-slate-500 font-medium">Guias técnicos e log de mudanças</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'funcionalidades.txt', label: 'Funcionalidades', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
            { id: 'arquivos_e_imagens.txt', label: 'Imagens e Ativos', icon: Image, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { id: 'atualizacoes.txt', label: 'Changelog', icon: RefreshCw, color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map(doc => (
            <button
              key={doc.id}
              onClick={async () => {
                try {
                  const data = await api.request(`/docs/${doc.id}`);
                  alert(`--- ${doc.label} ---\n\n${data.content}`);
                } catch (e) {
                  alert('Erro ao carregar documento.');
                }
              }}
              className="flex flex-col items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 group"
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform", doc.bg, doc.color)}>
                <doc.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-slate-700">{doc.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
               <h3 className="font-black text-slate-900 tracking-tight text-lg">Dados e Restauração</h3>
               <p className="text-xs text-slate-500 font-medium">Importação manual de backups</p>
            </div>
          </div>
          <Button 
            onClick={handleImportClick} 
            disabled={isImporting}
            variant="outline"
            className="flex items-center gap-2 rounded-xl"
          >
            {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importar Arquivo .ZIP
          </Button>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-xs text-amber-800 flex gap-3">
          <Shield className="w-5 h-5 shrink-0" />
          <p><b>CUIDADO:</b> Ao importar um backup, todos os dados atuais (membros, finanças, configurações) serão <b>substituídos</b> permanentemente pelo conteúdo do arquivo.</p>
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
             <h3 className="font-black text-slate-900 tracking-tight text-lg">Cloud Backup & Automação</h3>
             <p className="text-xs text-slate-500 font-medium">Link do backup com plataformas externas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-sky-500 text-white rounded-lg flex items-center justify-center">
                      <Send className="w-4 h-4" />
                   </div>
                   <span className="font-bold text-slate-800">Telegram Bot</span>
                </div>
                <button 
                  onClick={() => setCloudConfig({...cloudConfig, telegramEnabled: !cloudConfig.telegramEnabled})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${cloudConfig.telegramEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${cloudConfig.telegramEnabled ? 'translate-x-6' : ''}`} />
                </button>
             </div>

             {cloudConfig.telegramEnabled && (
                <div className="space-y-3 pt-2">
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Bot Token API</label>
                      <input 
                        type="password"
                        value={cloudConfig.telegramToken}
                        onChange={(e) => setCloudConfig({...cloudConfig, telegramToken: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                        placeholder="Ex: 728394012:AAH..."
                      />
                   </div>
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Chat ID / Grupo ID</label>
                      <input 
                        type="text"
                        value={cloudConfig.telegramChatId}
                        onChange={(e) => setCloudConfig({...cloudConfig, telegramChatId: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                        placeholder="Ex: -100492837482"
                      />
                   </div>
                   <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveCloudConfig} disabled={isSavingCloud} className="flex-1 rounded-xl h-12">
                         {isSavingCloud ? 'Salvando...' : 'Salvar'}
                      </Button>
                      <Button onClick={handleTestTelegram} variant="secondary" className="flex-1 rounded-xl h-12 bg-white border-slate-200">
                         Testar Envio
                      </Button>
                   </div>
                   <div className="p-3 bg-sky-50 rounded-lg text-[10px] text-sky-700 leading-normal flex gap-2">
                      <Shield className="w-4 h-4 shrink-0" />
                      <span>Configure um Bot no @BotFather e pegue seu ChatID com o @userinfobot. Os backups diários serão enviados automaticamente.</span>
                   </div>
                </div>
             )}
          </div>

          <div className="space-y-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center text-center">
             <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <HardDrive className="w-6 h-6" />
             </div>
             <h4 className="font-bold text-slate-800">Google Drive & Dropbox</h4>
             <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
               Para sincronização profissional com o Drive, recomendamos instalar o <b>Rclone</b> no seu Linux. É mais rápido, seguro e automático.
             </p>
             <div className="pt-2">
                <a href="https://rclone.org/drive/" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Ver tutorial Rclone</a>
             </div>
          </div>
        </div>
      </Card>

      <div className="mt-8">
        <button 
          onClick={() => setShowTutorial(!showTutorial)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <LogOut className="w-5 h-5 -rotate-90" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-800">Tutorial de Migração / Deploy</h3>
              <p className="text-xs text-slate-500">Aprenda a hospedar seu sistema passo a passo</p>
            </div>
          </div>
          {showTutorial ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
        </button>

        <AnimatePresence>
          {showTutorial && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4">
                <Card className="border-l-4 border-l-blue-500">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">1. Preparando o Servidor (Ubuntu 24.04/22.04)</h3>
                  <p className="text-sm text-slate-600 mb-4 tracking-tight">Execute estes comandos via SSH para instalar o Node.js e as bibliotecas necessárias para o WhatsApp:</p>
                  <div className="bg-slate-900 p-4 rounded-xl overflow-x-auto">
                    <code className="text-xs text-green-400 whitespace-pre">
{`# 1. Atualize o sistema
sudo apt update && sudo apt upgrade -y

# 2. Instale Node.js 20.x e dependências
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git chromium-browser

# 3. Instale TODAS as bibliotecas do Chrome (Essencial para o WhatsApp)
sudo apt-get install -y ca-certificates fonts-liberation libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils`}
                    </code>
                  </div>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">2. Rodando o App com WhatsApp Estável</h3>
                  <p className="text-sm text-slate-600 mb-4 tracking-tight">Para o WhatsApp não falhar, inicie o app apontando para o navegador que instalamos:</p>
                  <div className="bg-slate-900 p-4 rounded-xl overflow-x-auto">
                    <code className="text-xs text-green-400 whitespace-pre">
{`# Entre na pasta do seu app
npm install
sudo npm install -g pm2
npm run build

# Inicie com o CHROME_PATH definido (Ubuntu 24/22)
export CHROME_PATH=/usr/bin/chromium-browser
export NODE_ENV=production
export PORT=3000
pm2 start dist/server.cjs --name "igreja-app"

# Salve para iniciar no boot
pm2 save && pm2 startup`}
                    </code>
                  </div>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">3. NGINX + Cloudflare (SSL Loop Fix)</h3>
                  <p className="text-sm text-slate-600 mb-4 tracking-tight text-red-600 font-bold">Importante: No painel da CLOUDFLARE, mude o SSL/TLS para "Full (Strict)".</p>
                  <div className="bg-slate-900 p-4 rounded-xl overflow-x-auto">
                    <code className="text-xs text-green-400 whitespace-pre">
{`# Arquivo /etc/nginx/sites-available/igreja (ou app-igreja)
server {
    listen 80;
    server_name seudominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Habilite e adicione SSL
sudo ln -s /etc/nginx/sites-available/igreja /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
sudo certbot --nginx -d seudominio.com.br`}
                    </code>
                  </div>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <h3 className="font-bold text-lg text-slate-800 mb-2">4. Dica: Se o domínio não apontar no App</h3>
                  <ul className="text-sm text-slate-600 list-disc ml-4 space-y-2">
                    <li>Verifique se você alterou o <code className="bg-slate-100 rounded px-1">src/themeConfig.ts</code> para o NOVO domínio.</li>
                    <li>Sempre que mudar o domínio no código, você PRECISA rodar <code className="bg-slate-100 rounded px-1">npm run build</code> e reiniciar o app no VPS.</li>
                  </ul>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

const AdminAllScreens = ({ onTabChange, isTabAllowed }: { onTabChange: (tab: string) => void, isTabAllowed: (id: string) => boolean }) => {
  const screens = [
    { id: 'home', label: 'Dashboard Principal', icon: PieChart, color: 'bg-slate-800' },
    { id: 'financial', label: 'Gestão Financeira', icon: DollarSign, color: 'bg-amber-500' },
    { id: 'prayer', label: 'Orações', icon: PrayingHands, color: 'bg-red-500' },
    { id: 'users', label: 'Gestão de Pessoas', icon: Users, color: 'bg-blue-500' },
    { id: 'ministries', label: 'Ministérios e Escalas', icon: Music, color: 'bg-teal-500' },
    { id: 'readingPlans', label: 'Planos de Leitura', icon: TrendingUp, color: 'bg-emerald-500' },
    { id: 'events', label: 'Agenda de Eventos', icon: Calendar, color: 'bg-purple-500' },
    { id: 'announcements', label: 'Avisos e Notícias', icon: Bell, color: 'bg-orange-500' },
    { id: 'groups', label: 'Pequenos Grupos', icon: Home, color: 'bg-indigo-500' },
    { id: 'pastoral', label: 'Visitas Pastorais', icon: Heart, color: 'bg-rose-500' },
    { id: 'sermons', label: 'Gerenciar Sermões', icon: Mic, color: 'bg-orange-600' },
    { id: 'tithes', label: 'Configuração de Dízimos', icon: DollarSign, color: 'bg-emerald-600' },
    { id: 'admin_roles', label: 'Perfis de Acesso Adm', icon: Shield, color: 'bg-red-600' },
    { id: 'hosting', label: 'Servidor e Backups', icon: Server, color: 'bg-slate-700' },
  ].filter(s => isTabAllowed(s.id));

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

const AdminFinancial = ({ 
  transactions, 
  funds,
  balance, 
  onAdd, 
  onDelete, 
  onAddFund,
  onDeleteFund,
  onImportTransactions,
  onSaveRule,
  showMessage 
}: { 
  transactions: FinancialTransaction[], 
  funds: FinancialFund[],
  balance: number, 
  onAdd: () => void, 
  onDelete: (id: string) => void,
  onAddFund: (name: string, description: string) => Promise<void>,
  onDeleteFund: (id: string) => Promise<void>,
  onImportTransactions: (newTransactions: Partial<FinancialTransaction>[]) => Promise<void>,
  onSaveRule: (keyword: string, category: string) => Promise<void>,
  showMessage?: (msg: string) => void 
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions' | 'funds' | 'import'>('summary');
  const [showAddFund, setShowAddFund] = useState(false);
  const [newFundName, setNewFundName] = useState('');
  const [newFundDesc, setNewFundDesc] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Filters for Transactions tab
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFund, setFilterFund] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      let tMonth = -1;
      let tYear = -1;
      if (t.date.includes('/')) {
        const parts = t.date.split('/');
        if (parts.length === 3) {
          tMonth = parseInt(parts[1], 10);
          tYear = parseInt(parts[2], 10);
        }
      } else if (t.date.includes('-')) {
        const parts = t.date.split('-');
        if (parts.length === 3) {
          tYear = parseInt(parts[0], 10);
          tMonth = parseInt(parts[1], 10);
        }
      }
      
      const passDate = (tMonth === -1) || (tMonth === filterMonth && tYear === filterYear);
      const passType = filterType === 'all' || t.type === filterType;
      const passCat = filterCategory === 'all' || (t.category || 'Geral') === filterCategory;
      const passFund = filterFund === 'all' || (t.fundId || 'main') === filterFund;
      const passSearch = t.label.toLowerCase().includes(searchQuery.toLowerCase());
      
      return passDate && passType && passCat && passFund && passSearch;
    });
  }, [transactions, filterMonth, filterYear, filterType, filterCategory, filterFund, searchQuery]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => cats.add(t.category || 'Geral'));
    return Array.from(cats).sort();
  }, [transactions]);

  const exportTransactionsCSV = () => {
    let csv = "Data,Identificador,Categoria,Fundo,Tipo,Valor\n";
    filteredTransactions.forEach(t => {
      const fund = funds.find(f => f.id === t.fundId)?.name || 'Geral/Principal';
      const typeStr = t.type === 'in' ? 'Entrada' : 'Saida';
      const safeLabel = t.label.replace(/"/g, '""');
      csv += `${t.date},"${safeLabel}","${t.category || 'Geral'}","${fund}","${typeStr}",${t.value}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_${filterMonth}_${filterYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => {
      const cat = t.category || 'Geral';
      counts[cat] = (counts[cat] || 0) + (t.type === 'in' ? t.value : -t.value);
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: Math.abs(value), originalValue: value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const groups: Record<string, { in: number, out: number }> = {};
    transactions.slice(0, 100).forEach(t => {
      const date = new Date(t.date);
      const key = isNaN(date.getTime()) ? t.date.split('/')[1] || 'Mês' : date.toLocaleString('pt-BR', { month: 'short' });
      if (!groups[key]) groups[key] = { in: 0, out: 0 };
      if (t.type === 'in') groups[key].in += t.value;
      else groups[key].out += t.value;
    });
    return Object.entries(groups).map(([name, data]) => ({ name, ...data })).reverse();
  }, [transactions]);

  // Import related state
  const [importData, setImportData] = useState<any[]>([]);
  const [importMapping, setImportMapping] = useState({
    date: '',
    label: '',
    value: '',
    type: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setImportData(results.data);
        // Try to auto-detect columns
        const first = results.data[0] || {};
        const keys = Object.keys(first).map(k => k.toLowerCase());
        const mapping = { date: '', label: '', value: '', type: '' };
        
        keys.forEach((k, i) => {
          const originalKey = Object.keys(first)[i];
          if (k.includes('dat')) mapping.date = originalKey;
          if (k.includes('desc') || k.includes('hist') || k.includes('label')) mapping.label = originalKey;
          if (k.includes('val') || k.includes('valor') || k.includes('quant')) mapping.value = originalKey;
          if (k.includes('tipo') || k.includes('oper')) mapping.type = originalKey;
        });
        setImportMapping(mapping);
      }
    });
  };

  const processImport = async () => {
    if (!importMapping.date || !importMapping.label || !importMapping.value) {
      showMessage?.('Mapeie as colunas obrigatórias (Data, Descrição, Valor)');
      return;
    }

    setIsImporting(true);
    try {
      const processed = importData.map(row => {
        const valueRaw = String(row[importMapping.value]).replace(/[^0-9,.-]/g, '').replace(',', '.');
        const valueNum = Math.abs(parseFloat(valueRaw));
        let type: 'in' | 'out' = parseFloat(valueRaw) >= 0 ? 'in' : 'out';
        
        // Manual override if type column exists
        if (importMapping.type && row[importMapping.type]) {
          const t = String(row[importMapping.type]).toLowerCase();
          if (t.includes('c') || t.includes('ent') || t.includes('in')) type = 'in';
          if (t.includes('d') || t.includes('sai') || t.includes('out')) type = 'out';
        }

        // Auto tagging/categorization
        let category = 'Geral';
        const label = String(row[importMapping.label]).toLowerCase();
        
        if (label.includes('luz') || label.includes('enel') || label.includes('energia')) category = 'Utilidades';
        else if (label.includes('agua') || label.includes('sabesp')) category = 'Utilidades';
        else if (label.includes('aluguel')) category = 'Aluguel';
        else if (label.includes('pix') || label.includes('transf')) {
          if (label.includes('dizimo') || label.includes('dízimo')) category = 'Dízimo';
          else if (label.includes('oferta')) category = 'Oferta';
          else category = 'Transferência';
        }
        else if (label.includes('missao') || label.includes('missão')) category = 'Missões';
        else if (label.includes('evento') || label.includes('festa')) category = 'Evento';
        else if (label.includes('reforma') || label.includes('obra')) category = 'Manutenção';
        else if (label.includes('salario') || label.includes('salário') || label.includes('pgto')) category = 'Pessoal';

        return {
          label: row[importMapping.label],
          value: valueNum,
          date: row[importMapping.date],
          type,
          category,
          externalId: `${row[importMapping.date]}-${row[importMapping.label]}-${valueNum}` // Basic deduplication key
        };
      });

      await onImportTransactions(processed);
      setImportData([]);
      showMessage?.('Importação concluída com sucesso!');
      setActiveTab('summary');
    } catch (e) {
      showMessage?.('Erro ao importar transações.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Financeiro</h2>
          <p className="text-sm font-medium text-slate-500">Gestão de entradas, saídas e fundos</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'summary' && (
            <button onClick={onAdd} className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-primary/30">
              <Plus className="w-6 h-6" />
            </button>
          )}
          {activeTab === 'funds' && (
            <button onClick={() => setShowAddFund(true)} className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-teal-500/30">
              <Plus className="w-6 h-6" />
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto scrollbar-hide">
        {[
          { id: 'summary', label: 'Resumo', icon: PieChart },
          { id: 'transactions', label: 'Lançamentos', icon: Table },
          { id: 'funds', label: 'Fundos/Caixas', icon: Layers },
          { id: 'import', label: 'Importar', icon: FileUp },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === tab.id ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'summary' && (
          <motion.div 
            key="summary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Card className="bg-gradient-to-br from-primary to-indigo-600 text-white p-6 space-y-4 shadow-xl shadow-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-80">Saldo Total Consolidado</p>
              <h3 className="text-4xl font-black tracking-tight">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <div className="flex gap-4 pt-6 border-t border-white/10">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase opacity-60">Entradas Mensais</p>
                  <p className="text-lg font-bold text-emerald-300">
                    + R$ {transactions.filter(t => t.type === 'in').reduce((acc, t) => acc + t.value, 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase opacity-60">Saídas Mensais</p>
                  <p className="text-lg font-bold text-red-300">
                    - R$ {transactions.filter(t => t.type === 'out').reduce((acc, t) => acc + t.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  Distribuição por Categoria
                </h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => `R$ ${value.toLocaleString()}`}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {categoryData.slice(0, 4).map((item, i) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-500 truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <BarChartIcon className="w-4 h-4 text-primary" />
                  Entradas vs Saídas
                </h4>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} />
                      <YAxis hide />
                      <ReTooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="in" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                      <Bar dataKey="out" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Últimos Lançamentos</h3>
                <button 
                  onClick={() => setActiveTab('transactions')}
                  className="text-primary text-sm font-bold hover:underline"
                >
                  Ver Todos
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {transactions.slice(0, 15).map((t) => (
                  <div key={t.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 group hover:shadow-md transition-all">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm",
                      t.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {t.type === 'in' ? <Plus className="w-6 h-6" /> : <AlertCircle className="w-6 h-6 rotate-180" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{t.label}</p>
                      <div className="flex items-center gap-2">
                        <select 
                          value={t.category || 'Geral'}
                          onChange={async (e) => {
                            // Update transaction category
                            try {
                              const newCat = e.target.value;
                              await api.update('transactions', t.id, { category: newCat });
                              
                              // Learn: if the user manually changes the category, save a rule for this label
                              // We clean up the label a bit (e.g. "PIX REC GUSTAVO" -> "GUSTAVO" or just the whole label)
                              // For now, let's learn the WHOLE label words to avoid collision but still be useful.
                              // Actually, if they categorize "PIX ENVIADO PARA ENEL", they want "ENEL" to be "Utilidades".
                              // But just storing the whole label is safer for 1-to-1 matching.
                              if (t.label) {
                                await onSaveRule(t.label, newCat);
                              }
                              
                              showMessage?.('Categoria atualizada e sistema aprendeu a regra!');
                              // Trigger a local UI update or refresh
                              window.dispatchEvent(new CustomEvent('refresh-financial'));
                            } catch(err) {
                              showMessage?.('Erro ao atualizar categoria');
                            }
                          }}
                          className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase border-none outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                        >
                          {['Geral', 'Dízimo', 'Oferta', 'Missões', 'Utilidades', 'Aluguel', 'Pessoal', 'Manutenção', 'Transferência', 'Evento', 'Outros'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <span className="text-[10px] text-slate-400 font-medium">{t.date}</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <p className={cn("font-black text-sm whitespace-nowrap", t.type === 'in' ? "text-emerald-600" : "text-red-600")}>
                        {t.type === 'in' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <button 
                        onClick={() => onDelete(t.id)}
                        className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div 
            key="transactions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <Card className="p-4 bg-slate-50 border-none space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 min-w-[200px] w-full">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pesquisar Lançamento</label>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: Conta de Luz..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 w-full sm:w-auto">
                  <div className="min-w-[100px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mês</label>
                    <select 
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-primary"
                    >
                      {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{new Date(2020, m - 1).toLocaleString('pt-BR', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[100px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ano</label>
                    <select 
                      value={filterYear}
                      onChange={(e) => setFilterYear(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-medium outline-none focus:border-primary"
                    >
                      {[filterYear - 1, filterYear, filterYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-200/50">
                <div className="flex flex-wrap gap-2 items-center">
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-[10px] uppercase font-bold text-slate-600 outline-none"
                  >
                    <option value="all">Todos os Tipos</option>
                    <option value="in">Apenas Entradas (+)</option>
                    <option value="out">Apenas Saídas (-)</option>
                  </select>
                  
                  <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-[10px] uppercase font-bold text-slate-600 outline-none"
                  >
                    <option value="all">Todas as Categorias</option>
                    {uniqueCategories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select 
                    value={filterFund}
                    onChange={(e) => setFilterFund(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-[10px] uppercase font-bold text-slate-600 outline-none"
                  >
                    <option value="all">Todos os Caixas</option>
                    {funds.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <Button 
                  onClick={exportTransactionsCSV}
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-none shrink-0"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="font-bold text-slate-700">Nenhum lançamento encontrado</h3>
                  <p className="text-sm text-slate-500 mt-1">Tente ajustar os filtros acima.</p>
                </div>
              ) : (
                filteredTransactions.map(t => (
                  <div key={t.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 group hover:shadow-md transition-all">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shadow-sm shrink-0",
                      t.type === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}>
                      {t.type === 'in' ? <Plus className="w-6 h-6" /> : <AlertCircle className="w-6 h-6 rotate-180" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="font-bold text-slate-800 text-sm truncate pr-4" title={t.label}>{t.label}</p>
                        <p className={cn("font-black text-sm whitespace-nowrap", t.type === 'in' ? "text-emerald-600" : "text-red-600")}>
                          {t.type === 'in' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{t.date}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-200 hidden sm:block"></div>
                        <select 
                          value={t.category || 'Geral'}
                          onChange={async (e) => {
                            try {
                              const newCat = e.target.value;
                              await api.update('transactions', t.id, { category: newCat });
                              if (t.label) {
                                await onSaveRule(t.label, newCat);
                              }
                              showMessage?.('Categoria atualizada!');
                              window.dispatchEvent(new CustomEvent('refresh-financial'));
                            } catch(err) {
                              showMessage?.('Erro ao atualizar');
                            }
                          }}
                          className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase border-none outline-none cursor-pointer hover:bg-slate-200 transition-colors"
                        >
                          {['Geral', 'Dízimo', 'Oferta', 'Missões', 'Utilidades', 'Aluguel', 'Pessoal', 'Manutenção', 'Transferência', 'Evento', 'Outros'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <span className="text-[10px] font-bold text-slate-300">
                          • {funds.find(f => f.id === t.fundId)?.name || 'Geral'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onDelete(t.id)}
                      className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'funds' && (
          <motion.div 
            key="funds"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 gap-4"
          >
            {funds.map(fund => {
              const fundTransactions = transactions.filter(t => t.fundId === fund.id);
              const fundBalance = fundTransactions.reduce((acc, t) => t.type === 'in' ? acc + t.value : acc - t.value, 0);
              
              return (
                <Card key={fund.id} className="relative group overflow-hidden border-2 border-transparent hover:border-teal-100 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center">
                      <Layers className="w-6 h-6" />
                    </div>
                    {fund.id !== 'main' && (
                      <button onClick={() => onDeleteFund(fund.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-slate-900 text-lg">{fund.name}</h4>
                  <p className="text-xs text-slate-500 mb-4">{fund.description || 'Fundo reservado para despesas gerais.'}</p>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Saldo do Fundo</p>
                    <p className="text-xl font-black text-slate-800">R$ {fundBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </Card>
              );
            })}
          </motion.div>
        )}

        {activeTab === 'import' && (
          <motion.div 
            key="import"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-8 text-center gap-4 hover:border-primary transition-colors cursor-pointer relative">
              <FileUp className="w-12 h-12 text-slate-400" />
              <div>
                <h4 className="font-bold text-slate-900">Importar Extrato Bancário</h4>
                <p className="text-xs text-slate-500">Selecione um arquivo CSV exportado do seu banco</p>
              </div>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </Card>

            {importData.length > 0 && (
              <Card className="space-y-4 p-6">
                <h4 className="font-black text-slate-800 flex items-center gap-2">
                  <Table className="w-5 h-5 text-primary" />
                  Mapear Colunas
                </h4>
                <div className="space-y-4">
                  {[
                    { key: 'date', label: 'Data da Transação' },
                    { key: 'label', label: 'Descrição/Histórico' },
                    { key: 'value', label: 'Valor (R$)' },
                    { key: 'type', label: 'Tipo (Opcional)' },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{field.label}</label>
                      <select 
                        value={(importMapping as any)[field.key]}
                        onChange={(e) => setImportMapping({...importMapping, [field.key]: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-primary"
                      >
                        <option value="">Selecione a coluna...</option>
                        {Object.keys(importData[0] || {}).map(k => (
                          <option key={k} value={k}>{k}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-3">
                  <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>O sistema irá ignorar automaticamente transações que já foram registradas (baseado em Data, Descrição e Valor).</span>
                  </div>
                  <Button 
                    onClick={processImport} 
                    className="w-full h-14"
                    disabled={isImporting}
                  >
                    {isImporting ? 'Processando...' : `Confirmar Importação (${importData.length} linhas)`}
                  </Button>
                  <Button variant="ghost" onClick={() => setImportData([])} className="w-full">Cancelar</Button>
                </div>
              </Card>
            )}

            <div className="p-4 bg-slate-100 rounded-2xl">
              <h5 className="font-bold text-slate-700 text-sm mb-2">Orientações:</h5>
              <ul className="text-xs text-slate-500 space-y-2">
                <li>• No seu Internet Banking, escolha "Exportar para CSV".</li>
                <li>• O sistema aceita valores positivos (entradas) e negativos (saídas).</li>
                <li>• Identificamos automaticamente contas de Luz, Água e Aluguel.</li>
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddFund && (
          <Modal title="Novo Fundo/Caixa" onClose={() => setShowAddFund(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Nome do Fundo</label>
                <input 
                  type="text" 
                  value={newFundName}
                  onChange={e => setNewFundName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="Ex: Ministério Infantil"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Descrição (Opcional)</label>
                <textarea 
                  value={newFundDesc}
                  onChange={e => setNewFundDesc(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:border-primary"
                  placeholder="Finalidade deste caixa..."
                  rows={3}
                />
              </div>
              <Button 
                className="w-full"
                onClick={async () => {
                  if (!newFundName) return;
                  await onAddFund(newFundName, newFundDesc);
                  setNewFundName('');
                  setNewFundDesc('');
                  setShowAddFund(false);
                }}
              >
                Criar Fundo
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminRolesScreen = ({ 
  roles, 
  onAddRole, 
  onDeleteRole, 
  showMessage 
}: { 
  roles: AdminRole[], 
  onAddRole: (role: AdminRole) => Promise<void>, 
  onDeleteRole: (id: string) => Promise<void>, 
  showMessage: (msg: string) => void 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

  const availablePermissions = [
    { id: 'financial', label: 'Gestão Financeira' },
    { id: 'tithes', label: 'Dízimos e Ofertas' },
    { id: 'sermons', label: 'Sermões' },
    { id: 'events', label: 'Eventos' },
    { id: 'announcements', label: 'Avisos' },
    { id: 'groups', label: 'Pequenos Grupos' },
    { id: 'pastoral', label: 'Visitas Pastorais' },
    { id: 'users', label: 'Gestão de Usuários' },
    { id: 'readingPlans', label: 'Planos de Leitura' },
  ];

  const handleSave = async () => {
    if (!name.trim() || permissions.length === 0) {
      showMessage('Preencha o nome e selecione permissões');
      return;
    }
    await onAddRole({
      id: 'role-' + Date.now(),
      name,
      permissions
    });
    setName('');
    setPermissions([]);
    setShowAdd(false);
  };

  const togglePermission = (id: string) => {
    setPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Perfis de Acesso</h2>
          <p className="text-sm font-medium text-slate-500">Crie perfis personalizados para administradores</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-primary/30">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        {roles.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">Nenhum perfil criado ainda.</p>
        ) : (
          roles.map(role => (
            <Card key={role.id} className="p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">{role.name}</h3>
                <p className="text-xs text-slate-500">{role.permissions.length} permissões</p>
              </div>
              <button onClick={() => onDeleteRole(role.id)} className="p-2 bg-red-50 text-red-500 rounded-xl">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </Card>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <Modal title="Novo Perfil" onClose={() => setShowAdd(false)}>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nome do Perfil (ex: Tesouraria)</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-primary transition-colors"
                  placeholder="Nome do cargo"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Permissões de Acesso</label>
                <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
                  {availablePermissions.map(perm => (
                    <div 
                      key={perm.id}
                      onClick={() => togglePermission(perm.id)}
                      className={cn(
                        "p-3 rounded-xl border-2 flex items-center justify-between cursor-pointer transition-all",
                        permissions.includes(perm.id) ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-bold",
                        permissions.includes(perm.id) ? "text-primary" : "text-slate-600"
                      )}>{perm.label}</span>
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border",
                        permissions.includes(perm.id) ? "bg-primary border-primary text-white" : "border-slate-300"
                      )}>
                        {permissions.includes(perm.id) && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <Button onClick={handleSave} className="w-full">Salvar Perfil</Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

const NotificationSettingsScreen = ({ settings, onUpdate, onClose, showMessage }: { settings: any, onUpdate: (data: any) => Promise<void>, onClose: () => void, showMessage: (msg: string) => void }) => {
  const [localSettings, setLocalSettings] = useState({ 
    allMuted: false, 
    newSermonEnabled: true, 
    wordOfDayEnabled: true, 
    wordOfDayTime: '08:00',
    ...settings 
  });

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
                        const newFormData = {...formData, adminPhones: [...(formData.adminPhones || []), phone]};
                        setFormData(newFormData);
                        input.value = '';
                        onUpdate(newFormData);
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
                        const newFormData = {...formData, adminPhones: formData.adminPhones?.filter((_, i) => i !== index)};
                        setFormData(newFormData);
                        onUpdate(newFormData);
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
          onClick={async () => {
            if (!formData.adminPhones || formData.adminPhones.length === 0) {
              showMessage('Informe pelo menos um número de administrador para testar.');
              return;
            }
            if (statusData.status !== 'READY') {
              showMessage('WhatsApp não está conectado.');
              return;
            }
            try {
              const res = await api.request('/whatsapp/test', { method: 'POST' });
              if (res.error) {
                  showMessage(`Erro: ${res.error}`);
              } else {
                  showMessage('Mensagem de teste enviada para todos os administradores!');
              }
            } catch (err: any) {
              showMessage(`Erro ao enviar: ${err.message}`);
            }
          }}
        >
          Enviar Mensagem de Teste
        </Button>
      </div>
    </div>
  );
};

const MySchedulesScreen = ({ schedules, ministries, currentUser, onConfirm, onDecline, onClose }: { schedules: MinistrySchedule[], ministries: Ministry[], currentUser: UserType | null, onConfirm: (id: string) => void, onDecline: (id: string) => void, onClose: () => void }) => {
  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center gap-4">
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Minhas Escalas</h2>
      </header>

      <div className="space-y-4">
        {schedules.map(sch => {
          const ministry = ministries.find(m => m.id === sch.ministryId);
          const confirmation = currentUser ? sch.confirmations?.[currentUser.id] : undefined;

          return (
            <Card key={sch.id} className="space-y-4 border-l-4 border-l-primary">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">{ministry?.name}</p>
                  <h4 className="font-bold text-slate-900">{sch.title}</h4>
                  <div className="space-y-1 mt-2">
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {new Date(sch.date).toLocaleDateString('pt-BR')} às {sch.time}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {sch.location}
                    </p>
                  </div>
                </div>
                {confirmation && (
                  <span className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
                    confirmation === 'confirmed' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    {confirmation === 'confirmed' ? 'Confirmado' : 'Recusado'}
                  </span>
                )}
              </div>

              {!confirmation && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1 text-red-500 border-red-100 hover:bg-red-50" onClick={() => onDecline(sch.id)}>
                    <XCircle className="w-4 h-4" /> Não posso ir
                  </Button>
                  <Button className="flex-1" onClick={() => onConfirm(sch.id)}>
                    <CheckCircle className="w-4 h-4" /> Confirmar Presença
                  </Button>
                </div>
              )}
            </Card>
          );
        })}

        {schedules.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Calendar className="w-8 h-8" />
            </div>
            <p className="text-slate-500">Você não tem escalas agendadas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileScreen = ({ onLogout, user, onUpdateProfile, stats, prayers, pastoralVisits, schedules, ministries, whatsappConfig, onUpdateWhatsApp, isAdmin, onSwitchToAdmin, onSwitchToMember, showMessage, onOpenNotifications, initialIsEditing = false, darkMode, onToggleDarkMode, fontSize, onToggleFontSize }: { onLogout: () => void, user: UserType | null, onUpdateProfile: (data: Partial<UserType>) => Promise<void>, stats: { cells: number, prayers: number }, prayers?: PrayerRequest[], pastoralVisits?: PastoralVisit[], schedules?: MinistrySchedule[], ministries?: Ministry[], whatsappConfig?: WhatsAppConfig, onUpdateWhatsApp?: (data: WhatsAppConfig) => void, isAdmin?: boolean, onSwitchToAdmin?: () => void, onSwitchToMember?: () => void, showMessage: (msg: string) => void, onOpenNotifications?: () => void, initialIsEditing?: boolean, darkMode: boolean, onToggleDarkMode: () => void, fontSize?: 'small' | 'normal' | 'large' | 'xl', onToggleFontSize?: (size: any) => void }) => {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [form, setForm] = useState({
    name: user?.name || '',
    birthDate: user?.birthDate || '',
    phone: user?.phone || '',
    avatar: user?.avatar || ''
  });
  const [showMyPrayers, setShowMyPrayers] = useState(false);
  const [showMyVisits, setShowMyVisits] = useState(false);
  const [showMySchedules, setShowMySchedules] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);

  const fontSizeOptions = [
    { id: 'small', label: 'Pequena', size: 'text-sm' },
    { id: 'normal', label: 'Padrão', size: 'text-base' },
    { id: 'large', label: 'Grande', size: 'text-lg' },
    { id: 'xl', label: 'Extra Grande', size: 'text-xl' },
  ];

  const handleUpdate = async () => {
    try {
      await onUpdateProfile(form);
      setIsEditing(false);
      showMessage('Perfil atualizado com sucesso!');
    } catch (err) {
      showMessage('Erro ao atualizar perfil.');
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      showMessage('As senhas não coincidem.');
      return;
    }
    if (passwordForm.new.length < 6) {
      showMessage('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    try {
      await api.changePassword(passwordForm.current, passwordForm.new);
      setShowChangePassword(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
      showMessage('Senha alterada com sucesso!');
    } catch (err: any) {
      showMessage(err.message || 'Erro ao alterar senha.');
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

  const confirmSchedule = async (id: string, status: 'confirmed' | 'declined') => {
    try {
      await api.confirmMinistrySchedule(id, status);
      showMessage(status === 'confirmed' ? 'Presença confirmada!' : 'Você recusou esta escala.');
    } catch (err) {
      showMessage('Erro ao processar confirmação.');
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

  if (showMySchedules) {
    const mySchedules = schedules?.filter(s => s.assignedUserIds.includes(user?.id || '')) || [];
    return <MySchedulesScreen schedules={mySchedules} ministries={ministries || []} currentUser={user} onConfirm={(id) => confirmSchedule(id, 'confirmed')} onDecline={(id) => confirmSchedule(id, 'declined')} onClose={() => setShowMySchedules(false)} />;
  }

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
      {/* Font Size Selector Modal */}
      {showFontSizeMenu && (
        <Modal title="Tamanho da Letra" onClose={() => setShowFontSizeMenu(false)}>
          <div className="space-y-4">
            <p className="text-slate-500 text-sm">Escolha o tamanho que fica melhor para sua leitura:</p>
            <div className="grid grid-cols-1 gap-3">
              {fontSizeOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onToggleFontSize?.(opt.id as any);
                  }}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-2xl border-2 transition-all",
                    fontSize === opt.id 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-slate-100 bg-white text-slate-600 hover:border-slate-200"
                  )}
                >
                  <span className={cn("font-medium", opt.size)}>
                    {opt.label}
                  </span>
                  {fontSize === opt.id && <Check className="w-5 h-5" />}
                </button>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Exemplo de leitura:</p>
              <p className={cn(
                "text-slate-700 leading-relaxed transition-all",
                fontSize === 'small' && "text-[0.85rem]",
                fontSize === 'normal' && "text-[1rem]",
                fontSize === 'large' && "text-[1.15rem]",
                fontSize === 'xl' && "text-[1.8rem]"
              )}>
                "Lâmpada para os meus pés é tua palavra, e luz para o meu caminho."
              </p>
            </div>

            <Button 
              className="w-full h-12 mt-4" 
              onClick={() => setShowFontSizeMenu(false)}
            >
              Concluir e Salvar
            </Button>
          </div>
        </Modal>
      )}
      <header className="text-center pt-8 space-y-4">
        <div className="relative inline-block">
          <img src={form.avatar || user?.avatar || DEFAULT_AVATAR} className="w-32 h-32 rounded-full border-4 border-white shadow-xl mx-auto object-cover" alt="Profile" />
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
                <User className="w-4 h-4" />
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
          { icon: Bell, label: 'Notificações', action: onOpenNotifications },
          { icon: Lock, label: 'Alterar Senha', action: () => setShowChangePassword(true) },
          user?.id && ministries?.some(m => m.memberIds.includes(user.id) || m.leaderIds.includes(user.id)) && { icon: Calendar, label: 'Minhas Escalas', action: () => setShowMySchedules(true) },
          user?.role === 'superadmin' && { icon: MessageSquare, label: 'Configurar WhatsApp', action: () => setShowWhatsAppConfig(true) },
          { icon: darkMode ? Sun : Moon, label: darkMode ? 'Modo Claro' : 'Modo Noturno', action: onToggleDarkMode },
          { icon: Type, label: 'Tamanho da Letra', action: () => setShowFontSizeMenu(true) },
          { icon: PrayingHands, label: 'Minhas Orações', action: () => setShowMyPrayers(true) },
          { icon: Heart, label: 'Minhas Solicitações de Visita', action: () => setShowMyVisits(true) },
          { icon: Settings, label: 'Privacidade', action: () => setShowPrivacy(true) },
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

      {showPrivacy && (
        <Modal title="Privacidade e Seus Dados" onClose={() => setShowPrivacy(false)}>
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 space-y-3">
              <p className="font-bold text-slate-900">O que nós coletamos</p>
              <p>
                Para facilitar a comunicação e o cuidado pastoral, nós armazenamos seu 
                <strong> Nome, E-mail, Telefone e Histórico de Participação</strong> (pedidos de oração, presenças, etc).
              </p>
              <p>
                Apenas os administradores (pastores e líderes autorizados) possuem acesso 
                ao seu e-mail e telefone para gestão da igreja. Demais membros 
                apenas veem seu nome de perfil.
              </p>
            </div>
            
            <div className="pt-6 border-t border-slate-100 mt-6">
               <h4 className="text-sm font-bold text-slate-900 mb-2">Lei Geral de Proteção de Dados (LGPD)</h4>
               <p className="text-xs text-slate-500 mb-4">
                 Respeitamos a sua privacidade de acordo com a Lei 13.709/2018. 
                 Ao utilizar nosso app, seus dados são mantidos em sigilo e usados estritamente 
                 para atividades eclesiásticas. Caso deseje não fazer mais parte do nosso banco de dados, solicite a exclusão.
               </p>
               <Button variant="outline" className="w-full text-red-500 border-red-200 hover:bg-red-50" onClick={() => { setShowPrivacy(false); showMessage('Sua solicitação de exclusão foi enviada aos administradores.'); }}>
                 Solicitar Exclusão da Conta
               </Button>
            </div>
          </div>
        </Modal>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
          <Card className="w-full max-w-md space-y-4 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-slate-900">Alterar Senha</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Senha Atual</label>
                <input 
                  type="password" 
                  value={passwordForm.current} 
                  onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                  className="w-full p-3 bg-slate-50 rounded-xl" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nova Senha</label>
                <input 
                  type="password" 
                  value={passwordForm.new} 
                  onChange={e => setPasswordForm({...passwordForm, new: e.target.value})}
                  className="w-full p-3 bg-slate-50 rounded-xl" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Confirmar Nova Senha</label>
                <input 
                  type="password" 
                  value={passwordForm.confirm} 
                  onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})}
                  className="w-full p-3 bg-slate-50 rounded-xl" 
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleChangePassword} className="flex-1">Salvar</Button>
                <Button variant="outline" onClick={() => setShowChangePassword(false)} className="flex-1">Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
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
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              required
              className="w-full pl-11 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
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
                  <img src={member.avatar || DEFAULT_AVATAR} className="w-8 h-8 rounded-full" alt="" />
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
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data Sugerida</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              required
              className="w-full pl-11 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
            />
          </div>
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
                <span className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(sermon.date)}</span>
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
                    <p className="text-xs text-slate-500">{formatDate(selectedSermon.date)}</p>
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
                <p className="text-xs text-slate-500">{sermon.preacher} • {formatDate(sermon.date)}</p>
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
  const [cacheVersion, setCacheVersion] = useState(new Date().getTime());
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large' | 'xl'>(() => {
    return (localStorage.getItem('font-size') as any) || 'normal';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [currentUserData, setCurrentUserData] = useState<UserType | null>(null);
  const [currentTab, setCurrentTab] = useState('home');
  const [profileAutoEdit, setProfileAutoEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dynamic State
  const [events, setEvents] = useState<Event[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [cells, setCells] = useState<CellGroup[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [funds, setFunds] = useState<FinancialFund[]>([]);
  const [financialRules, setFinancialRules] = useState<FinancialRule[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([]);
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [verseHighlights, setVerseHighlights] = useState<VerseHighlight[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [pastoralVisits, setPastoralVisits] = useState<PastoralVisit[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [ministrySchedules, setMinistrySchedules] = useState<MinistrySchedule[]>([]);
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
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
  const [dailyVerse, setDailyVerse] = useState<{text: string, ref: string} | null>(null);
  const [verseStats, setVerseStats] = useState<{total: number, today: any, tomorrow: any} | null>(null);
  const [selectedAttendanceCell, setSelectedAttendanceCell] = useState<CellGroup | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalMessage, setGlobalMessage] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingCell, setEditingCell] = useState<CellGroup | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [showAddPastoralVisit, setShowAddPastoralVisit] = useState(false);
  const [selectedShareVerse, setSelectedShareVerse] = useState<{ text: string, ref: string } | null>(null);

  const showMessage = (msg: string) => {
    setGlobalMessage(msg);
    setTimeout(() => setGlobalMessage(null), 3000);
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('font-size', fontSize);
  }, [fontSize]);

  const refreshData = useCallback(async () => {
    if (!isLoggedIn) return;
    setCacheVersion(new Date().getTime());
    try {
      const [
        e, p, c, u, a, r, s, h, at, pv, m, ms, config, roles, verseToday, vStats
      ] = await Promise.all([
        api.list('events'),
        api.list('prayers'),
        api.list('cells'),
        api.list('users'),
        api.list('announcements'),
        api.list('readingPlans'),
        api.list('sermons'),
        api.list('verseHighlights'),
        api.list('attendance'),
        api.list('pastoralVisits'),
        api.list('ministries'),
        api.list('ministrySchedules'),
        api.list('config'),
        api.list('adminRoles').catch(() => []), // Handle if doesn't exist
        api.request('/verses/today').catch(() => null),
        api.request('/verses/stats').catch(() => null)
      ]);

      setDailyVerse(verseToday);
      setVerseStats(vStats);
      setEvents(e || []);
      setPrayers((p || []).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setCells(c || []);
      setUsers(u || []);
      setAnnouncements(a || []);
      setReadingPlans(r || []);
      setSermons(s || []);
      setVerseHighlights((h || []).filter((vh: any) => vh.uid === currentUserData?.id));
      setAttendanceHistory(at || []);
      setPastoralVisits(pv || []);
      setMinistries(m || []);
      setMinistrySchedules(ms || []);
      setAdminRoles(roles || []);

      const tConfig = (config || []).find((cfg: any) => cfg.id === 'tithes');
      if (tConfig) setTitheConfig(tConfig);
      
      const wConfig = (config || []).find((cfg: any) => cfg.id === 'whatsapp');
      if (wConfig) setWhatsappConfig(wConfig);

      if (userRole === 'admin' || userRole === 'superadmin') {
        const [trans, fds, rules] = await Promise.all([
          api.list('transactions'),
          api.list('funds'),
          api.list('financialRules').catch(() => [])
        ]);
        setTransactions(trans || []);
        setFunds(fds || []);
        setFinancialRules(rules || []);

        // Ensure at least one fund exists
        if (fds && fds.length === 0) {
          const defaultFund = { id: 'main', name: 'Caixa Geral', balance: 0 };
          await api.create('funds', defaultFund);
          setFunds([defaultFund]);
        }
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }, [isLoggedIn, userRole, currentUserData?.id]);

  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
    }
  }, [isLoggedIn, refreshData]);

  useEffect(() => {
    setGlobalErrorRef = setGlobalError;
    setGlobalSuccessRef = setGlobalMessage;

    const handleRefreshFinancial = () => refreshData();
    window.addEventListener('refresh-financial', handleRefreshFinancial);
    return () => window.removeEventListener('refresh-financial', handleRefreshFinancial);
  }, [refreshData]);

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
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        new Notification("Igreja Renovar", {
          body: "Notificações ativadas com sucesso!",
          icon: APP_CONFIG.logos.icon
        });
        return true;
      }
    } catch (err) {
      console.log('Permissão negada pelo navegador', err);
    }
    return false;
  };

  const showWebNotification = (title: string, body: string) => {
    if (Notification.permission === "granted" && !currentUserData?.notificationSettings?.allMuted) {
      new Notification(title, { body, icon: APP_CONFIG.logos.icon });
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
      
      if (currentTimeStr === currentUserData.notificationSettings.wordOfDayTime && lastNotified !== currentDayStr && dailyVerse) {
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

  // Registry push notifications automatically when logged in
  useEffect(() => {
    if (isLoggedIn) {
      // Delay slightly to ensure service worker is ready and UI is stable
      const timer = setTimeout(() => {
        registerPushNotifications();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

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

    unsubscribes.push(api.subscribe('events', setEvents, 5000));
    unsubscribes.push(api.subscribe('prayers', (data) => {
      data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPrayers(data);
    }, 5000));
    unsubscribes.push(api.subscribe('cells', setCells, 5000));
    unsubscribes.push(api.subscribe('users', setUsers, 5000));
    unsubscribes.push(api.subscribe('announcements', setAnnouncements, 5000));
    unsubscribes.push(api.subscribe('readingPlans', setReadingPlans, 5000));
    unsubscribes.push(api.subscribe('sermons', setSermons, 5000));
    unsubscribes.push(api.subscribe('verseHighlights', (data) => {
      setVerseHighlights(data.filter((h: any) => h.uid === currentUserData?.id));
    }, 5000));
    unsubscribes.push(api.subscribe('attendance', setAttendanceHistory, 5000));
    unsubscribes.push(api.subscribe('pastoralVisits', setPastoralVisits, 5000));
    unsubscribes.push(api.subscribe('ministries', setMinistries, 5000));
    unsubscribes.push(api.subscribe('ministrySchedules', setMinistrySchedules, 5000));
    unsubscribes.push(api.subscribe('config', (data) => {
      const tConfig = data.find((c: any) => c.id === 'tithes');
      if (tConfig) setTitheConfig(tConfig);
      
      const wConfig = data.find((c: any) => c.id === 'whatsapp');
      if (wConfig) setWhatsappConfig(wConfig);
    }, 5000));

    if (userRole === 'admin' || userRole === 'superadmin') {
      unsubscribes.push(api.subscribe('transactions', setTransactions, 5000));
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

  const updateAnyUser = async (userId: string, data: Partial<UserType>) => {
    try {
      const userToUpdate = users.find(u => u.id === userId);
      if (!userToUpdate) return;
      
      const originalUsers = [...users];
      const updatedUser = { ...userToUpdate, ...data };
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      
      if (currentUserData?.id === userId) {
        setCurrentUserData(updatedUser);
      }

      await api.update('users', userId, data);
    } catch (err) {
      handleApiError(err, 'updateAnyUser');
    }
  };

  const addMinistry = async (data: Partial<Ministry>) => {
    try {
      await api.create('ministries', {
        ...data,
        leaderIds: data.leaderIds || [],
        memberIds: data.memberIds || [],
        pendingRequestIds: data.pendingRequestIds || [],
      });
      handleApiSuccess('Ministério criado com sucesso!');
    } catch (err) {
      handleApiError(err, 'addMinistry');
    }
  };

  const updateMinistry = async (id: string, data: Partial<Ministry>) => {
    try {
      await api.update('ministries', id, data);
      handleApiSuccess('Ministério atualizado!');
    } catch (err) {
      handleApiError(err, 'updateMinistry');
    }
  };

  const requestJoinMinistry = async (ministryId: string) => {
    if (!currentUserData) return;
    const ministry = ministries.find(m => m.id === ministryId);
    if (!ministry) return;
    if (ministry.pendingRequestIds.includes(currentUserData.id) || ministry.memberIds.includes(currentUserData.id)) return;
    
    try {
      await api.update('ministries', ministryId, {
        pendingRequestIds: [...ministry.pendingRequestIds, currentUserData.id]
      });
      handleApiSuccess('Solicitação enviada com sucesso!');
    } catch (err) {
      handleApiError(err, 'requestJoinMinistry');
    }
  };

  const manageMinistryRequest = async (ministryId: string, userId: string, action: 'approve' | 'reject') => {
    const ministry = ministries.find(m => m.id === ministryId);
    if (!ministry) return;
    
    try {
      const pending = ministry.pendingRequestIds.filter(id => id !== userId);
      const members = action === 'approve' 
        ? [...new Set([...ministry.memberIds, userId])] 
        : ministry.memberIds;
        
      await api.update('ministries', ministryId, {
        pendingRequestIds: pending,
        memberIds: members
      });
      handleApiSuccess(`Solicitação ${action === 'approve' ? 'aprovada' : 'rejeitada'}!`);
    } catch (err) {
      handleApiError(err, 'manageMinistryRequest');
    }
  };

  const addMinistrySchedule = async (schedule: Partial<MinistrySchedule>) => {
    try {
      await api.create('ministrySchedules', schedule);
      handleApiSuccess('Escala criada com sucesso!');
    } catch (err) {
      handleApiError(err, 'addMinistrySchedule');
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

  const addAnyUser = async (data: Partial<UserType>) => {
    try {
      await api.create('users', data);
      handleApiSuccess('Usuário criado com sucesso!');
    } catch (err) {
      handleApiError(err, 'addAnyUser');
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
              `✨ *Novo Sermão Disponível!*\n\n"${data.title}"\nPregador: ${data.preacher}\nAssista agora no App da Igreja Renovar!`
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

  useEffect(() => {
    if (currentTab !== 'profile') {
      setProfileAutoEdit(false);
    }
  }, [currentTab]);

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

  const handleAddFund = async (name: string, description: string) => {
    try {
      const newFund = { id: 'fund-' + Date.now(), name, description, balance: 0 };
      await api.create('funds', newFund);
      setFunds(prev => [...prev, newFund]);
      showMessage('Novo fundo criado com sucesso!');
    } catch (e) {
      handleApiError(e, 'Criar Fundo');
    }
  };

  const handleDeleteFund = async (id: string) => {
    if (id === 'main') {
      showMessage('O Caixa Geral não pode ser excluído.');
      return;
    }
    if (!confirm('Deseja realmente excluir este fundo? Transações associadas serão mantidas mas ficarão sem categoria de fundo.')) return;
    try {
      await api.delete('funds', id);
      setFunds(prev => prev.filter(f => f.id !== id));
      showMessage('Fundo removido.');
    } catch (e) {
      handleApiError(e, 'Remover Fundo');
    }
  };

  const handleAddFinancialRule = async (keyword: string, category: string) => {
    try {
      const existing = financialRules.find(r => r.keyword.toLowerCase() === keyword.toLowerCase());
      if (existing) {
        if (existing.category === category) return;
        await api.update('financialRules', existing.id, { category });
      } else {
        await api.create('financialRules', { id: 'rule-' + Date.now(), keyword, category });
      }
      refreshData();
    } catch (e) {
      console.error('Failed to save rule:', e);
    }
  };

  const handleImportTransactions = async (newTrans: Partial<FinancialTransaction>[]) => {
    try {
      // Deduplication: check if externalId OR (date+label+value) already exists
      const existingKeys = new Set(transactions.map(t => t.externalId || `${t.date}-${t.label}-${t.value}`));
      
      const filtered = newTrans.filter(t => {
        const key = t.externalId || `${t.date}-${t.label}-${t.value}`;
        return !existingKeys.has(key);
      });

      // Apply learned rules
      const processed = filtered.map(t => {
        const label = (t.label || '').toLowerCase();
        const matchedRule = financialRules.find(r => label.includes(r.keyword.toLowerCase()));
        if (matchedRule) {
          return { ...t, category: matchedRule.category };
        }
        return t;
      });

      if (filtered.length === 0) {
        showMessage('Nenhuma nova transação encontrada (todas já importadas).');
        return;
      }

      // Create them
      for (const t of processed) {
        await api.create('transactions', {
          ...t,
          fundId: 'main' // Default to main fund
        });
      }
      
      await refreshData();
      showMessage(`${filtered.length} novas transações importadas!`);
    } catch (e) {
      handleApiError(e, 'Importar Transações');
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
          `🙏 *Novo Pedido de Oração*

*Membro:* ${currentUserData?.name}
*Privacidade:* ${privacy}
*Mensagem:* ${content}`
        );
      }
    } catch (err) {
      // Revert optimistic update
      setPrayers(prev => prev.filter(p => p.id !== tempPrayer.id));
      handleApiError(err, 'addPrayer');
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
    }, 5000);
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

  const updateMemberRole = async (userId: string, newRole: UserRole, leaderOf?: string, adminRoleId?: string) => {
    try {
      if (newRole === 'admin' && userRole !== 'superadmin') {
        setGlobalError('Apenas o Super Administrador pode promover usuários a Admin.');
        return;
      }

      if (newRole === 'superadmin' && userRole !== 'superadmin') {
        setGlobalError('Apenas um Super Administrador pode criar outro Super Administrador.');
        return;
      }

      await api.update('users', userId, { 
        role: newRole,
        leaderOf: newRole === 'leader' ? (leaderOf || null) : null,
        adminRoleId: newRole === 'admin' ? (adminRoleId || null) : null
      });
      showMessage('Cargo atualizado com sucesso!');
    } catch (err) {
      handleApiError(err, 'updateMemberRole');
    }
  };

  const updateMinistryLeaders = async (userId: string, ministryIds: string[]) => {
    try {
      const updatedMinistries = await Promise.all(ministries.map(async (m) => {
        const isNowLeader = ministryIds.includes(m.id);
        const wasLeader = m.leaderIds.includes(userId);

        if (isNowLeader === wasLeader) return m;

        const newLeaderIds = isNowLeader 
          ? [...m.leaderIds, userId]
          : m.leaderIds.filter(id => id !== userId);

        await api.update('ministries', m.id, { leaderIds: newLeaderIds });
        return { ...m, leaderIds: newLeaderIds };
      }));

      setMinistries(updatedMinistries);
    } catch (err) {
      handleApiError(err, 'updateMinistryLeaders');
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
    }} cacheVersion={cacheVersion} />;
  }

  const handleAddAdminRole = async (role: AdminRole) => {
    try {
      await api.create('adminRoles', role);
      setAdminRoles(prev => [...prev, role]);
      showMessage('Perfil criado com sucesso!');
    } catch (err) {
      handleApiError(err, 'handleAddAdminRole');
    }
  };

  const handleDeleteAdminRole = async (id: string) => {
    try {
      await api.delete('adminRoles', id);
      setAdminRoles(prev => prev.filter(r => r.id !== id));
      showMessage('Perfil excluído com sucesso!');
    } catch (err) {
      handleApiError(err, 'handleDeleteAdminRole');
    }
  };

  const renderContent = () => {
    if (isAdmin && isAdminPanel) {
      if (!isTabAllowed(currentTab)) {
        return <div className="p-8 text-center text-slate-500">Você não tem permissão para acessar esta tela.</div>;
      }

      const visibleUsers = users.filter(u => u.role !== 'superadmin' || userRole === 'superadmin');
      const stats = { 
        members: visibleUsers.length, 
        cells: cells.length, 
        events: events.length, 
        balance: totalBalance 
      };

      switch (currentTab) {
        case 'home': return <AdminDashboard stats={stats} users={visibleUsers} verseStats={verseStats} onAddEvent={() => setShowAddEvent(true)} onAddAnnouncement={() => setShowAddAnnouncement(true)} onAddReadingPlan={() => setShowAddReadingPlan(true)} onAddTransaction={() => setShowAddTransaction(true)} onSwitchToMember={() => navigate('/')} onTabChange={setCurrentTab} showMessage={showMessage} />;
        case 'bible': return <AdminVerses onBack={() => setCurrentTab('home')} showMessage={showMessage} isSuperAdmin={userRole === 'superadmin'} />;
        case 'all_screens': return <AdminAllScreens onTabChange={setCurrentTab} isTabAllowed={isTabAllowed} />;
        case 'financial': return (
          <AdminFinancial 
            transactions={transactions} 
            funds={funds}
            balance={totalBalance} 
            onAdd={() => setShowAddTransaction(true)} 
            onDelete={deleteTransaction} 
            onAddFund={handleAddFund}
            onDeleteFund={handleDeleteFund}
            onImportTransactions={handleImportTransactions}
            onSaveRule={handleAddFinancialRule}
            showMessage={showMessage} 
          />
        );
        case 'hosting': return <AdminHostingScreen />;
        case 'admin_roles': return <AdminRolesScreen roles={adminRoles} onAddRole={handleAddAdminRole} onDeleteRole={handleDeleteAdminRole} showMessage={showMessage} />;
        case 'tithes': return <TithesAdminScreen config={titheConfig} onUpdate={updateTitheConfig} showMessage={showMessage} />;
        case 'events': return <EventsScreen events={events} isAdmin onDelete={deleteEvent} onAdd={() => setShowAddEvent(true)} onEdit={(e) => { setEditingEvent(e); setShowAddEvent(true); }} showMessage={showMessage} cacheVersion={cacheVersion} />;
        case 'announcements': return <AnnouncementsScreen announcements={announcements} isAdmin onDelete={deleteAnnouncement} onAdd={() => setShowAddAnnouncement(true)} showMessage={showMessage} cacheVersion={cacheVersion} />;
        case 'groups': return <GroupsScreen cells={cells} users={users} isAdmin currentUser={currentUserData} onAdd={() => setShowAddCell(true)} onDelete={deleteCell} onEdit={(c) => { setEditingCell(c); setShowAddCell(true); }} onLeave={leaveCell} onAttendance={(c) => { setSelectedAttendanceCell(c); setShowAttendance(true); }} attendanceHistory={attendanceHistory} onShowRecordDetail={setSelectedRecord} showMessage={showMessage} />;
        case 'users':
        case 'users_members':
        case 'users_integration':
          return (
            <UserManagementScreen 
              users={users} 
              cells={cells} 
              ministries={ministries}
              adminRoles={adminRoles}
              currentUserRole={userRole} 
              onUpdateUser={updateAnyUser} 
              onAddUser={addAnyUser} 
              onUpdateRole={updateMemberRole} 
              onUpdateMinistryLeaders={updateMinistryLeaders}
              showMessage={showMessage} 
              initialTab={currentTab === 'users_integration' ? 'integration' : 'members'}
            />
          );
        case 'members':
        case 'integration':
          setCurrentTab('users');
          return null;
        case 'ministries': return <MinistriesScreen ministries={ministries} users={users} currentUser={currentUserData} adminRoles={adminRoles} onJoinRequest={requestJoinMinistry} onManageRequest={manageMinistryRequest} onAddSchedule={addMinistrySchedule} schedules={ministrySchedules} onAdd={addMinistry} onUpdate={updateMinistry} isAdmin={userRole === 'admin' || userRole === 'superadmin'} showMessage={showMessage} />;
        case 'prayer': return <PrayerWall prayers={prayers} cells={cells} onAdd={() => setShowAddPrayer(true)} onDelete={deletePrayer} onTogglePrayed={togglePrayed} onAddComment={addComment} currentUserId={currentUserData?.id} currentUser={currentUserData} isAdmin={true} isSuperAdmin={userRole === 'superadmin'} showMessage={showMessage} />;
        case 'readingPlans': return <ReadingPlansScreen plans={readingPlans} allProgress={allUserProgress} users={users} isAdmin={true} onAdd={() => setShowAddReadingPlan(true)} onDelete={deleteReadingPlan} showMessage={showMessage} />;
        case 'sermons': return <AdminSermonsScreen sermons={sermons} onAdd={addSermon} onDelete={deleteSermon} />;
        case 'pastoral': return <AdminPastoralVisits visits={pastoralVisits} onUpdateStatus={updatePastoralVisitStatus} />;
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
              schedules={ministrySchedules}
              ministries={ministries}
              whatsappConfig={whatsappConfig}
              onUpdateWhatsApp={updateWhatsAppConfig}
              isAdmin={isAdmin} 
              onSwitchToMember={() => navigate('/')} 
              showMessage={showMessage} 
              initialIsEditing={profileAutoEdit}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              fontSize={fontSize}
              onToggleFontSize={(size: any) => setFontSize(size)}
              onOpenNotifications={async () => {
                setShowNotificationSettings(true);
                // Also request permission in background
                requestNotificationPermission();
              }}
            />
          );
        }
        default: return <AdminDashboard stats={stats} users={users} verseStats={verseStats} onAddEvent={() => setShowAddEvent(true)} onAddAnnouncement={() => setShowAddAnnouncement(true)} onAddReadingPlan={() => setShowAddReadingPlan(true)} onAddTransaction={() => setShowAddTransaction(true)} onSwitchToMember={() => navigate('/')} onTabChange={setCurrentTab} showMessage={showMessage} />;
      }
    }

    switch (currentTab) {
      case 'home': return <Dashboard {...dashboardProps} />;
      case 'events': return <EventsScreen events={events} isAdmin={isAdmin} onDelete={deleteEvent} onAdd={() => setShowAddEvent(true)} onEdit={(e) => { setEditingEvent(e); setShowAddEvent(true); }} onShowOrações={() => setCurrentTab('prayer')} showMessage={showMessage} cacheVersion={cacheVersion} />;
      case 'prayer': return <PrayerWall prayers={prayers} cells={cells} onAdd={() => setShowAddPrayer(true)} onDelete={deletePrayer} onTogglePrayed={togglePrayed} onAddComment={addComment} currentUserId={currentUserData?.id} currentUser={currentUserData} isAdmin={isAdmin} isSuperAdmin={userRole === 'superadmin'} showMessage={showMessage} />;
      case 'announcements': return <AnnouncementsScreen announcements={announcements} isAdmin={isAdmin} onAdd={() => setShowAddAnnouncement(true)} onDelete={deleteAnnouncement} showMessage={showMessage} cacheVersion={cacheVersion} />;
      case 'readingPlans': return <ReadingPlansScreen plans={readingPlans} progress={userReadingProgress} onToggleChapter={toggleChapter} isAdmin={false} showMessage={showMessage} />;
      case 'bible': return <BibleScreen onTabChange={setCurrentTab} showMessage={showMessage} readingPlans={readingPlans} progress={userReadingProgress} highlights={verseHighlights} onToggleHighlight={toggleVerseHighlight} onShareVerse={setSelectedShareVerse} fontSize={fontSize} />;
      case 'sermons': return <SermonsScreen sermons={sermons} />;
      case 'tithes': return <TithesScreen config={titheConfig} onConfirmDonation={(val, label) => addTransaction({ label, value: val, type: 'in' })} showMessage={showMessage} currentUserData={currentUserData} />;
      case 'ministries': return <MinistriesScreen ministries={ministries} users={users} currentUser={currentUserData} adminRoles={adminRoles} onJoinRequest={requestJoinMinistry} onManageRequest={manageMinistryRequest} onAddSchedule={addMinistrySchedule} schedules={ministrySchedules} onAdd={addMinistry} onUpdate={updateMinistry} isAdmin={userRole === 'admin' || userRole === 'superadmin'} showMessage={showMessage} />;
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
            schedules={ministrySchedules}
            ministries={ministries}
            whatsappConfig={whatsappConfig}
            onUpdateWhatsApp={updateWhatsAppConfig}
            isAdmin={isAdmin} 
            onSwitchToAdmin={() => navigate('/admin')} 
            showMessage={showMessage} 
            initialIsEditing={profileAutoEdit}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            fontSize={fontSize}
            onToggleFontSize={(size: any) => setFontSize(size)}
            onOpenNotifications={async () => {
              setShowNotificationSettings(true);
              // Also request permission in background
              requestNotificationPermission();
            }}
          />
        );
      }
      default: return <Dashboard {...dashboardProps} onTabChange={setCurrentTab} onShowDonation={() => setCurrentTab('tithes')} />;
    }
  };

  const memberTabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'prayer', icon: PrayingHands, label: 'Orações' },
    { id: 'bible', icon: BookOpen, label: 'Bíblia' },
    { id: 'sermons', icon: Mic, label: 'Sermões' },
    { id: 'profile', icon: User, label: 'Perfil' },
  ];

  const getAdminPermissions = () => {
    if (userRole === 'superadmin') return null; // All access
    
    const permissions = new Set<string>();

    // 1. Global Admin Role
    if (userRole === 'admin') {
      if (!currentUserData?.adminRoleId) return null; // Full access for old admins
      const role = adminRoles.find(r => r.id === currentUserData.adminRoleId);
      role?.permissions.forEach(p => permissions.add(p));
    }

    // 2. Ministry-based Roles
    if (currentUserData) {
      ministries.forEach(ministry => {
        const isLeader = ministry.leaderIds.includes(currentUserData.id);
        
        if (isLeader) {
          // Leaders get ALL permissions assigned to their ministry
          ministry.allowedRoleIds?.forEach(roleId => {
            const role = adminRoles.find(r => r.id === roleId);
            role?.permissions.forEach(p => permissions.add(p));
          });
        } else if (ministry.memberRoles?.[currentUserData.id]) {
          // Regular members get permissions from their assigned role in the ministry
          const roleId = ministry.memberRoles[currentUserData.id];
          const role = adminRoles.find(r => r.id === roleId);
          role?.permissions.forEach(p => permissions.add(p));
        }
      });
    }

    return Array.from(permissions);
  };

  const adminPermissions = getAdminPermissions();

  const isTabAllowed = (tabId: string) => {
    if (!adminPermissions) return true;
    if (['home', 'profile', 'all_screens'].includes(tabId)) return true; // Always visible basic screens
    return adminPermissions.includes(tabId);
  };

  const adminTabs = [
    { id: 'home', icon: PieChart, label: 'Dashboard' },
    { id: 'all_screens', icon: Grid, label: 'Telas' },
    { id: 'financial', icon: DollarSign, label: 'Financeiro' },
    { id: 'pastoral', icon: Heart, label: 'Visitas' },
    { id: 'sermons', icon: Mic, label: 'Sermões' },
    { id: 'prayer', icon: PrayingHands, label: 'Orações' },
    { id: 'profile', icon: Settings, label: 'Perfil' },
    { id: 'hosting', icon: Server, label: 'Servidor' },
  ].filter(t => isTabAllowed(t.id));

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isAdminPanel = location.pathname.startsWith('/admin');
  const tabs = isAdmin && isAdminPanel ? adminTabs : memberTabs;

    const dashboardProps = {
      events,
      user: currentUserData,
      announcements,
      onTabChange: (tab: string) => {
        if (tab === 'profile-edit') {
          setCurrentTab('profile');
          setProfileAutoEdit(true);
        } else {
          setCurrentTab(tab);
        }
      },
      onShowDonation: () => setCurrentTab('tithes'),
      onShowReadingPlans: () => setCurrentTab('readingPlans'),
      onRequestPastoralVisit: () => setShowAddPastoralVisit(true),
      onShareVerse: setSelectedShareVerse,
      dailyVerse,
      isAdmin,
      onSwitchToAdmin: () => navigate('/admin'),
      showMessage,
      onRefresh: refreshData,
      cacheVersion,
      darkMode,
      onToggleDarkMode: () => setDarkMode(!darkMode)
    };

  return (
    <ErrorBoundary>
      <div className={cn(
        "min-h-screen bg-secondary mx-auto relative shadow-2xl overflow-hidden transition-all",
        fontSize === 'small' && "app-font-small",
        fontSize === 'large' && "app-font-large",
        fontSize === 'xl' && "app-font-xl",
        isAdminPanel ? "w-full md:max-w-none md:flex md:flex-row shadow-none" : "w-full md:max-w-5xl md:shadow-none"
      )}>
        
        {/* Desktop Admin Sidebar (Hidden on Mobile) */}
        {isAdminPanel && (
           <nav className="hidden md:flex md:w-64 md:flex-col md:bg-white md:border-r md:border-slate-100 md:h-screen md:sticky md:top-0 md:pt-8 md:px-4 md:z-50 md:shadow-lg">
             <div className="flex items-center gap-3 mb-8 px-2">
               <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <span className="text-primary font-bold text-xl">P</span>
               </div>
               <div>
                 <h1 className="font-bold text-sm tracking-tight text-slate-800">GESTÃO</h1>
                 <p className="text-[10px] text-slate-500 uppercase tracking-widest">Workspace</p>
               </div>
             </div>
             <div className="flex flex-col gap-2">
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
                     "flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left",
                     currentTab === tab.id ? "bg-primary text-white shadow-md shadow-primary/20" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                   )}
                 >
                   <tab.icon className={cn("w-5 h-5", currentTab === tab.id ? "stroke-[2.5px]" : "stroke-[2px]")} />
                   <span className="font-bold text-sm">{tab.label}</span>
                 </button>
               ))}
               <button
                 onClick={() => navigate('/')}
                 className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left mt-auto text-slate-500 hover:bg-slate-50 hover:text-slate-800 mb-4"
               >
                 <LogOut className="w-5 h-5 stroke-[2px]" />
                 <span className="font-bold text-sm">Voltar ao App</span>
               </button>
             </div>
           </nav>
        )}

        <div className={cn(
          "flex-1 pb-24", // mobile nav padding
          isAdminPanel ? "md:h-screen md:overflow-y-auto md:pb-6" : ""
        )}>
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
              <main className={cn("p-6", "md:p-10 md:max-w-7xl md:mx-auto w-full")}>
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
               <TransactionForm onSubmit={addTransaction} funds={funds} />
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
          {selectedShareVerse && (
            <Modal title="Compartilhar Versículo" onClose={() => setSelectedShareVerse(null)}>
              <VerseShareModal verse={selectedShareVerse} onClose={() => setSelectedShareVerse(null)} />
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
                          <img src={user?.avatar || DEFAULT_AVATAR} className="w-8 h-8 rounded-full" alt="" />
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
                settings={currentUserData.notificationSettings || { allMuted: false, newSermonEnabled: true, wordOfDayEnabled: true, wordOfDayTime: '08:00' }}
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
      </div>

        <nav className={cn(
          "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-5xl bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50",
          isAdminPanel ? "md:hidden" : ""
        )}>
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
                <tab.icon 
                  className={cn("w-6 h-6", currentTab === tab.id ? "stroke-[2.5px]" : "stroke-[2px]")} 
                  active={currentTab === tab.id}
                  cacheVersion={cacheVersion}
                />
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
      className="bg-white w-full max-w-md md:max-w-xl rounded-t-3xl md:rounded-3xl p-6 space-y-6 shadow-2xl"
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
  const [form, setForm] = useState(initialData || { 
    title: '', 
    date: new Date().toISOString().split('T')[0], 
    time: '19:00', 
    location: '', 
    category: 'Cultos', 
    image: 'https://picsum.photos/seed/newevent/400/200' 
  });
  
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
      <input placeholder="Título do Evento" className="w-full p-3 rounded-xl border bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-primary/20" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
      <div className="flex gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Data</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              type="date" 
              className="w-full pl-10 p-3 rounded-xl border bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-primary/20" 
              value={form.date} 
              onChange={e => setForm({...form, date: e.target.value})} 
            />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horário</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              type="time" 
              className="w-full pl-10 p-3 rounded-xl border bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-primary/20" 
              value={form.time} 
              onChange={e => setForm({...form, time: e.target.value})} 
            />
          </div>
        </div>
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
      <div className="flex gap-3">
        <div className="flex-2 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Dia da Semana</label>
          <select className="w-full p-3 rounded-xl border bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-primary/20" value={form.day} onChange={e => setForm({...form, day: e.target.value})}>
            <option>Segunda-feira</option>
            <option>Terça-feira</option>
            <option>Quarta-feira</option>
            <option>Quinta-feira</option>
            <option>Sexta-feira</option>
            <option>Sábado</option>
            <option>Domingo</option>
          </select>
        </div>
        <div className="flex-1 space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Horário</label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input 
              type="time" 
              className="w-full pl-10 p-3 rounded-xl border bg-slate-50 focus:bg-white transition-all outline-none focus:ring-2 focus:ring-primary/20" 
              value={form.time} 
              onChange={e => setForm({...form, time: e.target.value})} 
            />
          </div>
        </div>
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

const TransactionForm = ({ onSubmit, funds }: { onSubmit: (t: any) => void, funds: FinancialFund[] }) => {
  const [form, setForm] = useState({ 
    label: '', 
    value: '', 
    type: 'in' as 'in' | 'out', 
    fundId: funds[0]?.id || 'main',
    category: 'Geral' 
  });

  const categories = ['Geral', 'Dízimo', 'Oferta', 'Missões', 'Utilidades', 'Aluguel', 'Pessoal', 'Manutenção', 'Transferência', 'Evento', 'Outros'];

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Descrição</label>
        <input placeholder="Ex: Dízimo Maria" className="w-full p-3 rounded-xl border font-bold text-slate-800" value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Valor (R$)</label>
          <input type="number" placeholder="0.00" className="w-full p-3 rounded-xl border font-bold text-slate-800" value={form.value} onChange={e => setForm({...form, value: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Categoria</label>
          <select 
            className="w-full p-3 rounded-xl border font-bold text-slate-800"
            value={form.category}
            onChange={e => setForm({...form, category: e.target.value})}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Fundo / Caixa</label>
        <select 
          className="w-full p-3 rounded-xl border font-bold text-slate-800"
          value={form.fundId}
          onChange={e => setForm({...form, fundId: e.target.value})}
        >
          {funds.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button 
          className={cn("flex-1 py-3 rounded-xl border font-bold transition-all", form.type === 'in' ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-400")}
          onClick={() => setForm({...form, type: 'in'})}
        >
          Entrada (+)
        </button>
        <button 
          className={cn("flex-1 py-3 rounded-xl border font-bold transition-all", form.type === 'out' ? "bg-red-500 text-white border-red-500" : "bg-white text-slate-400")}
          onClick={() => setForm({...form, type: 'out'})}
        >
          Saída (-)
        </button>
      </div>
      <Button className="w-full py-4 h-14" onClick={() => onSubmit({ ...form, value: Number(form.value) })}>Concluir Lançamento</Button>
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
