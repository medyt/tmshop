import type { Product } from '../types/product'
import { clampImageUrls } from '../lib/productImages'

/** Elimină flag-ul vechi din versiuni anterioare (nu mai folosit). */
const LEGACY_SEED_FLAG_KEY = 'shoptop-seed-sn8004s-v1'

/** ID stabil pentru produsul seed — editările tale rămân pe același id după reîncărcare. */
export const SEED_SONYMAX_SN8004S_ID = 'seed-sn8004s-elena'

export const SEED_H2O_HUMIDIFIER_ID = 'seed-h2o-humidifier-elena'

export const SEED_NASAL_DILATOR_ID = 'seed-nasal-dilator-elena'

export const SEED_SOLAR_WALL_LED_ID = 'seed-solar-wall-led-elena'

export const SEED_INSTANT_EWH_FAUCET_ID = 'seed-instant-electric-water-faucet-elena'

export const SEED_KEY_PET_COMB_ID = 'seed-key-pet-comb-elena'

export const SEED_VINTAGE_T9_CLIPPER_ID = 'seed-vintage-t9-clipper-basel'

export const SEED_ELECTRIC_GRINDER_ID = 'seed-electric-grinder-basel'

export const SEED_HANDHELD_CONSOLE_ID = 'seed-handheld-console-basel'

export const SEED_ACTION_CAM_4K_ID = 'seed-action-cam-4k-basel'

export const SEED_KARAOKE_SPEAKER_SET_ID = 'seed-karaoke-speaker-2mic-basel'

export const SEED_X18_VIDEO_GAME_ID = 'seed-x18-video-game-basel'

export const SEED_VACUUM_SEALER_ID = 'seed-vacuum-sealer-basel'

export const SEED_VEG_SLICER_CHOPPER_ID = 'seed-vegetable-slicer-basel'

export const SEED_ULTRASONIC_AROMA_HUM_ID = 'seed-ultrasonic-aroma-humidifier-basel'

export const SEED_SPIRAL_POTATO_SLICER_ID = 'seed-spiral-potato-slicer-basel'

export const SEED_JORTAN_JT8161_ID = 'seed-jortan-jt8161-elena'

export const SEED_HELFERHOFF_CHERRY_OLIVE_CORER_ID =
  'seed-helferhoff-cherry-olive-corer-elena'

export const SEED_ICE_BUCKET_BT_SPEAKER_ID = 'seed-ice-bucket-bt-speaker-led-elena'

export const SEED_XTREEME4_SPEAKER_ID = 'seed-xtreeme4-speaker-elena'

export const SEED_SHOWER_TURBO_WATER_SAVE_ID =
  'seed-shower-turbo-water-saving-elena'

export const SEED_DIGITAL_BREATH_ALCOHOL_TESTER_ID =
  'seed-digital-breath-alcohol-tester-elena'

export const SEED_SOLAR_FLAME_LED_LIGHT_ID = 'seed-solar-flame-led-light-elena'

export const SEED_HTC1_THERMO_HYGROMETER_ID = 'seed-htc1-thermo-hygrometer-elena'

export const SEED_KJ12_WIRELESS_HEADSET_ID = 'seed-kj12-wireless-headset-elena'

export const SEED_VEHICLE_BLACKBOX_DVR_ID = 'seed-vehicle-blackbox-dvr-elena'

export const SEED_COSMETIC_BRUSH_STORAGE_BUCKET_ID =
  'seed-cosmetic-brush-storage-bucket-elena'

export const SEED_G63_SMART_LIGHT_SOUND_MACHINE_ID =
  'seed-g63-smart-light-sound-machine-elena'

export const SEED_MINI_DOORBELL_ID = 'seed-mini-doorbell-elena'

export const SEED_VEGGIE_SLICER_22PCS_ID = 'seed-22pcs-veggie-slicer-elena'

export const SEED_GALAXY_NIGHTLIGHT_PROJECTOR_ID =
  'seed-galaxy-nightlight-projector-elena'

export const SEED_MAGIC_MOP_360_ROTATIV_ID = 'seed-magic-mop-360-basel'

export const SEED_INFLATABLE_POOL_FAMILY_ID = 'seed-inflatable-pool-family-basel'

const URL_XSALES =
  'https://xsales.ro/detail/97da54fcf436b737a31dc871a09cba351fe5273b2aca9eda24c2f5103f34ea9a'
const URL_FIVO =
  'https://www.fivo.ro/magazin/casa-si-gradina/bucatarie/set-blender-de-mana-sonymax-4-in-1-1500w-cu-9-viteze-si-functie-turbo/'
const URL_DIYALA =
  'https://diyala.ro/produs/blender-electric-multifunctional-4-in-1-sonymax-sn-8004/'

/** Imagini publice de pe site-uri (listări magazin); pot expira dacă magazinele schimbă URL-urile. */
const IMG_GAVE_LISTING =
  'https://gave.ro/image/catalog/CATEGORII%20OK/Screenshot%202025-02-01%20at%2016.16.01.png'
const IMG_FIVO_1 =
  'https://www.fivo.ro/wp-content/uploads/2024/05/res_1830b43129f1abf7a9aee7bce183d515_1080x1080.webp'
const IMG_FIVO_2 =
  'https://www.fivo.ro/wp-content/uploads/2024/05/res_f3d2b608b3f4d94eb674bfa1488f19bd_1080x1080-1.webp'

export const SEED_SONYMAX_SN8004S: Product = {
  id: SEED_SONYMAX_SN8004S_ID,
  name: 'Set blender de mână SONYMAX 4 în 1',
  sku: 'SN-8004S',
  supplierPriceA: 75,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_GAVE_LISTING, IMG_FIVO_1, IMG_FIVO_2],
  description:
    'Brand SONYMAX, model SN-8004S. Set 4 în 1: blender de mână, tel, tocător 500 ml, pahar / beaker 600 ml. Putere 1500 W. Motor cupru — mențiune pe ambalaj. Lame inox. Garanție 12 luni pe cutie. „German Technology” / fiabilitate — text promo pe ambalaj. Distribuitor: Elena.',
  marketObservations: [
    {
      price: 159,
      sourceUrl: URL_XSALES,
      observedAt: '2026-05-10',
      note: 'XSales → Gave (model SN-8004S în descriere)',
    },
    {
      price: 159,
      sourceUrl: URL_FIVO,
      observedAt: '2026-05-10',
      note: 'Fivo.ro',
    },
    {
      price: 84.99,
      sourceUrl: URL_DIYALA,
      observedAt: '2026-05-10',
      note:
        'Diyala — titlu SN-8004 (posibil variantă); preț mai mic, verifică înainte de comparare',
    },
  ],
  notes:
    'Preț Elena: 75 RON. Preț propus ≈ medie din 3 observații online (actualizare 2026-05-10). Imagini și linkuri din surse publice — verifică periodic dacă URL-urile mai sunt valide.',
}

const URL_VIVIMALL_H2O =
  'https://vivimall.ro/products/umidificator-h2o-cu-difuzor-de-aroma-culori-random'
const URL_BRICOFAN_H2O =
  'https://www.bricofan.ro/umidificator-h2o-cu-difuzor-de-aroma-culori-random.html'
const URL_NINEFOLD_MINI_RGB =
  'https://ninefold.ro/product/mini-umidificator-portabil-rgb/'

const IMG_H2O_VIVIMALL =
  'https://vivimall.ro/cdn/shop/files/umidificator-h2o-cu-difuzor-de-aroma-lumina-de-noapte-led-in-7-culori-zgomot-redus-14-7x7-2cm-350ml--main-686cc59597048_e11978f6-6f2c-4471-8910-81175bfac14b.jpg?crop=center&height=1200&v=1761632871&width=1200'
const IMG_H2O_NINEFOLD =
  'https://ninefold.ro/wp-content/uploads/2025/01/Mini-umidificator-portabil3.jpg'
const IMG_H2O_BRICOFAN =
  'https://gomagcdn.ro/domains2/bricofan.ro/files/product/large/umidificator-h2o-cu-difuzor-de-aroma-culori-random-822442.jpg'

/** Din poză: cutie albă „H2O HUMIDIFIER”, cilindric portabil, LED RGB. */
export const SEED_H2O_HUMIDIFIER: Product = {
  id: SEED_H2O_HUMIDIFIER_ID,
  name: 'Umidificator portabil H2O Humidifier (LED)',
  sku: 'H2O-HUM-RGB',
  supplierPriceA: 12,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_H2O_VIVIMALL, IMG_H2O_NINEFOLD, IMG_H2O_BRICOFAN],
  description:
    'Ambalaj cu text „H2O HUMIDIFIER”. Dispozitiv cilindric alb, lumină LED în partea superioară / inel luminos (efect RGB). Tip portabil — util birou, mașină sau călătorii (confirmă pe etichetă: capacitate, USB, etc.). Distribuție Elena.',
  marketObservations: [
    {
      price: 49.35,
      sourceUrl: URL_VIVIMALL_H2O,
      observedAt: '2026-05-10',
      note: 'Vivimall — H2O, difuzor aromă, LED 7 culori, ~350 ml',
    },
    {
      price: 59.42,
      sourceUrl: URL_BRICOFAN_H2O,
      observedAt: '2026-05-10',
      note: 'Bricofan — același tip H2O aromă LED',
    },
    {
      price: 29,
      sourceUrl: URL_NINEFOLD_MINI_RGB,
      observedAt: '2026-05-10',
      note:
        'Ninefold — mini umidificator RGB portabil (referință similară, nu neapărat același SKU)',
    },
  ],
  notes:
    'Preț Elena: 12 RON. Preț propus = medie din 3 observații online (2026-05-10). Imagini de la magazine RO — modele similare H2O / mini RGB; verifică corespondența cu ambalajul tău.',
}

const URL_IAU_NASAL_STARTER =
  'https://iaureduceri.ro/produs/set-dilatator-nazal-pentru-15-zile-starter-kit-pentru-respiratie-usoara-si-reducerea-sforaitului/'
const URL_EARPLUGS_NASAL_MAGNET =
  'https://www.earplugs.ro/benzi-nazale/dilatator-nazal-cu-magneti/'
const URL_EARPLUGS_AIRMAX_SPORT =
  'https://www.earplugs.ro/dilatatoare-nazale/airmax-sport-dilatator-nazal-pentru-o-respiratie-mai-buna-marimea-s-m/'

const IMG_NASAL_IAU_STARTER =
  'https://iaureduceri.ro/wp-content/uploads/2026/02/set-dilatator-nazal-pentru-15-zile-starter-kit-pentru-respiratie572251.webp'
const IMG_NASAL_EARPLUGS_MAGNET =
  'https://cdn.myshoptet.com/usr/www.earplugs.ro/user/shop/big/16595_dilatator-nazal-cu-magneti.jpg?68edf38d'
const IMG_NASAL_EARPLUGS_AIRMAX =
  'https://cdn.myshoptet.com/usr/www.earplugs.ro/user/shop/big/16706_airmax-sport-dilatator-nazal-pentru-o-respiratie-nazala-mai-buna-marimea-s-m.jpg?683b3ce8'

/** Din poză: cutie „Sleep and Sport Nasal Dilator”, Starter Kit, 15 zile / once daily. */
export const SEED_NASAL_DILATOR: Product = {
  id: SEED_NASAL_DILATOR_ID,
  name: 'Sleep and Sport — dilatator nazal Starter Kit (15 zile)',
  sku: 'NASAL-SS-15D',
  supplierPriceA: 9,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_NASAL_IAU_STARTER, IMG_NASAL_EARPLUGS_MAGNET, IMG_NASAL_EARPLUGS_AIRMAX],
  description:
    'Cutie albă „Sleep and Sport Nasal Dilator”, Starter Kit. Pe ambalaj: „15 DAYS OF BETTER BREATHING”, „ONCE DAILY”; beneficii (respirație mai bună vs. benzi nazale, confort noaptea). Fotografie model cu dilatator pe nas. Distribuție Elena.',
  marketObservations: [
    {
      price: 39,
      sourceUrl: URL_IAU_NASAL_STARTER,
      observedAt: '2026-05-10',
      note: 'IaReduceri — set starter 15 zile, dilatator nazal',
    },
    {
      price: 39.21,
      sourceUrl: URL_EARPLUGS_NASAL_MAGNET,
      observedAt: '2026-05-10',
      note: 'Earplugs — dilatator nazal cu magneți (produs similar, aceeași categorie)',
    },
    {
      price: 72.02,
      sourceUrl: URL_EARPLUGS_AIRMAX_SPORT,
      observedAt: '2026-05-10',
      note:
        'Earplugs — Airmax Sport S+M (alt model dilatator sport; referință preț segment)',
    },
  ],
  notes:
    'Preț Elena: 9 RON. Preț propus = medie din 3 observații online (2026-05-10). Imagini: IaReduceri + Earplugs; verifică periodic că URL-urile mai sunt valide.',
}

const URL_SOLAR_UNELTEMARKET_20LED =
  'https://www.uneltemarket.ro/tlv-lampa-solara-cu-senzor-de-miscare-20-led-uri.html'
const URL_SOLAR_CONCEPTMAG_20LED =
  'https://www.conceptmag.ro/cumpara/lampa-cu-led-solara-si-senzor-de-miscare-20-x-led-3414'
const URL_SOLAR_7SOLAR_WALL_20LED =
  'https://7solar.ro/product/lampa-solara-de-perete-cu-senzor-miscare-20-led/'

const IMG_SOLAR_UNELTEMARKET_20LED =
  'https://www.uneltemarket.ro/media/catalog/product/cache/2/image/9df78eab33525d08d6e5fb8d27136e95/l/a/lampa-solara-de-perete-cu-senzor-de-miscare-cu-20-leduri_1_.jpg'
const IMG_SOLAR_7SOLAR_WALL =
  'https://7solar.ro/wp-content/uploads/2023/05/lampa-solara-de-perete-cu-senzor-miscare-20-led.jpg'
const IMG_SOLAR_CONCEPTMAG_20LED =
  'https://c.cdnmp.net/688591588/p/m/4/lampa-cu-led-solara-si-senzor-de-miscare-20-x-led~6104.jpg'

/** Din poză: ambalaj „SOLAR POWERED LED WALL LIGHT”, senzor PIR + senzor lumină (CDS), ~20 LED în grilă. */
export const SEED_SOLAR_WALL_LED: Product = {
  id: SEED_SOLAR_WALL_LED_ID,
  name: 'Solar Powered LED Wall Light (20 LED)',
  sku: 'SOLAR-WALL-20LED',
  supplierPriceA: 7,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [
    IMG_SOLAR_UNELTEMARKET_20LED,
    IMG_SOLAR_7SOLAR_WALL,
    IMG_SOLAR_CONCEPTMAG_20LED,
  ],
  description:
    'Pe cutie: „SOLAR POWERED LED WALL LIGHT”. Senzor mișcare PIR și senzor lumină noapte (CDS). Ilustrare: corp negru pentru perete, panou solar pe fața înclinată, senzor circular, panou cu ~20 LED (grilă tip 4×5). Text pe dispozitiv: „Solar Sensor Wall light”. Distribuție Elena.',
  marketObservations: [
    {
      price: 19.9,
      sourceUrl: URL_SOLAR_UNELTEMARKET_20LED,
      observedAt: '2026-05-10',
      note: 'Uneltemarket — TLV, lampă solară perete, senzor mișcare, 20 LED',
    },
    {
      price: 20.18,
      sourceUrl: URL_SOLAR_CONCEPTMAG_20LED,
      observedAt: '2026-05-10',
      note: 'Conceptmag — LED solar + senzor mișcare, 20× LED',
    },
    {
      price: 30,
      sourceUrl: URL_SOLAR_7SOLAR_WALL_20LED,
      observedAt: '2026-05-10',
      note: '7solar — lampă solară de perete, senzor, 20 LED (model similar)',
    },
  ],
  notes:
    'Preț Elena: 7 RON. Preț propus = medie din 3 observații online (2026-05-10). Imagini din listări RO; verifică periodic URL-urile și că prețurile din note mai corespund site-urilor.',
}

/** Poză ambalaj din catalogul local (`public/`). */
const IMG_EWH_PACKAGING_BOX = '/images/seed-instant-electric-water-faucet-shower.png'
const URL_EWH_TOPREDUS_WALL_SHOWER =
  'https://www.topredus.ro/lichidare-de-stoc-robinet-electric-cu-incalzire-instantanee-dus-cu-afisaj-led-si-prindere-pe-perete.html'
const URL_EWH_TVMARKET_DISPLAY_DUS =
  'https://www.tvmarket.ro/robinet-electric-instant-apa-calda-cu-display-si-furtun-pentru-dus.html'
const URL_EWH_TOPREDUS_INOX_360 =
  'https://www.topredus.ro/robinet-electric-instant-din-inox-cu-display-si-rotire-360-grade-3000w.html'

const IMG_EWH_TVMARKET_LISTING =
  'https://www.tvmarket.ro/media/catalog/product/cache/9/image/9df78eab33525d08d6e5fb8d27136e95/1/_/1_1_1197.jpg'
const IMG_EWH_TOPREDUS_INOX =
  'https://www.topredus.ro/media/catalog/product/cache/1/small_image/200x200/9df78eab33525d08d6e5fb8d27136e95/8/9/893-14037.png'

/** Din poză: cutie „INSTANT ELECTRIC HEATING WATER FAUCET & SHOWER”, afiș LED temperatură, duș detașabil. */
export const SEED_INSTANT_EWH_FAUCET: Product = {
  id: SEED_INSTANT_EWH_FAUCET_ID,
  name: 'Instant Electric Heating Water Faucet & Shower',
  sku: 'EWH-FAUCET-SHOWER',
  supplierPriceA: 60,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_EWH_PACKAGING_BOX, IMG_EWH_TVMARKET_LISTING, IMG_EWH_TOPREDUS_INOX],
  description:
    'Ambalaj multilingv (EN / PL / RU): încălzitor instant de apă — robinet electric pentru chiuvetă cu furtun și para de duș. Corp alb cu finisaje cromate; manetă unică; afișaj LED cu temperatură (ex. „49” pe cutie). Mesaje promo: fără boiler, fără încălzire centrală, apă caldă în câteva secunde. Distribuție Elena.',
  marketObservations: [
    {
      price: 114,
      sourceUrl: URL_EWH_TOPREDUS_WALL_SHOWER,
      observedAt: '2026-05-10',
      note:
        'TopRedus — robinet instant + duș, LED, montaj perete (lichidare stoc; verifică SKU vs. ambalaj)',
    },
    {
      price: 129.9,
      sourceUrl: URL_EWH_TVMARKET_DISPLAY_DUS,
      observedAt: '2026-05-10',
      note: 'TvMarket — instant apă caldă, display + furtun duș (model similar categoriei)',
    },
    {
      price: 154,
      sourceUrl: URL_EWH_TOPREDUS_INOX_360,
      observedAt: '2026-05-10',
      note:
        'TopRedus — variantă inox 3000 W, display LED, rotire 360° (referință preț segment)',
    },
  ],
  notes:
    'Preț Elena: 60 RON. Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = fotografie ambalaj (fișier în folderul public al aplicației). Verifică periodic linkurile și prețurile pe site-uri.',
}

/** Poză ambalaj din catalogul local (`public/`). */
const IMG_PET_KEY_COMB_BOX = '/images/seed-key-pet-comb.png'
const URL_PET_PETSMANIA_FURMINATOR_RAKE =
  'https://www.petsmania.ro/product/pieptene-furminator-rake-caini-si-pisici/'
const URL_PET_MEGAPET_FURMINATOR =
  'https://www.megapet.ro/furminator-perie-caine-si-pisica-pentru-descalcit-p2853/'
const URL_PET_SUPERPET_PURLOV_COMB =
  'https://www.superpet.ro/produs/perie-piepten-ingrijire-caini-si-pisici-autocuratare-negru-9-5x18-cm-purlov/'

const IMG_PET_PETSMANIA_RAKE =
  'https://www.petsmania.ro/pictures/0/147/pieptene-furminator-rake-caini-si-pisici.jpg'
const IMG_PET_MEGAPET_FURMINATOR =
  'https://www.megapet.ro/continut/produse/2853/420/furminator-perie-caine-si-pisica-pentru-descalcit-3542.jpg'

/** Din poză: cutie „KEY PET COMB”, „EFFICIENT HAIR REMOVAL”, unealtă albastră cu urechi de pisică pe capăt. */
export const SEED_KEY_PET_COMB: Product = {
  id: SEED_KEY_PET_COMB_ID,
  name: 'Key Pet Comb — îndepărtare eficientă păr',
  sku: 'PET-COMB-KEY',
  supplierPriceA: 8,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_PET_KEY_COMB_BOX, IMG_PET_PETSMANIA_RAKE, IMG_PET_MEGAPET_FURMINATOR],
  description:
    'Ambalaj alb cu bandouri albastre; text „KEY PET COMB”, slogan „Craftsmanship details reflect quality”, „EFFICIENT HAIR REMOVAL”. Ilustrare: pieptenă/perie de îngrijire cu mâner albastru și cap circular cu două „urechi” de pisică. Distribuție Elena.',
  marketObservations: [
    {
      price: 75,
      sourceUrl: URL_PET_PETSMANIA_FURMINATOR_RAKE,
      observedAt: '2026-05-10',
      note: 'PetsMania — pieptene Furminator Rake câini/pisici (referință categorie îndepărtare păr)',
    },
    {
      price: 121.76,
      sourceUrl: URL_PET_MEGAPET_FURMINATOR,
      observedAt: '2026-05-10',
      note: 'MegaPet — Furminator perie descâlcire (brand Furminator; alt SKU)',
    },
    {
      price: 48,
      sourceUrl: URL_PET_SUPERPET_PURLOV_COMB,
      observedAt: '2026-05-10',
      note:
        'SuperPet — perie/pieptene autocurățare Purlov (produs similar îngrijire blană)',
    },
  ],
  notes:
    'Preț Elena: 8 RON. Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = fotografie ambalaj (fișier în folderul public). Observațiile sunt piepteni/perii din aceeași categorie — nu neapărat același model Key.',
}

const IMG_VINTAGE_T9_BOX = '/images/seed-vintage-t9-hair-clipper.png'
const URL_CLIPPER_ROMANIANMAG_T9 =
  'https://www.romanianmag.ro/cumpara/aparat-de-tuns-vintage-hw-t9-profesional-fara-fir-trimmer-cu-lama-t-2596'
const URL_CLIPPER_OKAZII_T9 =
  'https://www.okazii.ro/aparat-de-tuns-vintage-t9-profesional-fara-fir-trimmer-pentru-par-si-barba-reincarcabil-a256678783'
const URL_CLIPPER_THEGIFT_T9 =
  'https://www.thegift.ro/cadouri-pentru-barbati-cadouri-diverse-c-21_99/masina-pentru-tuns-si-barbierit-2-in-1-vintage-t9-p-5528'

const IMG_CLIPPER_ROMANIANMAG_T9 =
  'https://c.cdnmp.net/506690928/p/m/8/aparat-de-tuns-vintage-hw-t9-profesional-fara-fir-trimmer-cu-lama-t~7248.jpg'
const IMG_CLIPPER_OKAZII_T9 =
  'https://images.okr.ro/serve/product/7cab6d532e25bfe7b0962a6d0059070e-21742-940_492_10'

/** Din poză (WhatsApp): cutie neagră „VINTAGE T9 PROFESSIONAL HAIR CLIPPER”, accente aurii. Preț furnizor Basel. */
export const SEED_VINTAGE_T9_CLIPPER: Product = {
  id: SEED_VINTAGE_T9_CLIPPER_ID,
  name: 'Vintage T9 Professional Hair Clipper',
  sku: 'CLIPPER-VINTAGE-T9',
  supplierPriceA: 0,
  supplierPriceB: 15,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [
    IMG_VINTAGE_T9_BOX,
    IMG_CLIPPER_ROMANIANMAG_T9,
    IMG_CLIPPER_OKAZII_T9,
  ],
  description:
    'Ambalaj negru cu text alb/auriu „VINTAGE T9 PROFESSIONAL HAIR CLIPPER”. Ilustrație aparat de tuns stil vintage metalic (auriu). Model cordless tip T9 pentru păr și barbă (confirmă pe etichetă: lame, accesorii, încărcare). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 35,
      sourceUrl: URL_CLIPPER_ROMANIANMAG_T9,
      observedAt: '2026-05-10',
      note: 'RomanianMag — Vintage HW-T9, trimmer profesional fără fir, lamă T',
    },
    {
      price: 29.99,
      sourceUrl: URL_CLIPPER_OKAZII_T9,
      observedAt: '2026-05-10',
      note:
        'Okazii — Vintage T9 profesional reîncărcabil (preț tip licitație/listare; poate varia)',
    },
    {
      price: 25,
      sourceUrl: URL_CLIPPER_THEGIFT_T9,
      observedAt: '2026-05-10',
      note: 'TheGift — mașină tuns și bărbierit 2 în 1 Vintage T9',
    },
  ],
  notes:
    'Preț Basel: 15 RON. Cost folosit = Basel (furnizor B). Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = captură ambalaj (fișier în folderul public).',
}

const IMG_GRINDER_BOX = '/images/seed-electric-grinder.png'
const URL_GRINDER_TOPREDUS =
  'https://www.topredus.ro/rasnita-electrica-pentru-cafea-sau-condimente-din-otel-inoxidabil.html'
const URL_GRINDER_WISEBUY =
  'https://www.wisebuy.ro/produse/rasnita-electrica-de-cafea-din-otel-inoxidabil-976'
const URL_GRINDER_EXPRESS21 =
  'https://www.express21.ro/electrocasnice-pentru-bucatarie/r%C3%A2%C8%99ni%C8%9B%C4%83-electric%C4%83-cafea-150w-capacitate-50-100-g-lame-din-o%C8%9Bel-inoxidabil-alimentare-220v-pentru-cafea-%C8%99i-condimente-dimensiuni-17-10-cm.html'

const IMG_GRINDER_TOPREDUS =
  'https://www.topredus.ro/media/catalog/product/cache/1/small_image/200x200/9df78eab33525d08d6e5fb8d27136e95/9/7/976-14994.png'
const IMG_GRINDER_WISEBUY =
  'https://www.wisebuy.ro/uploads/prod_a/976-23799.png'

/** Din poză (WhatsApp): cutie „Electric Grinder”, aparat inox, capac transparent, buton roșu. Preț Basel. */
export const SEED_ELECTRIC_GRINDER: Product = {
  id: SEED_ELECTRIC_GRINDER_ID,
  name: 'Electric Grinder (râșniță cafea / condimente)',
  sku: 'GRINDER-ELECTRIC',
  supplierPriceA: 0,
  supplierPriceB: 20,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_GRINDER_BOX, IMG_GRINDER_TOPREDUS, IMG_GRINDER_WISEBUY],
  description:
    'Ambalaj alb cu text „Electric Grinder”; ilustrație râșniță electrică mică din inox, capac transparent, buton roșu de pornire. Folosit pentru cafea măcinată, condimente etc. (confirmă pe etichetă: putere, capacitate). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 44,
      sourceUrl: URL_GRINDER_TOPREDUS,
      observedAt: '2026-05-10',
      note: 'TopRedus — râșniță electrică cafea/condimente, inox',
    },
    {
      price: 49,
      sourceUrl: URL_GRINDER_WISEBUY,
      observedAt: '2026-05-10',
      note: 'Wisebuy — râșniță electrică cafea din inox (model similar)',
    },
    {
      price: 27,
      sourceUrl: URL_GRINDER_EXPRESS21,
      observedAt: '2026-05-10',
      note: 'Express21 — râșniță 150 W, 50–100 g, inox (referință segment)',
    },
  ],
  notes:
    'Preț Basel: 20 RON. Cost folosit = Basel (furnizor B). Preț propus = medie din 3 observații online (2026-05-10). Prima imagine = captură ambalaj (fișier în folderul public).',
}

const IMG_CONSOLE_BOX = '/images/seed-handheld-console-switch-style.png'
const URL_CONSOLE_STELS_EMAG =
  'https://www.emag.ro/joc-portabil-stels-tehnologie-inteligenta-ecran-color-de-7-inchi-hdmi-10000-de-jocuri-negru-1163/pd/DPN18SYBM/'
const URL_CONSOLE_MOMANIO_HC800 =
  'https://www.momanio.ro/hc800-consola-de-jocuri-portabila-premium-cu-display-hd-ips-de-7-negru'
const URL_CONSOLE_MOMANIO_SJGAM =
  'https://www.momanio.ro/sjgam-m27-consola-portabila-de-gaming-premium-cu-display-hd-ips-de-7-negru'

const IMG_CONSOLE_STELS =
  'https://s13emagst.akamaized.net/products/73815/73814701/images/res_c1cb7ef47aaf889bdfee36157d0322be.jpg?width=450&height=450&hash=8F9C1607CCCD557B673593D9B6194D72'
const IMG_CONSOLE_HC800 =
  'https://i00.eu/img/716/1600x1600/8mmnf3ft/134566.jpg'

/** Din poză (WhatsApp): cutii albastre, consolă cu ecran + Joy-Con albastru/roșu (aspect tip Switch). Preț Basel. */
export const SEED_HANDHELD_CONSOLE: Product = {
  id: SEED_HANDHELD_CONSOLE_ID,
  name: 'Consolă portabilă gaming (aspect tip Switch)',
  sku: 'CONSOLE-HANDHELD-SWSTYLE',
  supplierPriceA: 0,
  supplierPriceB: 105,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_CONSOLE_BOX, IMG_CONSOLE_STELS, IMG_CONSOLE_HC800],
  description:
    'Ambalaj cu vizual consolă handheld: display central, grip-uri laterale în culori distincte (ex. albastru/roșu), aspect asemănător Nintendo Switch — poate fi model compatibil / clone / retro (nu presupune marcă Nintendo pe ambalaj; verifică eticheta). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 362.99,
      sourceUrl: URL_CONSOLE_STELS_EMAG,
      observedAt: '2026-05-10',
      note:
        'eMAG — STELS portabil 7″, HDMI, jocuri integrate (segment handheld retro/mod similar)',
    },
    {
      price: 396.93,
      sourceUrl: URL_CONSOLE_MOMANIO_HC800,
      observedAt: '2026-05-10',
      note: 'Momanio — HC800 retro 7″ IPS, HDMI, emulatoare (referință segment)',
    },
    {
      price: 380.38,
      sourceUrl: URL_CONSOLE_MOMANIO_SJGAM,
      observedAt: '2026-05-10',
      note: 'Momanio — SJGAM M27, ecran 7″ IPS (referință segment preț)',
    },
  ],
  notes:
    'Preț Basel: 105 RON. Cost = Basel (furnizor B). Observațiile sunt din categorii „consolă portabilă” cu ecran mare — nu neapărat același SKU ca în poză; verifică marca pe cutie.',
}

const IMG_ACTION_CAM_BOX = '/images/seed-action-cam-4k-sports.png'
const URL_CAM_GAVE_4K =
  'https://gave.ro/camera-sport-4k-ultrahd-30fps-wifi-16mp-si-accesorii'
const URL_CAM_SHOPVIO_4K =
  'https://shopvio.ro/products/camera-sport-4k-ultra-hd-wifi'
const URL_CAM_EMAG_COOAU_4K =
  'https://www.emag.ro/camera-video-sport-cooau-4k-ultra-hd-20mp-camera-pentru-casca-unghi-larg-170-rezistenta-la-apa-40m-cu-telecomanda-wi-fi-baterii-2x1200mah-16-accesorii-camera-video-ski-negru-sp0883v2/pd/DNFDLSYBM/'

const IMG_CAM_GAVE =
  'https://gave.ro/image/cache/catalog/CATEGORII_OK/camera_sport_4k_ultrahd_30fps_wifi_16mp_si_accesorii-1024x1024.png'
const IMG_CAM_SHOPVIO =
  'https://shopvio.ro/cdn/shop/files/unnamed_cdffb2b0-b8af-48d4-a8c4-19a5ef6a2de7.jpg?v=1709201309'

/** Din poză (WhatsApp): ambalaj „4K SPORTS Ultra HD DV”, tip cameră video sport / action cam. Preț Basel. */
export const SEED_ACTION_CAM_4K: Product = {
  id: SEED_ACTION_CAM_4K_ID,
  name: 'Cameră sport 4K Ultra HD DV',
  sku: 'CAM-4K-SPORTS-UHD',
  supplierPriceA: 0,
  supplierPriceB: 65,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_ACTION_CAM_BOX, IMG_CAM_GAVE, IMG_CAM_SHOPVIO],
  description:
    'Pe cutie: „4K SPORTS Ultra HD DV” — cameră video de acțiune stil GoPro / DV (rezoluție 4K în promo pe ambalaj; confirmă fps, Wi‑Fi, kit accesorii și rezistență la apă pe etichetă). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 129.99,
      sourceUrl: URL_CAM_GAVE_4K,
      observedAt: '2026-05-10',
      note: 'Gave — cameră sport 4K UltraHD 30fps WiFi 16MP + accesorii',
    },
    {
      price: 189,
      sourceUrl: URL_CAM_SHOPVIO_4K,
      observedAt: '2026-05-10',
      note: 'Shopvio — cameră sport 4K Ultra HD WiFi H9 (segment similar)',
    },
    {
      price: 299.99,
      sourceUrl: URL_CAM_EMAG_COOAU_4K,
      observedAt: '2026-05-10',
      note:
        'eMAG — COOAU 4K Ultra HD 20MP, Wi‑Fi, kit accesorii (referință segment premium)',
    },
  ],
  notes:
    'Preț Basel: 65 RON. Cost = Basel (furnizor B). Observațiile sunt din aceeași categorie (action cam 4K); nu garantează același brand ca pe ambalajul tău.',
}

const IMG_KARAOKE_BOX = '/images/seed-karaoke-speaker-dual-mic.png'
const URL_KARAOKE_EXPRESS21_ENGROSS =
  'https://www.express21.ro/boxe/set-karaoke-cu-2-microfoane-%C8%99i-box%C4%83-portabil%C4%83-roz-6w-iluminare-led-schimbare-voce-baterii-re%C3%AEnc%C4%83rcabile-engross.html'
const URL_KARAOKE_IMPACT_VISION =
  'https://impactmag.ro/produs/set-boxa-karaoke-2-microfoane-wireless-bluetooth-5-0-portabil-acumulator-albastru-impact-vision/'
const URL_KARAOKE_OKAZII_K12 =
  'https://www.okazii.ro/set-2-microfoane-pentru-karaoke-cu-boxa-portabila-k12-a254839627'

const IMG_KARAOKE_EXPRESS21 =
  'https://gomagcdn.ro/domains2/express21.ro/files/product/large/set-karaoke-cu-2-microfoane-si-boxa-portabila-roz-6w-iluminare-led-schimbare-voce-baterii-reincarcabile-engross-813509.jpg'
const IMG_KARAOKE_IMPACT =
  'https://impactmag.ro/wp-content/uploads/2025/04/set-boxa-karaoke-06.webp'

/** Din poză (WhatsApp): boxă portabilă mică cu margine luminată + două microfoane (set karaoke). Preț Basel. */
export const SEED_KARAOKE_SPEAKER_SET: Product = {
  id: SEED_KARAOKE_SPEAKER_SET_ID,
  name: 'Set karaoke — boxă portabilă + 2 microfoane',
  sku: 'KARAOKE-SET-2MIC',
  supplierPriceA: 0,
  supplierPriceB: 23,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_KARAOKE_BOX, IMG_KARAOKE_EXPRESS21, IMG_KARAOKE_IMPACT],
  description:
    'Ambalaj alb; imagine produs: boxă compactă portabilă cu mâner, contur luminos (LED/RGB pe marginea grilei), alături două microfoane mici (culoare deschisă). Tip set karaoke / petrecere — Bluetooth, USB sau SD în funcție de model (verifică pe cutie). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 25.62,
      sourceUrl: URL_KARAOKE_EXPRESS21_ENGROSS,
      observedAt: '2026-05-10',
      note:
        'Express21 Engross — set karaoke 2 microfoane + boxă 6 W, LED (preț apropiat de intrare)',
    },
    {
      price: 55,
      sourceUrl: URL_KARAOKE_IMPACT_VISION,
      observedAt: '2026-05-10',
      note:
        'Impact Vision — set boxă karaoke + 2 microfoane wireless, Bluetooth 5.0 (referință segment mijloc)',
    },
    {
      price: 110.19,
      sourceUrl: URL_KARAOKE_OKAZII_K12,
      observedAt: '2026-05-10',
      note:
        'Okazii — set K12 cu 2 microfoane wireless + boxă (preț tip licitație; poate varia)',
    },
  ],
  notes:
    'Preț Basel: 23 RON. Cost = Basel (furnizor B). Observațiile sunt din aceeași categorie (karaoke portabil + 2 microfoane); nu garantează același brand sau putere (W) ca pe ambalajul tău.',
}

const IMG_X18_BOX = '/images/seed-x18-video-game-console.png'
const URL_CON_EMAG_X12 =
  'https://www.emag.ro/consola-portabila-gaming-x12-8-gb-3000-de-jocuri-instalate-mario-etc-negru-1688202708016/pd/D5V5V2MBM/'
const URL_CON_MEDOSHOP_X7 =
  'https://www.medoshop.ro/produs/consola-jocuri-portabila-x7-display-4-3-inch-tv-out-10000-jocuri/'
const URL_CON_OKAZII_X12 =
  'https://www.okazii.ro/consola-jocuri-portabila-x12-display-5-1-inch-tv-out-albastru-cu-rosu-a233317451'

const IMG_CON_EMAG_X12 =
  'https://s13emagst.akamaized.net/products/32886/32885043/images/res_a535973368194afba5bd44aafb2503a1.jpg?width=450&height=450&hash=C20D4B9C97CA7644B095C982D458D939'
const IMG_CON_MEDOSHOP_X7 =
  'https://www.medoshop.ro/wp-content/uploads/2023/03/Hb54c433abdc44741b462b718333651a7r.jpg_960x960.jpg.jpg'

/** Din poză (WhatsApp): cutie cu etichetă albastră „X18” / „VIDEO GAME”; consolă handheld albă cu grip-uri negre. Preț Basel. */
export const SEED_X18_VIDEO_GAME: Product = {
  id: SEED_X18_VIDEO_GAME_ID,
  name: 'X18 VIDEO GAME — consolă handheld',
  sku: 'CONSOLE-X18-VGAME',
  supplierPriceA: 0,
  supplierPriceB: 120,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_X18_BOX, IMG_CON_EMAG_X12, IMG_CON_MEDOSHOP_X7],
  description:
    'Ambalaj cu bandă albastră „X18” și text „VIDEO GAME”. Vizual: consolă portabilă cu ecran central și grip-uri laterale întunecate (retro / emulator tip handheld). Verifică pe cutie: memorie, număr jocuri, ieșire TV. Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 310,
      sourceUrl: URL_CON_EMAG_X12,
      observedAt: '2026-05-10',
      note:
        'eMAG — consolă portabilă gaming X12, 8 GB, jocuri preinstalate (serie X apropiată ca segment)',
    },
    {
      price: 183,
      sourceUrl: URL_CON_MEDOSHOP_X7,
      observedAt: '2026-05-10',
      note:
        'Medoshop — consolă portabilă X7, 4,3″, TV-Out (referință preț serie handheld retro)',
    },
    {
      price: 239,
      sourceUrl: URL_CON_OKAZII_X12,
      observedAt: '2026-05-10',
      note:
        'Okazii — X12 5,1″ TV-Out (licitație/listare; preț variabil — nu există listare standard „X18” pe RO la căutare)',
    },
  ],
  notes:
    'Preț Basel: 120 RON. Cost = Basel (furnizor B). Piața folosește des „X7/X12” pentru handheld-uri similare; observațiile nu echivalează neapărat modelul X18 din poză.',
}

const IMG_VACUUM_BOX = '/images/seed-vacuum-sealer.png'
const URL_VAC_TENQ =
  'https://www.tenq.ro/collections/pret-maxim-50-lei/products/aparat-de-sigilat-si-vidat-vacuum-sealer-s-220v-90w'
const URL_VAC_ECONVENABIL =
  'https://www.econvenabil.ro/aparat-de-vidat-cu-pungi-incluse-etansare-automata-vacuum-sealer-90w-p43053'
const URL_VAC_PROREDUS = 'https://proredus.ro/products/aparat-de-vidat-vacuum-sealer'

const IMG_VAC_TENQ =
  'https://www.tenq.ro/cdn/shop/files/aparat-vidat_600x.jpg?v=1730829320'
const IMG_VAC_ECONVENABIL =
  'https://www.econvenabil.ro/image/uploads/products/w_rx200x200/aparat-de-vidat-cu-pungi-incluse-etansare-automata-vacuum-sealer-90w-p43053-02.jpg'

/** Din poză (WhatsApp): cutii „Vacuum Sealer”, aparat compact de vidat alimente. Preț Basel. */
export const SEED_VACUUM_SEALER: Product = {
  id: SEED_VACUUM_SEALER_ID,
  name: 'Vacuum Sealer — aparat de vidat alimente',
  sku: 'SEALER-VACUUM-KITCH',
  supplierPriceA: 0,
  supplierPriceB: 27,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_VACUUM_BOX, IMG_VAC_TENQ, IMG_VAC_ECONVENABIL],
  description:
    'Ambalaj cu text „Vacuum Sealer”; produs tip aparat de sigilat / vidat pentru pungi dedicate păstrării alimentelor (putere tipică ~90 W în categorie — verifică pe cutie). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 39.99,
      sourceUrl: URL_VAC_TENQ,
      observedAt: '2026-05-10',
      note:
        'Tenq — Vacuum Sealer S 90 W, pungi incluse (promoție pe site; verifică varianta activă)',
    },
    {
      price: 65,
      sourceUrl: URL_VAC_ECONVENABIL,
      observedAt: '2026-05-10',
      note: 'eConvenabil — aparat vidat + pungi, etanșare automată, 90 W',
    },
    {
      price: 83.99,
      sourceUrl: URL_VAC_PROREDUS,
      observedAt: '2026-05-10',
      note:
        'ProRedus — aparat vacuum sealer (preț din listare; poate include reduceri)',
    },
  ],
  notes:
    'Preț Basel: 27 RON. Cost = Basel (furnizor B). Observațiile sunt aparate „vacuum sealer” compacte 90 W din magazine RO — nu garantează același SKU ca ambalajul tău.',
}

const IMG_VEG_SLICER_BOX = '/images/seed-vegetable-slicer-chopper.png'
const URL_VEG_MAGAZIN_SPEEDY =
  'https://www.magazinultuturor.ro/cumpara/tocator-manual-speedy-chopper-pentru-legume-nicer-dicer-3692'
const URL_VEG_MARKET_QUICK =
  'https://www.market-romania.ro/tocator-si-feliator-pentru-legume-sau-fructe-multifunctional-5-in-1-nicer-dicer-quick.html'
const URL_VEG_MARKET_FUSION =
  'https://www.market-romania.ro/razatoare-multifunctionala-nicer-dicer-fusion-14643.html'

const IMG_VEG_MARKET_QUICK =
  'https://www.market-romania.ro/media/catalog/product/cache/4/image/9df78eab33525d08d6e5fb8d27136e95/n/i/nicer-dicerquick5.jpeg'
const IMG_VEG_TVMARKET_NICER =
  'https://www.tvmarket.ro/media/catalog/product/cache/9/image/9df78eab33525d08d6e5fb8d27136e95/f/e/feliator-profesional-rapid-practic-5-in-1-nicer-dicer-500x500.jpg'

/** Din poză (WhatsApp): cutii alb-verde, feliator/tocător legume tip „Nicer Dicer”. Preț Basel. */
export const SEED_VEG_SLICER_CHOPPER: Product = {
  id: SEED_VEG_SLICER_CHOPPER_ID,
  name: 'Feliator / tocător legume (tip Nicer Dicer)',
  sku: 'SLICER-VEG-MULTI',
  supplierPriceA: 0,
  supplierPriceB: 25,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_VEG_SLICER_BOX, IMG_VEG_MARKET_QUICK, IMG_VEG_TVMARKET_NICER],
  description:
    'Ambalaj cu vizual legume feliate și dispozitiv cu lame/grilă — set tip „Nicer Dicer” / feliator multifuncțional pentru legume și fructe (felii, cuburi, sticks în funcție de accesorii; verifică pe cutie). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 42.7,
      sourceUrl: URL_VEG_MAGAZIN_SPEEDY,
      observedAt: '2026-05-10',
      note:
        'Magazinul Tuturor — tocător manual Speedy Chopper „Nicer Dicer” (preț promo pe site)',
    },
    {
      price: 49.9,
      sourceUrl: URL_VEG_MARKET_QUICK,
      observedAt: '2026-05-10',
      note:
        'Market Romania — Nicer Dicer Quick 5 în 1, tocător și feliator multifuncțional',
    },
    {
      price: 100.9,
      sourceUrl: URL_VEG_MARKET_FUSION,
      observedAt: '2026-05-10',
      note:
        'Market Romania — Nicer Dicer FUSION, răzătoare multifuncțională (segment mai sus)',
    },
  ],
  notes:
    'Preț Basel: 25 RON. Cost = Basel (furnizor B). Observațiile sunt din gama Nicer Dicer / feliatoare similare — nu garantează același număr de accesorii sau marcă exactă ca pe ambalajul tău.',
}

const IMG_ULTRA_HUM_BOX = '/images/seed-ultrasonic-aroma-humidifier.png'
const URL_HUM_TOPREDUS_ULTRA =
  'https://www.topredus.ro/umidificator-ultrasonic-si-difuzor-de-arome.html'
const URL_HUM_XSALES_GAVE_QT59 =
  'https://xsales.ro/detail/97da54fcf436b737a31dc871a09cba356798ca5630c480fdfbeec67fd6b8be36'
const URL_HUM_OKAZII_300 =
  'https://www.okazii.ro/umidificator-ultrasonic-si-difuzor-de-arome-2-modele-300ml-a224412262'

const IMG_HUM_TOPREDUS =
  'https://www.topredus.ro/media/catalog/product/cache/1/small_image/200x200/9df78eab33525d08d6e5fb8d27136e95/1/1/1126-24455.jpg'
const IMG_HUM_XSALES_GAVE =
  'https://gave.ro/image/catalog/CATEGORII%20OK/Screenshot%202024-05-22%20at%2016.31.12.png'

/** Din poză (WhatsApp): cutii „Ultrasonic Aroma Humidifier”; corp sferic aspect lemn, LED în jurul „ecuatorului”. Preț Basel. */
export const SEED_ULTRASONIC_AROMA_HUMIDIFIER: Product = {
  id: SEED_ULTRASONIC_AROMA_HUM_ID,
  name: 'Ultrasonic Aroma Humidifier (lemn / LED)',
  sku: 'HUMID-ULTRASONIC-AROMA',
  supplierPriceA: 0,
  supplierPriceB: 12,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_ULTRA_HUM_BOX, IMG_HUM_TOPREDUS, IMG_HUM_XSALES_GAVE],
  description:
    'Ambalaj cu text „Ultrasonic Aroma Humidifier”; vizual dispozitiv rotund, finisaj tip lemn, bandă lumină (LED verde în poză) în zona mediană — umidificator ultrasonic cu funcție de difuzare aromă (uleiuri esențiale în funcție de model; verifică capacitate ml și butoane pe cutie). Distinct de umidificatorul cilindric H2O din seed. Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 36,
      sourceUrl: URL_HUM_TOPREDUS_ULTRA,
      observedAt: '2026-05-10',
      note:
        'TopRedus — umidificator ultrasonic + difuzor arome, LED 7 culori, ~300 ml (segment similar)',
    },
    {
      price: 95,
      sourceUrl: URL_HUM_XSALES_GAVE_QT59,
      observedAt: '2026-05-10',
      note:
        'XSales → Gave — Andowl Q-T59 300 ml, lemn deschis (model din aceeași categorie)',
    },
    {
      price: 90,
      sourceUrl: URL_HUM_OKAZII_300,
      observedAt: '2026-05-10',
      note:
        'Okazii — umidificator ultrasonic + difuzor arome 300 ml (preț tip licitație; poate varia)',
    },
  ],
  notes:
    'Preț Basel: 12 RON. Cost = Basel (furnizor B). SKU separat de „H2O-HUM-RGB” (alt tip de umidificator în catalog). Observațiile sunt din piața RO pentru difuzoare/umidificatoare ultrasonice cu design lemn.',
}

const IMG_SPIRAL_POTATO_BOX = '/images/seed-spiral-potato-slicer.png'
const URL_SPIRAL_ONPRICE =
  'https://www.onprice.ro/dispozitiv-pentru-taiat-cartofi-in-spirala-spiral-potato-slicer.html'
const URL_SPIRAL_MARKET_RO =
  'https://www.market-romania.ro/dispozitiv-pentru-taiat-cartofi-in-spirala-spiral-potato-slicer-13383.html'
const URL_SPIRAL_TENQ =
  'https://www.tenq.ro/products/dispozitiv-pentru-taiat-cartofi-in-spirala-spiral-potato-slicer'

const IMG_SPIRAL_ONPRICE =
  'https://www.onprice.ro/media/catalog/product/cache/12/image/9df78eab33525d08d6e5fb8d27136e95/1/6/1606-large_default.jpg'
const IMG_SPIRAL_MARKET_RO =
  'https://www.market-romania.ro/media/catalog/product/cache/4/image/9df78eab33525d08d6e5fb8d27136e95/7/_/7_1_126.jpg'

/** Din poză (WhatsApp): cutii „Spiral Potato Slicer”, unealtă manuală roșie pentru cartofi în spirală. Preț Basel. */
export const SEED_SPIRAL_POTATO_SLICER: Product = {
  id: SEED_SPIRAL_POTATO_SLICER_ID,
  name: 'Spiral Potato Slicer — feliator cartofi spirală',
  sku: 'SLICER-SPIRAL-POTATO',
  supplierPriceA: 0,
  supplierPriceB: 25,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_SPIRAL_POTATO_BOX, IMG_SPIRAL_ONPRICE, IMG_SPIRAL_MARKET_RO],
  description:
    'Ambalaj cu text „Spiral Potato Slicer”; dispozitiv manual (culoare tipic roșie în vizual) pentru tăiat cartofi în formă spirală / chips spiral — uneori ventuză/bază pentru stabilitate și bețișoare incluse (verifică pe cutie). Nu este feliatorul multifuncțional Nicer Dicer (SKU „SLICER-VEG-MULTI”). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 89.9,
      sourceUrl: URL_SPIRAL_ONPRICE,
      observedAt: '2026-05-10',
      note: 'OnPrice — Spiral Potato Slicer (promoție pe site)',
    },
    {
      price: 118.9,
      sourceUrl: URL_SPIRAL_MARKET_RO,
      observedAt: '2026-05-10',
      note: 'Market Romania — același tip produs „Spiral Potato Slicer”',
    },
    {
      price: 50,
      sourceUrl: URL_SPIRAL_TENQ,
      observedAt: '2026-05-10',
      note:
        'Tenq — dispozitiv spirală cartofi (preț din listare; verifică varianta activă)',
    },
  ],
  notes:
    'Preț Basel: 25 RON. Cost = Basel (furnizor B). SKU separat de „SLICER-VEG-MULTI” (alt produs / alt preț Basel în catalog).',
}

const IMG_JORTAN_JT8161_BOX = '/images/seed-jortan-jt-8161.png'

/** Listări pentru același model — căutare „JORTAN JT-8161” (Google Shopping / magazine RO). */
const URL_JORTAN_JT8161_JORTAN_RO =
  'https://www.jortan.ro/products/camera-de-supraveghere-jortan-jt-8161-1080p-wifi-ip66-wireless-nightvision-infrarosu-card-64gb'
const URL_JORTAN_JT8161_ONLINEGREEN =
  'https://onlinegreentime.com/products/pachet-1-4-camere-de-supraveghere-jortan-jt-8161'
const URL_JORTAN_JT8161_GOOGLE_SHOP =
  'https://www.google.com/search?q=JORTAN+JT-8161&tbm=shop'

/** Din poză (WhatsApp): cutie JORTAN JT-8161 — cameră inteligentă securitate, IP66, interior/exterior. Preț Elena. */
export const SEED_JORTAN_JT8161: Product = {
  id: SEED_JORTAN_JT8161_ID,
  name: 'Cameră inteligentă JORTAN JT-8161',
  sku: 'JT-8161',
  supplierPriceA: 45,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_JORTAN_JT8161_BOX],
  description:
    'Marcă JORTAN, model JT-8161 — cameră inteligentă de securitate (vizual tip dome PTZ cu antene externe), IP66 (interior și exterior). Pe ambalaj: „TOTALMENTE COLORIDO”, „CAMERA INTELIGENTE”; utilizare INTERIOR / AR LIVRE (exterior). Distribuție Elena.',
  marketObservations: [
    {
      price: 85,
      sourceUrl: URL_JORTAN_JT8161_JORTAN_RO,
      observedAt: '2026-05-10',
      note:
        'Jortan.ro — listare oficială brand; din rezultate Google Shopping ~85 RON, livrare „fără costuri” (verifică în coș)',
    },
    {
      price: 79,
      sourceUrl: URL_JORTAN_JT8161_ONLINEGREEN,
      observedAt: '2026-05-10',
      note:
        'Onlinegreentime — pachet 1–4 camere JT-8161; din Shopping ~79 RON + ~14,99 RON transport (verifică total)',
    },
    {
      price: 57.85,
      sourceUrl: URL_JORTAN_JT8161_GOOGLE_SHOP,
      observedAt: '2026-05-10',
      note:
        'Bazarul Online — din rezultate sponsorizate Google pentru JT-8161 ~57,85 RON + transport (~25 RON); poate exista comandă minimă — verifică listarea activă',
    },
  ],
  notes:
    'Preț Elena: 45 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 prețuri pentru același model JT-8161 (~74 RON): Jortan.ro, Onlinegreentime, Bazarul în Google Shopping (q=JORTAN+JT-8161). Transportul nu e inclus în medie — compară total în coș. Actualizare 2026-05-10.',
}

const IMG_HELFERHOFF_CHERRY_OLIVE_BOX = '/images/seed-helferhoff-cherry-olive-corer.png'

const URL_CHERRY_LEIFHEIT_FRESHFUL =
  'https://www.freshful.ro/p/100177610-leifheit-aparat-de-scos-samburi-cirese'
const URL_CHERRY_EDAR_EMAG =
  'https://www.emag.ro/aparat-de-scos-samburi-edar-dispozitiv-potrivit-pentru-cirese-visine-masline-mecanism-prindere-de-masa-alb-rosu-asmb01e/pd/D4QFZBYBM/'
const URL_CHERRY_VANORA_EMAG =
  'https://www.emag.ro/aparat-de-scos-samburi-cirese-visine-masline-plastic-er40657/pd/DK2SLWMBM/'

/** Din poză: cutie HelferHoff — dispozitiv îndepărtare sâmburi cireșe/măsline; opțiune 2 culori. Preț Elena. */
export const SEED_HELFERHOFF_CHERRY_OLIVE_CORER: Product = {
  id: SEED_HELFERHOFF_CHERRY_OLIVE_CORER_ID,
  name: 'Scos sâmburi cireșe & măsline HelferHoff',
  sku: 'HELFERHOFF-CHERRY-OLIVE',
  supplierPriceA: 14,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_HELFERHOFF_CHERRY_OLIVE_BOX],
  description:
    'Marcă HelferHoff — „Cherry and Olive Corer” / Cookware and Accessories. Pe cutie: dispozitiv plastic (vizual alb cu mecanism tip piston roșu) pentru îndepărtat sâmburi la cireșe sau măsline; mențiune „2 Colour Option”. Text rusă pe ambalaj: „МАШИНКА ДЛЯ УДАЛЕНИЯ КОСТОЧЕК”. Distribuție Elena.',
  marketObservations: [
    {
      price: 36.79,
      sourceUrl: URL_CHERRY_LEIFHEIT_FRESHFUL,
      observedAt: '2026-05-10',
      note:
        'Freshful — Leifheit aparat scos sâmburi cireșe (stock poate varia; preț din listare)',
    },
    {
      price: 39.91,
      sourceUrl: URL_CHERRY_EDAR_EMAG,
      observedAt: '2026-05-10',
      note:
        'eMAG — EDAR ASMB01E, prindere masă, cireșe/vișine/măsline (model apropiat ca UX)',
    },
    {
      price: 33.88,
      sourceUrl: URL_CHERRY_VANORA_EMAG,
      observedAt: '2026-05-10',
      note:
        'eMAG — Vanora plastic, cireșe/vișine/măsline (segment entry)',
    },
  ],
  notes:
    'Preț Elena: 14 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~37 RON); nu există listări „HelferHoff” în RO în căutările folosite — compară cu dispozitive similare de pe Freshful/eMAG (actualizare 2026-05-10).',
}

const IMG_ICE_BUCKET_BT_SPEAKER_BOX = '/images/seed-ice-bucket-bt-speaker-led.png'

const URL_ICE_TENQ =
  'https://www.tenq.ro/products/frapiera-cu-led-si-boxa-reincarcabila'
const URL_ICE_PROMAGG =
  'https://promagg.ro/products/frapiera-gheata-5l-cu-iluminare-led-si-boxa-wireless'
const URL_ICE_EMAG_7L =
  'https://www.emag.ro/frapiera-de-gheata-cu-led-si-difuzor-7l-frapiera7/pd/DGJN003BM/'

/** Din poză: găleată gheață iluminată cu boxă Bluetooth integrată, LED 7 culori, ~5 W. Preț Elena. */
export const SEED_ICE_BUCKET_BT_SPEAKER: Product = {
  id: SEED_ICE_BUCKET_BT_SPEAKER_ID,
  name: 'Găleată gheață LED + boxă Bluetooth',
  sku: 'ICE-BUCKET-BT-LED',
  supplierPriceA: 30,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_ICE_BUCKET_BT_SPEAKER_BOX],
  description:
    'Găleată pentru gheață (vizual aspect translucid/alb) cu difuzor Bluetooth și efecte lumină LED — pe cutie: „7 color light effects”, mențiuni tip „Up to 4 hours” / „5 HOURS” pentru redare muzică; încărcare USB; boxă și găleată detașabile pentru curățare. Dimensiuni tipice pe ambalaj: ~24,7 × 23,5 × 28,7 cm (lățime × adâncime × înălțime). Putere indicată ~5 W pe badge albastru. Marcaj CE pe etichetă. Distribuție Elena.',
  marketObservations: [
    {
      price: 99.99,
      sourceUrl: URL_ICE_TENQ,
      observedAt: '2026-05-10',
      note:
        'Tenq — frapieră ~7 L, LED + boxă wireless reîncărcabilă (preț promo din listare)',
    },
    {
      price: 79.99,
      sourceUrl: URL_ICE_PROMAGG,
      observedAt: '2026-05-10',
      note:
        'Promagg — frapieră 5 L LED + boxă Bluetooth (stoc/preț pot varia)',
    },
    {
      price: 90,
      sourceUrl: URL_ICE_EMAG_7L,
      observedAt: '2026-05-10',
      note:
        'eMAG — frapieră gheață cu LED și difuzor 7 L (listare OEM/similar)',
    },
  ],
  notes:
    'Preț Elena: 30 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~90 RON); produse din aceeași categorie (frapieră LED + Bluetooth 5–7 L), nu același SKU ca ambalajul tău (actualizare 2026-05-10).',
}

const IMG_XTREEME4_BOX = '/images/seed-xtreeme4-speaker.png'

const URL_SPK_HOCO_RGB =
  'https://www.emag.ro/boxa-portabila-bluetooth-5-0-hoco-pulsating-iluminare-rgb-tws-rosu-hc8-emagmpref-41406/pd/DCT4LCMBM/'
const URL_SPK_CHARGE3_STYLE =
  'https://www.emag.ro/boxa-portabila-charge-3-negru-20w-usb-waterproof-bluetooth-nv110/pd/DXG4XWBBM/'
const URL_SPK_DYTIMEEM =
  'https://www.emag.ro/boxa-portabila-wireless-dytimeem-bluetooth-5-0-autonomie-30-ore-rezistenta-la-apa-ipx5-culoare-camuflaj-e311g/pd/DJ40N03BM/'

/** Din poză: cutie „XTREEME4”, bas puternic, vizual boxă cilindrică cu LED; design tip petrecere. Preț Elena (notă manuscrisă pe cutie: 60). */
export const SEED_XTREEME4_SPEAKER: Product = {
  id: SEED_XTREEME4_SPEAKER_ID,
  name: 'Boxă portabilă Bluetooth XTREEME4 (Bass Boost / LED)',
  sku: 'XTREEME4',
  supplierPriceA: 60,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_XTREEME4_BOX],
  description:
    'Pe ambalaj: denumire „XTREEME4”, mesaj „POWERFUL BASS BOOST”; ilustrație boxă cilindrică cu zonă luminată LED (gradient tip albastru-roșu), siluete petrecere/concert în colțuri; mâner transport pe partea superioară (cutie roșu/alb). Produs tip OEM / inspirație design party speaker — nu este JBL; verifică pe etichetă putere (W), Bluetooth și certificări. Distribuție Elena.',
  marketObservations: [
    {
      price: 192.99,
      sourceUrl: URL_SPK_HOCO_RGB,
      observedAt: '2026-05-10',
      note:
        'eMAG — Hoco HC8, Bluetooth 5.0, iluminare RGB, TWS, ~10 W (referință LED + portabil)',
    },
    {
      price: 119.79,
      sourceUrl: URL_SPK_CHARGE3_STYLE,
      observedAt: '2026-05-10',
      note:
        'eMAG — Charge 3+ style NV110, 20 W, waterproof (segment boxă cilindrică OEM populară)',
    },
    {
      price: 69.9,
      sourceUrl: URL_SPK_DYTIMEEM,
      observedAt: '2026-05-10',
      note:
        'eMAG — Dytimeem E311G, Bluetooth 5.0, IPX5 (preț din listare; poate varia)',
    },
  ],
  notes:
    'Preț Elena: 60 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~128 RON); nu există listări „XTREEME4” pe magazinele verificate — compară cu boxe Bluetooth cu LED/RGB și bas promovat pe eMAG (actualizare 2026-05-10).',
}

const IMG_SHOWER_TURBO_BOX = '/images/seed-shower-turbo-water-saving-filter.png'

const URL_SHOWER_FILTRU_VIT_C =
  'https://www.emag.ro/para-dus-cu-vitamina-c-filtru-ionic-si-granule-minerale-3-nivele-de-filtrare-a-apei-functii-anti-calcar-usor-de-instalat-ss-05/pd/DZTF33YBM/'
const URL_SHOWER_IDROBRIC_RELAX =
  'https://www.emag.ro/para-de-dus-idrobric-relax-abs-cromat-3-niveluri-de-filtrare-a-apei-1-functie-anti-calcar-80-mm-difuzor-inox-ss304-cu-micro-duze-care-cresc-presiunea-jetului-de-apa-si-asigura-economia-de-apa-conexiun/pd/DRKZ0TMBM/'
const URL_SHOWER_TOPAQUA_HYDROMIST =
  'https://www.emag.ro/para-cap-de-dus-topaquar-hydromist-3-moduri-jet-buton-on-off-filtrare-economisire-apa-jet-uniform-crestere-presiune-gri-cap-dus-argintiu/pd/D4F79D3BM/'

/** Din poză: „TURBOCHARGED WATER SAVING SHOWER” — para de mână cromată, buton pe mâner, „Built-in filter”, diagramă flux. Preț Elena. */
export const SEED_SHOWER_TURBO_WATER_SAVE: Product = {
  id: SEED_SHOWER_TURBO_WATER_SAVE_ID,
  name: 'Para duș turbo — economisire apă + filtru',
  sku: 'SHOWER-TURBO-WATER-SAVE',
  supplierPriceA: 8,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_SHOWER_TURBO_BOX],
  description:
    'Ambalaj cu text „TURBOCHARGED WATER SAVING SHOWER”; vizual para de mână finisaj crom, față rotundă cu multe duze, mâner cilindric cu buton circular (on/off sau control jet); mențiune „Built-in filter”; schemă tehnică în partea inferioară a cutiei. Tip produs OEM pentru presiune/economie apă — verifică pe etichetă material (ABS/inox), filet 1/2” și filtru inclus. Distribuție Elena.',
  marketObservations: [
    {
      price: 29.03,
      sourceUrl: URL_SHOWER_FILTRU_VIT_C,
      observedAt: '2026-05-10',
      note:
        'eMAG — para cu filtru ionic / granule, anti-calcar (segment „filtru în para”)',
    },
    {
      price: 36.36,
      sourceUrl: URL_SHOWER_IDROBRIC_RELAX,
      observedAt: '2026-05-10',
      note:
        'eMAG — Idrobric Relax: micro-duze, presiune/economie apă, filtrare apă (similar marketing turbo)',
    },
    {
      price: 49.61,
      sourceUrl: URL_SHOWER_TOPAQUA_HYDROMIST,
      observedAt: '2026-05-10',
      note:
        'eMAG — Topaqua HydroMist: filtrare, economisire apă, creștere presiune (preț promo din listare)',
    },
  ],
  notes:
    'Preț Elena: 8 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații online (~38 RON); nu am găsit marca exactă de pe cutie — compară cu paras de duș cu filtru / „water saving” / presiune pe eMAG (actualizare 2026-05-10).',
}

const IMG_BREATH_ALCOHOL_BOX = '/images/seed-digital-breath-alcohol-tester.png'

const URL_ETILO_IZOWE =
  'https://www.emag.ro/alcool-tester-digital-cu-display-lcd-etilotest-digital-5-mustiucuri-incluse-plastic-5435345/pd/DGJ430BBM/'
const URL_ETILO_HGGZEG_LED =
  'https://www.emag.ro/etilotest-digital-hggzeg-alcool-tester-digital-display-led-color-functie-de-memorare-calibrare-automata-recunoastere-suflat-fals-acuratete-0-01-bac-analiza-rapida-incarcator-auto-adaptor-20w-acumulato/pd/D8V2MSYBM/'
const URL_ETILO_SIKS_POCKET =
  'https://www.emag.ro/aparat-tester-alcool-de-buzunar-siks-afisaj-lcd-avertizare-sonora-analiza-rapida-etilotest-negru-atcp02/pd/D1RWLVMBM/'

/** Din poză: „DIGITAL BREATH ALCOHOL TESTER” — etilotest compact tip breloc/display LCD (ex. g/l, BAC pe ambalaj). Preț Elena. */
export const SEED_DIGITAL_BREATH_ALCOHOL_TESTER: Product = {
  id: SEED_DIGITAL_BREATH_ALCOHOL_TESTER_ID,
  name: 'Etilotest digital portabil (Digital Breath Alcohol Tester)',
  sku: 'ETILOTEST-DIGITAL-BREATH',
  supplierPriceA: 20,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_BREATH_ALCOHOL_BOX],
  description:
    'Ambalaj cu text „DIGITAL BREATH ALCOHOL TESTER”; imagine: dispozitiv negru tip picătură, mustiuc transparent, breloc; display ilustrat cu valori (ex. 0,3 g/l, 0,03% BAC). Mesaj pe cutie tip „…ive Safely” (drive safely). Alimentare tip baterii (verifică pe etichetă), senzor de suflare — model OEM; precizia legală pentru șoferi se verifică doar la aparate certificate. Distribuție Elena.',
  marketObservations: [
    {
      price: 29.65,
      sourceUrl: URL_ETILO_IZOWE,
      observedAt: '2026-05-10',
      note:
        'eMAG — etilotest digital LCD, 5 mustiucuri (segment entry; preț din listare)',
    },
    {
      price: 49.92,
      sourceUrl: URL_ETILO_HGGZEG_LED,
      observedAt: '2026-05-10',
      note:
        'eMAG — Hggzeg, display LED, funcții memorie / calibrare (preț din listare)',
    },
    {
      price: 68.89,
      sourceUrl: URL_ETILO_SIKS_POCKET,
      observedAt: '2026-05-10',
      note:
        'eMAG — SIKS de buzunar, LCD, avertizare sonoră (apropiat de form factor compact; stoc poate varia)',
    },
  ],
  notes:
    'Preț Elena: 20 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații eMAG (~49 RON) — etiloteste digitale similare; nu același brand ca pe cutia ta. Listări doar ca referință piață (actualizare 2026-05-10).',
}

const IMG_SOLAR_FLAME_LED_BOX = '/images/seed-solar-flame-led-light.png'

const URL_SOLAR_FLAME_RED_MAG_SINGLE =
  'https://red-mag.ro/lampi-solare-gradina/26033-lampa-solara-led-tip-torta-cu-efect-flacara.html'
const URL_SOLAR_FLAME_RETOO_SET8 =
  'https://www.emag.ro/set-8x-lampi-solare-retoo-gardenpro-torta-led-efect-flacara-iluminare-ecologica-infigere-in-sol-ip65-pandela-policristalina-baterie-ni-mh-300mah-autonomie-10-12h-inaltime-41cm-diametru-7-5cm-material-/pd/DWHSQ1YBM/'
const URL_SOLAR_FLAME_ECHO_SET6 =
  'https://www.emag.ro/set-de-6-lampi-solare-pentru-exterior-echo-soulr-rezistente-la-intemperii-autonomie-10-ore-design-cu-flacara-0728633132300/pd/D5R1BFYBM/'

/** Din poză: „Solar Flame LED Light”, senzor lumină, tortă decorativă neagră, efect flacără LED în grădină. Preț Elena. */
export const SEED_SOLAR_FLAME_LED_LIGHT: Product = {
  id: SEED_SOLAR_FLAME_LED_LIGHT_ID,
  name: 'Solar Flame LED Light — lampă solară tip tortă (efect flacără)',
  sku: 'SOLAR-FLAME-LED-TORCH',
  supplierPriceA: 13,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_SOLAR_FLAME_LED_BOX],
  description:
    'Pe ambalaj: „Solar Flame LED Light”; mențiune „Light sensor activated”. Produs tip tortă decorative pentru sol: corp închis cu ornament perforat în zona „becului”, panou solar în partea superioară, țăruș pentru grădină/alei. Lumina imită flacără caldă (leduri secvențiate). Funcționare tipică zi/noapte — încărcare solară ziua, aprindere la amurg (confirmă pe etichetă: IP, înălțime, mAh). Distribuție Elena.',
  marketObservations: [
    {
      price: 60,
      sourceUrl: URL_SOLAR_FLAME_RED_MAG_SINGLE,
      observedAt: '2026-05-10',
      note:
        'Red-mag — 1 buc., tortă LED ~60 cm, IP65, efect flacără (preț din listare)',
    },
    {
      price: 82.49,
      sourceUrl: URL_SOLAR_FLAME_RETOO_SET8,
      observedAt: '2026-05-10',
      note:
        'eMAG — set 8× RETOO GardenPro, tortă LED efect flacără ~41 cm (preț total pachet; ~10,31 RON/buc)',
    },
    {
      price: 98.99,
      sourceUrl: URL_SOLAR_FLAME_ECHO_SET6,
      observedAt: '2026-05-10',
      note:
        'eMAG — set 6× Echo Soul®, design flacără, autonomie ~10 h (preț total pachet; ~16,5 RON/buc)',
    },
  ],
  notes:
    'Preț Elena: 13 RON. Observația 1 = listare 1 bucată (~60 RON). Observațiile 2–3 sunt pachete eMAG — împărțiți la numărul de bucăți pentru comparare cu intrarea ta. Medie simplă a celor 3 prețuri afișate ~80 RON (nu echivalează o singură bucată); pentru 1 buc. folosește ca reper listarea Red-mag sau preț/buc din seturi (actualizare 2026-05-10).',
}

const IMG_HTC1_THERMO_HYGRO_BOX = '/images/seed-htc1-digital-thermometer-hygrometer.png'

const URL_HTC1_EMAG_LCD =
  'https://www.emag.ro/termometru-higrometru-digital-de-camera-display-lcd-mare-afisare-simultana-ora-temperatura-umiditate-montaj-pe-perete-masa-htc-1/pd/D7Q31VMBM/'
const URL_HTC1_EMAG_STATION =
  'https://www.emag.ro/termometru-si-higrometru-de-camera-statie-meteo-temperatura-umiditate-ceas-alarma-valori-minime-maxime-htc-1-htc-1aa/pd/D0YPW1MBM/'
const URL_HTC1_EMAG_ALARM =
  'https://www.emag.ro/termometru-cu-afisarea-temperaturii-si-a-umiditatii-htc-1-functie-alarma-6513/pd/DCKWX3BBM/'

/** Din poză: model HTC-1 — termometru / higrometru digital cu ceas, LCD mare, corp alb, ramă neagră; blister. Preț Elena. */
export const SEED_HTC1_THERMO_HYGROMETER: Product = {
  id: SEED_HTC1_THERMO_HYGROMETER_ID,
  name: 'Termometru & higrometru digital HTC-1 (ceas, LCD)',
  sku: 'HTC-1-THERMO-HYGRO',
  supplierPriceA: 11,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_HTC1_THERMO_HYGRO_BOX],
  description:
    'Model HTC-1 pe carcasă: stație tip „weather desk” — afișaj LCD mare cu ramă neagră, corp alb. Funcții tipice: temperatură (°C/°F), umiditate relativă (%), ceas (AM/PM), uneori alarmă / MIN–MAX (confirmă pe manual). Alimentare tip baterie AA sau AAA (verifică blister). Butoane tip segmente pentru mod / reglaj / memorie. Ambalaj blister cu pictograme apă / termometru. Distribuție Elena.',
  marketObservations: [
    {
      price: 20.33,
      sourceUrl: URL_HTC1_EMAG_LCD,
      observedAt: '2026-05-10',
      note:
        'eMAG — termo-higrometru cameră HTC-1, LCD, oră + temp. + umiditate (preț din listare)',
    },
    {
      price: 19.04,
      sourceUrl: URL_HTC1_EMAG_STATION,
      observedAt: '2026-05-10',
      note:
        'eMAG — statie meteo HTC-1, ceas, alarmă, min/max (preț din listare)',
    },
    {
      price: 23.58,
      sourceUrl: URL_HTC1_EMAG_ALARM,
      observedAt: '2026-05-10',
      note:
        'eMAG — HTC-1, temperatură + umiditate, funcție alarmă (preț din listare)',
    },
  ],
  notes:
    'Preț Elena: 11 RON. Cost folosit = Elena (furnizor A). Preț propus ≈ medie din 3 observații eMAG pentru HTC-1 (~21 RON); vânzători diferiți, același model OEM frecvent (actualizare 2026-05-10).',
}

const IMG_KJ12_HEADSET_BOX = '/images/seed-kj12-wireless-headset.png'

const URL_KJ12_EMAG_MONO_ENTRY =
  'https://www.emag.ro/casca-bluetooth-mrg-ms109-handsfree-dupa-ureche-negru-0717/pd/DXTZXJMBM/'
const URL_KJ12_EMAG_LED_STANDBY =
  'https://www.emag.ro/casca-wireless-yyk530-bluetooth-5-1-edr-compatibila-ios-android-audio-hd-convorbire-12-ore-standby-180-ore-cutie-de-incarcare-afisaj-led-negru-hr-8/pd/DZFHSZMBM/'
const URL_KJ12_EMAG_ROT_LED =
  'https://www.emag.ro/casca-bluetooth-5-3-matcso-by-csm-4u-productsr-single-ear-handsfree-wireless-business-compatibila-ios-android-eliminare-zgomot-control-volum-usb-c-sunet-clar-cutie-de-incarcare-afisaj-led-negru-342005/pd/D7HC29YBM/'

/** Din poză: KJ12 — cască Bluetooth wireless in-ear cu brățară rotativă 180°, Hi-Fi / HD Voice, afișaj LED baterie (ex. „100”), Long standby. Preț Elena (notă pe cutie). */
export const SEED_KJ12_WIRELESS_HEADSET: Product = {
  id: SEED_KJ12_WIRELESS_HEADSET_ID,
  name: 'KJ12 — cască Bluetooth wireless (mono, rotire 180°, LED)',
  sku: 'KJ12-BT-HEADSET',
  supplierPriceA: 15,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_KJ12_HEADSET_BOX],
  description:
    'Pe ambalaj: model KJ12, „Wireless In-ear Rotatable Headphones”; accent „180° Rotation” (potrivire ureche stânga/dreapta). Promo: Hi-Fi Music, HD Voice / microfon handsfree, Long standby. Vizual: cască neagră cu hooks peste ureche, boom tip microfon subțire; corp lateral cu afișaj digital LED (în poză tip nivel baterie „100”). Ambalaj alb cu logo Wireless în chenar albastru. OEM — compatibilitate și codecuri conform manual. Distribuție Elena.',
  marketObservations: [
    {
      price: 25,
      sourceUrl: URL_KJ12_EMAG_MONO_ENTRY,
      observedAt: '2026-05-10',
      note:
        'eMAG — cască Bluetooth mono MRG MS109, handsfree după ureche (segment entry)',
    },
    {
      price: 89,
      sourceUrl: URL_KJ12_EMAG_LED_STANDBY,
      observedAt: '2026-05-10',
      note:
        'eMAG — YYK530: afișaj LED autonomie, standby 180 h, handsfree (foarte apropiat ca mesaje de pe cutie)',
    },
    {
      price: 113.74,
      sourceUrl: URL_KJ12_EMAG_ROT_LED,
      observedAt: '2026-05-10',
      note:
        'eMAG — Matcso single ear, rotație ureche 180°, cutie + LED, Bluetooth 5.3 (preț din listare)',
    },
  ],
  notes:
    'Preț Elena: 15 RON. Nu există listări „KJ12” pe magazinele verificate — observațiile sunt căști Bluetooth mono / business cu hook și (unde e cazul) LED și rotire ureche. Medie din 3 prețuri eMAG ≈ 76 RON (actualizare 2026-05-10); primul punct e reper entry ~25 RON.',
}

const IMG_VEHICLE_BLACKBOX_DVR_BOX = '/images/seed-vehicle-blackbox-dvr.png'

const URL_DVR_EMAG_LOULUNA_FHD =
  'https://www.emag.ro/camera-auto-de-bord-louluna-si-card-de-memorie-32-gb-wifi-aplicatie-android-ios-full-hd-1080p-unghi-inregistrare-170-ecran-lcd-g-sensor-vedere-nocturna-senzor-de-miscare-negru-at22/pd/DT7JJKYBM/'
const URL_DVR_EMAG_NAVITEL_R200 =
  'https://www.emag.ro/camera-auto-dvr-navitel-ecran-2-fhd-30fps-unghi-de-140-grade-g-sensor-auto-inregistrare-evenimente-r200/pd/DBR2CJBBM/'
const URL_DVR_EMAG_70MAI_LITE =
  'https://www.emag.ro/camera-auto-smart-70mai-dash-cam-lite-fov-130-1080p-wdr-g-sensor-sony-imx307-wi-fi-midrive-d08/pd/D26S6WBBM/'

/** Din poză: Vehicle Blackbox DVR — cameră auto Full HD 1080p (1920×1080), ecran TFT 2,4", detecție mișcare, file locking; suport ventuză parbriz. Preț Elena (notă pe cutie). */
export const SEED_VEHICLE_BLACKBOX_DVR: Product = {
  id: SEED_VEHICLE_BLACKBOX_DVR_ID,
  name: 'Vehicle Blackbox DVR — cameră auto Full HD 1080p (2,4" TFT)',
  sku: 'DVR-BLACKBOX-FHD1080',
  supplierPriceA: 35,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_VEHICLE_BLACKBOX_DVR_BOX],
  description:
    'Pe ambalaj: „Vehicle Blackbox DVR” / HD DVR 1920×1080, badge Full HD 1080. Ecran TFT 2,4″ pentru previzualizare și meniu. Pictograme tip file locking (protecție clipuri) și motion detection. Vizual: carcasă neagră tip dashcam cu lentilă proeminentă, montare ventuză pe parbriz (confirmă în pachet: cablu brichetă, card microSD uneori separat). Înregistrare tip buclă + senzor șoc tipic categoriei (G-sensor — verifică manual). OEM fără marcă unică pe piață. Distribuție Elena.',
  marketObservations: [
    {
      price: 219.23,
      sourceUrl: URL_DVR_EMAG_LOULUNA_FHD,
      observedAt: '2026-05-10',
      note:
        'eMAG — Louluna Full HD 1080p, LCD, G-sensor, senzor mișcare, vedere nocturnă (preț din listare)',
    },
    {
      price: 325.37,
      sourceUrl: URL_DVR_EMAG_NAVITEL_R200,
      observedAt: '2026-05-10',
      note:
        'eMAG — Navitel R200, FHD 30 fps, ecran 2″, 140°, G-sensor, înregistrare evenimente (preț din listare)',
    },
    {
      price: 352.36,
      sourceUrl: URL_DVR_EMAG_70MAI_LITE,
      observedAt: '2026-05-10',
      note:
        'eMAG — 70mai Dash Cam Lite, 1080p, ecran LCD 2″, Wi‑Fi, G-sensor, WDR (preț din listare)',
    },
  ],
  notes:
    'Preț Elena: 35 RON. Nu există listări „Vehicle Blackbox DVR” pe eMAG — observațiile sunt camere DVR Full HD cu ecran ~2–2,4″ și funcții apropiate (mișcare / protecție fișiere / G-sensor). Medie din 3 prețuri listare ~299 RON (snapshot JSON „price.current” pe paginile eMAG, 2026-05-10).',
}

const IMG_COSMETIC_BRUSH_BUCKET_BOX = '/images/seed-cosmetic-brush-storage-bucket.png'

const URL_COSMETIC_EMAG_ROT360_TEMU =
  'https://www.emag.ro/organizator-machiaj-rotativ-360-temu-5-compartimente-design-elegant-om1269/pd/DMPZ8WYBM/'
const URL_COSMETIC_EMAG_UNLOSHE_ROT =
  'https://www.emag.ro/suport-rotativ-pentru-pensule-de-machiaj-unloshe-model-cu-romburi-elegant-capac-transparent-compartiment-cu-trei-niveluri-rotativ-in-interior-si-exterior-27x12-3x12-3cm-transparent-urbannestliving153/pd/DK1M783BM/'
const URL_COSMETIC_EMAG_WHITE_LARGE =
  'https://www.emag.ro/organizator-pensule-machiaj-alb-25x12cm-capacitate-mare-gw57942/pd/DZLPWWYBM/'

/** Din poză: organizator cilindric alb pentru pensule/cosmetice, bază rotativă 360°, compartimente interioare; variantă cu capac transparent tip cupolă; model LD-1005-1. Preț Elena (notă pe cutie). */
export const SEED_COSMETIC_BRUSH_STORAGE_BUCKET: Product = {
  id: SEED_COSMETIC_BRUSH_STORAGE_BUCKET_ID,
  name: 'Organizator cosmetic rotativ 360° — bucket pensule (LD-1005-1)',
  sku: 'LD-1005-1-COSMETIC-BUCKET',
  supplierPriceA: 15,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_COSMETIC_BRUSH_BUCKET_BOX],
  description:
    'Cutie cu text tip „360° rotary cosmetic brush storage bucket”; model LD-1005-1 pe ambalaj. Recipient cilindric alb cu separator interioare („partition”) pentru pensule, rujuri, creioane — bază care permite rotirea completă pentru acces rapid. Ilustrare cu și fără capac transparent bombat anti-praf. Util birou machiaj / baie pentru spațiu compact. Distribuție Elena.',
  marketObservations: [
    {
      price: 61.01,
      sourceUrl: URL_COSMETIC_EMAG_ROT360_TEMU,
      observedAt: '2026-05-10',
      note:
        'eMAG — organizator machiaj rotativ 360°, 5 compartimente (preț din listare)',
    },
    {
      price: 73.4,
      sourceUrl: URL_COSMETIC_EMAG_UNLOSHE_ROT,
      observedAt: '2026-05-10',
      note:
        'eMAG — suport rotativ pensule, niveluri multiple, capac transparent (preț din listare)',
    },
    {
      price: 119.89,
      sourceUrl: URL_COSMETIC_EMAG_WHITE_LARGE,
      observedAt: '2026-05-10',
      note:
        'eMAG — organizator pensule alb 25×12 cm, capacitate mare (referință segment organizatoare masă)',
    },
  ],
  notes:
    'Preț Elena: 15 RON. Nu există listări „LD-1005-1” pe eMAG — observațiile sunt organizatoare rotative / pentru pensule din aceeași categorie. Medie din 3 prețuri listare ~85 RON (snapshot JSON „price.current”, 2026-05-10).',
}

const IMG_G63_SOUND_MACHINE_BOX = '/images/seed-g63-smart-light-sound-machine.png'

const URL_G63_EMAG_WAKEUP_RGB72 =
  'https://www.emag.ro/ceas-desteptator-electronic-72-desi-18-tipuri-de-lumini-rgb-cu-intesitate-reglabila-radio-fm-doua-alarme-si-functia-snooze-simuleaza-rasaritul-si-apusul-soarelui-cu-7-sunete-naturale-control-prin-buto/pd/DL3YZDYBM/'
const URL_G63_EMAG_LONGZIMING =
  'https://www.emag.ro/ceas-desteptator-cu-lumina-naturala-longziming-simuleaza-rasaritul-si-apusul-9-tonuri-naturale-12-moduri-de-culoare-20-niveluri-de-luminozitate-cb-240910-1226/pd/DN087LYBM/'
const URL_G63_EMAG_WHITENOISE_BT =
  'https://www.emag.ro/dispozitiv-sunete-hd-si-zgomot-alb-cu-lumini-de-ambientale-desteptator-cu-expresii-pentru-copii-proiectinno-ct-a1-design-modern-redare-muzica-bluetooth-card-sd-cronometru-standby-4-ore-alb-a032/pd/DH58P1YBM/'

/** Din poză: G63 Smart Light Sound Machine — dispozitiv în formă de „G”, LED RGB pe contur, ceas digital, butoane; lampă ambient / sunete pentru relaxare sau trezire. Preț Elena. */
export const SEED_G63_SMART_LIGHT_SOUND_MACHINE: Product = {
  id: SEED_G63_SMART_LIGHT_SOUND_MACHINE_ID,
  name: 'G63 Smart Light Sound Machine (lumină RGB + ceas + sunet)',
  sku: 'G63-SMART-LIGHT-SOUND',
  supplierPriceA: 20,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_G63_SOUND_MACHINE_BOX],
  description:
    'Pe ambalaj: „G63”, „Smart Light Sound Machine”. Vizual: carcasă albă în formă de G cu bandă LED RGB multicoloră pe interiorul curbei; zonă centrală cu afișaj tip ceas (ex. 22:38 în poză) și patru butoane circulare pentru control. Combinație tipică lampă de veghe / ambient cu alarmă sau sunete de fundal (white noise / natură — confirmă pe manual). Alimentare probabil USB sau adaptor (verifică eticheta). OEM fără marcă unică pe piața RO. Distribuție Elena.',
  marketObservations: [
    {
      price: 296,
      sourceUrl: URL_G63_EMAG_WAKEUP_RGB72,
      observedAt: '2026-05-10',
      note:
        'eMAG — ceas LED + lumini RGB, sunete naturale, simulare răsărit/apus, radio FM (segment wake-up light)',
    },
    {
      price: 229.8,
      sourceUrl: URL_G63_EMAG_LONGZIMING,
      observedAt: '2026-05-10',
      note:
        'eMAG — ceas cu lumină naturală, tonuri naturale, moduri culoare (segment similar)',
    },
    {
      price: 134.31,
      sourceUrl: URL_G63_EMAG_WHITENOISE_BT,
      observedAt: '2026-05-10',
      note:
        'eMAG — zgomot alb + lumini ambientale, Bluetooth, desteptator (segment sunet + lumină)',
    },
  ],
  notes:
    'Preț Elena: 20 RON. Nu există listări „G63” pe eMAG — observațiile sunt ceasuri / lampă cu RGB și sunete naturale sau white noise din aceeași categorie. Medie din 3 prețuri listare ~220 RON (snapshot JSON „price.current”, 2026-05-10).',
}

const IMG_MINI_DOORBELL_BOX = '/images/seed-mini-doorbell.png'

const URL_DOORBELL_EMAG_BEDEE_KIT =
  'https://www.emag.ro/sonerie-fara-fir-wireless-cu-monitor-bedeer-sonerie-video-pentru-exterior-clopotel-wireless-ecran-4-3-wifi-captura-imagine-la-imagine-hd-autonomie-mare-apasarea-soneriei-11-2x9x2-cm-negru-6hg3970hhhhh/pd/DBLJPG3BM/'
const URL_DOORBELL_EMAG_XIAOMI_3 =
  'https://www.emag.ro/sonerie-inteligenta-cu-camera-video-xiaomi-smart-doorbell-3-wi-fi-rezolutie-2k-acumulator-5200mah-incarcare-usb-c-79db-bhr5416gl/pd/DQMH4LMBM/'
const URL_DOORBELL_EMAG_NEST_BAT =
  'https://www.emag.ro/videointerfon-google-nest-doorbell-cu-baterii-193575008530/pd/DPWSZSMBM/'

/** Din poză: „MINI DOORBELL” — kit tip sonerie video wireless: unitate exterior cu cameră + buton clopoțel, receptor/clopoțel interior oval cu difuzor (după schițele de pe cutie). Preț Elena (notă pe cutie). */
export const SEED_MINI_DOORBELL: Product = {
  id: SEED_MINI_DOORBELL_ID,
  name: 'Mini Doorbell — sonerie video wireless (exterior + receptor)',
  sku: 'MINI-DOORBELL-WIFI-KIT',
  supplierPriceA: 35,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_MINI_DOORBELL_BOX],
  description:
    'Ambalaj cu titlu „MINI DOORBELL”; schițe line-art: modul pentru ușă cu lentilă cameră și buton cu pictogramă clopoțel; variantă cu grile difuzor; unitate interioară ovală tip clopoțel cu grilă mare (sunet apel). Produs OEM WiFi / RF în funcție de model — verifică pe etichetă: rezoluție, alimentare, Tuya sau aplicație proprie, card SD. Distribuție Elena.',
  marketObservations: [
    {
      price: 209.94,
      sourceUrl: URL_DOORBELL_EMAG_BEDEE_KIT,
      observedAt: '2026-05-10',
      note:
        'eMAG — Bedee sonerie video wireless + monitor interior 4,3″, WiFi, HD (segment kit compact)',
    },
    {
      price: 429.99,
      sourceUrl: URL_DOORBELL_EMAG_XIAOMI_3,
      observedAt: '2026-05-10',
      note:
        'eMAG — Xiaomi Smart Doorbell 3, Wi‑Fi, 2K, acumulator (segment premium cunoscut)',
    },
    {
      price: 1099,
      sourceUrl: URL_DOORBELL_EMAG_NEST_BAT,
      observedAt: '2026-05-10',
      note:
        'eMAG — Google Nest Doorbell cu baterii, Wi‑Fi (referință preț segment premium)',
    },
  ],
  notes:
    'Preț Elena: 35 RON. Nu există listări „Mini Doorbell” generice pe eMAG — observațiile sunt sonerii video WiFi din aceeași categorie (exterior + sunet interior). Medie din 3 prețuri listare ~580 RON (snapshot JSON „price.current”, 2026-05-10).',
}

const IMG_VEGGIE_SLICER_22PCS_BOX = '/images/seed-22pcs-veggie-slicer.png'

const URL_VEG22_EMAG_22PIECE_SET =
  'https://www.emag.ro/razatoare-multifuctionala-22-piese-cuprine-in-set-lame-din-otel-inoxidabil-feliere-radere-taietor-gri-verde-pr159/pd/DTF72M3BM/'
const URL_VEG22_EMAG_TENO_13IN1 =
  'https://www.emag.ro/feliator-de-legume-13-in-1-tenor-multifunctional-8-taieturi-accesorii-pentru-tocat-maruntit-feliat-julienne-separator-de-oua-lame-de-inox-28-x-13-cm-verde-teno752/pd/DM4570YBM/'
const URL_VEG22_EMAG_SET_16IN1 =
  'https://www.emag.ro/set-feliator-legume-multifunctional-16-in-1-abs-otel-inoxidabil-den-scq/pd/DJP2YXYBM/'

/** Din poză: „22 PCS VEGGIE SLICER” / Multifunction Veggie & Fruit Chopper — recipient cu mâner verde, accesorii pentru feliat legume; badge „CORE 6 ADVANTAGES”. Preț Elena. */
export const SEED_VEGGIE_SLICER_22PCS: Product = {
  id: SEED_VEGGIE_SLICER_22PCS_ID,
  name: '22 PCS Veggie Slicer — feliator / tocător legume & fructe',
  sku: 'SLICER-VEGGIE-22PCS',
  supplierPriceA: 35,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_VEGGIE_SLICER_22PCS_BOX],
  description:
    'Ambalaj cu text „22 PCS VEGGIE SLICER”, subtitlu tip „Multifunction Veggie & Fruit Chopper”; mențiuni marketing „CORE 6 ADVANTAGES” (material, design, operare simplă, viteză, timp, funcții). Vizual: bază/container întunecat cu presă sau levier verde și set de lame/inserții pentru felii, julienne, rază etc. (număr exact de piese confirmă manual). Distinct de setul Basel „SLICER-VEG-MULTI” din catalog (alt SKU / alt ambalaj). Distribuție Elena.',
  marketObservations: [
    {
      price: 80,
      sourceUrl: URL_VEG22_EMAG_22PIECE_SET,
      observedAt: '2026-05-10',
      note:
        'eMAG — răzătoare multifuncțională 22 piese, lame inox, gri-verde (potrivire foarte bună cu „22 PCS”)',
    },
    {
      price: 41.29,
      sourceUrl: URL_VEG22_EMAG_TENO_13IN1,
      observedAt: '2026-05-10',
      note:
        'eMAG — feliator legume 13 în 1 Teno, verde, lame inox (segment multifunction chopper)',
    },
    {
      price: 33.28,
      sourceUrl: URL_VEG22_EMAG_SET_16IN1,
      observedAt: '2026-05-10',
      note:
        'eMAG — set feliator 16 în 1 ABS + inox (referință entry în aceeași categorie)',
    },
  ],
  notes:
    'Preț Elena: 35 RON. SKU separat de „SLICER-VEG-MULTI” (tocător Nicer Dicer / Basel din seed). Medie din 3 observații eMAG ~52 RON (snapshot JSON „price.current”, 2026-05-10).',
}

const IMG_GALAXY_NIGHTLIGHT_BOX = '/images/seed-galaxy-nightlight-projector.png'

const URL_GALAXY_EMAG_ASTRONAUT =
  'https://www.emag.ro/proiector-de-stele-astronaut-copii-si-adulti-led-telecomanda-reglare-360o-alb-22-baby-projectors/pd/D83ZWTYBM/'
const URL_GALAXY_EMAG_STARRY_MIRACLE =
  'https://www.emag.ro/proiector-de-stele-techoner-starry-miracle-rgb-multiple-efecte-3-moduri-luminare-telecomanda-negru-led-starry/pd/DX1X503BM/'
const URL_GALAXY_EMAG_LASER_ASTRO =
  'https://www.emag.ro/proiector-laser-astronaut-cu-joc-de-lumini-nebula-si-stele-led-1033/pd/D4SH0WMBM/'

/** Din poză: „GALAXY NIGHTLIGHT PROJECTOR” — corp tip ou de dinozaur fisurat cu lumină roșie în interior, telecomandă albă; funcții pe cutie: galaxie personalizabilă, mod sleep, difuzor integrat. Preț Elena (notă pe cutie). */
export const SEED_GALAXY_NIGHTLIGHT_PROJECTOR: Product = {
  id: SEED_GALAXY_NIGHTLIGHT_PROJECTOR_ID,
  name: 'Galaxy Nightlight Projector — lampă veghe proiector stele/galaxie',
  sku: 'GALAXY-NIGHTLIGHT-PROJECTOR',
  supplierPriceA: 45,
  supplierPriceB: 0,
  costSupplier: 'A',
  salePrice: 0,
  imageUrls: [IMG_GALAXY_NIGHTLIGHT_BOX],
  description:
    'Ambalaj cu titlu „GALAXY NIGHTLIGHT PROJECTOR”; bullet-uri tip „Customizable galaxy”, „Sleep mode”, „Built-in speaker”. Ilustrare: proiector în formă de ou fisurat (aspect dino / coajă), bază mică, strălucire roșie din crăpături; telecomandă compactă pentru culori/moduri. Tip OEM pentru dormitor/copii — rotație, temporizator și redare audio Bluetooth sau jack în funcție de model (verifică manual). Distribuție Elena.',
  marketObservations: [
    {
      price: 33.88,
      sourceUrl: URL_GALAXY_EMAG_ASTRONAUT,
      observedAt: '2026-05-10',
      note:
        'eMAG — proiector stele astronaut LED, telecomandă, reglare 360° (segment entry)',
    },
    {
      price: 39.93,
      sourceUrl: URL_GALAXY_EMAG_STARRY_MIRACLE,
      observedAt: '2026-05-10',
      note:
        'eMAG — Starry Miracle RGB, 3 moduri lumină, telecomandă (segment similar)',
    },
    {
      price: 44.77,
      sourceUrl: URL_GALAXY_EMAG_LASER_ASTRO,
      observedAt: '2026-05-10',
      note:
        'eMAG — proiector laser astronaut, nebulă + stele, LED (preț din listare)',
    },
  ],
  notes:
    'Preț Elena: 45 RON. Nu există listări „Galaxy Nightlight Projector” pe eMAG — observațiile sunt proiectoare stele/galaxie cu telecomandă din aceeași categorie. Medie din 3 prețuri listare ~40 RON (snapshot JSON „price.current”, 2026-05-10).',
}

const IMG_MAGIC_MOP_360 = '/images/seed-magic-mop-360-rotativ.png'
const URL_MAGIC_MOP_CA_ACASA =
  'https://ca-acasa.ro/products/set-mop-magic-rotativ-360-grade-cu-talpa-%C8%99i-cuva-din-inox-4-rezerve-diferite-perie-rosturi-rezerve-incluse'
const URL_MAGIC_MOP_7SOLAR =
  'https://7solar.ro/product/set-mop-magic-rotativ-360-grade-cu-talpa-si-cuva-din-inox-4-rezerve-diferite-perie-rosturi-rezerve-incluse/'
const URL_MAGIC_MOP_VIVENDO =
  'https://vivendo.ro/ro/products/set-mop-rotativ-8-litri-cuva-din-inox-4-rezerve-diferite-perie-rosturi'
const URL_MAGIC_MOP_EMAG_ZANA =
  'https://www.emag.ro/set-mop-rotativ-zana-casei-cuva-din-inox-4-rezerve-diferite-perie-rosturi-covoare-incluse-mop112/pd/D6ZQF4YBM/'
const IMG_MAGIC_MOP_EMAG_ZANA =
  'https://s13emagst.akamaized.net/products/75276/75275839/images/res_4cb1107b27c79bb03d15daa9eab5405d.jpg?width=720&height=720&hash=5A43FC8C928A9CF325DE90FDF135A801'

/** Din poză: set mop rotativ 360°, găleată cu cuvă inox, coadă telescopică, 4 rezerve microfibră + perie rosturi. Preț Basel. */
export const SEED_MAGIC_MOP_360_ROTATIV: Product = {
  id: SEED_MAGIC_MOP_360_ROTATIV_ID,
  name: 'Set mop magic rotativ 360° — cuvă inox, coadă telescopică, 4 rezerve microfibră',
  sku: 'MOP-MAGIC-360-INOX',
  supplierPriceA: 0,
  supplierPriceB: 45,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_MAGIC_MOP_360, IMG_MAGIC_MOP_EMAG_ZANA],
  description:
    'Set complet curățenie: găleată cu compartimente spălare/stoarcere, cuvă centrifugă din inox, mop cu rotație 360°, coadă telescopică reglabilă, 4 rezerve din microfibră lavabile și perie pentru rosturi/covoare (conform ambalajului). Potrivit pentru gresie, parchet, laminat și alte suprafețe interioare. Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 79.99,
      sourceUrl: URL_MAGIC_MOP_CA_ACASA,
      observedAt: '2026-05-12',
      note: 'Ca-Acasa — titlu „Set mop magic rotativ 360 grade”, cuvă inox, 4 rezerve + perie rosturi',
    },
    {
      price: 109,
      sourceUrl: URL_MAGIC_MOP_7SOLAR,
      observedAt: '2026-05-12',
      note: '7Solar — același titlu OEM (SOL-4456), listare 109 lei (redus din 158 lei)',
    },
    {
      price: 85.99,
      sourceUrl: URL_MAGIC_MOP_VIVENDO,
      observedAt: '2026-05-12',
      note:
        'Vivendo — set mop rotativ 8 L, cuvă inox, 4 rezerve + perie rosturi (listare comparabilă)',
    },
    {
      price: 134.93,
      sourceUrl: URL_MAGIC_MOP_EMAG_ZANA,
      observedAt: '2026-05-12',
      note:
        'eMAG — Zana Casei MOP112, set rotativ inox 4 rezerve + perie (segment marketplace)',
    },
  ],
  notes:
    'Preț Basel: 45 RON. Cost folosit = Basel (furnizor B). Medie din primele 3 observații online ~92 RON (2026-05-12); eMAG Zana Casei ~135 RON ca reper marketplace. Prima imagine = fotografie produs (fișier în folderul public).',
}

const IMG_INFLATABLE_POOL_FAMILY = '/images/seed-inflatable-pool-200x120-family.png'
const URL_POOL_GAVE_200X150 =
  'https://gave.ro/index.php?product_id=23878&route=product%2Fproduct'
const URL_POOL_ASMARKET_201X150 =
  'https://www.asmarket.ro/cumpara/piscina-gonflabila-201-x-150-x-51-cm-2-inele-pompa-cadou-2203'
const URL_POOL_BESTWAY_200X146 =
  'https://piscinacopii.ro/produs/piscina-gonflabila-bestway-200-x-146-x-48-cm/'
const URL_POOL_SUPERMAGIC_201X150 =
  'https://supermagic.ro/products/piscina-exterior-gonflabila-xxl-2m-copii'

/** Din poză promo: piscină dreptunghiulară 200×120×40 cm, 2 inele albastru/alb, PVC, familie. Preț Basel. */
export const SEED_INFLATABLE_POOL_FAMILY: Product = {
  id: SEED_INFLATABLE_POOL_FAMILY_ID,
  name: 'Piscină gonflabilă 200×120×40 cm — 2 inele, familie',
  sku: 'POOL-GONFL-200X120-BASEL',
  supplierPriceA: 0,
  supplierPriceB: 55,
  costSupplier: 'B',
  salePrice: 0,
  imageUrls: [IMG_INFLATABLE_POOL_FAMILY],
  description:
    'Piscină gonflabilă dreptunghiulară pentru grădină sau curte: 200×120×40 cm (≈2 m × 1,2 m × 40 cm), 2 inele gonflabile albastru/alb, margini moi, material PVC rezistent. Ușor de umflat, golit și depozitat; potrivită pentru copii și adulți în aer liber (supraveghere adultă). Furnizor achiziție: Basel.',
  marketObservations: [
    {
      price: 132,
      sourceUrl: URL_POOL_GAVE_200X150,
      observedAt: '2026-05-12',
      note:
        'Gave — piscină dreptunghiulară 200×150×50 cm, PVC, familie (dimensiune apropiată)',
    },
    {
      price: 139,
      sourceUrl: URL_POOL_ASMARKET_201X150,
      observedAt: '2026-05-12',
      note:
        'ASMarket — 201×150×51 cm, 2 inele, vinil 0,28 mm, pompă umflare cadou',
    },
    {
      price: 149.99,
      sourceUrl: URL_POOL_BESTWAY_200X146,
      observedAt: '2026-05-12',
      note:
        'PiscinaCopii.ro → Noriel — Bestway 200×146×48 cm, 2 inele, robinet scurgere',
    },
    {
      price: 199.99,
      sourceUrl: URL_POOL_SUPERMAGIC_201X150,
      observedAt: '2026-05-12',
      note:
        'SuperMagic — piscină exterior 201×150×51 cm, capacitate ~400 L (listare comparabilă)',
    },
  ],
  notes:
    'Preț Basel: 55 RON. Cost folosit = Basel (furnizor B). Medie din primele 3 observații online ~140 RON (2026-05-12); SuperMagic ~200 RON ca reper listare promo. Prima imagine = grafică produs (fișier în folderul public).',
}

const SEED_PRODUCTS: readonly Product[] = [
  SEED_SONYMAX_SN8004S,
  SEED_H2O_HUMIDIFIER,
  SEED_NASAL_DILATOR,
  SEED_SOLAR_WALL_LED,
  SEED_INSTANT_EWH_FAUCET,
  SEED_KEY_PET_COMB,
  SEED_VINTAGE_T9_CLIPPER,
  SEED_ELECTRIC_GRINDER,
  SEED_HANDHELD_CONSOLE,
  SEED_ACTION_CAM_4K,
  SEED_KARAOKE_SPEAKER_SET,
  SEED_X18_VIDEO_GAME,
  SEED_VACUUM_SEALER,
  SEED_VEG_SLICER_CHOPPER,
  SEED_ULTRASONIC_AROMA_HUMIDIFIER,
  SEED_SPIRAL_POTATO_SLICER,
  SEED_JORTAN_JT8161,
  SEED_HELFERHOFF_CHERRY_OLIVE_CORER,
  SEED_ICE_BUCKET_BT_SPEAKER,
  SEED_XTREEME4_SPEAKER,
  SEED_SHOWER_TURBO_WATER_SAVE,
  SEED_DIGITAL_BREATH_ALCOHOL_TESTER,
  SEED_SOLAR_FLAME_LED_LIGHT,
  SEED_HTC1_THERMO_HYGROMETER,
  SEED_KJ12_WIRELESS_HEADSET,
  SEED_VEHICLE_BLACKBOX_DVR,
  SEED_COSMETIC_BRUSH_STORAGE_BUCKET,
  SEED_G63_SMART_LIGHT_SOUND_MACHINE,
  SEED_MINI_DOORBELL,
  SEED_VEGGIE_SLICER_22PCS,
  SEED_GALAXY_NIGHTLIGHT_PROJECTOR,
  SEED_MAGIC_MOP_360_ROTATIV,
  SEED_INFLATABLE_POOL_FAMILY,
]

/**
 * Completează din seed: produs nou dacă SKU-ul lipsește; dacă SKU-ul există deja, combină (preț Elena/Basel
 * lipsă, imagini suplimentare) fără a duplica rândul — astfel poți adăuga ulterior prețul Basel la același SKU.
 */
function mergeSeedIntoExisting(existing: Product, seed: Product): Product {
  const supplierPriceA =
    existing.supplierPriceA > 0 ? existing.supplierPriceA : seed.supplierPriceA
  const supplierPriceB =
    existing.supplierPriceB > 0 ? existing.supplierPriceB : seed.supplierPriceB

  const seen = new Set<string>()
  const mergedUrls: string[] = []
  for (const u of [...existing.imageUrls, ...seed.imageUrls]) {
    const t = u.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    mergedUrls.push(t)
  }

  const moExisting = existing.marketObservations?.length ?? 0
  const moSeed = seed.marketObservations?.length ?? 0

  return {
    ...existing,
    supplierPriceA,
    supplierPriceB,
    /** Inventarul vine doar din datele tale (localStorage); seed-ul nu îl suprascrie. */
    stockQty:
      typeof existing.stockQty === 'number' ? existing.stockQty : 0,
    imageUrls: clampImageUrls(mergedUrls),
    marketObservations:
      moExisting > 0
        ? existing.marketObservations
        : moSeed > 0
          ? seed.marketObservations
          : existing.marketObservations,
    description: existing.description?.trim() || seed.description,
    notes: existing.notes?.trim() || seed.notes,
  }
}

export function mergeSeedProducts(existing: Product[]): Product[] {
  try {
    localStorage.removeItem(LEGACY_SEED_FLAG_KEY)
  } catch {
    /* ignore */
  }

  const skuToIndex = new Map<string, number>()
  const next = [...existing]
  for (let i = 0; i < next.length; i++) {
    const sku = next[i].sku?.trim().toUpperCase()
    if (sku) skuToIndex.set(sku, i)
  }

  let changed = false
  for (const seed of SEED_PRODUCTS) {
    const sku = seed.sku?.trim().toUpperCase()
    if (!sku) continue

    const idx = skuToIndex.get(sku)
    if (idx !== undefined) {
      next[idx] = mergeSeedIntoExisting(next[idx], seed)
      changed = true
      continue
    }

    next.push({ ...seed })
    skuToIndex.set(sku, next.length - 1)
    changed = true
  }

  return changed ? next : existing
}
