'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function NavProgress() {
  const pathname = usePathname();
  const [key, setKey] = useState(0);

  useEffect(() => {
    setKey((k) => k + 1);
  }, [pathname]);

  return <div key={key} className="nav-progress" />;
}
