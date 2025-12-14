/**
 * Централизованный экспорт иконок
 * Используем как lucide-react, так и react-icons
 */

// Lucide React иконки (уже используются)
export {
  Moon,
  Sun,
  Monitor,
  Search,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  AlertCircle,
  Info,
  Loader2,
} from 'lucide-react';

// React Icons примеры (можно использовать любые наборы)
// Material Design Icons
export {
  MdTrendingUp,
  MdTrendingDown,
  MdRefresh,
  MdClose,
  MdCheckCircle,
  MdError,
  MdWarning,
  MdInfo,
} from 'react-icons/md';

// Font Awesome
export {
  FaBitcoin,
  FaEthereum,
  FaChartLine,
  FaExchangeAlt,
} from 'react-icons/fa';

// Heroicons
export {
  HiOutlineChartBar,
  HiOutlineCog,
  HiOutlineX,
  HiCheck,
} from 'react-icons/hi';

// Feather Icons
export {
  FiTrendingUp,
  FiTrendingDown,
  FiRefreshCw,
} from 'react-icons/fi';

/**
 * Пример использования:
 * 
 * import { Moon, Sun } from '@/lib/icons';
 * import { MdTrendingUp } from '@/lib/icons';
 * 
 * <Moon className="h-4 w-4" />
 * <MdTrendingUp className="h-5 w-5" />
 */

