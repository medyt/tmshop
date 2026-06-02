import { Link } from 'react-router-dom'
import { SHOP_INFO_ROUTES, SITE_LEGAL } from '../../lib/siteLegal'
import { ShopInfoPage } from './ShopInfoPage'

export function DeliveryInfoPage() {
  return (
    <ShopInfoPage
      title="Livrare și plată"
      lead="Cum livrăm comenzile și cum se face plata."
      path={SHOP_INFO_ROUTES.delivery}
      sections={[
        {
          title: 'Livrare prin curier',
          body: (
            <p>
              {SITE_LEGAL.brandName} livrează comenzile prin{' '}
              {SITE_LEGAL.deliveryCarriersLabel}, în România. Costul transportului
              este de {SITE_LEGAL.shippingFlatRateRon} RON per comandă. Curierul
              este ales în funcție de adresă și disponibilitate. Intervalul de
              livrare este confirmat după plasarea comenzii.
            </p>
          ),
        },
        {
          title: 'Plată la livrare',
          body: (
            <p>
              Plata se face la livrare, în numerar sau după modalitatea agreată
              cu echipa {SITE_LEGAL.brandName}. Nu procesăm plăți online pe
              site.
            </p>
          ),
        },
        {
          title: 'Comenzi fără cont',
          body: (
            <p>
              Poți plasa o comandă și fără cont. Pentru urmărire, păstrează
              referința comenzii afișată după finalizare.
            </p>
          ),
        },
      ]}
    />
  )
}

export function ReturnsInfoPage() {
  return (
    <ShopInfoPage
      title="Retur"
      lead="Informații despre retururi și reclamații."
      path={SHOP_INFO_ROUTES.returns}
      sections={[
        {
          title: 'Cum soliționăm retururile',
          body: <p>{SITE_LEGAL.returnSummary}</p>,
        },
        {
          title: 'Contact pentru retur',
          body: (
            <p>
              Pentru un retur sau o problemă cu produsul primit, scrie la{' '}
              <a href={`mailto:${SITE_LEGAL.contactEmail}`}>
                {SITE_LEGAL.contactEmail}
              </a>
              {SITE_LEGAL.contactPhone ? (
                <>
                  {' '}
                  sau sună la {SITE_LEGAL.contactPhone}
                </>
              ) : null}
              .
            </p>
          ),
        },
      ]}
    />
  )
}

export function ContactInfoPage() {
  return (
    <ShopInfoPage
      title="Contact"
      lead="Date de contact pentru comenzi, livrări și întrebări."
      path={SHOP_INFO_ROUTES.contact}
      sections={[
        {
          title: 'Date de contact',
          body: (
            <>
              <p>
                <strong>{SITE_LEGAL.operatorName}</strong>
              </p>
              <p>CUI: {SITE_LEGAL.operatorCui}</p>
              <p>Reg. Com.: {SITE_LEGAL.operatorRegCom}</p>
              <p>
                Email:{' '}
                <a href={`mailto:${SITE_LEGAL.contactEmail}`}>
                  {SITE_LEGAL.contactEmail}
                </a>
              </p>
              {SITE_LEGAL.contactPhone ? (
                <p>Telefon: {SITE_LEGAL.contactPhone}</p>
              ) : null}
              <p>Adresă: {SITE_LEGAL.operatorAddress}</p>
              <p>Program: {SITE_LEGAL.supportHours}</p>
              <p>
                Site:{' '}
                <a href={SITE_LEGAL.siteUrl}>{SITE_LEGAL.siteUrl}</a>
              </p>
            </>
          ),
        },
      ]}
    />
  )
}

export function FaqInfoPage() {
  return (
    <ShopInfoPage
      title="Întrebări frecvente"
      lead="Răspunsuri rapide la întrebările comune."
      path={SHOP_INFO_ROUTES.faq}
      sections={[
        {
          title: 'Pot comanda fără cont?',
          body: (
            <p>
              Da. Poți finaliza comanda ca vizitator, completând datele de
              livrare la checkout.
            </p>
          ),
        },
        {
          title: 'Cum plătesc comanda?',
          body: <p>Plata se face la livrare, conform {SITE_LEGAL.deliverySummary}</p>,
        },
        {
          title: 'Unde văd confirmarea comenzii?',
          body: (
            <p>
              După trimitere, vei vedea pagina de confirmare cu referința
              comenzii.
            </p>
          ),
        },
        {
          title: 'Aveți nevoie de mai multe detalii?',
          body: (
            <p>
              Consultă pagina de{' '}
              <Link to={SHOP_INFO_ROUTES.contact}>contact</Link> sau scrie la{' '}
              {SITE_LEGAL.contactEmail}.
            </p>
          ),
        },
      ]}
    />
  )
}

export function TermsInfoPage() {
  return (
    <ShopInfoPage
      title="Termeni și condiții"
      lead={`Condițiile de utilizare a magazinului ${SITE_LEGAL.brandName}.`}
      path={SHOP_INFO_ROUTES.terms}
      sections={[
        {
          title: 'Operator',
          body: (
            <p>
              Magazinul online {SITE_LEGAL.siteUrl} este operat de{' '}
              {SITE_LEGAL.brandName}, cu sediul în {SITE_LEGAL.operatorAddress}.
            </p>
          ),
        },
        {
          title: 'Comenzi',
          body: (
            <p>
              Prin plasarea unei comenzi confirmi că datele furnizate sunt
              corecte și că dorești achiziția produselor selectate la prețurile
              afișate în catalog.
            </p>
          ),
        },
        {
          title: 'Prețuri și disponibilitate',
          body: (
            <p>
              Prețurile și stocul pot fi actualizate. Dacă un produs nu mai este
              disponibil, te vom contacta pentru o soluție.
            </p>
          ),
        },
        {
          title: 'Livrare și plată',
          body: <p>{SITE_LEGAL.deliverySummary}</p>,
        },
        {
          title: 'Contact',
          body: (
            <p>
              Pentru întrebări legate de termeni, scrie la{' '}
              {SITE_LEGAL.contactEmail}.
            </p>
          ),
        },
      ]}
    />
  )
}

export function PrivacyInfoPage() {
  return (
    <ShopInfoPage
      title="Politica de confidențialitate"
      lead="Cum prelucrăm datele personale în magazinul online."
      path={SHOP_INFO_ROUTES.privacy}
      sections={[
        {
          title: 'Operatorul datelor',
          body: (
            <p>
              {SITE_LEGAL.brandName} prelucrează datele necesare pentru
              procesarea comenzilor și gestionarea conturilor de client.
            </p>
          ),
        },
        {
          title: 'Ce date colectăm',
          body: (
            <ul>
              <li>Date de identificare și contact la checkout sau înregistrare</li>
              <li>Date despre comandă: produse, cantități, adresă de livrare</li>
              <li>Date tehnice minime pentru funcționarea site-ului și sesiunii</li>
            </ul>
          ),
        },
        {
          title: 'De ce folosim datele',
          body: (
            <p>
              Datele sunt folosite pentru preluarea și livrarea comenzilor,
              comunicarea cu tine și, dacă ai cont, autentificarea în magazin.
            </p>
          ),
        },
        {
          title: 'Durata păstrării',
          body: (
            <p>
              Păstrăm datele cât este necesar pentru onorarea comenzilor,
              obligațiile legale și soluționarea solicitărilor.
            </p>
          ),
        },
        {
          title: 'Drepturile tale',
          body: (
            <p>
              Poți solicita informații, rectificare sau ștergere scriind la{' '}
              {SITE_LEGAL.contactEmail}.
            </p>
          ),
        },
      ]}
    />
  )
}

export function CookiesInfoPage() {
  return (
    <ShopInfoPage
      title="Politica cookie"
      lead="Ce cookie-uri și stocare locală folosește site-ul."
      path={SHOP_INFO_ROUTES.cookies}
      sections={[
        {
          title: 'Cookie-uri esențiale',
          body: (
            <p>
              Folosim cookie-uri și stocare locală necesare pentru coș,
              autentificare și salvarea preferinței tale privind cookie-urile.
            </p>
          ),
        },
        {
          title: 'Fără cookie-uri de marketing',
          body: (
            <p>
              În această versiune a magazinului nu folosim cookie-uri de
              analiză sau publicitate de la terți.
            </p>
          ),
        },
        {
          title: 'Cum îți poți gestiona alegerea',
          body: (
            <p>
              La prima vizită îți poți alege să accepți toate cookie-urile
              esențiale sau doar cele strict necesare. Poți șterge datele din
              browser oricând.
            </p>
          ),
        },
      ]}
    />
  )
}
