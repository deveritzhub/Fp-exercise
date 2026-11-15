# Echte app met Google Health Connect en Apple Health

Besluit eigenaar (15 nov 2026): er komt een echte app voor Android en iPhone die koppelt met Health
Connect en Apple Health. Gezondheidsgegevens gaan daarbij (met toestemming van de patiënt) van en naar
Google en Apple.

## Waarom de huidige Android-app niet volstaat
De app in `android/` is een Trusted Web Activity: een schil die de website toont. Die kan niet bij
Health Connect. Er is een app nodig met een eigen (native) laag.

## Opzet
- **Eén project (Capacitor)** voor Android en iPhone. De schermen blijven van de website komen
  (`app.fpflow.nl`), dus een update van de site staat meteen in de app. Pakketnaam blijft `nl.fpflow.app`.
- **Brug**: de app zet `window.FPHealth` in de pagina. De website gebruikt die brug al:
  `web/src/lib/heartRate.ts` (live hartslag). Zonder app werkt dezelfde code via Bluetooth in Chrome.
- **Lezen** uit Health: hartslag (live tijdens de training en achteraf), stappen, trainingen.
- **Schrijven** naar Health: een afgeronde FP Flow-training (soort, duur, gemiddelde hartslag).
- **Toestemming** per soort gegevens, door de patiënt, in het systeemscherm van Android/iOS; intrekken
  kan daar en in de app. Zonder toestemming werkt de app gewoon, zonder koppeling.
- **Opslag**: alleen samenvattingen (`session_heart_rates`, stappen per dag), privé voor de patiënt.

## Stappen
1. [x] Live hartslag in de web-app + opslag per training (15 nov).
2. [ ] Capacitor-project met de brug; Android-build in GitHub Actions (vervangt de TWA-workflow).
3. [ ] Health Connect: hartslag, stappen en trainingen lezen; training schrijven.
4. [ ] iPhone-project + HealthKit; build op een macOS-runner. Vereist het Apple Developer-account.
5. [ ] Inloggen met Google/Apple in de app via de systeembrowser (Google staat inloggen in een
      ingebouwde webweergave niet toe).
6. [ ] Privacyverklaring (`/privacy`) aanvullen: welke gegevens, van/naar Google en Apple, intrekken.
7. [ ] Winkels: Play "Health apps"-verklaring en Health Connect-rechten onderbouwen; App Store
      privacylabels en teksten voor HealthKit-toestemming. Testaccount: synthetische demopatiënt.

## Wat de eigenaar zelf regelt
- Apple Developer Program (€99 per jaar), bij voorkeur op naam van de praktijk (D-U-N-S-nummer).
- Google Play-ontwikkelaarsaccount (eenmalig $25), zie `docs/ANDROID.md`.
- Sleutels en certificaten als GitHub-secrets; nooit in de repository of in de chat.

## Risico's
- Apple keurt apps af die alleen een website tonen; de Health-koppeling en de live hartslag zijn de
  eigen functies waarmee de app daaraan voldoet. Goedkeuring is niet gegarandeerd.
- De iPhone-app kan alleen op een Mac(-runner) gebouwd en op een echt toestel getest worden.
