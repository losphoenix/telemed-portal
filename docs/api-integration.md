# API Integration Plan

## Session and Identity

Expected mobile session responsibilities:

- patient login and logout
- secure JWT persistence
- session restore on app launch
- current organization context

Primary modules:

- `auth`
- `patient`
- `organization`

## Entity Map

### Organization

Use for:

- clinic discovery
- brand, address, timezone, and support channels
- cancellation policy and payment settings

### User

Expose only provider-safe fields to the patient app:

- doctor name
- specialty
- profile photo if later added
- availability summary

### Service

Use for:

- visit type catalog
- price and co-pay preview
- duration and delivery mode compatibility

### Room

Likely not patient-facing except for in-person visit preparation:

- room data can stay internal unless needed for directions

### Appointment

Portal requirements:

- list upcoming and past visits
- create appointment
- reschedule appointment
- cancel appointment
- join telehealth appointment
- show reminders, notes, and intake payload state

### Conversation

Portal requirements:

- list threads
- open thread by appointment
- send patient message
- receive doctor or AI messages
- unread status handling

### Follow-up

Portal requirements:

- show pending check-in tasks
- render AI question flow
- submit patient replies
- surface escalation notice when doctor review is triggered

### Sale

Portal requirements:

- show co-pay due
- initiate payment
- show receipt and payment history

### Notification

Portal requirements:

- in-app notification feed
- push notification routing by deep link
- reminder and follow-up badge counts

## Mobile Contract Suggestions

- keep patient auth completely separate from staff auth
- expose lightweight appointment list payloads for home screen performance
- include `deliveryMode`, `status`, and `videoLink` in appointment detail response
- include `senderType` in conversation payloads so AI messages are clearly labeled
- include `flaggedForDoctor` and `escalatedToDoctor` on follow-up status responses

## Risks To Address Early

- video link lifecycle and expiry
- token refresh strategy if visits last longer than auth expiry
- notification deep links for message and appointment detail
- patient-safe error handling for payment and scheduling failures
