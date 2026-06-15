import OverviewPage from './OverviewPage'
import AboutPage from './AboutPage'
import ServicesPage from './ServicesPage'
import ProjectsPage from './ProjectsPage'
import WhyPage from './WhyPage'
import ContactPage from './ContactPage'

export const cardPages = [
  { id: 'overview', label: 'Overview', component: OverviewPage },
  { id: 'about', label: 'About', component: AboutPage },
  { id: 'services', label: 'Services', component: ServicesPage },
  { id: 'projects', label: 'Projects', component: ProjectsPage },
  { id: 'why', label: 'Why Me', component: WhyPage },
  { id: 'contact', label: 'Contact', component: ContactPage },
]
