import React from 'react';
import CornerPanel from '@/components/panels/CornerPanel';

export default function CurrentVitalsPanel({ className = '' }) {
  return (
    <CornerPanel
      title="Current Vitals"
      subtitle="Contextual overview"
      showAction={false}
      className={`panel-top-left w-full sm:w-[320px] md:w-[340px] h-[245px] ${className}`}
      bodyClassName="justify-between space-y-1"
    >
      <div className="relative w-full h-[120px] flex items-center justify-center overflow-hidden py-1">
        {/* Floating Node Polyhedral Graphic matching reference */}
        <svg
          viewBox="0 0 280 120"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients for Nodes */}
            <radialGradient id="nodeRed" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#fecdd3" />
              <stop offset="60%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#be123c" />
            </radialGradient>
            <radialGradient id="nodeCyan" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#e0f2fe" />
              <stop offset="60%" stopColor="#27baff" />
              <stop offset="100%" stopColor="#0284c7" />
            </radialGradient>
            <radialGradient id="nodeBlue" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>
            <radialGradient id="nodeBlueAlt" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#dbeafe" />
              <stop offset="60%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            {/* Central Glow Filter */}
            <filter id="glowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Central Complex Lattice connecting filaments */}
          <g stroke="rgba(39, 186, 255, 0.28)" strokeWidth="1" fill="none">
            {/* Outer Hex/Polygon Mesh */}
            <polygon
              points="140,16 215,40 195,95 85,95 65,40"
              stroke="rgba(255, 255, 255, 0.18)"
              strokeDasharray="3 3"
            />
            {/* Interconnected internal struts */}
            <line x1="65" y1="40" x2="140" y2="60" stroke="rgba(255, 64, 88, 0.45)" strokeWidth="1.2" />
            <line x1="215" y1="40" x2="140" y2="60" stroke="rgba(39, 186, 255, 0.45)" strokeWidth="1.2" />
            <line x1="140" y1="16" x2="140" y2="60" stroke="rgba(39, 186, 255, 0.45)" strokeWidth="1.2" />
            <line x1="85" y1="95" x2="140" y2="60" stroke="rgba(59, 130, 246, 0.45)" strokeWidth="1.2" />
            <line x1="195" y1="95" x2="140" y2="60" stroke="rgba(39, 186, 255, 0.45)" strokeWidth="1.2" />
            <line x1="65" y1="40" x2="85" y2="95" stroke="rgba(255, 255, 255, 0.22)" />
            <line x1="215" y1="40" x2="195" y2="95" stroke="rgba(255, 255, 255, 0.22)" />
            <line x1="140" y1="16" x2="65" y2="40" stroke="rgba(255, 255, 255, 0.22)" />
            <line x1="140" y1="16" x2="215" y2="40" stroke="rgba(255, 255, 255, 0.22)" />
          </g>

          {/* Central 3D Wireframe Polyhedron Core */}
          <polygon
            points="122,48 158,48 148,74 132,74"
            fill="rgba(39, 186, 255, 0.12)"
            stroke="rgba(39, 186, 255, 0.6)"
            strokeWidth="0.8"
          />

          {/* Spherical Nodes with Specular Highlights */}
          {/* Node 1: Top Core (Blue) */}
          <circle cx="140" cy="16" r="7" fill="url(#nodeBlueAlt)" filter="url(#glowFilter)" />
          <circle cx="138" cy="14" r="2" fill="white" opacity="0.85" />

          {/* Node 2: Left High (Red) */}
          <circle cx="65" cy="40" r="9" fill="url(#nodeRed)" filter="url(#glowFilter)" />
          <circle cx="62" cy="37" r="2.5" fill="white" opacity="0.9" />

          {/* Node 3: Right High (Cyan) */}
          <circle cx="215" cy="40" r="9" fill="url(#nodeCyan)" filter="url(#glowFilter)" />
          <circle cx="212" cy="37" r="2.5" fill="white" opacity="0.9" />

          {/* Node 4: Left Low (Blue) */}
          <circle cx="85" cy="95" r="8" fill="url(#nodeBlue)" />
          <circle cx="83" cy="93" r="2" fill="white" opacity="0.85" />

          {/* Node 5: Right Low (Cyan) */}
          <circle cx="195" cy="95" r="8" fill="url(#nodeCyan)" />
          <circle cx="193" cy="93" r="2" fill="white" opacity="0.85" />

          {/* Center Hub Node */}
          <circle cx="140" cy="60" r="5" fill="#38bdf8" opacity="0.9" />
          <circle
            cx="140"
            cy="60"
            r="10"
            stroke="#27baff"
            strokeWidth="0.75"
            fill="none"
            opacity="0.5"
            className="animate-ping"
            style={{ transformOrigin: '140px 60px', animationDuration: '3s' }}
          />
        </svg>
      </div>

      {/* Status Bar at Bottom of Panel with Generous Clearance */}
      <div className="flex items-center justify-between pt-2 pb-0.5 border-t border-white/[0.06]">
        <span className="text-[10px] text-slate-400 font-medium">Neural Synapse Status</span>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/25 text-[10.5px] text-cyan-300 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span>Equilibrium 94%</span>
        </div>
      </div>
    </CornerPanel>
  );
}

