import { useState, useEffect, useCallback } from 'react';
export type DensityMode = 'comfortable' | 'compact';
export function useDensity() {
  const [density, setDensity] = useState<DensityMode>(() => {
    const saved = localStorage.getItem('app-density');
    return (saved as DensityMode) || 'comfortable';
  });
  useEffect(() => {
    const root = document.documentElement;
    if (density === 'compact') {
      root.classList.add('density-compact');
      root.classList.remove('density-comfortable');
    } else {
      root.classList.add('density-comfortable');
      root.classList.remove('density-compact');
    }
    localStorage.setItem('app-density', density);
  }, [density]);
  const toggleDensity = useCallback(() => {
    setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'));
  }, []);
  const setSpecificDensity = useCallback((val: DensityMode) => {
    setDensity(val);
  }, []);
  return { density, toggleDensity, setDensity: setSpecificDensity };
}