import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const getMatch = () => typeof window !== 'undefined' && window.matchMedia(query).matches;
  const [matches, setMatches] = useState<boolean>(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handle = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, [query]);

  return matches;
}
