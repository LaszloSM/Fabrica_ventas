import { 
  LayoutDashboard, 
  Kanban, 
  Handshake, 
  Building2, 
  Users, 
  CalendarDays, 
  Flag, 
  BarChart3, 
  Settings,
  Plus,
  Bell,
  UserCircle,
  HelpCircle,
  LogOut,
  Search,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  MoreVertical,
  Download,
  Filter,
  Mail,
  Phone,
  Video,
  Gavel,
  Trophy,
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Briefcase,
  Target,
  LineChart,
  UserPlus,
  ShieldCheck,
  Globe
} from 'lucide-react';

export type ViewType = 
  | 'dashboard' 
  | 'pipeline' 
  | 'opportunities' 
  | 'opportunity-detail'
  | 'accounts' 
  | 'contacts' 
  | 'activities' 
  | 'goals' 
  | 'reports' 
  | 'settings';

export const NAVIGATION_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'opportunities', label: 'Oportunidades', icon: Handshake },
  { id: 'accounts', label: 'Cuentas', icon: Building2 },
  { id: 'contacts', label: 'Contactos', icon: Users },
  { id: 'activities', label: 'Actividades', icon: CalendarDays },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'reports', label: 'Reportes', icon: LineChart },
  { id: 'settings', label: 'Configuración', icon: Settings },
] as const;

export interface Opportunity {
  id: string;
  name: string;
  account: string;
  value: number;
  stage: string;
  probability: number;
  owner: string;
  nextAction: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  unit: string;
}

export const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: '1',
    name: 'Expansión Sostenible Q3',
    account: 'Logística Global SA',
    value: 125000,
    stage: 'Negociación',
    probability: 75,
    owner: 'Carlos Mendoza',
    nextAction: 'Enviar propuesta final',
    dueDate: 'Hoy',
    priority: 'high',
    unit: 'SAS BIC'
  },
  {
    id: '2',
    name: 'Proyecto Cero Carbono',
    account: 'EcoIndustrias S.A.',
    value: 45000,
    stage: 'Propuesta',
    probability: 40,
    owner: 'Ana Silva',
    nextAction: 'Revisar contrato',
    dueDate: 'Mañana',
    priority: 'medium',
    unit: 'SAS BIC'
  },
  {
    id: '3',
    name: 'Auditoría Impacto 2024',
    account: 'Banco del Norte',
    value: 85000,
    stage: 'Calificación',
    probability: 10,
    owner: 'Carlos Mendoza',
    nextAction: 'Llamada de prospección',
    dueDate: '28 Oct',
    priority: 'low',
    unit: 'Fundación'
  }
];

export const MOCK_ACTIVITIES = [
  {
    id: 'a1',
    type: 'Llamada',
    title: 'Seguimiento propuesta comercial',
    entity: 'EcoTech Solutions',
    time: 'Hoy, 14:00',
    status: 'pending',
    icon: Phone
  },
  {
    id: 'a2',
    type: 'Email',
    title: 'Envío reporte Q3',
    entity: 'María Fernández',
    time: 'Mañana',
    status: 'pending',
    icon: Mail
  },
  {
    id: 'a3',
    type: 'Reunión',
    title: 'Presentación de resultados',
    entity: 'Fundación Vida Verde',
    time: '28 Oct, 10:00',
    status: 'completed',
    icon: Video
  }
];

export const MOCK_ACCOUNTS = [
  { id: 'acc1', name: 'EcoSolutions Inc.', industry: 'Energía Renovable', size: 'Corporativo (1K+)', city: 'CDMX', country: 'México', owner: 'Ana López', website: 'www.ecosolutions.mx' },
  { id: 'acc2', name: 'TechCorp Global', industry: 'Software SaaS', size: 'Mediana (50-250)', city: 'Bogotá', country: 'Colombia', owner: 'Carlos Ruiz', website: 'www.techcorp.co' },
  { id: 'acc3', name: 'Fundación Verde', industry: 'ONG', size: 'Pequeña (1-50)', city: 'Lima', country: 'Perú', owner: 'María Rojas', website: ' www.fverde.org' },
];

export const MOCK_USERS = [
  { id: 'u1', name: 'Carlos Mendoza', email: 'carlos.m@coimpacto.com', role: 'Administrador', unit: 'Global', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos' },
  { id: 'u2', name: 'Ana Silva', email: 'ana.s@coimpacto.com', role: 'Gerente Comercial', unit: 'SAS BIC', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana' },
  { id: 'u3', name: 'Laura Restrepo', email: 'laura.r@coimpacto.com', role: 'Analista de Impacto', unit: 'Fundación', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laura' },
];
