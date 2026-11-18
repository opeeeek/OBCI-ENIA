# ObciążeniaEC – zestawienie obciążeń wg Eurokodów (PL)

Program do kompletnego zestawiania obciążeń konstrukcji budowlanych w Polsce – wg PN-EN 1990 i PN-EN 1991-1-1, -1-3, -1-4, -1-5, -1-6 z Załącznikami krajowymi. Wygląd i sposób pracy jak w **BelkaŻB** (ciemny pasek narzędzi, zakładki, dane po lewej – wyniki, schematy i tok obliczeń po prawej, klikane odwołania do punktów normy, raport), zakres obliczeń rozszerzony względem **ObciążeniaEC1**.

## Uruchomienie

| Plik | Opis |
|---|---|
| `dist/ObciazeniaEC.exe` | wersja dla Windows 10/11 (WebView2, jak BelkaŻB). Dane robocze: `%AppData%\ObciazeniaEC`. |
| `dist/ObciazeniaEC.html` | ten sam program jako jeden plik – otwórz w Edge/Chrome/Firefox (działa offline). |
| `src/index.html` | wersja źródłowa (moduły w `src/js/`). |

Budowanie: `node build.js` (HTML) lub `./build-desktop.sh` (HTML + EXE, wymaga Go). Testy: `npm test`.

## Zakres

* **Projekt i lokalizacja** – wyszukiwarka ~950 miast (z wysokością n.p.m.) i ~2470 gmin, mapa stref śniegowych i wiatrowych z pasami przejściowymi (klik na mapie → strefy, opcjonalnie wysokość z internetu), współczynniki γ, ξ, K_FI (RC1–RC3), EQU, edytowalne ψ, **kreator** tworzący pełne zestawienie typowego budynku.
* **G – stałe** – układy warstw z bazą **283 materiałów** (PN-EN 1991-1-1 zał. A tabl. A.1–A.12, gęstości śniegu zał. E, dane orientacyjne producentów: mury, izolacje, pokrycia, stropy systemowe, ścianki, fasady, sufity, instalacje, materiały składowane z kątem zsypu), tryby: γ·t, ciężar powierzchniowy, elementy w rozstawie γ·b·h/a (krokwie, legary); elementy liniowe (γ·A, ściana g·H·(1−ω), wartość); przeliczenie na rzut połaci; materiały własne.
* **Q – użytkowe** – kategorie A–I (tabl. 6.2, 6.4, 6.8, 6.10) z zakresami, redukcje α_A i α_n, ścianki działowe (6.3.1.2(8)), bariery (tabl. 6.12), wózki widłowe FL1–FL6 (φ, siły poziome), składowanie (γ·h), obciążenia montażowe przy betonowaniu (PN-EN 1991-1-6, tabl. 4.2), inne z własnym ψ.
* **S – śnieg** – s_k wg ZK (strefy 1–5, pas przejściowy: średnia/większa/ręcznie), C_e, C_t; dachy jedno-, dwu-, wielospadowe (kosz), walcowe, przy wyższej budowli (μ_w, μ_s), zaspy przy attykach, nawisy, bariery przeciwśnieżne.
* **W – wiatr** – v_b,0 wg ZK (strefy 1–3, wysokość, pas przejściowy), q_p wg ZK tabl. NA.3 **lub** wzorów ogólnych CEN (c_o, k_I, ρ) **lub** ręcznie + tabela porównawcza; ściany (strefy A–E, profil dla h > b, brak korelacji), dachy płaskie (attyka, zaokrąglenie, mansarda), jedno-, dwu-, czterospadowe, wiaty jedno- i dwuspadowe (φ), ściany wolnostojące i attyki, tablice, siły z c_f, tarcie; c_pe,1…c_pe,10, c_pi (standard, ściana dominująca, μ, ręcznie). **Interaktywny schemat**: rzut budynku z wymiarami (L, B, b, d, e) i łańcuchami wymiarów stref, przekrój/elewacje, barwy wg ciśnienia; przełącznik normowych kierunków wiatru θ = 0°/90° (dla dachu jednospadowego także 180°) – wyniki i tabela stref aktualizują się od razu; kliknięcie strefy pokazuje c_pe,10/c_pe,1, w_e, w_i, w_net, w_d i pole strefy; okno powiększenia.
* **T – termiczne** – elementy budynków (tabl. 5.1–5.3, także w gruncie), pomosty typu 1–3 (rys. 6.1, tabl. 6.1–6.2, ω_N, ω_M), dowolne ΔT; wydłużenia, krzywizna, naprężenia przy skrępowaniu.
* **Σ – zestawienia i kombinacje** – dla elementu (strop, dach, krokiew, ściana): bez przeliczeń, na rzut poziomy lub składowe ⟂/∥ do połaci; na m² albo na m bieżący (pasmo b); wszystkie kombinacje SGN (6.10 lub 6.10a/b), SGU (charakterystyczna, częsta, quasi-stała), odrywanie STR i EQU; kat. H nie łączy się ze śniegiem i wiatrem; obciążenia użytkowe sumowane jako jedno oddziaływanie, przypadki S/W jako alternatywy.
* **Podsumowanie, raport** (druk/PDF, HTML, CSV), zapis/odczyt projektu (`.obc`), autozapis, tryb ciemny, skróty klawiszowe.

Każda wartość wynikowa ma tok obliczeń ze wzorem, podstawieniem i odwołaniem do normy (kliknięcie → streszczenie punktu normy). Każdy parametr można zmienić ręcznie.

## Porównanie z eurocodeapplied.com

Zob. [docs/POROWNANIE_eurocodeapplied.md](docs/POROWNANIE_eurocodeapplied.md) – główna różnica to metoda q_p (ZK tabl. NA.3 vs wzory CEN): dla kat. terenu III/IV i małych wysokości ZK daje do +28%.

## Źródła danych

Mapy stref i baza miejscowości – z programu ObciążeniaEC1 (granice wg map ZK do PN-EN 1991-1-3 i 1991-1-4, PRG 2025, Copernicus DEM). Objaśnienia punktów norm to streszczenia własne – nie zastępują tekstu norm.
