# Security and Privacy Responsibilities

This guide explains where each security/privacy topic belongs in a Laravel + mobile app setup, and how it applies to this project.

## In This Project

- `src/` is the Expo mobile frontend.
- `backend_work/` contains backend code and API endpoints.
- In a Laravel architecture, the items below are mostly backend responsibilities, with the frontend handling user input, display, and safe token/session storage.

## Quick Rule

- If it decides who can log in, what data can be seen, what gets stored, or what gets logged, it is backend work.
- If it only collects input, displays output, or sends requests to the API, it is frontend work.

## Breakdown

| Topic | Main Side | Why | Frontend Role | Backend Role |
|---|---|---|---|---|
| Authentication using Laravel Sanctum | Backend | Sanctum issues and validates API/session authentication | Show login form, store token/session safely, attach auth on requests | Create tokens or session auth, protect routes, invalidate tokens |
| Role-based authorization | Backend | Only the server can safely enforce roles like student/admin/super_admin | Hide or show buttons for better UX | Enforce roles with policies, gates, or middleware |
| Password hashing | Backend | Passwords must never be stored in plain text | Collect the password only | Hash passwords before storage and verify them on login |
| Input validation | Both, but backend is the source of truth | Client-side checks can be bypassed | Validate for fast feedback | Re-validate every request before using the data |
| Protection against SQL injection | Backend | Injection happens in database queries | Never build SQL in the app | Use parameter binding, ORM/query builder, and safe raw queries |
| Protection against XSS | Mostly backend/web frontend | Unsafe HTML can execute scripts in web views or web pages | Avoid rendering unsafe HTML; sanitize rich text if needed | Escape output and sanitize stored content before returning it |
| Secure API access | Both | The frontend calls the API, but the backend must enforce security | Use HTTPS, send auth headers, store secrets securely | Require authentication, rate limit, validate origin/cookies where relevant |
| Data privacy for read receipts | Backend | Read receipts are personal usage data | Show the status clearly and collect consent where needed | Store only necessary receipt data, limit access, and define retention rules |
| Audit logs for administrative actions | Backend | Audit logs must be trustworthy and tamper-resistant | Show an activity history if needed | Record who did what, when, and from where |
| Compliance with Kenya’s Data Protection Act | Both, plus policy/process | Compliance is not just code | Display privacy notices, consent prompts, and rights-request screens | Enforce lawful processing, access control, minimization, retention, deletion, and logging |

## Topic-by-Topic Notes

### 1) Authentication using Laravel Sanctum

**Main side:** Backend

Sanctum is the backend authentication layer. It creates or validates the login session or API token. The frontend only sends credentials, stores the returned token/session safely, and includes authentication on later requests.

**What the frontend does**

- Shows the login screen
- Sends email/password to the API
- Stores the returned token or session securely
- Logs the user out by clearing local auth state

**What the backend does**

- Verifies the credentials
- Issues the Sanctum token or session
- Protects authenticated routes
- Revokes tokens on logout

### 2) Role-based authorization

**Main side:** Backend

The frontend may hide admin-only features, but that is only for usability. Real protection must happen on the server.

**What the frontend does**

- Hides buttons or screens the user should not see
- Adjusts menus based on role

**What the backend does**

- Checks whether the user is a student, admin, or super admin
- Blocks unauthorized actions
- Returns `403 Forbidden` when the role is not allowed

### 3) Password hashing

**Main side:** Backend

Passwords must be hashed before storage. The frontend should never store a plain password except temporarily in the login/register form.

**What the frontend does**

- Collects password input
- Sends it over HTTPS

**What the backend does**

- Hashes passwords with a secure algorithm
- Verifies passwords during login
- Rehashes when needed

### 4) Input validation

**Main side:** Both, with backend as the authority

Frontend validation improves user experience. Backend validation protects the system.

**What the frontend does**

- Checks required fields
- Warns about obvious mistakes early

**What the backend does**

- Re-checks every field
- Rejects bad data
- Normalizes and sanitizes values before saving

### 5) Protection against SQL injection and cross-site scripting

**SQL injection**

- **Main side:** Backend
- Use parameter binding, Eloquent, or the query builder instead of string-built SQL.

**XSS**

- **Main side:** Mostly backend/web frontend
- For a mobile app, classic browser XSS is less common, but it still matters if you:
  - render HTML in a WebView
  - build a web version of the app
  - display user-generated rich text

**What the frontend does**

- Avoids rendering unsafe HTML
- Sanitizes rich text if the app supports it

**What the backend does**

- Escapes output
- Sanitizes stored content if needed
- Never trusts user input in SQL or HTML

### 6) Secure API access

**Main side:** Both

The frontend must call the API correctly, but the backend must decide whether access is allowed.

**What the frontend does**

- Uses HTTPS
- Sends the auth token or session correctly
- Stores auth data in secure device storage
- Handles expired sessions gracefully

**What the backend does**

- Requires authentication on protected endpoints
- Validates tokens or sessions
- Applies rate limiting and access checks
- Returns only the data the caller is allowed to see

### 7) Data privacy for read receipts

**Main side:** Backend

Read receipts show whether a user has viewed a notice. That is personal usage data, so it should be handled carefully.

**What the frontend does**

- Shows whether a notice has been read
- Explains the feature to the user when needed

**What the backend does**

- Stores the minimum receipt data needed
- Limits who can see read-receipt information
- Applies retention rules
- Supports deletion or anonymization where appropriate

### 8) Audit logs for administrative actions

**Main side:** Backend

Audit logs should be created on the server so they cannot be easily altered by the client.

**What the frontend does**

- Displays an activity log if the UI includes one

**What the backend does**

- Records admin actions such as approve, reject, delete, publish, or edit
- Stores actor, timestamp, target item, and action details
- Protects logs from tampering

### 9) Compliance with Kenya’s Data Protection Act

**Main side:** Both, plus policy/process

Compliance is bigger than code. It includes technical controls, user notices, internal processes, retention rules, and handling user rights.

**What the frontend does**

- Shows a privacy notice
- Collects consent where the law requires it
- Lets users request access, correction, or deletion
- Explains why data is being collected

**What the backend does**

- Processes personal data lawfully and fairly
- Collects only what is needed
- Secures personal data
- Supports access, correction, deletion, and objection requests
- Keeps audit trails where needed
- Limits transfers and sharing of personal data

## Short Answer For Students

If they need a one-sentence answer for each item:

- Authentication with Sanctum: backend
- Role-based authorization: backend
- Password hashing: backend
- Input validation: both, but backend is final
- SQL injection protection: backend
- XSS protection: mostly backend/web frontend
- Secure API access: both
- Read-receipt privacy: backend
- Audit logs: backend
- Kenya Data Protection Act compliance: both, plus policy and process

## Official References

- Laravel Sanctum: https://laravel.com/docs/sanctum
- Laravel Authorization: https://laravel.com/docs/authorization
- Laravel Hashing: https://laravel.com/docs/hashing
- Laravel Validation: https://laravel.com/docs/validation
- Laravel Query Builder / SQL injection protection: https://laravel.com/docs/queries
- Laravel Blade escaping: https://laravel.com/docs/blade
- Kenya Data Protection Act, 2019: https://new.kenyalaw.org/akn/ke/act/2019/24/eng@2019-11-15
- ODPC data subject rights and data protection principles: https://www.odpc.go.ke/rights-of-a-data-subject/
- ODPC compliance guidance: https://www.odpc.go.ke/data-protection-compliance/

## Important Note

This is a technical explanation, not legal advice. If this project will store real student data, confirm the final compliance approach with a qualified legal or data protection professional.
