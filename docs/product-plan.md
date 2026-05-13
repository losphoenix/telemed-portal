# Product Plan

## Positioning

The portal is a patient companion for booking, telehealth, secure messaging, and AI-guided follow-up. It should borrow the confidence and clarity of ChatGPT's chat-first workflow, but the app cannot behave like a general medical advice bot. It needs structured guardrails, explicit triage states, and doctor escalation.

## Experience Model

### 1. Conversational front door

The first meaningful action in the app should be a guided prompt:

- "Describe what is going on"
- "I need to book a visit"
- "I have a question after my appointment"
- "I need help with medication or side effects"

The AI concierge then routes the patient into one of these flows:

- book a same-day or future appointment
- complete a structured intake before booking
- open an existing conversation thread
- complete a scheduled follow-up check-in
- escalate to emergency guidance or office contact

### 2. Home screen

Home should be organized around current care, not navigation chrome:

- next appointment card
- pending follow-up card
- unread messages
- quick action to start AI chat
- billing or co-pay reminder if outstanding

### 3. Appointment flow

The booking flow maps directly to `organization`, `service`, `user`, `room`, and `appointment` modules.

Recommended steps:

1. clinic selection
2. visit reason
3. suggested service or specialty
4. delivery mode: in-person or telehealth
5. doctor preference or first available
6. time slot selection
7. intake questions
8. co-pay review
9. confirmation

### 4. Telehealth visit support

For confirmed telehealth appointments:

- show countdown
- show visit preparation checklist
- expose join link only when valid
- support pre-visit device check
- display post-visit summary once completed

### 5. Secure messaging

Messages should feel like an extension of care episodes:

- thread can be attached to appointment
- doctor, patient, and AI messages are visually distinct
- AI can summarize long threads for the patient
- AI never impersonates the doctor

### 6. Follow-up automation

Follow-up is one of the strongest differentiators.

Flow:

1. visit completes
2. follow-up is scheduled by API
3. push or SMS nudges patient back into app
4. AI asks doctor-approved check-in questions
5. patient responses are summarized
6. concerning replies are escalated to doctor

## Feature Modules

- `features/auth`
- `features/home`
- `features/ai-concierge`
- `features/appointments`
- `features/telehealth`
- `features/conversations`
- `features/follow-up`
- `features/billing`
- `features/profile`
- `features/notifications`

## Milestone Plan

### Milestone 1

- patient auth
- clinic selection
- basic home screen
- appointment list and detail

### Milestone 2

- booking flow
- intake forms
- telehealth join screen
- messaging inbox

### Milestone 3

- AI concierge
- AI follow-up experience
- billing and receipts
- push notifications

### Milestone 4

- personalization
- medication reminders if introduced later
- richer care plans and attachments
