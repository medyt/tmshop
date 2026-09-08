import { Link } from 'react-router-dom'
import { ContactForm } from '../../components/shop/ContactForm'
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
          title: 'Modul de livrare',
          body: (
            <p>
              {SITE_LEGAL.brandName} livrează comenzile exclusiv prin{' '}
              {SITE_LEGAL.deliveryCarriersLabel}, pe întreg teritoriul României.
              Costul transportului este de {SITE_LEGAL.shippingFlatRateRon} RON
              per comandă
              {SITE_LEGAL.shippingFreeOverRon > 0
                ? `, gratuit de la ${SITE_LEGAL.shippingFreeOverRon} RON`
                : ''}
              . Curierul este ales în funcție de adresă și
              disponibilitate, iar coletul este predat la adresa indicată la
              plasarea comenzii.
            </p>
          ),
        },
        {
          title: 'Termen estimativ de livrare',
          body: (
            <p>
              Comenzile sunt procesate în {SITE_LEGAL.processingTime}, iar
              livrarea prin curier durează, în general,{' '}
              {SITE_LEGAL.deliveryEstimate} de la confirmarea comenzii, în funcție
              de localitate și de disponibilitatea produselor. Vei primi
              confirmarea expedierii și numărul AWB pentru urmărirea coletului.
            </p>
          ),
        },
        {
          title: 'Modalități de plată',
          body: (
            <p>
              Poți plăti <strong>la livrare (ramburs)</strong>, în numerar sau
              card la curier, ori <strong>online cu cardul</strong> prin
              procesatorul autorizat Netopia Payments. Plata online este
              securizată, iar {SITE_LEGAL.brandName} nu stochează datele
              cardului tău.
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
      title="Retur și dreptul de retragere"
      lead="Cum poți returna produsele și cum îți recuperezi banii."
      path={SHOP_INFO_ROUTES.returns}
      sections={[
        {
          title: 'Dreptul legal de retragere (14 zile)',
          body: (
            <p>
              În calitate de consumator, ai dreptul să te retragi din contract,
              fără a invoca vreun motiv, în termen de 14 zile calendaristice de la
              data la care intri în posesia fizică a produsului (conform OUG nr.
              34/2014). Pentru a-ți exercita acest drept, ne poți informa printr-o
              declarație neechivocă (de exemplu, un email) înainte de expirarea
              celor 14 zile.
            </p>
          ),
        },
        {
          title: 'Cum faci un retur',
          body: (
            <>
              <ol>
                <li>
                  Completează{' '}
                  <Link to={SHOP_INFO_ROUTES.returnRequest}>
                    formularul de retur online
                  </Link>{' '}
                  cu numărul comenzii, datele de contact, motivul și un{' '}
                  <strong>IBAN românesc valid</strong> (obligatoriu) pentru
                  rambursare, sau scrie la{' '}
                  <a href={`mailto:${SITE_LEGAL.contactEmail}`}>
                    {SITE_LEGAL.contactEmail}
                  </a>
                  .
                </li>
                <li>
                  Un operator verifică dacă cererea este validă (asociată unei
                  comenzi reale). După validare, primești pe email instrucțiunile
                  de expediere (destinatar, telefon, adresă).
                </li>
                <li>
                  Ambalează produsul în siguranță, împreună cu accesoriile și
                  documentele primite. Menționează numărul comenzii pe colet sau
                  în documentele de expediere.
                </li>
                <li>
                  Expediază coletul pe cheltuiala ta. După ce primim și
                  verificăm returul, îți rambursăm suma totală a comenzii pe
                  IBAN-ul din cerere.
                </li>
              </ol>
            </>
          ),
        },
        {
          title: 'Unde trimiți coletul',
          body: (
            <>
              <p>
                Poți trimite coletul cu <strong>orice curier</strong>{' '}
                (recomandăm DPD). Costul transportului de retur este suportat de
                client. Pe AWB completează:
              </p>
              <ul>
                <li>
                  <strong>Destinatar:</strong> {SITE_LEGAL.operatorName} - retur
                  comanda [numărul comenzii]
                </li>
                {SITE_LEGAL.returnPhone ? (
                  <li>
                    <strong>Telefon destinatar:</strong> {SITE_LEGAL.returnPhone}
                  </li>
                ) : null}
                <li>
                  <strong>Adresă:</strong> {SITE_LEGAL.returnAddress}
                </li>
              </ul>
              <p>
                Telefonul destinatar, adresa exactă și numărul comenzii îți sunt
                confirmate pe email, după validarea cererii.
              </p>
            </>
          ),
        },
        {
          title: 'Condiții de expediere (obligatorii)',
          body: (
            <p>
              <strong>Atenție:</strong> nu trimite coletul cu plata ramburs sau
              cu taxele de transport neachitate. Nerespectarea acestei condiții
              va duce la refuzul returului.
            </p>
          ),
        },
        {
          title: 'Returnarea banilor',
          body: (
            <p>
              După primirea și verificarea coletului, îți rambursăm suma totală
              a comenzii (produse + livrarea inițială) prin transfer bancar pe
              IBAN-ul obligatoriu din cererea de retur, în cel mult 14 zile.
              Costul transportului pentru retur rămâne în sarcina ta. Putem
              amâna rambursarea până la primirea produsului sau până ne
              dovedești că l-ai expediat.
            </p>
          ),
        },
        {
          title: 'Starea produsului returnat',
          body: (
            <p>
              Ești responsabil doar pentru diminuarea valorii produselor rezultată
              din manipularea acestora dincolo de ceea ce este necesar pentru a
              stabili natura, caracteristicile și funcționarea lor.
            </p>
          ),
        },
        {
          title: 'Excepții de la dreptul de retragere',
          body: (
            <p>
              Dreptul de retragere nu se aplică, conform legii, anumitor categorii
              de produse, precum: produse sigilate care nu pot fi returnate din
              motive de igienă și care au fost desigilate, produse personalizate
              sau care se deteriorează rapid.
            </p>
          ),
        },
        {
          title: 'Produse defecte și garanție',
          body: (
            <p>
              Pentru produse cu defecte sau neconforme beneficiezi de garanția
              legală de conformitate. Te rugăm să ne contactezi și vom remedia
              situația prin reparare, înlocuire sau rambursare, conform legii.
            </p>
          ),
        },
        {
          title: 'Contact pentru retur',
          body: (
            <p>
              Pentru orice retur sau reclamație, scrie la{' '}
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
              <p>EUID: {SITE_LEGAL.operatorEuid}</p>
              <p>Data înființării: {SITE_LEGAL.operatorFoundedDate}</p>
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
        {
          title: 'Trimite-ne un mesaj',
          body: (
            <>
              <p className="muted" style={{ marginTop: 0 }}>
                Completează formularul de mai jos; primim mesajul direct pe email.
                Răspundem în programul afișat mai sus.
              </p>
              <ContactForm />
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
          body: (
            <p>
              Poți plăti <strong>ramburs la livrare</strong> (numerar sau card
              la curier) sau <strong>online cu cardul</strong> prin Netopia, la
              finalizarea comenzii.
            </p>
          ),
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
              Magazinul online {SITE_LEGAL.siteUrl} ({SITE_LEGAL.brandName}) este
              operat de {SITE_LEGAL.operatorName}, CUI {SITE_LEGAL.operatorCui},
              Reg. Com. {SITE_LEGAL.operatorRegCom}, cu sediul în{' '}
              {SITE_LEGAL.operatorAddress}.
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
          title: 'Dreptul de retragere',
          body: (
            <p>
              Consumatorii beneficiază de dreptul de retragere în 14 zile, conform
              OUG nr. 34/2014. Detaliile complete sunt descrise în pagina de{' '}
              <Link to={SHOP_INFO_ROUTES.returns}>Retur</Link>.
            </p>
          ),
        },
        {
          title: 'Soluționarea litigiilor (ANPC / SOL)',
          body: (
            <p>
              Pentru reclamații te poți adresa Autorității Naționale pentru
              Protecția Consumatorilor (ANPC) –{' '}
              <a
                href="https://anpc.ro"
                target="_blank"
                rel="noopener noreferrer"
              >
                anpc.ro
              </a>
              . De asemenea, poți folosi platforma europeană de soluționare
              online a litigiilor (SOL/ODR):{' '}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noopener noreferrer"
              >
                ec.europa.eu/consumers/odr
              </a>
              .
            </p>
          ),
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
              {SITE_LEGAL.operatorName} (CUI {SITE_LEGAL.operatorCui}), care
              operează magazinul {SITE_LEGAL.brandName}, prelucrează datele
              necesare pentru procesarea comenzilor și gestionarea conturilor de
              client.
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
          title: 'De ce folosim datele (temei legal)',
          body: (
            <ul>
              <li>
                Executarea contractului: preluarea, livrarea și gestionarea
                comenzilor și a contului de client.
              </li>
              <li>
                Obligație legală: emiterea documentelor fiscale și contabile.
              </li>
              <li>
                Interes legitim: securitatea site-ului și prevenirea fraudelor.
              </li>
            </ul>
          ),
        },
        {
          title: 'Cui dezvăluim datele',
          body: (
            <p>
              Transmitem datele strict necesar către firmele de curierat (de
              exemplu {SITE_LEGAL.deliveryCarriersLabel}) pentru livrare și către
              furnizorii noștri de servicii (găzduire, contabilitate), care le
              prelucrează în numele nostru și în condiții de confidențialitate.
            </p>
          ),
        },
        {
          title: 'Durata păstrării',
          body: (
            <p>
              Păstrăm datele cât este necesar pentru onorarea comenzilor și
              respectarea obligațiilor legale (de exemplu, documentele fiscale se
              păstrează conform termenelor impuse de lege), după care le ștergem
              sau le anonimizăm.
            </p>
          ),
        },
        {
          title: 'Drepturile tale (GDPR)',
          body: (
            <>
              <p>
                Conform Regulamentului (UE) 2016/679 (GDPR), ai dreptul de acces,
                rectificare, ștergere, restricționare, portabilitate și opoziție
                cu privire la datele tale.
              </p>
              <p>
                Pentru exercitarea acestor drepturi, scrie la{' '}
                <a href={`mailto:${SITE_LEGAL.contactEmail}`}>
                  {SITE_LEGAL.contactEmail}
                </a>
                . Ai, de asemenea, dreptul de a depune o plângere la Autoritatea
                Națională de Supraveghere a Prelucrării Datelor cu Caracter
                Personal (ANSPDCP) –{' '}
                <a
                  href="https://www.dataprotection.ro"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  dataprotection.ro
                </a>
                .
              </p>
            </>
          ),
        },
        {
          title: 'Cookie-uri',
          body: (
            <p>
              Detalii despre cookie-urile folosite găsești în{' '}
              <Link to={SHOP_INFO_ROUTES.cookies}>Politica de cookie</Link>.
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
          title: 'Cookie-uri de marketing (opționale)',
          body: (
            <p>
              <strong>Meta Pixel</strong> (Meta Platforms Ireland Ltd.) este
              inclus în pagină pentru măsurarea reclamelor (PageView și
              evenimente e-commerce). Dacă alegi „Accept toate”, încărcăm și{' '}
              <strong>Google Analytics 4</strong> (Google Ireland Ltd.) și{' '}
              <strong>TikTok Pixel</strong> (TikTok Technology Limited). Acestea
              pot seta cookie-uri proprii. GA4 și TikTok nu se activează dacă
              alegi „Doar esențiale”.
            </p>
          ),
        },
        {
          title: 'Cum îți poți gestiona alegerea',
          body: (
            <p>
              La prima vizită poți accepta toate cookie-urile sau doar cele
              strict necesare. Îți poți schimba alegerea oricând ștergând datele
              site-ului din browser (preferința de cookie este salvată local) sau
              folosind setările de confidențialitate ale browserului. Pentru
              cookie-urile de marketing îți poți retrage consimțământul și din
              setările contului Meta/TikTok.
            </p>
          ),
        },
      ]}
    />
  )
}
