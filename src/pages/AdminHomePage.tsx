import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'

const adminSections = [
  {
    to: '/admin/gestiune',
    title: 'Gestiune produse',
    description:
      'Modifică stocurile, prețurile de vânzare și detaliile produselor din catalog.',
  },
  {
    to: '/admin/comenzi',
    title: 'Comenzi',
    description:
      'Vezi comenzile clienților, datele de livrare și produsele incluse.',
  },
  {
    to: '/admin/awb',
    title: 'AWB pentru printare',
    description:
      'Generează automat AWB pentru fiecare comandă și deschide fișa gata de printat.',
  },
] as const

export function AdminHomePage() {
  return (
    <AdminLayout
      title="Panou admin"
      lead="Alege ce vrei să faci în zona de administrare."
    >
      <nav className="admin-menu" aria-label="Secțiuni admin">
        {adminSections.map((section) => (
          <Link key={section.to} to={section.to} className="admin-menu__card">
            <h2 className="admin-menu__title">{section.title}</h2>
            <p className="admin-menu__description muted">{section.description}</p>
          </Link>
        ))}
      </nav>
    </AdminLayout>
  )
}
