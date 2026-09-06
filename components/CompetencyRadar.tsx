'use client';

import { useMemo } from 'react';
import type { CompetencyState } from '@/types/interview';

interface CompetencyRadarProps {
  competencies: CompetencyState;
  className?: string;
  size?: number;
}

export function CompetencyRadar({ competencies, className = '', size = 300 }: CompetencyRadarProps) {
  const data = useMemo(() => {
    const keys = Object.keys(competencies);
    if (keys.length < 3) return null; // Radar needs at least 3 points
    
    return keys.map((key) => {
      const state = competencies[key];
      // Normalize values for radar [0, 1]
      const ratingScore = state.rating ? state.rating / 4 : 0; 
      const confidenceScore = state.confidence;
      const difficultyScore = state.difficulty / 5;
      
      return {
        label: key.replace(/_/g, ' '),
        rating: ratingScore,
        confidence: confidenceScore,
        difficulty: difficultyScore,
      };
    });
  }, [competencies]);

  if (!data) {
    return <div className={`flex items-center justify-center text-xs text-muted-foreground ${className}`} style={{ width: size, height: size }}>Insufficient data for radar</div>;
  }

  const center = size / 2;
  const radius = (size / 2) * 0.7; // Leave room for labels
  const angleStep = (Math.PI * 2) / data.length;

  const points = (key: 'rating' | 'confidence' | 'difficulty', scale = 1) => {
    return data.map((d, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const value = d[key] * scale;
      const r = radius * value;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');
  };

  const ratingPoints = points('rating');
  const confidencePoints = points('confidence');
  const difficultyPoints = points('difficulty');

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.1)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.02)" />
          </radialGradient>
          <linearGradient id="rating-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.4)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.1)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background Web */}
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={data.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              const r = radius * level;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="hsl(var(--border) / 0.5)"
            strokeWidth="1"
            strokeDasharray={level === 1 ? 'none' : '4 4'}
          />
        ))}

        {/* Axis Lines */}
        {data.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="hsl(var(--border) / 0.5)"
              strokeWidth="1"
            />
          );
        })}

        {/* Confidence Area (Background) */}
        <polygon
          points={confidencePoints}
          fill="hsl(var(--muted) / 0.2)"
          stroke="hsl(var(--muted-foreground) / 0.3)"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Difficulty Perimeter */}
        <polygon
          points={difficultyPoints}
          fill="none"
          stroke="hsl(var(--destructive) / 0.5)"
          strokeWidth="2"
        />

        {/* Rating Area (Foreground) */}
        <polygon
          points={ratingPoints}
          fill="url(#rating-fill)"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          filter="url(#glow)"
        />

        {/* Rating Points */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const r = radius * d.rating;
          return (
            <circle
              key={i}
              cx={center + r * Math.cos(angle)}
              cy={center + r * Math.sin(angle)}
              r="4"
              fill="hsl(var(--background))"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          );
        })}

        {/* Labels */}
        {data.map((d, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const labelRadius = radius + 24;
          const x = center + labelRadius * Math.cos(angle);
          const y = center + labelRadius * Math.sin(angle);
          
          let textAnchor: "start" | "end" | "middle" = "middle";
          if (Math.abs(Math.cos(angle)) > 0.1) {
            textAnchor = Math.cos(angle) > 0 ? "start" : "end";
          }
          
          return (
            <text
              key={i}
              x={x}
              y={y}
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="text-[10px] font-medium uppercase tracking-wider"
              fill="hsl(var(--muted-foreground))"
              style={{ textTransform: 'capitalize' }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-[-20px] flex gap-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          <span>Rating</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border border-destructive bg-transparent" />
          <span>Difficulty</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full border border-dashed border-muted-foreground bg-muted/20" />
          <span>Confidence</span>
        </div>
      </div>
    </div>
  );
}
