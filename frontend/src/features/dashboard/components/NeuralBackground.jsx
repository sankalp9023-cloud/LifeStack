import React from 'react';
import neuralBrainImg from '@/assets/backgrounds/neural-brain.jpg';

export default function NeuralBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none flex items-center justify-center">
      {/* Primary Neural Brain Visual */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={neuralBrainImg}
          alt="Neural Brain Network Core"
          className="w-full h-full object-cover object-center max-w-[1920px] max-h-[1080px] filter grayscale drop-shadow-[0_0_50px_rgba(39,186,255,0.13)] opacity-65 transition-opacity duration-700"
          loading="eager"
        />

        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(39, 186, 255, .2)', mixBlendMode: 'color' }}
        />

        {/* Deep ambient vignette overlay to blend edges seamlessly into space-950 */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(3, 9, 20, 0) 35%, rgba(3, 9, 20, 0.4) 65%, rgba(3, 9, 20, 0.85) 88%, #030914 100%)',
          }}
        />

        {/* Subtle atmospheric ambient glow to enhance the luminous brain */}
        <div className="absolute w-[600px] h-[400px] rounded-full bg-blue-500/10 blur-[130px] -translate-y-4 pointer-events-none" />
        <div className="absolute w-[350px] h-[250px] rounded-full bg-red-600/5 blur-[120px] translate-x-48 -translate-y-12 pointer-events-none" />
      </div>
    </div>
  );
}

