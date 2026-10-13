# Security Specification for Dyktanda Online

## 1. Data Invariants
1. Dyktanda (`/dictations/{id}`) and kategorie (`/categories/{id}`) are publicly readable so that anonymous learners do not need an account.
2. Only verified administrators (`isAdmin()`) can create, update, or delete categories and dictations.
3. Administrator identity is verified either via verified email (`sparklyfrog2060@gmail.com`) or via registered document in `/admins/{uid}`.
4. Dictation documents must contain valid strings, non-empty title, valid categoryId, valid difficulty, bounded lengths, and valid segment arrays.
5. All administrative mutations require authentic identity and field boundary enforcement.

## 2. The Dirty Dozen Payloads (Adversarial Security Test Cases)
1. **Unauthenticated Category Creation**: Anonymous client attempts `POST /categories` -> Denied.
2. **Unauthenticated Dictation Deletion**: Anonymous client attempts `DELETE /dictations/abc` -> Denied.
3. **Spoofed Admin Email without Verification**: User with `request.auth.token.email = sparklyfrog2060@gmail.com` but `email_verified = false` -> Denied.
4. **Giant Payload / Denial of Wallet**: Dictation title exceeding 200 characters or rawText exceeding 20,000 chars -> Denied.
5. **Arbitrary Collection Insertion**: Creating documents in `/users` or unmapped paths -> Denied by global deny rule.
6. **Self-Promotion to Admin**: Non-admin authenticated user attempts `POST /admins/{their_uid}` with `{ role: "admin" }` -> Denied.
7. **Ghost Field Injection (Shadow Update)**: Attempting to update a dictation with extra injected keys `{ isHacked: true }` -> Denied.
8. **Invalid Category Type Injection**: Creating category with `order = "first"` (string instead of number) -> Denied.
9. **Blanket List Vulnerability Check**: Query without matching resource bounds -> Denied.
10. **ID Poisoning Attack**: Modifying document with 2KB special character ID -> Denied by `isValidId()`.
11. **Malicious Empty Title Injection**: Creating dictation with empty title `""` -> Denied.
12. **Foreign Admin Takeover**: Non-admin deleting admin record -> Denied.

## 3. Test Runner Invariant
All 12 dirty payloads are verified to fail with `PERMISSION_DENIED`.
Public readers can `get` and `list` categories and dictations.
