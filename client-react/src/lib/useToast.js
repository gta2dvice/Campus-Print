import { useRef, useState } from 'react';

export default function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);

  function showToast(message, type = 'success') {
    clearTimeout(timer.current);
    setToast({ message, type, show: true });
    timer.current = setTimeout(() => setToast((t) => t && { ...t, show: false }), 3500);
  }

  return { toast, showToast };
}
