/**
 * Primitivas compartidas: iconos, progreso, badges y diálogos.
 * Centralizar aquí el comportamiento de foco evita implementaciones distintas
 * entre las misiones, el copiloto y las confirmaciones de canje.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Route,
  Gift,
  Users,
  UserRound,
  Flame,
  Zap,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Clock,
  Check,
  Lock,
  Snowflake,
  Target,
  ChevronDown,
  X,
  Sparkles,
  FolderKanban,
  Monitor,
  ChartNoAxesCombined,
  Workflow,
  Medal,
  Video,
  BriefcaseBusiness,
  ThumbsUp,
  MessageCircle,
  ExternalLink,
  Play,
  Volume2,
  Search,
  Menu,
  CalendarDays,
  GraduationCap,
  ShieldCheck,
  Table2,
  Percent,
  Plus,
  CheckCheck,
  RotateCcw,
  Download,
  Headphones,
} from 'lucide-react';
const icons = {
  dashboard: LayoutDashboard,
  route: Route,
  gift: Gift,
  users: Users,
  user: UserRound,
  flame: Flame,
  zap: Zap,
  arrow: ArrowRight,
  back: ArrowLeft,
  book: BookOpen,
  clock: Clock,
  check: Check,
  lock: Lock,
  snow: Snowflake,
  target: Target,
  chevron: ChevronDown,
  close: X,
  sparkles: Sparkles,
  folder: FolderKanban,
  monitor: Monitor,
  chart: ChartNoAxesCombined,
  workflow: Workflow,
  award: Medal,
  video: Video,
  briefcase: BriefcaseBusiness,
  like: ThumbsUp,
  message: MessageCircle,
  external: ExternalLink,
  play: Play,
  volume: Volume2,
  search: Search,
  menu: Menu,
  calendar: CalendarDays,
  graduation: GraduationCap,
  shield: ShieldCheck,
  table: Table2,
  percent: Percent,
  plus: Plus,
  checks: CheckCheck,
  reset: RotateCcw,
  download: Download,
  headphones: Headphones,
};
/** Mantiene nombres semánticos estables para los iconos usados en el catálogo. */
export function Icon({
  name,
  size = 20,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const C = icons[name as keyof typeof icons] || BookOpen;
  return <C size={size} strokeWidth={1.8} aria-hidden="true" {...props} />;
}
/** Barra accesible: el valor debe llegar normalizado al intervalo 0–100. */
export function ProgressBar({
  value,
  label,
  segmented = false,
}: {
  value: number;
  label?: string;
  segmented?: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label || 'Progreso'}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`progress ${segmented ? 'segmented' : ''}`}
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
// Solo el diálogo superior atiende Escape/Tab cuando el copiloto se abre sobre una misión.
const modalStack: symbol[] = [];
/** Controla scroll, foco inicial, navegación circular con Tab y restauración del foco. */
export function Modal({
  title,
  children,
  onClose,
  drawer = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const identity = Symbol();
    modalStack.push(identity);
    const prev = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (modalStack.at(-1) !== identity) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,textarea,select,[tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      const index = modalStack.indexOf(identity);
      if (index >= 0) modalStack.splice(index, 1);
      document.body.style.overflow = modalStack.length ? 'hidden' : old;
      document.removeEventListener('keydown', key);
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div
      className={`overlay ${drawer ? 'drawer-overlay' : ''}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={drawer ? 'drawer' : 'modal'}
      >
        <div className="modal-head">
          <span className="eyebrow">{title}</span>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar panel">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
/** Etiqueta breve de estado; no reemplaza un control interactivo. */
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`badge ${className}`}>{children}</span>;
}
