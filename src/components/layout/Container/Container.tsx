import { cn } from '@/utils/cn';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function Container({ children, className }: ContainerProps) {
  return (
    <div className={cn('container mx-auto px-4 sm:px-4 md:px-4 lg:px-8', className)}>
      {children}
    </div>
  );
}
