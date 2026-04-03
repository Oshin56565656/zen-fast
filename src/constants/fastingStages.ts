import { Zap, Activity, Flame, Recycle, Sparkles, ShieldCheck } from 'lucide-react';

export const FASTING_STAGES = [
  {
    id: 'blood-sugar-rising',
    label: 'Blood Sugar Rising',
    description: 'Your body is processing the last meal. Insulin levels are high.',
    startHour: 0,
    endHour: 4,
    icon: Zap,
    color: 'text-blue-400',
    hex: '#60a5fa',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/20'
  },
  {
    id: 'blood-sugar-falling',
    label: 'Blood Sugar Falling',
    description: 'Insulin levels drop. Your body begins to tap into glycogen stores.',
    startHour: 4,
    endHour: 12,
    icon: Activity,
    color: 'text-yellow-400',
    hex: '#facc15',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/20'
  },
  {
    id: 'ketosis-begins',
    label: 'Ketosis Begins',
    description: 'Glycogen is low. Your body starts burning fat for fuel (Ketones).',
    startHour: 12,
    endHour: 18,
    icon: Flame,
    color: 'text-orange-400',
    hex: '#fb923c',
    bgColor: 'bg-orange-400/10',
    borderColor: 'border-orange-400/20'
  },
  {
    id: 'autophagy',
    label: 'Autophagy',
    description: 'Cellular cleanup begins. Your body recycles damaged components.',
    startHour: 18,
    endHour: 24,
    icon: Recycle,
    color: 'text-purple-400',
    hex: '#c084fc',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/20'
  },
  {
    id: 'growth-hormone',
    label: 'Growth Hormone',
    description: 'Human Growth Hormone (HGH) levels spike significantly.',
    startHour: 24,
    endHour: 48,
    icon: Sparkles,
    color: 'text-green-400',
    hex: '#4ade80',
    bgColor: 'bg-green-400/10',
    borderColor: 'border-green-400/20'
  },
  {
    id: 'immune-regeneration',
    label: 'Immune Regeneration',
    description: 'Insulin sensitivity is maximized and immune system starts to regenerate.',
    startHour: 48,
    endHour: 1000,
    icon: ShieldCheck,
    color: 'text-cyan-400',
    hex: '#22d3ee',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/20'
  }
];
