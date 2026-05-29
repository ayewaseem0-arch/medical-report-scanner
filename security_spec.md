# Security Specification - Precision Diagnostics Suite

## Data Invariants
- Feedback must always have a rating (1-5) and a usefulness flag.
- Feedback is immutable once created.
- Only authenticated users can submit feedback.
- Feedback must be linked to the submitting user's UID.

## The Dirty Dozen Payloads
1. **Unauthorized Create**: An unauthenticated user tries to submit feedback.
2. **Identity Spoofing**: A user tries to submit feedback with someone else's `userId`.
3. **Invalid Rating (High)**: A user tries to submit a rating of 6.
4. **Invalid Rating (Low)**: A user tries to submit a rating of 0.
5. **Missing Required Field**: A user tries to submit feedback without a `rating`.
6. **Malicious ID Poisoning**: A user tries to use a 2KB string as a `feedbackId`.
7. **Bypassing Server Timestamp**: A user tries to provide their own `createdAt` date instead of using `request.time`.
8. **Update Attempt**: A user tries to modify an existing feedback document.
9. **Unauthorized Delete**: A user tries to delete their own or someone else's feedback.
10. **Resource Exhaustion**: A user tries to send a 1MB comment.
11. **PII Leakage**: An unauthenticated user tries to list all feedback.
12. **Ghost Field Injection**: A user tries to add an `isAdmin: true` field to their feedback.

## Test Runner
(Omitted for brevity in this turn, but planned for implementation if required)
