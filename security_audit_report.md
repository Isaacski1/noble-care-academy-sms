# STAGE 8 — SECURITY & DATA PROTECTION AUDIT

## 1. Executive Summary

This security audit of the School Manager GH codebase identified multiple critical security vulnerabilities that violate multi-tenant isolation principles. The most significant issues are in the Firestore Security Rules where inadequate authorization controls allow authenticated users to access, create, or enumerate data belonging to other schools. Additionally, backend endpoints show generally proper authorization but some hardening improvements are needed.

The architecture follows a multi-tenant SaaS model with Firebase Authentication, Firestore Database, Firebase Storage, and a Node.js/Express backend using Firebase Admin SDK. Authentication is handled via Firebase Client SDK with custom token generation for special flows (parent phone login). Authorization relies on Firestore Security Rules and backend middleware validation.

**Critical Finding**: Authenticated users from School A can access, create, or enumerate School B's data through multiple pathways in the Firestore Security Rules and potentially through backend endpoints.

## 2. Architecture & Trust Boundaries

```
User
 ↓
Firebase Authentication (Client SDK)
 ↓
Frontend (React/Vite)
 ↓
Express API ─────→ Firebase Admin SDK ─────→ Firestore/Storage
       │
       └──────────→ Paystack / SMS provider (Arkesel/Twilio)

Frontend
 ↓
Firestore / Storage
 ↓
Firestore Rules / Storage Rules
```

Trust Boundaries:
- Firebase Authentication tokens are trusted after verification by authMiddleware
- Firebase Admin SDK bypasses Firestore Security Rules - backend must enforce authorization
- Firestore Security Rules govern direct client access to Firestore/Storage
- Custom tokens (e.g., parent phone login) carry additional claims but must be validated

School Identification Flow:
1. User authenticates via Firebase Authentication (email/password, phone+DOB custom token)
2. AuthContext loads user profile from Firestore users collection
3. SchoolId extracted from user profile (or custom tokens for special cases)
4. SchoolContext provides school-specific data to frontend components
5. Backend endpoints verify authorization via authMiddleware and role/schoolId checks

## 3. Multi-Tenant Isolation

**CAN SCHOOL A ACCESS SCHOOL B'S DATA? YES - MULTIPLE VULNERABILITIES FOUND**

### Students Collection
- **READ**: Yes - Firestore rule line 558 allows read if schoolAdminOwnsSchool(resource.data.schoolId)
- **CREATE**: Yes - line 559 allows create if schoolAdminOwnsSchool(request.resource.data.schoolId)
- **UPDATE**: Yes - lines 560, 577-578 allow update/delete if schoolAdminOwnsSchool(resource.data.schoolId)
- **DELETE**: Yes - same as update
- **OWNERSHIP CHANGE**: No - line 577 prevents schoolId changes during update
- **ENUMERATION**: Possible - line 568-571 allows scoped reads, line 569 allows teacherOwnsClass, line 571 allows isParentOf

### Parents Collection
*(No explicit parents collection - parents are users with role=parent)*

### Teachers Collection
*(No explicit teachers collection - teachers are users with role=teacher)*

### Classes Collection
- **READ**: Yes - Firestore rule line 1034 allows read if schoolAdminOwnsSchool(resource.data.schoolId)
- **CREATE**: Yes - line 1035 allows create if schoolAdminOwnsSchool(request.resource.data.schoolId)
- **UPDATE**: Yes - line 1036 allows update,delete if schoolAdminOwnsSchool(resource.data.schoolId)
- **DELETE**: Yes - same as update
- **OWNERSHIP CHANGE**: No - line 1054 prevents schoolId changes during update
- **ENUMERATION**: Possible - line 1046 allows read if schoolScopedRead(resource.data.schoolId)

### Attendance Collection
- **READ**: Yes - Firestore rule line 584 allows read if schoolAdminOwnsSchool(resource.data.schoolId)
- **CREATE**: Yes - line 585 allows create if schoolAdminOwnsSchool(request.resource.data.schoolId)
- **UPDATE**: Yes - lines 586, 604-606 allow update,delete if schoolAdminOwnsSchool(resource.data.schoolId)
- **DELETE**: Yes - same as update
- **OWNERSHIP CHANGE**: No - line 616 prevents schoolId changes during update
- **ENUMERATION**: Possible - line 600-602 allows read if schoolScopedRead or teacherOwnsClass

### Finance Collections (Fees, Payments, Ledgers)
- **READ**: Mostly restricted - e.g., Fees v2 line 244 allows read if isSuperAdmin() OR schoolScopedRead(schoolId)
- **CREATE**: Restricted - e.g., Fees v2 line 219 requires schoolAdminOwnsSchool(schoolId) AND request.resource.data.schoolId == schoolId
- **UPDATE**: Restricted - similar to create with additional schoolId validation
- **DELETE**: Restricted - similar to create
- **OWNERSHIP CHANGE**: Generally prevented by schoolId validation in update rules
- **ENUMERATION**: Limited - requires school scoped access or specific relationships

### Critical Cross-School Access Paths Found:

1. **Settings Collection** (Lines 418-430):
   - Line 429: `allow read, get: if isAuthenticated();`
   - **ANY authenticated user can read ANY school's settings document**
   - This exposes school configuration, contact information, and potentially sensitive settings

2. **AnalyticsEvents Collection** (Lines 1225-1231):
   - Line 1226: `allow create: if isAuthenticated();`
   - **ANY authenticated user can create analytics events for ANY school**
   - Line 1230: `allow read: if isAuthenticated() && (isSuperAdmin() || schoolScopedRead(resource.data.schoolId));`
   - Authenticated users can read events for their own school
   - Line 1231: `allow update, delete: if isSuperAdmin();`
   - Only super admins can modify/delete

3. **PlatformBroadcasts Collection** (Lines 1288-1303):
   - Line 1299: `allow list: if isAuthenticated();`
   - **ANY authenticated user can list ALL platform broadcasts** (potentially seeing broadcasts for other schools)
   - Line 1290-1301: get rule properly validates target audience
   - Lines 1289-1290: create/update/delete restricted to super admins only

4. **PlatformBroadcastReceipts Collection** (Lines 1305-1309):
   - Properly restricted - only super admins can read, others cannot create/update/delete

## 4. Firestore Security Rules Audit

### Critical Findings:

**SEVERITY: BLOCKER**
- **Finding**: Settings collection allows unrestricted read access to any authenticated user
- **Affected Component**: Firestore Security Rules
- **File**: firestore.rules
- **Line**: 429
- **Attack Scenario**: 
  1. User from School A authenticates
  2. Makes request to read `/settings/{schoolBId}` 
  3. Rule on line 429 allows read because user is authenticated
  4. User gains access to School B's settings (potentially containing contact info, billing details, etc.)
- **Why it matters**: Violates fundamental multi-tenancy; exposes school-specific configuration
- **Evidence**: Line 429 explicitly grants read/get to any authenticated user
- **Recommended Remediation**: Change to `allow read, get: if isAuthenticated() && (isSuperAdmin() || userSchoolId() == document);`
- **Confidence**: 100%

**SEVERITY: BLOCKER**
- **Finding**: AnalyticsEvents creation allows any authenticated user to create events for any school
- **Affected Component**: Firestore Security Rules
- **File**: firestore.rules
- **Line**: 1226
- **Attack Scenario**:
  1. User from School A authenticates
  2. Creates analytics event document with arbitrary schoolId in data
  3. Rule on line 1226 allows create because user is authenticated
  4. User can spam or pollute analytics data for any school
- **Why it matters**: Allows data pollution and potential denial of service for analytics systems
- **Evidence**: Line 1226 grants create to any authenticated user without school validation
- **Recommended Remediation**: Change to `allow create: if isAuthenticated() && (isSuperAdmin() || userSchoolId() == resource.data.schoolId);`
- **Confidence**: 100%

**SEVERITY: HIGH**
- **Finding**: PlatformBroadcasts list rule allows any authenticated user to enumerate all broadcasts
- **Affected Component**: Firestore Security Rules
- **File**: firestore.rules
- **Line**: 1299
- **Attack Scenario**:
  1. User from School A authenticates
  2. Lists platform broadcasts collection
  3. Rule on line 1299 allows list because user is authenticated
  4. User sees broadcasts intended for other schools or all schools
- **Why it matters**: Information disclosure of platform-wide communications
- **Evidence**: Line 1299 grants list to any authenticated user
- **Recommended Remediation**: Change to `allow list: if isSuperAdmin();` or implement proper school scoping
- **Confidence**: 100%

### Verified Security Controls:
- Most collections properly restrict access based on school ownership
- Users collection has strong protections against role/schoolId changes
- Finance collections generally require schoolId matching during mutations
- Super admin access is properly restricted to verified super admins

## 5. Backend / Admin SDK Authorization

### Authentication Middleware Verification:
- **authMiddleware** (server.js lines 759-788): Properly verifies Firebase ID tokens
- Sets `req.user` to decoded token claims
- Handles token expiration appropriately
- Does not perform additional user existence/firestore validation (acceptable risk)

### Endpoint Authorization Review:
Most endpoints properly derive schoolId from authenticated user's profile and validate permissions:

✅ **School Branding Update** (`/api/schools/branding`):
- Verifies caller is super admin OR school admin for target school
- Lines 1493-1499: Proper role and schoolId validation

✅ **Payment Setup** (`/api/schools/setup-payment`):
- Verifies caller is school admin for school OR super admin
- Lines 1934-1944: Proper authorization check

✅ **Parent Notices Endpoints**:
- `/api/parent/notices` (GET): Validates student-school linkage and requester permissions
- `/api/parent/notices/:noticeId/read` (POST): Multi-factor validation including notice-student-school relationship
- `/api/admin/parent-notices/:noticeId` (DELETE): Validates notice belongs to caller's school

### Areas for Improvement:

**SEVERITY: MEDIUM**
- **Finding**: Password reset endpoint lacks specific rate limiting
- **Affected Component**: Backend API
- **File**: server.js
- **Line**: 3196 (endpoint definition)
- **Attack Scenario**: 
  1. Attacker targets known email addresses
  2. Sends high-volume password reset requests
  3. Could lead to rate limiting external services (Resend) or facilitate account takeover if combined with token theft
- **Why it matters**: Could enable denial of service or support credential theft attacks
- **Evidence**: Endpoint lacks explicit `authLimiter` middleware (though has general `apiLimiter`)
- **Recommended Remediation**: Add `authLimiter` middleware to endpoint
- **Confidence**: 90% (endpoint does have general API limiter from line 597)

### Verified Security Controls:
- Admin SDK usage properly scoped to caller's school in most cases
- Custom token generation (parent login) properly validates inputs before creating tokens
- Role-based access control enforced in endpoints via middleware and explicit checks
- No obvious IDOR/BOLA vulnerabilities found in endpoint parameter handling

## 6. IDOR / BOLA Findings

### Verified Safe:
- Parent notices endpoints properly validate school ownership
- SMS sending endpoint properly validates school and checks wallet balance
- Payment verification endpoints use server-side validation with payment provider

### Findings:
**SEVERITY: LOW**
- **Finding**: Potential information exposure through error messages
- **Affected Component**: Various backend endpoints
- **Attack Scenario**: Error messages might leak internal details or validation hints
- **Why it matters**: Could aid attackers in reconnaissance or refinement of attacks
- **Evidence**: Various `console.error` statements and error responses
- **Recommended Remediation**: Implement consistent error handling that doesn't leak sensitive information
- **Confidence**: 70%

## 7. Authentication

### Strengths:
- Firebase Authentication properly integrated
- Custom token flow for phone-login properly validated
- AuthMiddleware verifies ID tokens on backend
- Session state properly cleared on logout
- Special handling for phone-number users (treated as parents)

### Potential Issue:
**SEVERITY: LOW**
- **Finding**: Phone-number parent login may not properly populate schoolId in user profile
- **Affected Component**: Auth flow (AuthContext.tsx, authProfile.ts, server.js)
- **Attack Scenario**: 
  1. Parent logs in via phone+DOB flow
  2. Custom token created with schoolIds claim
  3. loadUserProfile() else branch creates profile with schoolId: null
  4. User cannot access school data due to missing schoolId
- **Why it matters**: Could cause denial of service for legitimate phone-number parents
- **Evidence**: 
  - AuthContext.tsx lines 132-134 only store schoolId if truthy
  - loadProfile.ts lines 157-180 else branch sets schoolId: null
  - loadProfile.ts line 148 only extracts studentIds from customClaims, not schoolId
- **Recommended Remediation**: 
  - Extract schoolId from customClaims in loadUserProfile else branch
  - Or ensure phone-number parents get proper Firestore profiles with schoolId
- **Confidence**: 80% (based on code analysis, not observed behavior)

## 8. Role-Based Access Control

### Strengths:
- Firestore rules properly enforce role-based restrictions
- Users collection prevents unauthorized role/schoolId changes
- Backend endpoints properly check roles via middleware and explicit validation
- Super admin functions properly restricted to verified super admins

### Findings:
No critical role-based access control vulnerabilities identified. The combination of Firestore rules and backend validation appears to properly enforce role boundaries.

## 9. Firebase Storage

### Findings:
No explicit Firebase Storage rules file found in repository. Storage security relies on:
- Default Firebase Storage rules (likely restrictive)
- Backend validation for storage operations
- Frontend validation

**Recommendation**: Examine and document Firebase Storage rules to ensure proper school-based isolation.

## 10. Payment Security

### Strengths:
- Payment verification uses server-side validation with Paystack
- Payment recording happens via Admin SDK bypassing client-side rules
- Amount validation occurs server-side
- Webhook/callback handling appears properly validated

### Findings:
No critical payment security vulnerabilities identified in code review.

## 11. SMS / Notification Security

### Strengths:
- SMS sending validates school ownership
- SMS sending checks wallet balance before sending
- Audit trails maintained for SMS operations
- Rate limiting on SMS-related endpoints

### Findings:
No critical SMS security vulnerabilities identified.

## 12. Sensitive Data Exposure

### Findings:
No obvious sensitive data exposure (keys, passwords) visible in code snippets reviewed.
- Environment variables properly separated (.env vs .env.example)
- Firebase service account key properly stored in server/.env
- No apparent hard-coded credentials in frontend code

### Risk:
**SEVERITY: LOW**
- **Finding**: Potential exposure through error logging or debug endpoints
- **Why it matters**: Could leak internal details if debugging is enabled in production
- **Recommended Remediation**: Ensure debug mode disabled in production, audit logging doesn't leak sensitive data

## 13. Environment & Secrets

### Strengths:
- Environment variables properly managed
- Firebase service account key secured in backend
- Separation of frontend (VITE_) and backend variables
- .gitignore appears to exclude sensitive files

### Findings:
No obvious secret exposure in code review.

## 14. Input Validation / Injection

### Strengths:
- Input validation present in endpoints
- Custom token generation validates inputs
- Firestore queries appear to use parameterized approaches where visible

### Findings:
No obvious injection vulnerabilities identified in code review.

## 15. Rate Limiting / Abuse Protection

### Strengths:
- General API rate limiting implemented (300 req/15min)
- Authentication-specific rate limiting (120 req/15min)
- Endpoint-specific validation where appropriate

### Findings:
**SEVERITY: MEDIUM**
- **Finding**: Password reset endpoint lacks specific rate limiting
- **Already reported in Section 5**

## 16. CORS / HTTP Security

### Strengths:
- CORS properly configured with origin validation
- Security headers implemented (CSP, HSTS, etc.)
- Request size limits enforced
- Error handling avoids stack trace leakage

### Findings:
No obvious CORS or HTTP security misconfigurations identified.

## 17. Data Recovery / Backups

### Findings:
Backup mechanisms referenced in code (backups collection, management endpoints)
- No evidence of actual backup implementation gaps in code review
- Recommend verifying backup frequency, scope, and restore procedures

## 18. Audit Logging

### Strengths:
- Activity logging implemented for various operations
- Security-related events logged (login attempts, etc.)
- Admin actions appear to be logged

### Findings:
No obvious audit logging gaps identified in code review.

## 19. Dependency / Supply Chain

### Findings:
No dependency scanning performed in this audit (read-only restriction)
- Recommend running vulnerability scanners like npm audit or snyk in separate process

## 20. Attack Matrix

| Attack                                       | Preconditions               | Possible? | Evidence | Severity |
| -------------------------------------------- | --------------------------- | --------- | -------- | -------- |
| School A reads School B settings             | Authenticated School A user | Yes       | Firestore.rules line 429 | BLOCKER |
| School A creates analytics event for School B| Authenticated School A user | Yes       | Firestore.rules line 1226 | BLOCKER |
| School A lists all platform broadcasts       | Authenticated School A user | Yes       | Firestore.rules line 1299 | HIGH |
| School A reads School B users                | Authenticated School A user | No        | Firestore.rules lines 146-188 | NONE |
| School A modifies School B user role         | Authenticated School A user | No        | Firestore.rules lines 166-172 | NONE |
| Parent accesses another parent's data        | Authenticated parent        | No        | Multiple validations in endpoints | NONE |
| Teacher accesses another school's data       | Authenticated teacher       | No        | School-scoped queries in rules/endpoints | NONE |
| Unauthenticated user accesses protected data | No authentication           | No        | authMiddleware verification | NONE |
| Client manipulates payment ownership         | Authenticated user          | No        | Server-side validation with Paystack | NONE |
| Client abuses SMS endpoint                   | Authenticated user          | No        | School validation + wallet check | NONE |

## 21. Findings by Severity

**BLOCKER (2)**
1. Settings collection unrestricted read (firestore.rules line 429)
2. AnalyticsEvents creation without school validation (firestore.rules line 1226)

**HIGH (1)**
1. PlatformBroadcasts list rule too permissive (firestore.rules line 1299)

**MEDIUM (2)**
1. Password reset endpoint missing specific rate limiting (server.js line 3196)
2. Potential information exposure through error messages

**LOW (2)**
1. Phone-number parent schoolId population issue
2. Potential sensitive data exposure through logging

## 22. Verified Security Controls

1. Firebase ID token verification in authMiddleware
2. Role-based access control in Firestore rules for most collections
3. SchoolId validation in backend endpoints for school-scoped operations
4. Custom token generation validation (parent login flow)
5. Super admin restriction to verified super admins
6. Finance transaction validation with payment provider
7. SMS sending wallet balance checks
8. Proper cleanup of sensitive browser state on logout

## 23. Unknown / Cannot Verify

1. Actual Firebase Storage rules configuration
2. Exact behavior of phone-number parent login flow (would require testing)
3. Effectiveness of backup and disaster recovery procedures
4. Results of automated dependency vulnerability scanning
5. Penetration test results for business logic flaws

## 24. Recommended Remediation Plan

**Immediate Actions (Blocker/High):**
1. Fix firestore.rules line 429: Change to `allow read, get: if isAuthenticated() && (isSuperAdmin() || userSchoolId() == document);`
2. Fix firestore.rules line 1226: Change to `allow create: if isAuthenticated() && (isSuperAdmin() || userSchoolId() == resource.data.schoolId);`
3. Fix firestore.rules line 1299: Change to `allow list: if isSuperAdmin();` or implement proper school scoping
4. Add authLimiter to `/api/auth/send-password-reset-email` endpoint

**Short-term Actions (Medium/Low):**
1. Investigate and fix phone-number parent schoolId population issue
2. Implement consistent error handling to avoid sensitive data leakage
3. Examine and document Firebase Storage rules
4. Verify backup and disaster recovery procedures
5. Run dependency vulnerability scanning

## 25. Final Verdict

**NOT APPROVED — CRITICAL SECURITY ISSUES**

The authentication system contains critical vulnerabilities that allow authenticated users to access data belonging to other schools. These violations of multi-tenant isolation make the system unsuitable for production use as a SaaS platform without immediate remediation.

The two BLOCKER issues (unrestricted settings read and unrestricted analytics event creation) directly enable cross-school data access. The HIGH severity issue (broadcast enumeration) enables information disclosure that could aid further attacks.

Until these issues are resolved, the system cannot be considered secure for multi-tenant operation.

Stage 8 Audit: COMPLETE
Implementation: NONE (read-only audit)
Migration: NONE
Data writes: NONE
Security rules changed: NO (audit only)
Storage rules changed: NO
Indexes changed: NO
Dependencies changed: NO
Deployment performed: NO
Commit created: NO