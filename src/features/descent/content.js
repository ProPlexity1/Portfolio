import { BarChart3, Globe2, MessageSquareText, PlugZap, Rocket, ShieldCheck, Target } from 'lucide-react'

// Swap this for your real inbox before going live.
export const CONTACT_EMAIL = 'ukasha@example.com'

export const CTA = { contact: 'Start a project', work: 'See the work' }

// One entry per stop on the way down. `cam` is where the camera looks in the
// photo (image pixels, 1500x2000) and how far it zooms past "cover" framing.
// The summit stop is a boot-level close-up of the snow; `fallback` is used when
// WebGL is unavailable and the close-up can't be drawn.
export const STOPS = [
  { id: 'summit', label: 'Summit', alt: 5180, cam: { x: 721, y: 432, z: [40, 45] }, fallback: { x: 740, y: 455, z: [1.9, 2.3] } },
  { id: 'ridge', label: 'The view', alt: 5150, cam: { x: 740, y: 470, z: [1.9, 2.3] }, rail: false },
  { id: 'about', label: 'About', alt: 4870, cam: { x: 655, y: 590, z: [1.6, 2.6] } },
  { id: 'services', label: 'Services', alt: 4520, cam: { x: 1000, y: 650, z: [1.7, 2.3] } },
  { id: 'work', label: 'Work', alt: 4140, cam: { x: 300, y: 830, z: [2.0, 2.0] } },
  { id: 'approach', label: 'Approach', alt: 3790, cam: { x: 1240, y: 1110, z: [2.4, 2.1] } },
  { id: 'stack', label: 'Stack', alt: 3520, cam: { x: 1260, y: 1500, z: [2.4, 2.0] } },
  { id: 'basecamp', label: 'Base camp', alt: 3260, cam: { x: 760, y: 1370, z: [1.0, 1.12] } },
]

// Trail through the photo. Points flagged with `stop` sit under that stop's camera.
export const TRAIL = [
  [548, 668], [585, 600], [628, 540], [675, 488], [712, 446], { p: [740, 420], stop: [0, 1] },
  [776, 462], [742, 528], { p: [662, 598], stop: 2 },
  [760, 640], [870, 668], { p: [962, 704], stop: 3 },
  [905, 790], [760, 838], [580, 862], { p: [384, 884], stop: 4 },
  [520, 902], [760, 902], [960, 918], [1080, 990], { p: [1176, 1132], stop: 5 },
  [1300, 1238], [1190, 1350], { p: [1086, 1474], stop: 6 },
  [1040, 1610], [990, 1712], [930, 1772], { p: [846, 1806], stop: 7 },
]

export const facts = [
  ['whoami', 'Ukasha Bin Khalil'],
  ['builds', 'Websites, SaaS, dashboards'],
  ['latest', 'Storix, inventory SaaS'],
  ['status', 'Taking client work'],
]

export const services = [
  { icon: Rocket, title: 'SaaS development', description: 'Custom web apps with authentication, dashboards, roles and product flows that scale with the business.' },
  { icon: Globe2, title: 'Business websites', description: 'Fast, responsive sites with clear structure and pages built to turn visitors into enquiries.' },
  { icon: BarChart3, title: 'Admin dashboards', description: 'Panels for tracking data, managing records and making faster calls.' },
  { icon: PlugZap, title: 'API integration', description: 'Payments, forms, databases and third-party tools wired into one workflow.' },
]

export const projects = [
  {
    id: 'storix',
    title: 'Storix',
    kind: 'Inventory management SaaS',
    stack: ['React', 'PostgreSQL', 'JWT auth'],
    description: 'Stock tracking with secure access, role management and a dashboard that shows the business what is moving and what is not.',
    features: ['Authentication', 'Inventory tracking', 'Dashboard analytics', 'Role management'],
  },
  {
    id: 'scholars',
    title: 'The Scholars',
    kind: 'Education website, client build',
    stack: ['Laravel', 'Tailwind CSS'],
    description: 'An education site built for a real client: a calm interface, clear content structure and layouts that hold up on every screen.',
    features: ['Responsive UI', 'Content structure', 'Performance polish'],
  },
]

export const reasons = [
  { icon: MessageSquareText, title: 'Clear communication', description: 'Straight updates, practical decisions and no guessing about what happens next.' },
  { icon: ShieldCheck, title: 'Reliable build quality', description: 'Clean structure, responsive layouts and tools picked for long-term maintenance.' },
  { icon: Target, title: 'Business first', description: 'Every feature is shaped around the real goal: saving time, earning trust or driving growth.' },
]

export const steps = [
  { title: 'Share the goal', description: 'Tell me what you need built and what it should achieve.' },
  { title: 'Plan the build', description: 'We agree scope, screens, features and a clear delivery path.' },
  { title: 'Ship it', description: 'Direct communication and a focused build, start to launch.' },
]
