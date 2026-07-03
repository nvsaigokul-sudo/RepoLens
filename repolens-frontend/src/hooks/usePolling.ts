import { useEffect, useRef, useState } from 'react';

interface PollingOptions<T> {
  fetchFn: () => Promise<T>;
  stopCondition: (data: T) => boolean;
  intervalMs?: number;
  maxTimeoutMs?: number;
  onSuccess?: (data: T) => void;
  onFailure?: (error: Error) => void;
}

export function usePolling<T>({
  fetchFn,
  stopCondition,
  intervalMs = 3000,
  maxTimeoutMs = 30000,
  onSuccess,
  onFailure
}: PollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const startPolling = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setLoading(true);
    setError(null);
    startTimeRef.current = Date.now();

    const executeFetch = async () => {
      // Check timeout
      if (Date.now() - startTimeRef.current > maxTimeoutMs) {
        setError('Request timed out. Please try again.');
        setLoading(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (onFailure) {
          onFailure(new Error('Polling timed out'));
        }
        return;
      }

      try {
        const result = await fetchFn();
        setData(result);
        
        if (stopCondition(result)) {
          setLoading(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          if (onSuccess) {
            onSuccess(result);
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during polling');
        setLoading(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (onFailure) {
          onFailure(err);
        }
      }
    };

    // First execution
    executeFetch();
    
    // Set interval
    timerRef.current = setInterval(executeFetch, intervalMs);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return { data, loading, error, startPolling };
}
