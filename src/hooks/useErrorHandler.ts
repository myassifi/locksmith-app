import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

export function useErrorHandler() {
  const [isLoading, setIsLoading] = useState(false);

  const executeAsync = async <T,>(
    fn: () => Promise<T>,
    options?: { errorMessage?: string }
  ): Promise<T | undefined> => {
    setIsLoading(true);
    try {
      const result = await fn();
      return result;
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: options?.errorMessage || error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, executeAsync };
}
