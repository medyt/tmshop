# Format descriere landing (`.lpd`)

Descrierea produsului rămâne HTML în coloana `products.description`, dar folosește
doar clasele de mai jos, fără `style` inline. Stilurile sunt în `src/pages/ShopLanding.css`.
Model complet: `content/A024.html`.

Public: clienți în vârstă, pe telefon. Cuvinte simple, propoziții scurte, fără jargon.

## Structură (în această ordine)

1. `div.lpd-hook` — `h2` (max. 10 cuvinte, beneficiul principal) + un `p` (max. 25 de cuvinte).
2. Câte un `div.lpd-feature` pentru FIECARE poză din descrierea originală, în ordinea originală:
   `img` (src `/shoptop-api/uploads/landing/<ID>-<n>.webp`, `alt` descriptiv, `width`/`height`, `loading="lazy"`)
   + `div.lpd-feature__body` cu `h3` (max. 7 cuvinte) și `ul` cu 2–3 `li` (max. 10 cuvinte fiecare).
   Beneficiile trebuie să fie legate de ce arată poza (vezi textul `alt` original și textul din jurul pozei).
3. `div.lpd-steps` — `h3` „Cum îl folosești” / „Cum o folosești” + `ol` cu max. 3 pași. Se omite dacă nu are sens.
4. `div.lpd-box` — `h3` „Ce primești în colet” + `ul`. La ofertele 1+1 / 2+2 scrie clar câte bucăți vin în colet.
5. `details.lpd-more` + `summary` „Specificații tehnice” + `table` cu rânduri `th`/`td`. Doar date din original.
6. `details.lpd-more` + `summary` „Întrebări frecvente” — 2–3 perechi `h4` + `p`. Ultima este mereu:
   „Cum plătesc?” → „La curier, când primești coletul, sau online cu cardul.”

## Reguli de conținut

- Română cu diacritice corecte. Adresare cu „tu”. Fără emoji (iconițele vin din CSS).
- Text vizibil (fără `details`) de cel mult ~130 de cuvinte.
- Doar fapte din descrierea originală. Nu inventa cifre, materiale, puteri, garanții, certificări.
- Fără presiune falsă: nu „stoc limitat”, „doar azi”, „ultimele bucăți”, „grăbește-te”, numărători.
- Fără promisiuni medicale sau absolute. „Elimină 100%” → „ajută la reducerea…”. Fără „vindecă”, „tratează”.
- Fără prețuri, reduceri sau termene de livrare în descriere (se afișează separat pe pagină).
- Fără `style`, fără alte clase, fără `<script>`, fără linkuri externe.
