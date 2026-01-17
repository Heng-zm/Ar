"use client";

import dynamic from 'next/dynamic';
import { Loader } from 'lucide-react';

// Dynamically import ARView with ssr: false
// This prevents Next.js from trying to render Three.js/Camera logic on the server
const ARView = dynamic(() => import('@/components/ar-view'), { 
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <Loader className="h-8 w-8 animate-spin text-white" />
        <p className="text-sm font-medium text-white/80">Initializing AR Engine...</p>
      </div>
    </div>
  )
});

export default function Home() {
  return (
    <main className="h-screen w-screen overflow-hidden bg-black">
      <ARView />
    </main>
  );
}