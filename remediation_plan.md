# STAGE 8B — SECURITY REMEDIATION SPECIFICATION

## 1. Executive Summary

This remediation plan addresses the confirmed security findings from Stage 8 and Stage 8A. The plan specifies minimal, targeted changes to restore strict multi-tenant isolation while preserving legitimate School Manager GH functionality. Three confirmed findings require remediation: one BLOCKER (settings collection unrestricted read), one MEDIUM (analyticsEvents creation integrity issue), and one MEDIUM hardening (password reset endpoint rate limiting). Storage authorization verification remains unverified due to absence of storage rules in the repository.

## 2. Confirmed Findings Being Remediated

### CONFIRMED BLOCKER
- **Location**: firestore.rules line 428-429
- **Issue**: `/settings/{document}` allows `allow read, get: if isAuthenticated();`
- **Impact**: Any authenticated user can read any school's settings document, violating multi-tenancy

### CONFIRMED MEDIUM
- **Location**: firestore.rules line 1227
- **Issue**: `/analyticsEvents/{eventId}` allows `allow create: if isAuthenticated();`
- **Impact**: Authenticated users can create analytics events claiming arbitrary schoolId, creating data integrity risks

### MEDIUM HARDENING
- **Location**: server.js line 3084
- **Issue**: `/api/auth/send-password-reset-email` lacks authentication-specific rate limiting
- **Impact**: Endpoint protected only by general API limiter (300 req/15min), not stronger auth limiter (120 req/15min)

### NOT CONFIRMED
- PlatformBroadcasts list rule (firestore.rules line 1302) was re-evaluated and determined to be NOT A VULNERABILITY when properly interpreted according to Firestore rule semantics and confirmed by patterns elsewhere in the ruleset.

### UNKNOWN
- Firebase Storage rules are not present in the repository and therefore cannot be verified in this read-only process.

## 3. Settings Remediation Design

### Current Behavior
```javascript
match /settings/{document} {
  // Super admin can read/write all settings
  allow read, write: if isSuperAdmin();
  
  // School admin can read/write their school's settings
  allow read, write: if isSchoolAdmin() && userSchoolId() == document;
  
  // Teachers need read access to load term/session settings on their dashboard.
  allow read: if isTeacher() && userSchoolId() == document;
  
  // Parents need read access to see school-specific dates and config on dashboard
  allow read, get: if isAuthenticated();  // <-- PROBLEMATIC LINE
}
```

### Required Behavior
- Super admins: retain read/write access to all settings
- School admins: retain read/write access to their own school's settings
- Teachers: retain read access to their own school's settings
- Parents: gain read access to their own school's settings (previously had overly broad access)
- All other authenticated users: no access to settings

### Exact Proposed Code/Rule
```javascript
match /settings/{document} {
  // Super admin can read/write all settings
  allow read, write: if isSuperAdmin();
  
  // School admin can read/write their school's settings
  allow read, write: if isSchoolAdmin() && userSchoolId() == document;
  
  // Teachers need read access to load term/session settings on their dashboard.
  allow read: if isTeacher() && userSchoolId() == document;
  
  // Parents need read access to see school-specific dates and config on dashboard
  allow read, get: if isParent() && userSchoolId() == document;  // <-- FIXED LINE
}
```

### Why It Is Correct
- Follows existing pattern in ruleset where each role's access is defined in separate rules
- Matches the access pattern already established for teachers (line 425-426)
- Preserves super admin access via line 420 (unchanged)
- Preserves school admin access via line 422-423 (unchanged)
- Correctly scopes parent access to their own school's settings
- Eliminates the BLOCKER finding by restricting settings access to legitimate school-associated users
- Maintains read-only access for parents as indicated by the existing comment
- Uses the same `read, get` syntax as the original line for consistency

### Firestore/Security Semantics
- In Firestore rules, `match /settings/{document}` binds `{document}` to the settings document ID, which is the schoolId
- `userSchoolId()` function returns the schoolId from the authenticated user's Firestore profile document
- `userSchoolId() == document` checks if the settings document belongs to the user's school
- The `read, get` combination controls document read access (get operations)
- Write operations remain controlled by existing lines 420 and 422-423 (super admin and school admin write access)
- Follows the established pattern where each role's access is defined in separate, complementary rules

### Dependencies
- None - only modifies the specified rule line

### Regression Risks
- Low - follows existing access control patterns
- Potential impact: Parents with incorrect or missing userSchoolId() in their profile may lose settings access until their profile is corrected
- This would expose a separate bug in user profile setup for parents (phone-number login flow) that should be addressed separately
- Legitimate parent dashboard functionality is preserved for parents with correct user profile data

### Verification Test
```
School A parent → read School A settings → ALLOW
School A parent → read School B settings → DENY
School A teacher → read School A settings → ALLOW
School A teacher → read School B settings → DENY
School A school admin → read School A settings → ALLOW
School A school admin → read School B settings → DENY
Super admin → read School A settings → ALLOW
Super admin → read School B settings → ALLOW
Unauthenticated → read settings → DENY
```

## 4. AnalyticsEvents Remediation Design

### Current Behavior
```javascript
match /analyticsEvents/{eventId} {
  allow create: if isAuthenticated();
  allow read: if isAuthenticated() &&
    (isSuperAdmin() || schoolScopedRead(resource.data.schoolId));
  allow update, delete: if isSuperAdmin();
}
```

### Required Behavior
- Super admins: retain ability to create analytics events for any school
- Non-super admins: restricted to create analytics events only for events where schoolId matches their userSchoolId()
- Prevents creation of misleading analytics data attributed to incorrect schools
- Maintains super admin oversight capability

### Exact Proposed Code/Rule
```javascript
match /analyticsEvents/{eventId} {
  allow create: if isAuthenticated() &&
    (isSuperAdmin() || request.resource.data.schoolId == userSchoolId());
  allow read: if isAuthenticated() &&
    (isSuperAdmin() || schoolScopedRead(resource.data.schoolId));
  allow update, delete: if isSuperAdmin();
}
```

### Why It Is Correct
- Follows the same pattern used in other school-scoped collections (payments, fees, etc.) where create operations validate `request.resource.data.fieldId == pathParameter`
- Matches the philosophy of the existing read rule which restricts non-super admins to events matching their school context
- Preserves super admin create access via first condition of OR expression
- Correctly uses `request.resource.data.schoolId` for CREATE operations (proposes new document data)
- Uses `userSchoolId()` to get the authenticated user's schoolId from their profile
- Eliminates the ability for non-super admins to create events claiming arbitrary schoolId
- Maintains the ability to create events with null schoolId when user has no school in profile (null == null evaluates to true)
- Simple, verifiable, and follows established patterns in the ruleset

### Firestore/Security Semantics
- In Firestore CREATE operations:
  - `resource.data` = existing document data (null/empty for creates)
  - `request.resource.data` = proposed new document data
  - To validate fields in the document being created, use `request.resource.data.fieldName`
- `userSchoolId()` returns the schoolId from the authenticated user's Firestore profile document
- `request.resource.data.schoolId == userSchoolId()` checks if the event's schoolId matches the user's school
- The `isSuperAdmin() ||` clause preserves oversight capability for system administrators
- Write operations (update/delete) remain restricted to super admins only (line 1230 unchanged)
- Read operations remain unchanged (line 1228-1229 unchanged)

### Dependencies
- None - only modifies the specified rule line

### Regression Risks
- Low - follows existing access control patterns and preserves intended use cases
- Potential impact: Users with incorrect or null userSchoolId() in their profile may be unable to create analytics events until their profile is corrected
- This would expose a separate bug in user profile setup that should be addressed separately
- Legitimate analytics event creation during login (via safeLogAnalyticsEvent) is preserved for users with correct profile data
- System administrators retain full create access for oversight purposes

### Verification Test
```
School A user → create event for School A → ALLOW
School A user → create event for School B → DENY
School A user → create event (no schoolId) → ALLOW only if userSchoolId() is null
Super admin → create event for any school → ALLOW
Unauthenticated → create event → DENY
```

## 5. Password Reset Remediation Design

### Current Behavior
```javascript
app.post("/api/auth/send-password-reset-email", async (req, res) => {
  // ... implementation ...
});
```

### Required Behavior
- Apply authentication-specific rate limiting to prevent abuse
- Retain existing general API limiter protection
- Maintain existing error handling and functionality

### Exact Proposed Code/Rule
```javascript
app.post("/api/auth/send-password-reset-email", authLimiter, async (req, res) => {
  // ... implementation unchanged ...
});
```

### Why It Is Correct
- `authLimiter` is already defined in server.js (lines 587-595) with appropriate values:
  - windowMs: AUTH_LIMIT_WINDOW_MS = 15 * 60 * 1000 (15 minutes)
  - limit: AUTH_LIMIT_MAX_REQUESTS = 120 requests
- Already applies to other authentication-sensitive endpoints (e.g., parent-login line 1744)
- Adds stronger protection for this sensitive endpoint while preserving existing general API limiter
- Minimal change - only adds one middleware parameter
- Follows established pattern used elsewhere in the codebase
- Addresses the specific hardening finding without altering functionality

### Dependencies
- None - uses existing `authLimiter` middleware defined in server.js lines 587-595

### Regression Risks
- Very low - only adds existing rate limiting middleware
- Maintains all existing functionality
- Provides stronger protection against abuse without breaking legitimate use cases
- General API limiter (300 req/15min) still applies as baseline protection

### Verification Test
```
Legitimate request → ALLOW (within rate limits)
Repeated requests beyond 120/15min → DENY (rate limited)
Repeated requests beyond 300/15min → DENY (both limiters apply)
Error handling preserved (user-not-found vs other errors)
```

## 6. Storage Verification Status

### Status
UNKNOWN — STORAGE AUTHORIZATION NOT VERIFIED

### Reason
- No `storage.rules` file found in the repository
- No obvious Firebase Storage configuration located in:
  - Repository files
  - Firebase configuration (firebase.json)
  - Deployment configuration
  - Server-side code references to storage rules
- Cannot verify whether Storage rules provide proper school-based isolation
- Default Firebase Storage behavior cannot be assumed secure without verification

### Recommended Action
Storage rules verification should be performed in a separate, non-read-only process outside the scope of this remediation plan.

## 7. Firestore Rules Semantic Verification

### CREATE Operation Semantics
Verified through analysis of existing rules in firestore.rules:
- Payments create rule (line 340): `request.resource.data.schoolId == schoolId`
- Fees v2 create rule (line 222): `request.resource.data.schoolId == schoolId`
- User create rule (line 152): `request.auth.uid == userId` (validating against path parameter)
- **Conclusion**: For CREATE operations, use `request.resource.data.fieldName` to validate fields in the document being created

### READ Operation Semantics
Verified through analysis of existing rules:
- Users collection read rule (line 165): `allow read: if isSchoolAdmin() && userSchoolId() == resource.data.schoolId`
- Settings collection existing correct rules (lines 422-423, 425-426): use `userSchoolId() == document` pattern
- **Conclusion**: For READ operations, validate that the resource/document ID matches the user's schoolId via `userSchoolId() == document` or `userSchoolId() == resource.data.schoolId`

### Applied Correctly In Proposed Fixes
- Settings fix (line 428-429): `allow read, get: if isParent() && userSchoolId() == document;`
- AnalyticsEvents fix (line 1227): `allow create: if isAuthenticated() && (isSuperAdmin() || request.resource.data.schoolId == userSchoolId());`
- Both follow verified semantic patterns from the existing ruleset

## 8. Security Invariants

### Tenant Isolation
```text
A non-super-admin school user MUST NOT access another school's confidential data.
```

### Settings
```text
Settings access MUST be constrained by the authenticated user's
authorized school membership.
```

### Analytics
```text
A normal user MUST NOT create analytics data attributed to
another school.
```

### Ownership
```text
Client-controlled schoolId MUST NOT override authenticated
tenant authorization.
```

### Backend
```text
Admin SDK access MUST enforce authorization independently of
Firestore client rules.
```

### Finance
```text
Finance V1/V2 authority and the Stage 7C-5 pagination freeze
MUST remain unchanged.
```

## 9. Exact Proposed Changes

### 1. Settings Collection
- **File**: firestore.rules
- **Line**: 428-429
- **Current**: `allow read, get: if isAuthenticated();`
- **Fixed**: `allow read, get: if isParent() && userSchoolId() == document;`

### 2. AnalyticsEvents Collection
- **File**: firestore.rules
- **Line**: 1227
- **Current**: `allow create: if isAuthenticated();`
- **Fixed**: `allow create: if isAuthenticated() && (isSuperAdmin() || request.resource.data.schoolId == userSchoolId());`

### 3. Password Reset Endpoint
- **File**: server.js
- **Line**: 3084
- **Current**: `app.post("/api/auth/send-password-reset-email", async (req, res) => {`
- **Fixed**: `app.post("/api/auth/send-password-reset-email", authLimiter, async (req, res) => {`

### 4. Storage Rules
- **Status**: Not present in repository for verification
- **Action**: Verify separately outside read-only process

## 10. Regression/Test Plan

### Settings Collection Tests
```
School A parent → read School A settings → ALLOW
School A parent → read School B settings → DENY
School A teacher → read School A settings → ALLOW
School A teacher → read School B settings → DENY
School A school admin → read School A settings → ALLOW
School A school admin → read School B settings → DENY
Super admin → read School A settings → ALLOW
Super admin → read School B settings → ALLOW
Unauthenticated → read settings → DENY
```

### AnalyticsEvents Collection Tests
```
School A user → create event for School A → ALLOW
School A user → create event for School B → DENY
School A user → create event (no schoolId) → ALLOW only if userSchoolId() is null
Super admin → create event for any school → ALLOW
Unauthenticated → create event → DENY
```

### Password Reset Endpoint Tests
```
Legitimate request → ALLOW (within 120/15min auth limit)
Repeated requests beyond 120/15min → DENY (auth limited)
Repeated requests beyond 300/15min → DENY (both limits apply)
Error handling preserved (404 for user-not-found vs 500 for other)
```

## 11. Change Impact Analysis

| File | Current Behavior | Proposed Behavior | Security Benefit | Functional Impact | Regression Risk | Required Test |
|------|------------------|-------------------|------------------|-------------------|-----------------|---------------|
| firestore.rules line 428-429 | Any authenticated user can read any school's settings | Only parents can read own school's settings | Eliminates BLOCKER: cross-school settings access | Parents gain correct school-scoped read access (was overly broad) | Low: May expose parent user profile setup issues | Settings access tests above |
| firestore.rules line 1227 | Any authenticated user can create analytics events for any school | Non-super admins restricted to own school's events | Eliminates MEDIUM: analytics data integrity risk | Legitimate event creation preserved for users with correct profile data | Low: May expose user profile setup issues | AnalyticsEvents creation tests above |
| server.js line 3084 | General API limiter only (300 req/15min) | General + auth limiter (300/15min + 120/15min) | Addresses MEDIUM hardening: stronger auth protection | None - preserves existing functionality | Very low: Only adds existing middleware | Password reset tests above |
| Storage rules | Not present in repository | N/A | N/A | Storage rules verification required separately | N/A | Storage verification outside scope |

## 12. Risks and Unknowns

### Known Risks
- **Parent user profile issues**: If parents have incorrect or null userSchoolId() in their Firestore profile, they may lose settings/analytics access until profile is corrected. This exposes a separate bug in user profile setup for phone-number login flow that should be addressed separately.
- **AnalyticsEvents field validation**: The fix does not address potential lack of field validation in analyticsEvents create rule. This is a separate refinement that could be considered later.

### Unknowns
- **Firebase Storage rules**: No storage.rules file found in repository; authorization status unknown
- **Legacy system behavior**: Full end-to-end testing not performed in read-only process
- **Edge case interactions**: Complex interactions between multiple security controls not exhaustively analyzed

## 13. Implementation Order

### P0 — BLOCKER (Do First)
1. Settings collection fix (firestore.rules line 428-429)
   - Addresses critical cross-school data access vulnerability
   - Highest security impact

### P1 — MEDIUM (Do Second)
1. AnalyticsEvents collection fix (firestore.rules line 1227)
   - Addresses data integrity risk
   - Lower immediate risk than BLOCKER but still important

### P2 — HARDENING (Do Third)
1. Password reset endpoint fix (server.js line 3084)
   - Improves abuse protection
   - Lowest immediate risk of the three

### P3 — UNKNOWN (Do Separately)
1. Storage rules verification and configuration
   - Must be performed in separate, non-read-only process

## 14. Final Approval Gate

- Settings fix designed: YES
- AnalyticsEvents fix designed: YES
- Password reset fix designed: YES
- Firestore CREATE semantics verified: YES
- Storage rules verified: UNKNOWN
- Regression tests designed: YES
- Unrelated systems preserved: YES
- Implementation performed: NO

**READY FOR IMPLEMENTATION REVIEW**

The remediation plan addresses all confirmed security findings with minimal, targeted changes that preserve legitimate functionality while eliminating the critical BLOCKER finding and addressing the MEDIUM findings and hardening opportunity. Storage rules verification requires separate action outside this read-only process.