# Mobile app (Expo / Expo Go)

Expo + React Native app for Plant-Doctor, distributed via **EAS Update** and opened in the **Expo Go** client. No Apple Developer account and no native build are required for this path — Expo Go is a prebuilt app from the App/Play Store that loads the published JS bundle.

### Stack & layout

| | |
|---|---|
| Path | `apps/mobile-app` |
| Nx name | `mobile-app` |
| Stack | Expo (SDK 54) + React Native + Expo Router |
| Config | `app.json`, `eas.json` |
| Source | `src/app` (file-based routes), `src/components`, `src/constants/theme.ts` |

### Prerequisites

- Node + npm, repo dependencies installed (`npm install` at repo root).
- An Expo account (free). Log in once:
  ```bash
  cd apps/mobile-app
  npx eas-cli login
  ```
- The **Expo Go** app installed on the target device, version matching **SDK 54**.

### Environment

Copy the example env, then fill in values:

```bash
cd apps/mobile-app
cp .env.example .env
```

`EXPO_PUBLIC_*` variables are **inlined into the JS bundle at publish time**, not read at runtime. Set them *before* `eas update` or `expo start`.

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL of the Node backend. Use a URL reachable from the phone (not `localhost`) for Expo Go on a physical device. |
| `EXPO_PUBLIC_BACKEND_API_KEY` | Static `x-api-key` sent on every request. Bundled into the client — treat as non-secret gate, not real auth. |

### Local development (no account needed)

```bash
cd apps/mobile-app
npx expo start          # or: npx nx run mobile-app:start
```
Scan the QR code with Expo Go on the same Wi-Fi network.

### Publishing an update for Expo Go

EAS Update publishes a JS bundle that Expo Go loads over the air. Two concepts matter:

- **Branch** — where updates live (a line of updates).
- **Channel** — a named alias that points to a branch. The Expo Go share link queries by **channel**, so a channel must exist and point at the branch you publish to. A channel is created **once** (see below); afterwards every `eas update` on that branch flows through the same share link automatically.

First-time setup (per channel) — creates the channel and points it at an existing branch:

```bash
npx eas-cli update --branch <branch> --message "Initial publish"   # creates the branch + update
npx eas-cli channel:create <branch>                                # creates channel <branch> → branch <branch>
```

Publish a new version (repeat for every change that is JS/asset/config-only):

```bash
npx eas-cli update --branch <branch> --message "describe the change"
```

Updates cannot change native code, native dependencies, app permissions, or the Expo SDK version — those need a native build. The **runtime version** is pinned to the SDK (`runtimeVersion.policy: "sdkVersion"` in `app.json`), so the Expo Go client on the device must match the SDK the app was published with.

### Sharing the update with Expo Go

Build a QR-code link that opens the latest update in Expo Go:

```
https://qr.expo.dev/eas-update?projectId=<PROJECT_ID>&runtimeVersion=exposdk:<SDK_VERSION>&channel=<branch>&slug=exp
```

- `slug=exp` targets **Expo Go** (omit your app's slug, which would target a dev build).
- Colleagues open the link in a phone browser → scan the QR with the camera → opens in Expo Go.
- The link is stable: republishing to the same channel/branch updates it in place; no need to regenerate it.

You can also share the direct deep link, or use the **Preview** QR button on the update's page in the EAS dashboard:

```
exp://u.expo.dev/<PROJECT_ID>?runtime-version=exposdk:<SDK_VERSION>&channel-name=<branch>
```

### Useful commands

```bash
npx eas-cli whoami                       # check logged-in account
npx eas-cli channel:list                 # list channels and the branches they point to
npx eas-cli channel:create <name>        # create a channel (points to a branch of the same name)
npx eas-cli channel:edit <name> --branch <branch>   # repoint a channel at another branch
npx eas-cli update --branch <branch> --message "..."  # publish an update
npx expo start                           # local dev server
npx nx run mobile-app:start              # same, via Nx
npx nx run mobile-app:test               # run tests
```

### Caveats

- `EXPO_PUBLIC_API_URL` is baked in at publish time. If you change the backend URL, set the env *before* re-publishing.
- Keep the app on SDK 54 unless you've confirmed the Expo Go client on the App/Play Store supports a newer SDK. A mismatched SDK produces a 404 / "no channel" type error because the runtime version won't match.
- EAS Update + Expo Go does **not** require a paid (or any) Apple Developer account. The `eas.json` build profiles (`development`, `preview`, `production`) are for native builds and are not used by the Expo Go path.
