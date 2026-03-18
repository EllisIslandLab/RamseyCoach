import { useState, useEffect } from 'react';

export function useIsStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(mq.matches || iosStandalone);
  }, []);

  return isStandalone;
}
