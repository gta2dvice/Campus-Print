import { useEffect } from 'react';

/** Applies a class to document.body for the lifetime of the page (matches the old per-page <body class="..."> setup). */
export default function useBodyClass(className) {
  useEffect(() => {
    if (!className) return;
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
}
