# FP Flow in Google Play — stappenlijst

Vink af wat klaar is. ✋ = jij (account, betaling, beslissing). 🤖 = Claude.

## 1. Voorbereiding
- [ ] ✋ **Render op Starter** (±$7/mnd): dashboard.render.com → fp-exercise → Settings → Instance Type → *Starter*. Anders valt de app in slaap en opent hij traag.
- [x] ✋ **Domein gekoppeld**: `app.fpflow.nl` is geverifieerd door Render en heeft een HTTPS-certificaat. `APP_ORIGIN=https://app.fpflow.nl` is ingesteld.
- [ ] ✋ **Privacyverklaring afmaken** op `/privacy`: de stukken tussen [vierkante haken] (bewaartermijnen, contactgegevens, klachtrecht AP). Google keurt een onvolledige verklaring af. Claude kan de tekst aanpassen zodra jij de gegevens geeft.
- [x] 🤖 Pakketnaam `nl.fpflow.app`, manifest, winkelteksten (`LISTING.md`), formulieranswoorden (`FORMS.md`), testaccount-instructie (`REVIEW.md`).

## 2. Google Play-account
- [ ] ✋ play.google.com/console → ontwikkelaarsaccount ($25 eenmalig). **Organisatie** als je een KvK + D-U-N-S-nummer hebt; bij een **persoonlijk** account eerst 14 dagen een gesloten test met minstens 12 testers.
- [ ] ✋ Identiteit laten verifiëren (een paar dagen).

## 3. Android-pakket maken met PWABuilder
1. ✋ Ga naar **pwabuilder.com**, vul in: `https://app.fpflow.nl/p` → *Start*.
2. ✋ *Package for stores* → **Android** → *Generate Package* → *Options*, en vul in:

   | Veld | Waarde |
   |---|---|
   | Package ID | `nl.fpflow.app` |
   | App name | `FP Flow` |
   | Launcher name | `FP Flow` |
   | App version / version code | `1.0.0` / `1` |
   | Host | `app.fpflow.nl` |
   | Start URL | `/p` |
   | Theme color / Background color | `#29483C` / `#F7F9F7` |
   | Display mode | Standalone |
   | Notification delegation | Aan |
   | Location delegation / Google Play billing | Uit |
   | Signing key | **Create new** (vul je eigen naam/organisatie in) |
3. ✋ *Download* → je krijgt een zip met o.a. `app-release-bundle.aab`, `signing.keystore` en `signing-key-info.txt`.
   **Bewaar de keystore en het wachtwoordbestand veilig (bijv. in een wachtwoordmanager). Kwijt = nooit meer een update kunnen uploaden. Stuur ze nooit naar Claude of in een chat.**

## 4. App in Play Console
- [ ] ✋ *App maken*: naam FP Flow, standaardtaal Nederlands, App (geen game), Gratis.
- [ ] ✋ *Testen → Interne test* → nieuwe release → upload `app-release-bundle.aab` → *Play App Signing* accepteren.
- [ ] ✋ *Instellingen → App-integriteit → App-ondertekening*: kopieer de **SHA-256** van het *certificaat van de app-ondertekeningssleutel* en geef die aan Claude.
- [ ] 🤖 Claude zet in Render `ANDROID_PACKAGE_NAME=nl.fpflow.app` en `ANDROID_CERT_SHA256=<die waarde>` (met jouw akkoord), en controleert `/.well-known/assetlinks.json`. Daarna verdwijnt de adresbalk in de app.
- [ ] ✋ Voeg jezelf (en eventueel collega's) toe als interne testers en installeer de app via de testlink.

## 5. Winkelvermelding en formulieren
- [ ] ✋ Teksten uit `LISTING.md` plakken (NL en EN).
- [ ] ✋ Icoon en feature graphic uit `android/store/`.
- [ ] ✋ Formulieren invullen met `FORMS.md` (gegevensveiligheid, gezondheidsapp, doelgroep, contentclassificatie, advertenties, app-toegang).
- [ ] ✋ Testaccount maken en invullen volgens `REVIEW.md`.

## 6. Schermafbeeldingen (op je eigen telefoon)
Maak op je Android-telefoon (aan/uit + volume omlaag) 4 tot 8 schermafbeeldingen in de app, met een **demo-account** (geen echte patiënt):
1. Vandaag (training van vandaag + held)
2. Een oefening tijdens de training (video + timer)
3. Held met de baas van de week
4. Inventaris/winkel met je held in een outfit
5. Krachtlog met 1RM
6. Mobiliteit met de programma's om zelf te starten
7. Voortgang
8. Instellingen (privacy, delen)

## 7. Live
- [ ] ✋ Interne test → (bij persoonlijk account: gesloten test 14 dagen, 12 testers) → *Productie* → *Release ter beoordeling sturen*. Beoordeling duurt meestal een paar dagen.

Daarna: elke "zet live" komt automatisch in de app. Een nieuwe AAB is alleen nodig bij een nieuw icoon, nieuwe naam of nieuw domein.
