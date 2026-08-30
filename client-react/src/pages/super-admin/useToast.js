import { useCallback, useRef, useState } from 'react';

// Small hook wrapping the shared Toast component's {message,type,show} shape,
// matching the original common.js showToast(msg, type) behaviour (auto-hides after 3.5s).
export default function useToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type, show: true });
    timerRef.current = setTimeout(() => {
      setToast((t) => (t ? { ...t, show: false } : t));
    }, 3500);
  }, []);

  return [toast, showToast];
}
