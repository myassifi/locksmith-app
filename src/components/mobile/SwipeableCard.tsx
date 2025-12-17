import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface SwipeableInventoryCardProps {
  children: ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function SwipeableInventoryCard({ children, onEdit, onDelete }: SwipeableInventoryCardProps) {
  return (
    <Card className="relative overflow-hidden">
      {children}
    </Card>
  );
}
