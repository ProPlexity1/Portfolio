import { BarChart3, Globe2, MessageSquareText, PackageCheck, PlugZap, Rocket, ShieldCheck, Target, GraduationCap } from 'lucide-react'

export const techStack = ['React', 'Laravel', 'PostgreSQL', 'Tailwind CSS', 'JWT', 'Docker']

export const terminalLines = [
  ['$ whoami', 'Ukasha Bin Khalil'],
  ['$ services', 'Websites • SaaS • Dashboards'],
  ['$ latest-project', 'Inventory Management SaaS'],
  ['$ availability', 'Available for Client Work'],
]

export const services = [
  {
    icon: Globe2,
    title: 'Business Websites',
    description: 'Fast, responsive websites designed to help businesses grow online.',
  },
  {
    icon: Rocket,
    title: 'SaaS Development',
    description: 'Scalable software platforms built for startups and businesses.',
  },
  {
    icon: BarChart3,
    title: 'Admin Dashboards',
    description: 'Management systems with analytics, reporting and automation.',
  },
  {
    icon: PlugZap,
    title: 'API Integration',
    description: 'Connect systems and automate workflows.',
  },
]

export const projects = [
  {
    number: '01',
    title: 'The Scholars',
    icon: GraduationCap,
    stack: ['Laravel', 'Tailwind CSS'],
    description: 'Educational platform built from scratch for a real client.',
    features: ['Responsive Design', 'Modern UI', 'Optimized Performance'],
  },
  {
    number: '02',
    title: 'Flowventory',
    icon: PackageCheck,
    stack: ['React', 'PostgreSQL', 'JWT Authentication'],
    description: 'Inventory management SaaS designed to simplify stock tracking and business operations.',
    features: ['Authentication', 'Inventory Tracking', 'Dashboard Analytics', 'Role Management'],
  },
]

export const reasons = [
  {
    icon: MessageSquareText,
    title: 'Reliable Communication',
    description: 'Clear updates and professional collaboration throughout every project.',
  },
  {
    icon: ShieldCheck,
    title: 'Modern Technology',
    description: 'Built using current tools and best practices.',
  },
  {
    icon: Target,
    title: 'Business Focused',
    description: 'Solutions designed around real business needs.',
  },
]
