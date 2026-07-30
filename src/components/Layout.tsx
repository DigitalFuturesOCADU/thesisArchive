import { NavLink, Outlet } from 'react-router-dom'
import { SearchBar } from './SearchBar'

const ORR_DF =
  'https://openresearch.ocadu.ca/view/divisions/sch=5Fgs=5Fdfu/'

export function Layout() {
  return (
    <div className="site">
      <header className="site-header">
        <div className="site-header__inner">
          <div className="site-header__top">
            <NavLink to="/" className="brand" end>
              <span className="brand__program">Digital Futures</span>
              <span className="brand__title">Thesis Archive</span>
            </NavLink>
            <nav className="nav" aria-label="Primary">
              <NavLink to="/" end>
                Projects
              </NavLink>
              <NavLink to="/advisors">Advisors</NavLink>
              <NavLink to="/years">Years</NavLink>
              <NavLink to="/topics">Topics</NavLink>
              <NavLink to="/bibliographies">Bibliographies</NavLink>
            </nav>
          </div>
          <SearchBar />
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="site-footer__inner">
          <p>
            Collated from the{' '}
            <a href={ORR_DF} target="_blank" rel="noreferrer">
              OCAD University Open Research Repository — Digital Futures
            </a>
            .
          </p>
        </div>
      </footer>
    </div>
  )
}
