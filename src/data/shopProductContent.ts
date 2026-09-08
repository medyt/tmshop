import type { Product } from '../types/product'
import { htmlToBlocks } from '../lib/richText'

export type ShopProductPageContent = {
  lead: string
  highlights: string[]
  specs: { label: string; value: string }[]
  paragraphs: string[]
}

export const SHOP_PRODUCT_CONTENT: Record<string, ShopProductPageContent> = {
  'seed-sn8004s-elena': {
    lead:
      'Set blender de mână SONYMAX SN-8004S, 4 în 1, 1500 W, cu tocător, tel și pahar gradat pentru preparate rapide în bucătărie.',
    highlights: [
      'Set complet 4 în 1: blender de mână, tel, tocător și pahar gradat',
      'Motor 1500 W cu 9 trepte de viteză și funcție turbo',
      'Lame din oțel inoxidabil și arbore metalic',
      'Tocător aproximativ 500 ml și pahar gradat aproximativ 600 ml',
      'Potrivit pentru supe, piureuri, sosuri, creme și mixuri dense',
      'Design compact, ușor de depozitat după utilizare',
      'Mențiune pe ambalaj: motor cupru și garanție 12 luni',
    ],
    specs: [
      { label: 'Brand / model', value: 'SONYMAX SN-8004S' },
      { label: 'Cod produs', value: 'SN-8004S' },
      { label: 'Tip produs', value: 'Set blender electric de mână 4 în 1' },
      { label: 'Putere', value: '1500 W' },
      { label: 'Viteze', value: '9 + funcție turbo' },
      { label: 'Capacitate tocător', value: 'aprox. 500 ml' },
      { label: 'Capacitate pahar', value: 'aprox. 600 ml' },
      { label: 'Material lame', value: 'oțel inoxidabil' },
    ],
    paragraphs: [
      'Blenderul de mână SONYMAX SN-8004S acoperă operațiile uzuale din bucătărie: mixare, tocare fină, batere și măsurare direct în paharul gradat. Comutatorul rotativ permite adaptarea vitezei la textura dorită, iar funcția turbo ajută la ingrediente mai dure.',
      'Listările comparabile din piața românească descriu același tip de set 4 în 1 la 1500 W; verifică în colet accesoriile și eticheta pentru corespondența exactă cu modelul SN-8004S.',
    ],
  },
  'seed-h2o-humidifier-elena': {
    lead:
      'Umidificator portabil H2O cu difuzor de aromă și lumină LED, potrivit pentru birou, dormitor sau deplasări.',
    highlights: [
      'Design cilindric compact, ușor de mutat între încăperi',
      'Umidificare ultrasonică cu rezervor de aproximativ 350 ml',
      'Difuzor de aromă pentru uleiuri esențiale, conform manualului',
      'Lumină LED cu efecte colorate, inclusiv mod noapte',
      'Funcționare silențioasă, potrivită lângă pat sau birou',
      'Alimentare USB, practică pentru mașină sau laptop',
      'Dimensiuni aproximative 14,7 × 7,2 cm în listări comparabile',
    ],
    specs: [
      { label: 'Cod produs', value: 'H2O-HUM-RGB' },
      { label: 'Tip produs', value: 'Umidificator portabil cu difuzor aromă' },
      { label: 'Capacitate rezervor', value: 'aprox. 350 ml' },
      { label: 'Iluminare', value: 'LED, efecte multicolor' },
      { label: 'Alimentare', value: 'USB' },
      { label: 'Utilizare', value: 'birou, dormitor, călătorii' },
      { label: 'Referință piață', value: 'listări H2O aromă LED, nu mini RGB generic' },
    ],
    paragraphs: [
      'Modelul H2O Humidifier adaugă umiditate în aerul uscat din sezonul rece sau în spații cu aer condiționat. Rezervorul se umple cu apă curată, iar funcția de aromă poate fi folosită cu uleiuri compatibile difuzoarelor.',
      'Culoarea carcasei poate varia între loturi, conform ambalajului. Listările similare din magazinele românești menționează aceeași familie de produs; verifică eticheta pentru capacitate și tipul conectorului USB.',
    ],
  },
  'seed-nasal-dilator-elena': {
    lead:
      'Starter Kit Sleep and Sport cu dilatator nazal pentru 15 zile de utilizare zilnică, pentru respirație mai ușoară noaptea sau la sport.',
    highlights: [
      'Set starter pentru 15 zile, o utilizare pe zi',
      'Dilatare pasajelor nazale fără benzi adezive pe piele',
      'Potrivit pentru somn, alergare sau antrenamente',
      'Design discret, se poartă în interiorul nărilor',
      'Ambalaj cu instrucțiuni și beneficii promovate pe cutie',
      'Alternativă la benzi nazale clasice pentru unii utilizatori',
      'Format compact, ușor de luat în deplasare',
    ],
    specs: [
      { label: 'Cod produs', value: 'NASAL-SS-15D' },
      { label: 'Tip produs', value: 'Dilatator nazal Starter Kit' },
      { label: 'Durată kit', value: '15 zile, utilizare zilnică' },
      { label: 'Aplicație', value: 'somn și sport' },
      { label: 'Ambalaj', value: 'Sleep and Sport Nasal Dilator' },
      { label: 'Referință piață', value: 'dilatatoare cu magneți sau Airmax, alt design' },
    ],
    paragraphs: [
      'Dilatatorul nazal Sleep and Sport este destinat persoanelor care vor o respirație mai liberă în timpul somnului sau al efortului fizic. Kitul starter acoperă două săptămâni de utilizare conform indicațiilor de pe ambalaj.',
      'Produsul nu înlocuiește consultul medical pentru probleme respiratorii cronice. În piață există modele cu magneți sau mărimi diferite; acest set urmează ambalajul Sleep and Sport cu program de 15 zile.',
    ],
  },
  'seed-solar-wall-led-elena': {
    lead:
      'Lampă solară de perete cu 20 LED, senzor de mișcare PIR și senzor de lumină pentru iluminat automat pe alee, terasă sau intrare.',
    highlights: [
      'Alimentare solară, fără cabluri și fără consum din rețea',
      'Senzor PIR pentru aprindere la mișcare',
      'Senzor de lumină pentru funcționare automată noaptea',
      'Panou solar integrat pe fața corpului',
      'Grilă cu aproximativ 20 LED pentru zonă largă',
      'Montaj pe perete, potrivit exterior acoperit',
      'Corp compact, finisaj negru',
    ],
    specs: [
      { label: 'Cod produs', value: 'SOLAR-WALL-20LED' },
      { label: 'Tip produs', value: 'Lampă solară de perete cu senzor' },
      { label: 'Sursă lumină', value: 'aprox. 20 LED' },
      { label: 'Senzori', value: 'PIR mișcare + CDS lumină' },
      { label: 'Alimentare', value: 'panou solar, acumulator intern' },
      { label: 'Montaj', value: 'perete' },
      { label: 'Referință piață', value: 'modele TLV 20 LED similare, nu identice' },
    ],
    paragraphs: [
      'Lampa Solar Powered LED Wall Light se încarcă ziua și oferă lumină orientată când senzorul detectează mișcare sau când nivelul ambiental scade. Este o soluție simplă pentru zone fără priză la exterior.',
      'Autonomia depinde de expunerea la soare și de frecvența declanșărilor. Listările comparabile din România folosesc aceeași configurație 20 LED cu senzor; verifică dimensiunile și fixările incluse în colet.',
    ],
  },
  'seed-instant-electric-water-faucet-elena': {
    lead:
      'Robinet electric cu încălzire instantanee a apei, cu afișaj LED de temperatură și furtun cu para de duș pentru chiuvetă sau perete.',
    highlights: [
      'Apă caldă în câteva secunde, fără boiler clasic',
      'Afișaj LED cu temperatura apei în timp real',
      'Manetă unică pentru controlul debitului',
      'Furtun detașabil și para de duș incluse pe ambalaj',
      'Corp alb cu finisaje cromate',
      'Potrivit pentru bucătărie, baie sau spații fără centrală',
      'Mesaje promo pe cutie: fără încălzire centrală, montaj rapid',
    ],
    specs: [
      { label: 'Cod produs', value: 'EWH-FAUCET-SHOWER' },
      { label: 'Tip produs', value: 'Robinet electric instant + duș' },
      { label: 'Afișaj', value: 'LED temperatură' },
      { label: 'Montaj', value: 'chiuvetă sau perete, conform kitului' },
      { label: 'Alimentare', value: 'rețea electrică, verifică puterea pe etichetă' },
      { label: 'Referință piață', value: 'modele inox 3000 W rotire 360°, alt SKU' },
    ],
    paragraphs: [
      'Instant Electric Heating Water Faucet & Shower este gândit pentru puncte de apă unde nu există apă caldă imediat disponibilă. După montaj și legare la rețeaua de apă rece, încălzitorul pornește la deschiderea manetei.',
      'Instalarea trebuie făcută respectând manualul și cerințele electrice locale. Listările similare din România includ variante cu montaj pe perete sau corp inox la puteri mai mari; confirmă pe etichetă puterea și debitul maxim.',
    ],
  },
  'seed-key-pet-comb-elena': {
    lead:
      'Pieptene Key Pet Comb pentru îndepărtarea eficientă a părului de pe blana câinilor și pisicilor, cu design prietenos pe ambalaj.',
    highlights: [
      'Îndepărtează părul mort și reduce shedding-ul în casă',
      'Mâner ergonomic albastru, ușor de controlat',
      'Cap de pieptenare cu design decorativ tip urechi de pisică',
      'Potrivit pentru blană medie și lungă la câini și pisici',
      'Curățare rapidă după periaj',
      'Format compact pentru utilizare acasă',
      'Text pe cutie: Efficient Hair Removal',
    ],
    specs: [
      { label: 'Cod produs', value: 'PET-COMB-KEY' },
      { label: 'Tip produs', value: 'Pieptene îngrijire blană animale' },
      { label: 'Specii', value: 'câini și pisici' },
      { label: 'Ambalaj', value: 'Key Pet Comb' },
      { label: 'Referință piață', value: 'Furminator sau perii autocurățare, alt brand' },
    ],
    paragraphs: [
      'Key Pet Comb este un accesoriu de îngrijire pentru periajul regulat al companionilor. Pieptenarea deschide blana, îndepărtează firele slăbite și poate reduce părul lăsat pe mobilier.',
      'Nu este un Furminator original; listările comparabile din magazinele pentru animale oferă piepteni cu lame metalice sau perii autocurățare la prețuri diferite. Alege modelul după tipul de blană al animalului.',
    ],
  },
  'seed-vintage-t9-clipper-basel': {
    lead:
      'Aparat de tuns Vintage T9 Professional Hair Clipper, fără fir, cu design metalic retro pentru păr și barbă.',
    highlights: [
      'Design vintage auriu, aspect profesional pe ambalaj',
      'Funcționare fără fir după încărcare',
      'Potrivit pentru tuns păr și contur barbă',
      'Lamă tip T în listări comparabile HW-T9',
      'Corp metalic ilustrat pe cutie',
      'Ușor de folosit acasă sau în deplasare',
      'Accesorii și lame conform pachetului',
    ],
    specs: [
      { label: 'Cod produs', value: 'CLIPPER-VINTAGE-T9' },
      { label: 'Tip produs', value: 'Aparat de tuns profesional cordless' },
      { label: 'Model ambalaj', value: 'Vintage T9 Professional Hair Clipper' },
      { label: 'Alimentare', value: 'acumulator reîncărcabil' },
      { label: 'Utilizare', value: 'păr și barbă' },
      { label: 'Referință piață', value: 'HW-T9 sau 2 în 1 tuns și bărbierit, variante OEM' },
    ],
    paragraphs: [
      'Mașina de tuns Vintage T9 este un model entry din gama aparatelor cordless cu look retro. După încărcare, poate fi folosită pentru tunsori rapide acasă sau pentru retușuri de barbă.',
      'Listările din România folosesc denumiri Vintage T9 sau HW-T9 cu specificații ușor diferite. Verifică în colet lamele, uleiul de întreținere și timpul de încărcare pe manual.',
    ],
  },
  'seed-electric-grinder-basel': {
    lead:
      'Râșniță electrică compactă pentru cafea boabe și condimente, cu corp din inox și capac transparent.',
    highlights: [
      'Măcinare rapidă la apăsarea butonului roșu',
      'Capac transparent pentru control vizual',
      'Potrivită pentru cafea, piper, nucșoară și ierburi uscate',
      'Corp metalic, design mic de blat',
      'Curățare ușoară după utilizare uscată',
      'Ideală pentru porții proaspete acasă',
      'Ambalaj Electric Grinder',
    ],
    specs: [
      { label: 'Cod produs', value: 'GRINDER-ELECTRIC' },
      { label: 'Tip produs', value: 'Râșniță electrică cafea și condimente' },
      { label: 'Material', value: 'inox, capac plastic transparent' },
      { label: 'Putere tipică segment', value: 'aprox. 150 W în listări comparabile' },
      { label: 'Capacitate tipică', value: '50–100 g în modele similare' },
      { label: 'Alimentare', value: '220 V' },
    ],
    paragraphs: [
      'Electric Grinder reduce boabele și condimentele la dimensiunea dorită pentru cafea filtru, espresso de casă sau condimente proaspăt măcinate. Butonul de pornire menține funcționarea cât timp este apăsat.',
      'Pentru cafea aromată, măcinați cantități mici imediat înainte de preparare. Listările comparabile menționează 150 W și rezervoare sub 100 g; confirmă pe etichetă puterea și capacitatea exactă.',
    ],
  },
  'seed-handheld-console-basel': {
    lead:
      'Consolă portabilă de gaming cu ecran central și grip-uri laterale în stil handheld, aspect tip Switch pentru jocuri retro sau emulare.',
    highlights: [
      'Format handheld cu ecran color integrat',
      'Grip-uri laterale ergonomice, culori contrastante pe ambalaj',
      'Jocuri preinstalate sau suport card, conform modelului',
      'Potrivită pentru copii și adulți pasionați de retro gaming',
      'Portabilă pentru călătorii și timp liber',
      'Poate include ieșire TV sau HDMI în unele variante',
      'Nu este consolă Nintendo originală',
    ],
    specs: [
      { label: 'Cod produs', value: 'CONSOLE-HANDHELD-SWSTYLE' },
      { label: 'Tip produs', value: 'Consolă portabilă gaming' },
      { label: 'Ecran', value: 'aprox. 7 inch în segment comparabil' },
      { label: 'Design', value: 'handheld cu grip-uri detașabile sau fixe' },
      { label: 'Referință piață', value: 'STELS, HC800 sau SJGAM M27, alt SKU' },
    ],
    paragraphs: [
      'Consola portabilă din ambalajul Basel reproduce forma populară cu ecran între două controlere. Funcțiile exacte depind de marcă și firmware: bibliotecă de jocuri, emulator, slot card sau conectivitate HDMI.',
      'Listările românești din același segment descriu ecrane IPS de 7 inch și mii de titluri integrate. Verifică pe cutie marca, memoria și compatibilitatea cu televizorul înainte de achiziție.',
    ],
  },
  'seed-action-cam-4k-basel': {
    lead:
      'Cameră video sport 4K Ultra HD DV pentru filmări outdoor, cu monturi și accesorii tip action cam.',
    highlights: [
      'Rezoluție 4K promovată pe ambalaj pentru clipuri detaliate',
      'Format compact, montare pe cască, ghidon sau suport',
      'Potrivită pentru sport, drumeții și activități outdoor',
      'Unghi larg tipic categoriei pentru cadre dinamice',
      'Poate include Wi-Fi și telecomandă în funcție de lot',
      'Carcasă pentru utilizare în condiții solicitante',
      'Stil GoPro / DV, fără a fi neapărat marcă premium',
    ],
    specs: [
      { label: 'Cod produs', value: 'CAM-4K-SPORTS-UHD' },
      { label: 'Tip produs', value: 'Cameră sport action cam' },
      { label: 'Rezoluție ambalaj', value: '4K Ultra HD DV' },
      { label: 'Cadre tipice segment', value: 'până la 30 fps în listări comparabile' },
      { label: 'Conectivitate', value: 'Wi-Fi în unele modele similare' },
      { label: 'Referință piață', value: 'H9 sau COOAU 4K, specificații diferite' },
    ],
    paragraphs: [
      'Camera 4K Sports Ultra HD DV este destinată utilizatorilor care vor clipuri la sport fără telefon în mână. Accesoriile din kit permit fixarea pe echipament și filmarea din perspectivă la nivelul ochilor.',
      'Rezistența la apă, autonomia bateriei și numărul de accesorii variază între OEM-uri. Listările comparabile menționează 16–20 MP foto și kituri extinse; citește manualul pentru adâncimea maximă sub apă.',
    ],
  },
  'seed-karaoke-speaker-2mic-basel': {
    lead:
      'Set karaoke cu boxă portabilă iluminată și două microfoane pentru petreceri acasă, în curte sau la picnic.',
    highlights: [
      'Boxă compactă cu mâner de transport',
      'Contur LED sau RGB pe marginea grilei',
      'Două microfoane incluse pentru duete',
      'Redare de pe Bluetooth, USB sau card în funcție de model',
      'Voce și efecte pentru distracție la petreceri',
      'Baterie reîncărcabilă în variante similare',
      'Pachet complet gata de utilizare',
    ],
    specs: [
      { label: 'Cod produs', value: 'KARAOKE-SET-2MIC' },
      { label: 'Tip produs', value: 'Set boxă karaoke + 2 microfoane' },
      { label: 'Putere tipică segment', value: 'aprox. 6 W în modele entry' },
      { label: 'Microfoane', value: '2 bucăți' },
      { label: 'Conectivitate', value: 'Bluetooth în listări comparabile' },
      { label: 'Referință piață', value: 'Engross sau Impact Vision wireless, alt SKU' },
    ],
    paragraphs: [
      'Setul karaoke reunește difuzorul și microfoanele pentru seri cu prieteni sau familie. Conectați telefonul prin Bluetooth și redați playlistul preferat, iar microfoanele permit cântatul simultan.',
      'Puterea reală, autonomia și faptul că microfoanele sunt cu fir sau wireless depind de lot. Listările din România variază între seturi entry la câteva zeci de lei și kituri Bluetooth 5.0 la preț mai mare.',
    ],
  },
  'seed-x18-video-game-basel': {
    lead:
      'Consolă handheld X18 VIDEO GAME cu ecran central și grip-uri laterale pentru biblioteci retro preinstalate.',
    highlights: [
      'Ambalaj cu bandă albastră X18 și mențiune VIDEO GAME',
      'Format portabil cu butoane clasice',
      'Jocuri integrate sau extindere prin card, conform manualului',
      'Carcasă deschisă cu grip-uri întunecate în vizualul cutiei',
      'Potrivită pentru nostalgie și timp liber',
      'Posibilă ieșire TV în unele variante din serie',
      'Model distinct de consola 7 inch tip Switch din catalog',
    ],
    specs: [
      { label: 'Cod produs', value: 'CONSOLE-X18-VGAME' },
      { label: 'Tip produs', value: 'Consolă jocuri portabilă handheld' },
      { label: 'Model ambalaj', value: 'X18 VIDEO GAME' },
      { label: 'Ecran', value: 'dimensiune conform manualului' },
      { label: 'Referință piață', value: 'X7 sau X12 cu TV-Out, nu listare standard X18' },
    ],
    paragraphs: [
      'Consola X18 VIDEO GAME face parte din familia de handheld-uri cu mii de titluri retro integrate. Este ușor de folosit de copii și adulți pentru sesiuni scurte fără consolă de living.',
      'Piața românească listează frecvent modele X7 sau X12 cu specificații apropiate. Verifică pe cutie memoria, numărul de jocuri și cablul pentru televizor înainte de comparare cu alte console din catalog.',
    ],
  },
  'seed-vacuum-sealer-basel': {
    lead:
      'Aparat de vidat și sigilat Vacuum Sealer pentru pungi alimentare, cu etanșare automată și consum redus de energie.',
    highlights: [
      'Vidare pentru prelungirea prospețimii alimentelor',
      'Sigilare termică a pungilor dedicate',
      'Format compact de blat',
      'Potrivit pentru carne, legume porționate și meal prep',
      'Reduce spațiul în congelator',
      'Funcționare simplă cu un singur ciclu',
      'Uneori pungi incluse în pachet',
    ],
    specs: [
      { label: 'Cod produs', value: 'SEALER-VACUUM-KITCH' },
      { label: 'Tip produs', value: 'Aparat de vidat alimente' },
      { label: 'Putere tipică', value: 'aprox. 90 W' },
      { label: 'Alimentare', value: '220 V' },
      { label: 'Funcții', value: 'vidare și sigilare' },
      { label: 'Referință piață', value: 'Vacuum Sealer S cu pungi, alt model' },
    ],
    paragraphs: [
      'Vacuum Sealer extrage aerul din pungile compatibile și le sigilează pentru depozitare la frigider sau congelator. Este util pentru porționare, sous-vide la temperaturi permise de punga folosită și organizarea cămării.',
      'Folosiți doar pungi și folii recomandate de producător. Listările comparabile din România oferă aparate la 90 W cu pungi incluse; verifică dacă modelul tău suportă vidare umedă sau doar uscată.',
    ],
  },
  'seed-vegetable-slicer-basel': {
    lead:
      'Feliator și tocător manual pentru legume și fructe, tip Nicer Dicer, cu lame și recipient pentru felii și cuburi rapide.',
    highlights: [
      'Felii, cuburi și sticks cu presare pe lame',
      'Recipient de colectare integrat',
      'Reduce timpul de preparare pentru salate și garnituri',
      'Lame interschimbabile conform setului',
      'Fără alimentare electrică',
      'Ambalaj cu legume feliate în vizual promo',
      'SKU distinct de setul 22 piese din catalog',
    ],
    specs: [
      { label: 'Cod produs', value: 'SLICER-VEG-MULTI' },
      { label: 'Tip produs', value: 'Feliator / tocător legume multifuncțional' },
      { label: 'Stil', value: 'Nicer Dicer / Speedy Chopper' },
      { label: 'Alimentare', value: 'manual' },
      { label: 'Referință piață', value: 'Nicer Dicer Quick 5 în 1 sau FUSION, alt număr piese' },
    ],
    paragraphs: [
      'Dispozitivul tip Nicer Dicer transformă legumele în felii uniforme sau cuburi prin apăsare pe grila selectată. Este practic pentru salate, supe, stir-fry și porții pentru copii.',
      'Numărul de lame și formatele exacte depind de ambalaj. Listările românești includ variante 5 în 1 sau FUSION cu mai multe accesorii decât un set entry; verifică lista pieselor din colet.',
    ],
  },
  'seed-ultrasonic-aroma-humidifier-basel': {
    lead:
      'Umidificator ultrasonic cu difuzor de arome și bandă LED, design sferic finisaj lemn, diferit de modelul cilindric H2O.',
    highlights: [
      'Nebufizare ultrasonică pentru umidificare ambient',
      'Difuzor de arome pentru uleiuri esențiale compatibile',
      'Bandă LED colorată în zona ecuatorului',
      'Aspect decorativ tip lemn pentru birou sau dormitor',
      'Funcționare silențioasă, potrivită pe noptieră',
      'Capacitate tipică aproximativ 300 ml în segment comparabil',
      'SKU separat de H2O-HUM-RGB',
    ],
    specs: [
      { label: 'Cod produs', value: 'HUMID-ULTRASONIC-AROMA' },
      { label: 'Tip produs', value: 'Umidificator ultrasonic cu difuzor aromă' },
      { label: 'Design', value: 'sferă, finisaj lemn' },
      { label: 'Iluminare', value: 'LED multicolor' },
      { label: 'Capacitate tipică', value: 'aprox. 300 ml' },
      { label: 'Referință piață', value: 'Andowl Q-T59 sau modele 300 ml similare' },
    ],
    paragraphs: [
      'Ultrasonic Aroma Humidifier adaugă umiditate și poate difuza parfum discret în încăpere. Rezervorul se umple cu apă curată, iar uleiurile se folosesc doar dacă manualul permite.',
      'Listările comparabile descriu 300 ml și 7 culori LED. Acest model nu este umidificatorul portabil H2O din același catalog; verifică butoanele și autonomia pe eticheta lotului primit.',
    ],
  },
  'seed-spiral-potato-slicer-basel': {
    lead:
      'Dispozitiv manual Spiral Potato Slicer pentru cartofi tăiați în spirală, ideal pentru chipsuri spirală acasă.',
    highlights: [
      'Cartofi în spirală pe băț pentru prăjit sau cuptor',
      'Corp manual, culoare roșie în vizualul ambalajului',
      'Poate include ventuză sau bază de fixare',
      'Rezultate uniforme pentru gustări și petreceri',
      'Ușor de folosit după fixarea cartofului',
      'Produs distinct de feliatorul multifuncțional Nicer Dicer',
      'Ambalaj Spiral Potato Slicer',
    ],
    specs: [
      { label: 'Cod produs', value: 'SLICER-SPIRAL-POTATO' },
      { label: 'Tip produs', value: 'Feliator manual cartofi spirală' },
      { label: 'Utilizare', value: 'cartofi, gustări' },
      { label: 'Alimentare', value: 'manual' },
      { label: 'Referință piață', value: 'listări Spiral Potato Slicer, prețuri variabile' },
    ],
    paragraphs: [
      'Spiral Potato Slicer transformă cartofii în spirale continue pentru prăjire crocantă sau coacere. Este un gadget de bucătărie pentru seri cu familia sau pentru vânzare la evenimente.',
      'Stabilitatea la blat depinde de ventuză sau suportul inclus. Listările din România folosesc aceeași denumire generică; verifică dacă bețișoarele sunt în pachet.',
    ],
  },
  'seed-jortan-jt8161-elena': {
    lead:
      'Cameră inteligentă de supraveghere JORTAN JT-8161, 1080P, WiFi, IP66, cu vedere nocturnă și aplicație mobilă.',
    highlights: [
      'Filmare Full HD 1080P pentru detalii clare',
      'Conectivitate WiFi 2,4 GHz și aplicație Yoosee',
      'Carcasă IP66 pentru interior și exterior',
      'Vedere nocturnă IR și filmare color noaptea în listări oficiale',
      'Audio bidirecțional pentru comunicare la distanță',
      'Panoramare până la 355° în specificațiile publicate',
      'Stocare pe card microSD, pachete cu card inclus posibil',
    ],
    specs: [
      { label: 'Brand / model', value: 'JORTAN JT-8161' },
      { label: 'Cod produs', value: 'JT-8161' },
      { label: 'Rezoluție', value: '1080P Full HD' },
      { label: 'Protecție', value: 'IP66' },
      { label: 'WiFi', value: '2,4 GHz' },
      { label: 'Stocare', value: 'microSD până la 256 GB' },
      { label: 'Alimentare', value: 'DC 12 V 2 A' },
      { label: 'Aplicație', value: 'Yoosee Android / iOS' },
    ],
    paragraphs: [
      'Camera JORTAN JT-8161 oferă acces la imagini live și înregistrări de pe telefon. Senzorul de mișcare poate trimite notificări, iar montajul flexibil pe perete sau colț acoperă curtea, garajul sau intrarea.',
      'Site-ul oficial Jortan menționează unghi 2,8–12 mm, compresie H.265 și vizibilitate nocturnă până la aproximativ 30 m. Pachetul livrat poate include card microSD; confirmă conținutul coletului la primire.',
    ],
  },
  'seed-helferhoff-cherry-olive-corer-elena': {
    lead:
      'Dispozitiv HelferHoff pentru scos sâmburi la cireșe, vișine și măsline, cu mecanism simplu de apăsare.',
    highlights: [
      'Îndepărtează sâmburii rapid fără tocător și cuțit',
      'Potrivit pentru cireșe, vișine și măsline',
      'Corp plastic ușor de spălat',
      'Două variante de culoare menționate pe ambalaj',
      'Mecanism tip piston pentru o singură mișcare',
      'Util la conserve, dulceață și aperitive',
      'Marcă HelferHoff pe cutie',
    ],
    specs: [
      { label: 'Brand', value: 'HelferHoff' },
      { label: 'Cod produs', value: 'HELFERHOFF-CHERRY-OLIVE' },
      { label: 'Tip produs', value: 'Aparat scos sâmburi cireșe și măsline' },
      { label: 'Material', value: 'plastic' },
      { label: 'Culori', value: '2 opțiuni pe ambalaj' },
      { label: 'Referință piață', value: 'Leifheit sau EDAR cu prindere masă, alt design' },
    ],
    paragraphs: [
      'Cherry and Olive Corer HelferHoff scurtează pregătirea fructelor cu sâmbure. Introduceți fructul, apăsați mecanismul și colectați produsul curat pentru rețete sau congelare.',
      'În România listările comparabile sunt adesea sub alte mărci, cu prindere de masă sau forme diferite. Acest model urmează ambalajul HelferHoff cu opțiune de culoare la livrare.',
    ],
  },
  'seed-ice-bucket-bt-speaker-led-elena': {
    lead:
      'Găleată pentru gheață cu iluminare LED în 7 culori și boxă Bluetooth integrată, pentru petreceri pe terasă sau la piscină.',
    highlights: [
      'Păstrează băuturile reci cu gheață',
      'Efecte luminoase LED schimbabile',
      'Difuzor Bluetooth pentru muzică de pe telefon',
      'Boxă detașabilă pentru curățare ușoară',
      'Încărcare USB, autonomie câteva ore în listări similare',
      'Dimensiuni aproximative 24,7 × 23,5 × 28,7 cm pe ambalaj',
      'Putere audio indicată aproximativ 5 W',
    ],
    specs: [
      { label: 'Cod produs', value: 'ICE-BUCKET-BT-LED' },
      { label: 'Tip produs', value: 'Găleată gheață cu boxă Bluetooth' },
      { label: 'Iluminare', value: '7 efecte culoare' },
      { label: 'Putere audio', value: 'aprox. 5 W' },
      { label: 'Încărcare', value: 'USB' },
      { label: 'Referință piață', value: 'frapieră 5–7 L LED, alt SKU' },
    ],
    paragraphs: [
      'Combinația de găleată și boxă elimină două accesorii separate la o petrecere în aer liber. Umpleți cu gheață, conectați telefonul și lăsați luminile să creeze atmosferă.',
      'Capacitatea exactă în litri și autonomia difuzorului depind de lot. Listările comparabile din România folosesc frapiere 5–7 L cu Bluetooth; verifică eticheta CE și manualul de curățare.',
    ],
  },
  'seed-xtreeme4-speaker-elena': {
    lead:
      'Boxă portabilă Bluetooth XTREEME4 cu bas amplificat și efecte LED, design party cu mâner de transport.',
    highlights: [
      'Mesaj pe cutie: Powerful Bass Boost',
      'Iluminare LED pe corpul cilindric',
      'Mâner pentru transport la picnic sau plajă',
      'Redare wireless de pe telefon sau tabletă',
      'Design roșu-alb orientat petrecere',
      'Poate suporta TWS sau redare de pe card în funcție de lot',
      'Produs OEM, nu boxă JBL originală',
    ],
    specs: [
      { label: 'Model ambalaj', value: 'XTREEME4' },
      { label: 'Cod produs', value: 'XTREEME4' },
      { label: 'Tip produs', value: 'Boxă portabilă Bluetooth' },
      { label: 'Caracteristici promo', value: 'Bass Boost, LED' },
      { label: 'Referință piață', value: 'Hoco HC8 sau Charge 3 style, alt brand' },
    ],
    paragraphs: [
      'Boxa XTREEME4 este gândită pentru volum ridicat și bas accentuat la evenimente informale. LED-urile pulsează pe ritmul muzicii în modelele din aceeași categorie.',
      'Nu există listări standard XTREEME4 pe magazinele mari verificate; compară puterea în wați, IP-ul și autonomia cu boxe Bluetooth RGB din același segment de preț.',
    ],
  },
  'seed-shower-turbo-water-saving-elena': {
    lead:
      'Para de duș turbo cu economisire de apă, microduze pentru jet mai puternic și filtru integrat conform ambalajului.',
    highlights: [
      'Jet concentrat cu consum redus de apă',
      'Față rotundă cu multe duze fine',
      'Buton pe mâner pentru control sau oprire rapidă',
      'Mențiune Built-in filter pe cutie',
      'Finisaj crom, aspect modern',
      'Montaj pe furtun standard de duș',
      'Marketing turbocharged water saving',
    ],
    specs: [
      { label: 'Cod produs', value: 'SHOWER-TURBO-WATER-SAVE' },
      { label: 'Tip produs', value: 'Para duș mână cu economisire apă' },
      { label: 'Finisaj', value: 'crom' },
      { label: 'Filtru', value: 'integrat, conform ambalaj' },
      { label: 'Filet', value: 'verifică compatibilitatea 1/2 inch pe etichetă' },
      { label: 'Referință piață', value: 'paras cu filtru ionic sau Idrobric, alt model' },
    ],
    paragraphs: [
      'Para turbo redirecționează apa prin duze multiple pentru senzație de presiune mai mare la același debit. Filtrul integrat din ambalaj poate reține impurități grossiere, în funcție de calitatea apei.',
      'Schimbă filtrul sau granulele conform recomandărilor producătorului. Listările comparabile includ paras cu vitamina C sau microduze inox; acest model urmează ambalajul Turbocharged Water Saving Shower.',
    ],
  },
  'seed-digital-breath-alcohol-tester-elena': {
    lead:
      'Etilotest digital portabil Digital Breath Alcohol Tester cu display și mustiuc pentru verificări orientative înainte de condus.',
    highlights: [
      'Rezultat afișat pe ecran LCD sau LED',
      'Format compact tip breloc sau buzunar',
      'Mustiuc detașabil pentru igienă',
      'Analiză rapidă după suflare',
      'Mesaj drive safely pe ambalaj',
      'Alimentare baterii conform etichetei',
      'Nu înlocuiește aparatul certificat legal',
    ],
    specs: [
      { label: 'Cod produs', value: 'ETILOTEST-DIGITAL-BREATH' },
      { label: 'Tip produs', value: 'Etilotest digital portabil' },
      { label: 'Afișaj', value: 'LCD / LED' },
      { label: 'Unități tipice', value: 'g/l sau % BAC pe ambalaj' },
      { label: 'Utilizare', value: 'orientativă, personală' },
      { label: 'Referință piață', value: 'SIKS sau Hggzeg cu mustiucuri incluse' },
    ],
    paragraphs: [
      'Testerul digital măsoară alcoolul din aerul expirat pentru o autoevaluare înainte de a conduce. Păstrați mustiucul curat și respectați timpul de așteptare după consum de alcool sau băuturi dulci.',
      'Pentru valoare juridică în trafic este necesar un etilotest omologat. Listările eMAG din același segment includ modele cu mai multe mustiucuri sau calibrare automată la prețuri diferite.',
    ],
  },
  'seed-solar-flame-led-light-elena': {
    lead:
      'Lampă solară Solar Flame LED Light tip tortă de grădină, cu efect flacără și senzor de lumină pentru aprindere automată.',
    highlights: [
      'Efect LED imită flacără caldă',
      'Încărcare solară ziua, aprindere seara',
      'Senzor de lumină activat pe ambalaj',
      'Țăruș pentru înfigare în sol',
      'Decor pentru alee, terasă sau margine gazon',
      'Fără cabluri și fără prize exterior',
      'Corp închis cu ornament perforat',
    ],
    specs: [
      { label: 'Cod produs', value: 'SOLAR-FLAME-LED-TORCH' },
      { label: 'Tip produs', value: 'Lampă solară grădină efect flacără' },
      { label: 'Alimentare', value: 'panou solar, baterie Ni-MH în modele similare' },
      { label: 'Control', value: 'senzor lumină' },
      { label: 'Montaj', value: 'țăruș sol' },
      { label: 'Referință piață', value: 'torțe RETOO sau Echo Soul seturi, alt pachet' },
    ],
    paragraphs: [
      'Solar Flame LED Light adaugă lumină ambientală caldă fără foc deschis. Panoul solar încarcă acumulatorul ziua, iar seara LED-urile creează efect de torță pe alei.',
      'Înălțimea și autonomia variază între loturi. Listările comparabile vând bucăți individuale sau seturi de 6–8 torțe; acest produs urmează ambalajul Solar Flame LED Light pentru o bucată.',
    ],
  },
  'seed-htc1-thermo-hygrometer-elena': {
    lead:
      'Stație digitală HTC-1 cu termometru, higrometru și ceas pe display LCD mare, pentru cameră, birou sau depozit.',
    highlights: [
      'Afișare simultană temperatură și umiditate',
      'Ceas cu format AM/PM',
      'Funcții alarmă și memorii min/max în variante listate',
      'Montaj pe masă sau perete',
      'Ecran LCD mare, ușor de citit',
      'Alimentare baterie AA sau AAA conform blisterului',
      'Model OEM frecvent pe piața românească',
    ],
    specs: [
      { label: 'Model', value: 'HTC-1' },
      { label: 'Cod produs', value: 'HTC-1-THERMO-HYGRO' },
      { label: 'Măsurători', value: 'temperatură °C/°F, umiditate % RH' },
      { label: 'Afișaj', value: 'LCD' },
      { label: 'Funcții', value: 'ceas, alarmă opțională' },
      { label: 'Alimentare', value: 'baterii, tip pe etichetă' },
    ],
    paragraphs: [
      'HTC-1 ajută la monitorizarea confortului în locuință sau la depozitarea corectă a obiectelor sensibile la umiditate. Valorile min și max permit observarea fluctuațiilor pe parcursul zilei.',
      'Listările eMAG pentru HTC-1 descriu același model OEM cu mici diferențe de funcții între vânzători. Verifică în colet bateriile incluse și suportul de masă.',
    ],
  },
  'seed-kj12-wireless-headset-elena': {
    lead:
      'Cască Bluetooth mono KJ12 cu cârlig peste ureche, rotație 180° și afișaj LED pentru nivel baterie și apeluri handsfree.',
    highlights: [
      'Design in-ear cu hook reglabil stânga/dreapta',
      'Rotație 180° pentru potrivire pe ambele urechi',
      'Apeluri handsfree cu microfon direcțional',
      'Afișaj LED pentru autonomie pe carcasă',
      'Promo Hi-Fi Music și HD Voice pe ambalaj',
      'Standby lung menționat pe cutie',
      'Compatibil Android și iOS conform manualului',
    ],
    specs: [
      { label: 'Model', value: 'KJ12' },
      { label: 'Cod produs', value: 'KJ12-BT-HEADSET' },
      { label: 'Tip produs', value: 'Cască Bluetooth mono business' },
      { label: 'Montare', value: 'pe ureche, rotire 180°' },
      { label: 'Afișaj', value: 'LED nivel baterie' },
      { label: 'Referință piață', value: 'YYK530 sau Matcso single ear, alt SKU' },
    ],
    paragraphs: [
      'Casca KJ12 este destinată convorbirilor în mișcare, la volan sau în birou. O singură ureche rămâne liberă pentru sunet ambiental, iar microfonul preia vocea pentru apeluri.',
      'Nu există listări standard KJ12 pe magazinele verificate; compară cu căști mono cu LED și rotire ureche din același segment. Verifică versiunea Bluetooth și portul de încărcare pe etichetă.',
    ],
  },
  'seed-vehicle-blackbox-dvr-elena': {
    lead:
      'Cameră auto Vehicle Blackbox DVR Full HD 1080p cu ecran TFT 2,4 inch, montare pe parbriz și înregistrare în buclă.',
    highlights: [
      'Înregistrare video 1920×1080 Full HD',
      'Ecran TFT 2,4 inch pentru previzualizare',
      'Montare ventuză pe parbriz',
      'Detecție mișcare și blocare fișiere la șoc',
      'Unghi larg tipic pentru bandă și margine drum',
      'Alimentare la brichetă auto',
      'Model DVR entry fără marcă premium pe ambalaj',
    ],
    specs: [
      { label: 'Cod produs', value: 'DVR-BLACKBOX-FHD1080' },
      { label: 'Tip produs', value: 'Cameră auto DVR dashcam' },
      { label: 'Rezoluție', value: 'Full HD 1080p' },
      { label: 'Ecran', value: 'TFT 2,4 inch' },
      { label: 'Montaj', value: 'ventuză parbriz' },
      { label: 'Funcții', value: 'înregistrare buclă, senzor șoc' },
      { label: 'Referință piață', value: 'Louluna sau Navitel R200, alt brand' },
    ],
    paragraphs: [
      'Dashcam-ul Vehicle Blackbox DVR înregistrează continuu drumul și poate păstra clipuri protejate la impact. Ecranul integrat permite setarea rapidă fără aplicație pe telefon.',
      'Cardul microSD poate fi inclus sau separat. Listările comparabile adaugă Wi-Fi sau WDR la prețuri mai mari; confirmă pe manual capacitatea maximă de card și modul de vizionare nocturnă.',
    ],
  },
  'seed-cosmetic-brush-storage-bucket-elena': {
    lead:
      'Organizator cosmetic rotativ 360° LD-1005-1 pentru pensule, rujuri și accesorii machiaj, cu compartimente și capac opțional.',
    highlights: [
      'Rotație completă pentru acces la fiecare compartiment',
      'Separator interior pentru pensule și produse mici',
      'Variantă ilustrată cu capac transparent anti-praf',
      'Format cilindric compact pe masă de machiaj',
      'Păstrează ordinea în baie sau dressing',
      'Model LD-1005-1 pe ambalaj',
      'Plastic ușor de șters',
    ],
    specs: [
      { label: 'Model', value: 'LD-1005-1' },
      { label: 'Cod produs', value: 'LD-1005-1-COSMETIC-BUCKET' },
      { label: 'Tip produs', value: 'Organizator pensule machiaj rotativ' },
      { label: 'Rotație', value: '360°' },
      { label: 'Capac', value: 'transparent opțional conform ambalaj' },
      { label: 'Referință piață', value: 'organizatoare Temu sau Unloshe, alt model' },
    ],
    paragraphs: [
      'Bucket-ul rotativ ține pensulele verticale și separă rujurile de alte obiecte fragile. O rotație scurtă aduce compartimentul dorit în față fără a răsturna totul pe masă.',
      'Dimensiunile exacte depind de lot. Listările eMAG din aceeași categorie oferă 5 compartimente sau niveluri multiple; verifică dacă capacul este inclus în coletul tău.',
    ],
  },
  'seed-g63-smart-light-sound-machine-elena': {
    lead:
      'Dispozitiv G63 Smart Light Sound Machine cu lumină RGB, ceas digital și sunete de relaxare sau trezire.',
    highlights: [
      'Formă G cu bandă LED RGB pe contur',
      'Afișaj ceas digital central',
      'Butoane pentru moduri lumină și sunet',
      'Sunete white noise sau natură conform manualului',
      'Lampă de veghe și ambient pentru dormitor',
      'Posibilă simulare răsărit în variante similare',
      'Alimentare USB sau adaptor pe etichetă',
    ],
    specs: [
      { label: 'Model', value: 'G63' },
      { label: 'Cod produs', value: 'G63-SMART-LIGHT-SOUND' },
      { label: 'Tip produs', value: 'Lampă ambient cu sunet și ceas' },
      { label: 'Iluminare', value: 'RGB' },
      { label: 'Funcții', value: 'ceas, sunete, alarmă opțională' },
      { label: 'Referință piață', value: 'ceasuri wake-up light RGB, alt brand' },
    ],
    paragraphs: [
      'G63 combină lumină colorată cu sunete liniștitoare pentru somn sau concentrare. Poate fi folosit pe noptieră pentru copii sau adulți care preferă un fundal sonor constant.',
      'Nu există listări G63 pe magazinele verificate; compară cu ceasuri cu simulare răsărit și zgomot alb. Verifică numărul de melodii, volumul maxim și dacă există radio FM.',
    ],
  },
  'seed-mini-doorbell-elena': {
    lead:
      'Kit Mini Doorbell sonerie video wireless cu unitate exterior cu cameră și receptor interior pentru apel la ușă.',
    highlights: [
      'Buton apel cu pictogramă clopoțel pe modul exterior',
      'Cameră integrată pe unitatea de ușă',
      'Receptor interior cu difuzor puternic',
      'Fără cabluri între exterior și interior în variante wireless',
      'Poate include captură imagine la apăsare',
      'Montaj DIY pe ușă sau perete',
      'Aplicație sau monitor în funcție de model',
    ],
    specs: [
      { label: 'Cod produs', value: 'MINI-DOORBELL-WIFI-KIT' },
      { label: 'Tip produs', value: 'Sonerie video wireless kit' },
      { label: 'Componente', value: 'unitate ușă + receptor interior' },
      { label: 'Conectivitate', value: 'WiFi sau RF, conform etichetă' },
      { label: 'Referință piață', value: 'Bedee cu monitor 4,3 inch sau Xiaomi 2K, alt SKU' },
    ],
    paragraphs: [
      'Mini Doorbell permite auzirea vizitatorilor și, pe unele variante, vizualizarea lor pe telefon sau pe monitorul din kit. Este o soluție entry față de soneriile inteligente premium.',
      'Rezoluția camerei, autonomia pe baterie și compatibilitatea cu aplicațiile cloud variază. Listările comparabile includ ecrane interioare sau modele 2K la prețuri mult mai mari.',
    ],
  },
  'seed-22pcs-veggie-slicer-elena': {
    lead:
      'Set 22 PCS Veggie Slicer multifuncțional pentru feliat, tocat și julienne legume și fructe, cu lame din inox.',
    highlights: [
      'Pachet extins cu multiple lame și accesorii',
      'Recipient cu presă verde pentru tăiere rapidă',
      'Felii uniforme, cuburi și julienne',
      'Lame oțel inoxidabil în listări comparabile',
      'Marketing Core 6 Advantages pe ambalaj',
      'Reduce timpul pentru salate și meal prep',
      'SKU diferit de tocătorul Nicer Dicer Basel',
    ],
    specs: [
      { label: 'Cod produs', value: 'SLICER-VEGGIE-22PCS' },
      { label: 'Tip produs', value: 'Feliator multifuncțional legume și fructe' },
      { label: 'Număr piese', value: '22 piese conform ambalaj' },
      { label: 'Material lame', value: 'inox în segment comparabil' },
      { label: 'Referință piață', value: 'set eMAG 22 piese gri-verde, alt ambalaj' },
    ],
    paragraphs: [
      'Setul 22 PCS Veggie Slicer acoperă majoritatea tăierilor uzuale în bucătărie. Așezați leguma pe lamă, apăsați prin recipient și colectați rezultatul în bol.',
      'Numărul exact de piese și tipurile de tăieturi trebuie confirmate în manual. Listările eMAG cu 22 piese sunt foarte apropiate ca tip; acest produs urmează ambalajul Multifunction Veggie and Fruit Chopper.',
    ],
  },
  'seed-galaxy-nightlight-projector-elena': {
    lead:
      'Proiector Galaxy Nightlight cu efect stele și galaxie, mod sleep și difuzor integrat pentru dormitor sau camera copiilor.',
    highlights: [
      'Proiecție personalizabilă pe tavan și pereți',
      'Mod sleep pentru stingere graduală',
      'Difuzor integrat pentru muzică sau sunete',
      'Telecomandă pentru culori și moduri',
      'Design ou fisurat cu lumină interioară',
      'Atmosferă relaxantă seara',
      'Alimentare adaptor sau USB conform manualului',
    ],
    specs: [
      { label: 'Cod produs', value: 'GALAXY-NIGHTLIGHT-PROJECTOR' },
      { label: 'Tip produs', value: 'Lampă veghe proiector stele' },
      { label: 'Control', value: 'telecomandă inclusă pe ambalaj' },
      { label: 'Funcții', value: 'proiecție, sleep mode, difuzor' },
      { label: 'Referință piață', value: 'proiectoare astronaut Starry Miracle, alt design' },
    ],
    paragraphs: [
      'Galaxy Nightlight Projector transformă camera într-un cer înstelat cu câteva moduri de culoare. Modul sleep poate reduce treptat lumina, iar difuzorul redă melodii line sau zgomot alb.',
      'Listările comparabile folosesc design astronaut sau laser RGB. Verifică dacă rotația proiecției și conexiunea Bluetooth sunt disponibile pe unitatea livrată.',
    ],
  },
  'seed-magic-mop-360-basel': {
    lead:
      'Set mop magic rotativ 360° cu găleată cu cuvă din inox, coadă telescopică și patru rezerve microfibră plus perie rosturi.',
    highlights: [
      'Sistem centrifugal pentru stoarcere fără mâini ude',
      'Cuvă din inox rezistentă la utilizare frecventă',
      'Mop cu rotație 360° pentru colțuri și sub mobilier',
      'Coadă telescopică reglabilă pe înălțime',
      'Patru rezerve microfibră lavabile incluse',
      'Perie pentru rosturi și covoare în pachet',
      'Potrivit gresie, parchet și laminat',
    ],
    specs: [
      { label: 'Cod produs', value: 'MOP-MAGIC-360-INOX' },
      { label: 'Tip produs', value: 'Set mop rotativ cu găleată' },
      { label: 'Cuvă', value: 'inox' },
      { label: 'Rezerve microfibră', value: '4 bucăți' },
      { label: 'Accesorii', value: 'perie rosturi' },
      { label: 'Referință piață', value: 'seturi 8 L Ca-Acasa sau Zana Casei MOP112' },
    ],
    paragraphs: [
      'Setul combină spălarea și stoarcerea într-o singură găleată cu două zone. Mopul absoarbe murdăria, iar cuva centrifugă îndepărtează excesul de apă înainte de următoarea trecere.',
      'Capacitatea găleții poate fi 8 L în listări comparabile. Verifică fixarea cozii telescopice și înlocuirea rezervelor când se uzează firele microfibrei.',
    ],
  },
  'seed-inflatable-pool-family-basel': {
    lead:
      'Piscină gonflabilă dreptunghiulară 200×120×40 cm cu două inele, pentru familie în curte sau grădină vara.',
    highlights: [
      'Dimensiuni aproximative 2 m lungime și 1,2 m lățime',
      'Înălțime apă aproximativ 40 cm, potrivită copii și adulți la joacă',
      'Două inele gonflabile albastru și alb',
      'Margini moi pentru confort la intrare',
      'Material PVC rezistent la utilizare sezonieră',
      'Umflare și golire ușoară',
      'Necesită supraveghere adultă constantă',
    ],
    specs: [
      { label: 'Cod produs', value: 'POOL-GONFL-200X120-BASEL' },
      { label: 'Tip produs', value: 'Piscină gonflabilă dreptunghiulară' },
      { label: 'Dimensiuni', value: '200 × 120 × 40 cm' },
      { label: 'Inele', value: '2' },
      { label: 'Material', value: 'PVC' },
      { label: 'Referință piață', value: '200×150×50 cm Gave sau Bestway 200×146, dimensiuni apropiate' },
    ],
    paragraphs: [
      'Piscina gonflabilă oferă răcorire rapidă fără lucrări permanente. Montați pe o suprafață plană, curată de pietre, și umpleți cu apă conform indicilor de pe cutie.',
      'Listările comparabile folosesc adesea 200×150 cm sau 201×150 cm cu pompă cadou. Acest model urmează grafica 200×120×40 cm; verifică grosimea foliei și dacă pompă este inclusă.',
    ],
  },
}

function buildFallbackContent(product: Product): ShopProductPageContent {
  const rawDescription = (product.description ?? product.name).trim()
  const chunks = htmlToBlocks(rawDescription)
  const description = chunks.join(' ') || product.name
  const lead = chunks[0] ?? product.name
  const body = chunks.length > 1 ? chunks.slice(1) : [description || product.name]
  const specs: { label: string; value: string }[] = [
    { label: 'Denumire', value: product.name },
  ]
  if (product.sku?.trim()) {
    specs.push({ label: 'Cod produs', value: product.sku.trim() })
  }
  const sentenceHighlights = body
    .join(' ')
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12)
    .slice(0, 6)

  return {
    lead,
    highlights: sentenceHighlights.length > 0 ? sentenceHighlights : [lead],
    specs,
    paragraphs: body,
  }
}

export function getShopProductPageContent(product: Product): ShopProductPageContent {
  return SHOP_PRODUCT_CONTENT[product.id] ?? buildFallbackContent(product)
}
