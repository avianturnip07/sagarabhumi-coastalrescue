'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import Splash from '../components/Splash';

// Dashboard memuat Leaflet, yang hanya berjalan di browser. Karena itu SSR dimatikan.
const Dashboard = dynamic(() => import('../components/Dashboard'), {
  ssr: false,
  loading: () => <div className="bathy h-dvh" aria-busy="true" />,
});

export default function Page() {
  const [phase, setPhase] = useState('splash'); // splash -> leaving -> app
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const enter = () => {
    setPhase('leaving'); // dashboard mulai dimuat di bawah splash yang sedang memudar
    timer.current = setTimeout(() => setPhase('app'), 700);
  };

  return (
    <>
      {phase !== 'splash' && <Dashboard />}
      {phase !== 'app' && <Splash leaving={phase === 'leaving'} onEnter={enter} />}
    </>
  );
}
