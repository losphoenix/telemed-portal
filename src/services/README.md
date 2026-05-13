# Service Layer Notes

Suggested mobile API slices:

- `authService`
- `patientService`
- `organizationService`
- `serviceCatalogService`
- `appointmentService`
- `conversationService`
- `followUpService`
- `saleService`
- `notificationService`

Recommended patterns:

- keep home screen queries small and cache-friendly
- split list and detail endpoints into separate hooks
- normalize current appointment and current conversation state in Redux only where needed
- treat AI follow-up interactions as first-class mutations, not generic message sends
