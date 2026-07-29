import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { Advisors } from './pages/Advisors'
import { AdvisorDetail } from './pages/AdvisorDetail'
import { Years } from './pages/Years'
import { YearDetail } from './pages/YearDetail'
import { Topics } from './pages/Topics'
import { TopicDetail } from './pages/TopicDetail'
import { Bibliography } from './pages/Bibliography'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="projects" element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="advisors" element={<Advisors />} />
          <Route path="advisors/:id" element={<AdvisorDetail />} />
          <Route path="years" element={<Years />} />
          <Route path="years/:year" element={<YearDetail />} />
          <Route path="topics" element={<Topics />} />
          <Route path="topics/:slug" element={<TopicDetail />} />
          <Route path="bibliographies" element={<Bibliography />} />
          <Route path="bibliography" element={<Bibliography />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
