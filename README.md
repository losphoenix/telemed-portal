# Telemedicine Portal

Patient-facing mobile application plan for the `telemed-api` platform.

## Product Direction

This app should feel closer to a guided AI care companion than a generic booking app. The patient experience starts with conversation, then narrows into scheduling, preparation, visit support, and follow-up.

Primary goals:

- reduce friction for first contact
- collect enough context before the visit to help the doctor
- make telehealth visits, secure messaging, and follow-up feel like one flow
- keep billing, reminders, and care instructions visible but lightweight

## Recommended Stack

- React Native with Expo
- TypeScript
- React Navigation or Expo Router
- Redux Toolkit for auth, patient session, notifications, and cached entities
- RTK Query for API integration
- React Hook Form for intake and profile forms
- Secure token storage for JWT
- Push notifications for reminders and follow-ups

## Core Experience Areas

1. AI care concierge
2. account, onboarding, and clinic selection
3. appointment booking and rescheduling
4. telehealth visit access
5. secure patient-doctor messaging
6. AI-led follow-up conversations
7. billing, co-pay, and visit receipts
8. profile, insurance, and care preferences

## Screen Map

- Splash / session restore
- Sign in / sign up
- Verify patient identity
- Select organization or clinic
- Home
- AI concierge chat
- Book appointment
- Appointment details
- Join telehealth visit
- Messages
- Follow-up check-in
- Billing and receipts
- Profile and insurance
- Notifications center

## Proposed Folder Blueprint

```text
telemedicine-portal/
├── README.md
├── docs/
│   ├── product-plan.md
│   └── api-integration.md
└── src/
    ├── app/                  # route groups and screen ownership
    ├── features/             # appointment, ai, conversation, billing
    ├── services/             # API client and RTK Query services
    ├── store/                # Redux store, auth, notifications
    └── theme/                # tokens, typography, spacing
```

## Running a Development Build

> **Why can't I just use Expo Go?**
> This app includes LiveKit for telehealth video, which requires native modules that Expo Go does not bundle. A custom development build is required. This is a one-time setup — after the native binary is built, day-to-day development hot-reloads exactly like Expo Go.

### Option A — Local build (iOS)

**Prerequisites**

- Xcode (from the Mac App Store)
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods 1.16+ installed via Homebrew

**One-time machine setup**

```bash
# Install CocoaPods via Homebrew only — do not use gem install or RVM
brew install cocoapods
pod --version   # must be 1.16+
```

If you have RVM installed, it will corrupt the CocoaPods gem environment and break `pod install`. Remove it before continuing:

```bash
rvm implode --force
# Open a new terminal after this
```

If you have MacPorts installed, its curl can interfere with downloading the WebRTC binary. Prepend system paths to avoid it:

```bash
export PATH="/usr/bin:/usr/local/bin:$PATH"
```

**First-time project setup**

```bash
yarn install
yarn ios
```

`yarn ios` will:
1. Run `pod install` to fetch all native dependencies (including a large WebRTC binary from GitHub — if it times out, just run `yarn ios` again)
2. Compile the native app and install it on the iOS simulator
3. Start the Metro dev server
4. Open the app automatically

The first build takes several minutes. Subsequent runs are fast because the native layer is already compiled.

**Daily development (after first build)**

Just start Metro — no rebuild needed:

```bash
npx expo start --localhost
```

Press `i` to open in the iOS simulator. Keep this terminal running while developing.

**If the simulator shows "No script URL provided"**

Metro was not running when the app opened. Start Metro first, then press `i`:

```bash
npx expo start --localhost
# wait for QR code to appear, then press i
```

**If you need to rebuild the native layer** (after adding a new native package or if the iOS folder gets out of sync):

```bash
rm -rf ios
npx expo prebuild --platform ios
yarn ios
```

---

### Option B — Cloud build via EAS (no Xcode required)

EAS builds the native binary in Expo's cloud and gives you a download link. You install it once, then use the local Metro dev server for hot reload — no Xcode or CocoaPods needed on your machine.

**One-time setup**

```bash
npm install -g eas-cli
eas login
```

**Build**

```bash
eas build --profile development --platform ios
# or for Android:
eas build --profile development --platform android
```

EAS will print a link when the build finishes. Install the `.ipa` on your simulator or device via the Expo dashboard.

**Daily development (after installing the EAS build)**

```bash
npx expo start
```

Scan the QR code using the installed dev build app — not Expo Go.

---

### Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| `pod install` fails with `visionos` error | CocoaPods too old | `brew install cocoapods` |
| `pod install` fails with gem/rexml errors | RVM polluting GEM_PATH | `rvm implode --force`, new terminal |
| WebRTC download fails | Flaky GitHub CDN | Retry `yarn ios` |
| "No script URL provided" on simulator | Metro not running | `npx expo start --localhost` then press `i` |
| App opens Expo Go instead of dev build | Wrong app opened | Find TelemedicinePortal icon on simulator home screen |
| Simulator connects but crashes on LiveKit screen | Running in Expo Go | Open the TelemedicinePortal dev build, not Expo Go |

---

## Build Sequence

1. auth and patient session
2. organization and service discovery
3. appointment booking and detail screens
4. AI concierge and structured symptom intake
5. conversation thread and follow-up experience
6. telehealth room entry and visit status handling
7. billing and notification polish

## Design Notes

- The home screen should open with a conversational card stack, not a grid of utilities.
- AI output must stay grounded in clinic-approved prompts and always provide escalation paths.
- Medical urgency states should break the chat pattern and push the user toward urgent care, emergency, or office contact actions.
