import {
  BarChart3,
  Globe2,
  GraduationCap,
  MessageSquareText,
  PackageCheck,
  PlugZap,
  Rocket,
  ShieldCheck,
  Target,
} from 'lucide-react'

export const techStack = ['React', 'Laravel', 'PostgreSQL', 'Tailwind CSS', 'JWT']

export const terminalLines = [
  ['$ whoami', 'Ukasha Bin Khalil'],
  ['$ services', 'Websites / SaaS / Dashboards'],
  ['$ latest-project', 'Inventory Management SaaS'],
  ['$ availability', 'Available for Client Work'],
]

export const services = [
  { icon: Globe2, title: 'Business Websites', description: 'Fast, responsive sites with clear structure, polished UI and conversion-focused pages.' },
  { icon: Rocket, title: 'SaaS Development', description: 'Custom web apps with authentication, dashboards, roles and scalable product flows.' },
  { icon: BarChart3, title: 'Admin Dashboards', description: 'Operational panels for tracking data, managing records and making faster decisions.' },
  { icon: PlugZap, title: 'API Integration', description: 'Connect payments, forms, databases and third-party tools into one smooth workflow.' },
]

export const projects = [
  {
    number: '01',
    title: 'The Scholars',
    icon: GraduationCap,
    stack: ['Laravel', 'Tailwind CSS'],
    description: 'Education-focused website built for a real client with a clean interface and responsive layouts.',
    features: ['Responsive UI', 'Content Structure', 'Performance Polish'],
  },
  {
    number: '02',
    title: 'Storix',
    icon: PackageCheck,
    stack: ['React', 'PostgreSQL', 'JWT Authentication'],
    description: 'Inventory management SaaS for stock tracking, secure access and business workflow visibility.',
    features: ['Authentication', 'Inventory Tracking', 'Dashboard Analytics', 'Role Management'],
  },
]

export const reasons = [
  { icon: MessageSquareText, title: 'Clear Communication', description: 'Straightforward updates, practical decisions and no confusion about what comes next.' },
  { icon: ShieldCheck, title: 'Reliable Build Quality', description: 'Clean structure, responsive layouts and modern tools chosen for long-term maintainability.' },
  { icon: Target, title: 'Business Focused', description: 'Every feature is shaped around the real goal: saving time, improving trust or driving growth.' },
]
