import fieldPolicy from '@data/field-policy.json'
import type { FieldPolicy } from '../types'

const policy = fieldPolicy as FieldPolicy

const ORR_DF =
  'https://openresearch.ocadu.ca/view/divisions/sch=5Fgs=5Fdfu/'

export function DataPage() {
  return (
    <div className="page">
      <div className="toolbar">
        <h1 className="toolbar__title">Data</h1>
      </div>
      <p className="lede tight">{policy.intro}</p>
      <p className="tight">
        Source:{' '}
        <a href={ORR_DF} target="_blank" rel="noreferrer">
          Open Research — Digital Futures
        </a>
      </p>

      <section className="section">
        <h2>Fields kept</h2>
        <ul className="field-list">
          {policy.kept.map((f) => (
            <li key={f.field}>
              <code>{f.field}</code>
              <span>{f.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2>Fields ignored</h2>
        <ul className="field-list">
          {policy.ignored.map((f) => (
            <li key={f.field}>
              <code>{f.field}</code>
              <span>{f.reason}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
