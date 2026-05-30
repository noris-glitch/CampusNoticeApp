# Security and Privacy: Presentation Version

## 1) Authentication using Laravel Sanctum

- **Main side:** Backend
- Sanctum handles login security for the app.
- The frontend sends the email and password.
- The backend verifies credentials and issues or validates the session/token.
- The frontend stores auth state securely and sends it with later requests.

## 2) Role-based authorization

- **Main side:** Backend
- Roles decide what a user can do, such as student, admin, or super admin.
- The frontend may hide buttons for convenience.
- The backend must still block unauthorized access.
- Real protection happens on the server, not in the UI.

## 3) Password hashing

- **Main side:** Backend
- Passwords should never be stored in plain text.
- The frontend only collects the password.
- The backend hashes it before saving to the database.
- During login, the backend compares the submitted password to the hash.

## 4) Input validation

- **Main side:** Both, with backend as final authority
- The frontend checks input first to give quick feedback.
- The backend must validate again before saving anything.
- Client-side validation can be bypassed.
- Server-side validation protects the system.

## 5) Protection against SQL injection

- **Main side:** Backend
- SQL injection is a database attack.
- The backend should use parameter binding, Eloquent, or the query builder.
- User input should never be inserted directly into SQL strings.
- The frontend does not provide real protection here.

## 6) Protection against cross-site scripting (XSS)

- **Main side:** Mostly backend/web frontend
- XSS happens when unsafe content is rendered as code.
- The backend should escape or sanitize output.
- The frontend should avoid rendering untrusted HTML.
- This matters most in web views, browser views, or rich-text content.

## 7) Secure API access

- **Main side:** Both
- The frontend must call the API over HTTPS.
- The frontend should store tokens securely on the device.
- The backend must require authentication for protected routes.
- The backend should also rate-limit and authorize requests properly.

## 8) Data privacy for read receipts

- **Main side:** Backend
- Read receipts show whether a user has seen a notice.
- That is personal usage data.
- The backend should store only what is needed.
- Access to read receipts should be restricted.
- The frontend should only display the status clearly.

## 9) Audit logs for administrative actions

- **Main side:** Backend
- Audit logs record actions like approve, reject, delete, and publish.
- They should include who did it, what they did, and when.
- Logs must be created server-side so they are trustworthy.
- The frontend can display the logs, but should not be the source of truth.

## 10) Compliance with Kenya’s Data Protection Act

- **Main side:** Both, plus policy/process
- The app must handle personal data lawfully and fairly.
- The frontend should show privacy notices and consent prompts.
- The backend should control access, retention, and deletion.
- Users should be able to request access, correction, or deletion where required.
- Compliance is not just code; it also includes policy and process.

## One-Line Summary

- Authentication with Sanctum: **backend**
- Role-based authorization: **backend**
- Password hashing: **backend**
- Input validation: **both**
- SQL injection protection: **backend**
- XSS protection: **mostly backend/web frontend**
- Secure API access: **both**
- Read-receipt privacy: **backend**
- Audit logs: **backend**
- Kenya Data Protection Act compliance: **both + policy**

