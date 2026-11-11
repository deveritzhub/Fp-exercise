# Inlogmethoden

- **Wachtwoord** (+ tweestapsverificatie voor medewerkers).
- **Passkeys** (Face ID, vingerafdruk, schermvergrendeling): altijd beschikbaar. Gekoppeld aan het domein (`APP_ORIGIN`): na een overstap naar een eigen domein moeten gebruikers opnieuw een passkey toevoegen.
- **Google en Apple**: verschijnen pas als de sleutels in Render staan.

## Google instellen
1. Google Cloud Console → APIs & Services → OAuth consent screen (extern, app-naam FP Flow).
2. Credentials → OAuth client ID → Web application. Authorized redirect URI: `https://<domein>/api/auth/oauth/google/callback`.
3. In Render: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

## Apple instellen (Apple Developer, $99/jaar)
1. Identifiers → App ID met "Sign in with Apple"; daarna een Services ID (dit is `APPLE_CLIENT_ID`).
2. Bij de Services ID: domein en Return URL `https://<domein>/api/auth/oauth/apple/callback`.
3. Keys → nieuwe key met Sign in with Apple → download de `.p8`.
4. In Render: `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` (inhoud van de .p8; regeleinden mogen als `\n`).

## Regels
- Een bestaand account wordt nooit overgenomen op basis van alleen het e-mailadres: koppelen gebeurt ingelogd via Account → Inlogmethoden.
- Alleen door Google/Apple bevestigde e-mailadressen.
- Medewerkers met tweestapsverificatie moeten na Google/Apple nog steeds hun code invoeren. Een passkey telt zelf als tweede stap.
- De laatste inlogmethode kan niet worden verwijderd.
- Voor de app stores: gebruik vóór review de officiële knopstijlen van Google en Apple.
