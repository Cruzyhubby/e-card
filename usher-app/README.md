# Éclat Gate

Mobile gate-scanner for the Éclat invitation platform. The organizer creates an **usher account** for one event in Event Studio; the usher signs in here with that account's e-mail and password and scans guest QR codes at the door. Accounts are real user accounts — there are no gate pass tokens.

## Run

```bash
cd usher-app
npm install
npx expo install   # optional: aligns native deps with the installed Expo SDK
npm start          # then press a for Android, i for iOS, w for web
```

Scripts: `npm run start | android | ios | web`.

## Connect to the API

The sign-in screen shows only e-mail and password, plus a one-line status. There is no server URL or device ID to configure:

- **Discovery** — on launch the app probes the saved URL, the Expo/browser dev host, `localhost:8000`, or `10.0.2.2:8000` in parallel and keeps the first origin that answers the public `GET /api/ping`.
- **Fix itself** — if the saved URL stops working (IP change, server restart), sign-in and session restore re-run discovery automatically.
- **Offline** — if nothing answers, the row shows **No connection** with a **RETRY** action. The error stays usher-friendly: check the venue Wi-Fi and retry.
- **Device ID** — comes from the usher account on the server, so it is never entered by hand.

For a fixed deployment, set the origin at build time so discovery is skipped entirely:

```bash
# usher-app/.env  (or eas.json -> build.production.env)
EXPO_PUBLIC_API_URL=https://events.example.com
```

The app talks only to `GET /api/ping`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/password`, `GET /api/gate/stats`, and `POST /api/check-in/verify` with a Sanctum bearer token. The token is the normal account session created at sign-in; nothing long-lived is issued or pasted in by hand.

## Signing in

1. The organizer opens **Event Studio → Gate & ushers** and creates a gate account with just a **gate label** (e.g. `GATE-01`) and a **password**.
2. The organizer shares the label and password with the ushers at that entrance.
3. The usher enters the **gate label or e-mail** and **gate password**, then taps **Sign in**.
4. The app opens **Who is scanning?** — the person enters their own full names (first, middle, last), phone number and e-mail. These identify them in the scan log; the gate account itself stays shared.
5. **Start scanning**. The account is scoped to that event on the server, so passes from other events return DENIED.

Legacy e-mail accounts with `must_change_password` still get the **Set a new password** screen before the scanner opens.

If the organizer suspends or removes the account in the admin, the session is revoked; the app clears the saved account and returns to sign-in on the next request.

## Behaviour

- The Sanctum token is stored with **expo-secure-store** (Android Keystore / iOS Keychain, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`). Base URL, device ID, operator details and the bound event persist in AsyncStorage; the gate password is never stored. Expo web has no SecureStore, so the web dev build falls back to AsyncStorage.
- Sessions written by older builds that kept the token in AsyncStorage are migrated to SecureStore on first launch and the token is removed from AsyncStorage.
- The saved session is re-verified on launch and on entering the scanner. 401/403 clears the session and returns to setup with an explanation; sign-out deletes the token on the device and revokes it on the server.
- Camera permission is requested on the scanner screen only. QR payloads like `{APP_URL}/i/{token}` are reduced to the bare token.
- The same token is ignored for 3.5s, with a 700ms cooldown between verify requests.
- Results appear as an inline card above the session list and stay until the next scan or a tap, so the camera keeps working: emerald VALID, amber ALREADY CHECKED IN, red DENIED, slate CHECK CONNECTION / SESSION EXPIRED.
- Feedback uses expo-haptics notification patterns with a Vibration fallback. No audio dependency is used; the result card is the primary cue.
- A four-tab shell: **Home** (event summary, 2×2 gate KPIs, quick actions, your shift and recent check-ins), **Scan** (camera or manual entry), **History** (in-memory session with search and status filters; clearing is immediate), and **Profile** (account, event scope, change password, log out).
- Home totals come from `GET /api/gate/stats` and refresh every 30s and after each scan. **Your Shift** counts only this session and resets when the app reloads.
- Manual entry accepts the printed pass code or a full `/i/` e-card link and uses the same server validation as the camera.
- Screen stays awake while the scanner is open.

## Notes

`npx expo install` may adjust native dependency versions for your installed SDK 58 patch. Session scans are memory-only and are lost when the app reloads, but gate totals come from the server and survive restarts.
