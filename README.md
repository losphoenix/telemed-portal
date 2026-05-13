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
