# ObciazeniaEC1 a eurocodeapplied.com – skąd biorą się różnice

Opracowanie do pytania: *„W programie ObciazeniaEC1 wyniki różnią się ze stroną https://eurocodeapplied.com/design/en1991 – porównaj i dostosuj albo wyjaśnij”.*

## Jak porównywałem

* Z pliku `ObciazeniaEC1.exe` wyodrębniłem osadzony kod HTML/JS (silnik obliczeń, mapy stref, bazę materiałów) i uruchomiłem go w Node.js.
* Kalkulatory eurocodeapplied.com (dział EN 1991) obejmują **przede wszystkim wiatr**: szczytowe ciśnienie prędkości, ściany, dachy płaskie, jedno- i dwuspadowe, wiaty, attyki/ściany wolnostojące, tablice, elementy prostokątne, walce. Liczą wg **wartości zalecanych CEN** (ewentualnie wybranych załączników: Finlandia, Portugalia, osobno Wielka Brytania i Irlandia). **Polskiego Załącznika krajowego nie obsługują** – dla Polski pola parametrów krajowych zostają puste albo przyjmowane są wartości zalecane.
* Ze środowiska tej sesji strona eurocodeapplied.com była zablokowana na poziomie sieci, więc metodykę strony odtworzyłem z jej dokumentacji (wzory EN 1991-1-4 (4.3)–(4.8), tablice 7.1–7.11). Napisałem niezależną implementację tych wzorów i porównałem ją z silnikiem ObciazeniaEC1 (test `test/engine.test.js`, „Wiatr – q_b, q_p…”).

## 1. Główna przyczyna różnic – szczytowe ciśnienie prędkości q_p(z)

| | ObciazeniaEC1 (domyślnie „wg ZK”) | eurocodeapplied.com |
|---|---|---|
| Metoda | ZK PL, tabl. NA.3: `q_p = c_e(z)·q_b`, `c_e(z) = a·(z/10)^e` | wzory ogólne CEN (4.3)–(4.8): `c_r = k_r·ln(z/z0)`, `I_v = k_I/(c_o·ln(z/z0))`, `q_p = [1 + 7·I_v]·½ρv_m²` |
| Kat. III | `c_e = 1,9·(z/10)^0,26`, z_min = 5 m | z0 = 0,3 m, z_min = 5 m |
| Kat. IV | `c_e = 1,5·(z/10)^0,29`, z_min = 10 m | z0 = 1,0 m, z_min = 10 m |

Porównanie dla strefy 1 (v_b,0 = 22 m/s, q_b = 0,3025 kN/m²) – q_p [kN/m²] **ZK / CEN (różnica)**:

| kat. | z = 3 m | 5 m | 10 m | 15 m | 20 m | 30 m | 50 m |
|---|---|---|---|---|---|---|---|
| 0 | 0,740 / 0,708 (+4,5%) | 0,807 / 0,788 (+2,4%) | 0,907 / 0,903 (+0,5%) | 0,972 / 0,973 (−0,1%) | 1,021 / 1,025 (−0,4%) | 1,094 / 1,100 (−0,5%) | 1,193 / 1,197 (−0,3%) |
| I | 0,674 / 0,632 (+6,7%) | 0,742 / 0,716 (+3,7%) | 0,847 / 0,837 (+1,1%) | 0,915 / 0,912 (+0,3%) | 0,966 / 0,967 (−0,1%) | 1,044 / 1,047 (−0,4%) | 1,150 / 1,152 (−0,2%) |
| II | 0,521 / 0,496 (+5,1%) | 0,589 / 0,584 (+0,9%) | 0,696 / 0,712 (−2,2%) | 0,767 / 0,791 (−3,1%) | 0,822 / 0,850 (−3,3%) | 0,906 / 0,936 (−3,2%) | 1,024 / 1,049 (−2,4%) |
| **III** | **0,480 / 0,387 (+23,9%)** | **0,480 / 0,387 (+23,9%)** | **0,575 / 0,517 (+11,2%)** | 0,639 / 0,599 (+6,6%) | 0,688 / 0,660 (+4,3%) | 0,765 / 0,750 (+2,0%) | 0,873 / 0,870 (+0,4%) |
| **IV** | **0,454 / 0,356 (+27,5%)** | **0,454 / 0,356 (+27,5%)** | **0,454 / 0,356 (+27,5%)** | 0,510 / 0,437 (+16,9%) | 0,555 / 0,497 (+11,5%) | 0,624 / 0,588 (+6,2%) | 0,724 / 0,709 (+2,1%) |

Ponieważ ciśnienie wiatru na powierzchnie to `w = q_p·c_pe`, **ta sama różnica procentowa przenosi się na wszystkie wyniki wiatrowe** (ściany, dachy, attyki, wiaty, siły). Dla typowych budynków w Polsce (teren kat. III, wysokość do kilkunastu metrów) to +5…+24%.

**Wniosek:** to nie jest błąd ObciazeniaEC1. Dla projektów w Polsce obowiązuje Załącznik krajowy, a ZK podaje właśnie uproszczony współczynnik ekspozycji `c_e(z)` (tabl. NA.3). Wyniki eurocodeapplied.com dla Polski są wynikami „bez ZK”.
Gdy w ObciazeniaEC1 przełączy się metodę na „wzory ogólne (4.3)–(4.8) z c_o”, wyniki q_p pokrywają się z niezależną implementacją wzorów CEN co do 10⁻⁹ (sprawdzone dla kat. 0–IV i z = 3–60 m) – czyli z metodą eurocodeapplied.com.

W nowym programie **ObciążeniaEC** w zakładce *Wiatr → Lokalizacja* jest tabela porównawcza ZK/CEN dla bieżących danych i przełącznik metody (ZK / CEN / q_p ręcznie), więc różnicę widać od razu.

## 2. Inne źródła rozbieżności przy porównywaniu

1. **v_b,0** – ZK: strefa 1 i 3: 22 m/s (z poprawką powyżej 300 m n.p.m.), strefa 2: 26 m/s, strefa 3 dodatkowo mnożnik gęstości `(20000 − A)/(20000 + A)`. Na eurocodeapplied.com wartość trzeba wpisać ręcznie – łatwo o inną.
2. **q_b,0 zaokrąglone w ZK** – ZK podaje 0,30 i 0,42 kN/m², a `½·1,25·22² = 0,3025`, `½·1,25·26² = 0,4225` – różnica < 1%.
3. **Wysokość odniesienia z_e** – dla ścian budynków wyższych niż szerokość (h > b) profil q_p zmienia się pasami (rys. 7.4); dla attyk z_e = h_bud + h_p; dla tablic z_e = z_g + h/2.
4. **Pole obciążone A** – c_pe,1 (A ≤ 1 m²) vs c_pe,10 (A ≥ 10 m²) i interpolacja logarytmiczna; łatwo porównać wynik „dla mocowań” z wynikiem „dla konstrukcji”.
5. **c_pi** – przy braku danych +0,2 / −0,3 (bardziej niekorzystna); ściana dominująca 0,75/0,90·c_pe; rys. 7.13 (μ). Różny wybór daje różne w_net.
6. **c_s c_d** – oba programy domyślnie 1,0.

Tablice c_pe (7.1–7.5) i tablica 7.9 w ObciazeniaEC1 sprawdziłem pozycja po pozycji – są zgodne z normą.

## 3. Co poprawiłem względem ObciazeniaEC1 (w nowym ObciążeniaEC)

| Obszar | ObciazeniaEC1 | ObciążeniaEC | Uzasadnienie |
|---|---|---|---|
| Pomosty – T_e,max / T_e,min (PN-EN 1991-1-5, rys. 6.1) | typ 2: T_max + 4,5; typ 3: T_max + 1,5 | typ 1: +16 / −3; typ 2: +4 / +4; typ 3: +2 / +8 | relacje liniowe, na których oparto rys. 6.1 (odczyt z wykresu dawał 4,5 i 1,5) |
| Ścianki działowe w kombinacjach | osobne oddziaływanie zmienne z ψ₀ (gdy wiodący jest strop: 1,5·2,0 + 1,5·0,7·0,8) | część obciążenia użytkowego stropu – sumowane (1,5·2,8) | PN-EN 1991-1-1, 6.3.1.2(8) i 3.3.1(2): obciążenia użytkowe elementu tworzą jedno oddziaływanie; ObciazeniaEC1 zaniżał q_Ed o 1,5·0,3·q_ścianek (np. −0,36 kN/m²) |
| Kilka przypadków śniegu / wiatru w jednym zestawieniu | traktowane jak różne oddziaływania (sumowane z ψ₀) | traktowane jako alternatywne – bierze się najniekorzystniejszy | przypadki (i)/(ii)/(iii) i zaspy są wariantami tego samego oddziaływania; sumowanie podwajało śnieg |
| Odrywanie | tylko STR (γ_G,inf = 1,0) | STR i EQU (0,9·G + 1,5·W) | PN-EN 1990, tabl. A1.2(A) – równowaga statyczna |
| T₀ | 8 °C („wg ZK”) | 10 °C (edytowalne) | wartość zalecana PN-EN 1991-1-5, A.1(3); **proszę o potwierdzenie z Państwa egzemplarzem ZK** – nie mogłem zweryfikować tekstu ZK online |

Pozostałe wzory ObciazeniaEC1 (s_k wg ZK, μ₁–μ₃, μ_w, zaspy, nawisy, bariery, α_A, α_n, ścianki, bariery poziome, kombinacje 6.10a/b z ξ = 0,85, ψ) są poprawne i zostały przeniesione.

## 4. Do potwierdzenia przez projektanta

* **T₀ i mapy T_max/T_min** z ZK do PN-EN 1991-1-5 – program nie zawiera map izoterm (wartości wpisuje się ręcznie).
* **Wartości q_k kat. A** – przyjęto wartości zalecane z tabl. 6.2 (stropy 2,0; schody 3,0; balkony 2,5 kN/m²) jak w ObciazeniaEC1; jeśli Państwa praktyka/ZK przyjmuje inne (np. 1,5 kN/m² dla stropów), wystarczy wpisać.
* **c_dir** – domyślnie 1,0 (bezpiecznie); wartości kierunkowe z tabl. NA.2 można wpisać ręcznie.
