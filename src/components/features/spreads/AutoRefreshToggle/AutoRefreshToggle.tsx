import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

export interface AutoRefreshToggleProps {
  isAuto: boolean;
  onToggle: (isAuto: boolean) => void;
  onRefresh: () => void;
  className?: string;
}

/**
 * Переключатель автообновления
 * Кнопка "Auto" (автообновление) и "Refresh" (ручное обновление)
 */
export function AutoRefreshToggle({
  isAuto,
  onToggle,
  onRefresh,
  className,
}: AutoRefreshToggleProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={isAuto ? 'primary' : 'secondary'}
        size="sm"
        onClick={() => onToggle(!isAuto)}
        className={cn(isAuto && 'ring-2 ring-green-500 dark:ring-green-400')}
      >
        Auto
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRefresh}
        className="flex items-center gap-1.5"
      >
        <RefreshCw className="h-4 w-4" />
        Refresh
      </Button>
    </div>
  );
}
