import { NavLink } from 'react-router-dom'
import './CourierNav.css'

export type CourierTab = 'panou' | 'expedieri' | 'rutare' | 'tarife'

const TABS: Array<{ id: CourierTab; to: string; label: string; hint: string }> = [
  { id: 'panou', to: '/admin/curieri', label: 'Panou curierat', hint: 'Performanță, județe, retururi' },
  { id: 'expedieri', to: '/admin/curieri/expedieri', label: 'Expedieri', hint: 'AWB-uri cu tracking' },
  { id: 'rutare', to: '/admin/curieri/rutare', label: 'Rutare curieri', hint: 'Ponderi, curieri, simulator' },
  { id: 'tarife', to: '/admin/curieri/tarife', label: 'Tarife curieri', hint: 'Contracte vs. cost real' },
]

export function CourierNav({ active }: { active: CourierTab }) {
  return (
    <nav className="cnav" aria-label="Secțiuni curierat">
      {TABS.map((t) => (
        <NavLink
          key={t.id}
          to={t.to}
          end
          className={`cnav__tab${active === t.id ? ' cnav__tab--active' : ''}`}
          aria-current={active === t.id ? 'page' : undefined}
        >
          <span className="cnav__label">{t.label}</span>
          <span className="cnav__hint">{t.hint}</span>
        </NavLink>
      ))}
    </nav>
  )
}
