import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export function SearchBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const urlQ = params.get('q') ?? ''
  const [q, setQ] = useState(urlQ)
  const onProjects = /\/projects\/?$/.test(location.pathname)

  useEffect(() => {
    setQ(urlQ)
  }, [urlQ])

  function go(value: string) {
    const next = value.trim()
    if (onProjects) {
      const sp = new URLSearchParams(params)
      if (next) sp.set('q', next)
      else sp.delete('q')
      navigate({ pathname: '/projects', search: sp.toString() }, { replace: true })
      return
    }
    const sp = new URLSearchParams()
    if (next) sp.set('q', next)
    navigate(`/projects?${sp.toString()}`)
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    go(q)
  }

  return (
    <form className="global-search" role="search" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor="global-search">
        Search archive
      </label>
      <input
        id="global-search"
        type="search"
        placeholder="Search projects, students, advisors…"
        value={q}
        onChange={(e) => {
          const value = e.target.value
          setQ(value)
          if (onProjects) go(value)
        }}
      />
      <button type="submit">Search</button>
    </form>
  )
}
