# Security Specification for Firestore Rules

## 1. Data Invariants
- `celebrations/{celebrationId}`:
  - Read access (get) is public so that students, teachers, parents, and alumni on different devices can immediately access and real-time synchronize celebration updates without login.
  - List queries (`list`) on the collection are restricted to prevent scraping.
  - Creation and updates to `celebrations` must strictly require an authorized admin (`request.auth != null && (request.auth.token.email == 's114017@ms2.kghs.kh.edu.tw' || exists(/databases/$(database)/documents/admins/$(request.auth.uid)))`).
  - Document IDs must conform to `isValidId` (`^[a-zA-Z0-9_\\-]+$`, length <= 128).
  - Incoming payloads must validate key shapes: `updatedAt` must be a valid number.
- `admins/{adminId}`:
  - Only authenticated admin users can read and manage admin roles.
  - Self-assignment of admin role by unauthorized users is forbidden.

## 2. The Dirty Dozen Payloads
1. Unauthenticated write to `/celebrations/102nd` (Expected: PERMISSION_DENIED)
2. Malicious user with non-admin email attempting to write `/celebrations/102nd` (Expected: PERMISSION_DENIED)
3. Write to invalid celebration ID `/celebrations/../../etc/passwd` (Expected: PERMISSION_DENIED)
4. Junk string payload with 2MB ID `/celebrations/<huge-string>` (Expected: PERMISSION_DENIED)
5. Payload missing required `updatedAt` field on create (Expected: PERMISSION_DENIED)
6. Non-admin attempting to read `/admins/someone_else` (Expected: PERMISSION_DENIED)
7. Unauthenticated list query on `/celebrations` (Expected: PERMISSION_DENIED)
8. Unauthenticated list query on `/admins` (Expected: PERMISSION_DENIED)
9. Unauthenticated write to `/admins/{uid}` (Expected: PERMISSION_DENIED)
10. Email spoofing attempt with unverified email (Expected: PERMISSION_DENIED)
11. Update to celebration attempting to inject arbitrary root field (Expected: PERMISSION_DENIED)
12. Attempt to delete `/celebrations/102nd` by non-admin or unauthenticated user (Expected: PERMISSION_DENIED)
