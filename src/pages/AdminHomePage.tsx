import { Link } from 'react-router-dom'
import { AdminLayout } from '../components/admin/AdminLayout'
import { AdminStatsDashboard } from './AdminStatsPage'

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
  {
    to: '/admin/recenzii',
    title: 'Recenzii',
    description:
      'Aprobă sau respinge recenziile trimise de clienți înainte să apară pe site.',
  },
  {
    to: '/admin/statistici-lunare',
    title: 'Statistici lunare',
    description:
      'Profitabilitate pe luni, cheltuieli, marje și TVA — raport anual.',
  },
  {
    to: '/admin/retururi',
    title: 'Retururi',
    description:
      'Vezi și gestionează cererile de retur trimise de clienți prin formular.',
  },
] as const

export function AdminHomePage() {
  return (
    <AdminLayout
      title="Panou admin"
      lead="Alege ce vrei să faci în zona de administrare."
      isHome
    >
      <div className="admin-home">
        <nav className="admin-menu" aria-label="Secțiuni admin">
          {adminSections.map((section) => (
            <Link key={section.to} to={section.to} className="admin-menu__card">
              <h2 className="admin-menu__title">{section.title}</h2>
              <p className="admin-menu__description muted">
                {section.description}
              </p>
            </Link>
          ))}
        </nav>
        <AdminStatsDashboard />
      </div>
    </AdminLayout>
  )
}
