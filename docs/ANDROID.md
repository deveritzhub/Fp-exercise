# FP Exercise in Google Play (Android)

De Android-app is een **Trusted Web Activity (TWA)**: een Android-schil die de FP Exercise-webapp
schermvullend opent (zonder adresbalk), met eigen icoon, opstartscherm en kleuren. Alle schermen en
functies komen van de website, dus **elke update die live gaat staat meteen in de app**. Een nieuwe
versie in de Play Store is alleen nodig als de schil verandert (naam, icoon, kleuren, webadres,
Android-instellingen).

- Project: `android/` (standaard Android Browser Helper). Instellingen in `android/gradle.properties`.
- Bouwen: GitHub Actions-workflow **Android app** (`.github/workflows/android.yml`), bij wijzigingen in
  `android/` of met de hand ("Run workflow"). Bouwt altijd een **test-APK** (direct op een telefoon te
  installeren) en, zodra de uploadsleutel als secret staat, een **ondertekende AAB** voor Google Play.
- Koppeling app ↔ website: `https://<domein>/.well-known/assetlinks.json`, geleverd door de server op
  basis van de omgevingsvariabelen `ANDROID_PACKAGE_NAME` en `ANDROID_CERT_SHA256`.
- Afbeeldingen voor de Play Store: `android/store/icon-512.png` en `android/store/feature-graphic-1024x500.png`.

## Wat je nodig hebt (jouw beslissingen; deels kosten)

| | |
|---|---|
| Google Play-ontwikkelaarsaccount | eenmalig 25 dollar, play.google.com/console. Kies bij voorkeur een **organisatieaccount** (met D-U-N-S-nummer): een nieuw *persoonlijk* account moet eerst 14 dagen een gesloten test met minstens 12 testers draaien voordat de app openbaar mag. |
| Eigen domein | bijv. `app.<jouwdomein>.nl`. De app hangt aan het domein; later wisselen betekent een nieuwe app-versie en een nieuwe koppeling. |
| Betaalde hosting | het gratis Render-plan valt in slaap; de app doet er dan tot een minuut over om te openen. |
| Privacyverklaring | de site heeft `/privacy`; controleer of die klopt voor je praktijk (Google vraagt een openbare link). |

## Stappen

1. **Pakketnaam kiezen** (staat vast na de eerste upload). Nu: `nl.functionalperformance.oefenapp`
   (`fpPackageName` in `android/gradle.properties`).
2. **Domein**: koppel het domein in Render, zet daar `APP_ORIGIN=https://<domein>` en zet
   `fpHost=<domein>` in `android/gradle.properties`.
3. **Uploadsleutel** (op je eigen computer; goed bewaren, nooit in de repository):
   ```
   keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 upload.jks > upload.jks.b64
   ```
   In GitHub → Settings → Secrets and variables → Actions: `FP_KEYSTORE_BASE64` (inhoud van het
   .b64-bestand), `FP_KEYSTORE_PASSWORD`, `FP_KEY_ALIAS` (`upload`), `FP_KEY_PASSWORD`.
4. **Bouwen**: GitHub → Actions → *Android app* → *Run workflow*; download `fp-exercise-release-aab`.
5. **Play Console**: maak de app aan, kies *Play App Signing*, upload de AAB bij *Testen → Interne test*.
6. **App en site koppelen**: kopieer in de Play Console bij *App-integriteit* de **SHA-256** van het
   *certificaat van de app-ondertekeningssleutel*. Zet in Render:
   - `ANDROID_PACKAGE_NAME=nl.functionalperformance.oefenapp`
   - `ANDROID_CERT_SHA256=<die SHA-256>` (meerdere: gescheiden door komma's)

   Controleer `https://<domein>/.well-known/assetlinks.json`. Zonder deze stap werkt de app wel, maar
   met een adresbalk bovenin.
7. **Winkelvermelding en formulieren**: korte en lange beschrijving, schermafbeeldingen (telefoon),
   de twee afbeeldingen uit `android/store/`, categorie *Medisch* of *Gezondheid en fitness*,
   leeftijdsclassificatie, doelgroep (volwassenen), **Gegevensveiligheid** (gezondheidsgegevens,
   accountgegevens; versleuteld verzonden; verwijdering op verzoek mogelijk), **verklaring voor
   gezondheidsapps**, en een **testaccount** voor de beoordeling door Google (een synthetische
   demopatiënt, nooit een echte patiënt).
8. Interne test → (indien nodig gesloten test) → productie.

## Eerst op je eigen telefoon proberen

Download `fp-exercise-debug-apk` uit de workflow-run en open het bestand op een Android-telefoon
(sta "onbekende apps installeren" toe). Die testversie is ondertekend met een tijdelijke sleutel en
toont daarom een smalle adresbalk; in de Play-versie verdwijnt die na stap 6.

## Wat hier niet getest kon worden

Deze ontwikkelomgeving kan de Android-servers van Google niet bereiken. De Android-build is hier dus
niet uitgevoerd; de eerste run van de GitHub-workflow is de echte test.
