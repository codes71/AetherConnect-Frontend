## 1. Core Operational Directives

### Plan & Confirm Workflow
- **Step 1: Code/File Analysis**
  - Gemini must always read all relevant files and code sections related to a reported issue, feature request, or conflict.  
  - Never act on assumptions; gather sufficient context before proposing changes.

- **Step 2: Plan Proposal**
  - Present a **clear, step-by-step plan** that specifies:
    - Which files will be created, edited, or deleted.
    - The exact nature of the changes (functions, imports, logic, configs, etc.).
    - The reasoning behind each change.

- **Step 3: User Approval**
  - Ask for explicit approval from the user before executing changes.

- **Step 4: Execute**
  - Once approved, apply the changes precisely as planned.  

---

### Conflict Resolution & Reporting
When handling bugs, conflicts, or errors:  
1. **Analyze deeply**: Check code, dependencies, configs, and environment.  
2. **Report clearly**:
   - Why the issue is occurring.
   - What is triggering it.
   - How the solution will resolve it.  
3. **Evidence-based fixes only**:  
   - Do not remove, add, or rewrite major sections of code without proof and reasoning.  
   - Every fix must be traceable to its root cause.  

---

### User Collaboration
-Gemini has the **right to question all instructions**.  
- If an instruction appears conflicting, incomplete, or risky:
  - Gemini must pause and clarify before taking any action.  
- The user and Gemini must resolve conflicts **together, step by step**.

---

### Progress Tracking
- Gemini must maintain **persistent memory of project status**.  
- At the start of each session:  
  1. Cross-reference with `backend.md` and prior progress notes.  
  2. Determine the last completed step.  
  3. Identify the next logical step in the roadmap.  
- Always assume the **environment is the project root directory** of a `pnpm` workspace.  

---

## 2. Session Logs

### Session: 2025-09-18

This session involved extensive debugging of the frontend authentication flow, followed by a general security review and system analysis.

**1. Authentication Flow Debugging (Solved)**

*   **Initial Issue:** Application was unusable due to a "Token replay attack detected" error, preventing users from logging in or refreshing their session.
*   **Investigation & Fixes:**
    1.  **Race Condition:** Identified and fixed a race condition in `api.ts` where multiple components were triggering token refresh simultaneously.
    2.  **`HttpOnly` Cookie Handling:** Discovered that client-side code was ineffectively trying to clear `HttpOnly` cookies. Corrected the logic in `auth-context.tsx` to call the backend logout endpoint, delegating cookie clearing to the server.
    3.  **Infinite Loop:** The previous fix introduced an infinite loop because the `/logout` endpoint itself required authentication. Resolved this by updating the `api.ts` interceptor to ignore 401 errors from the logout endpoint.
    4.  **Backend Config Issue:** Diagnosed that the backend was sending invalid cookie headers (`SameSite=None` without `Secure` on HTTP), which caused the browser to reject them and prevented the invalid token from being cleared. Advised the user on the backend fix and provided a manual workaround.
    5.  **Incorrect Middleware Routing:** Identified the root cause of incorrect redirects was `middleware.ts` making auth decisions based on cookie existence, not validity. Disabled the faulty logic in the middleware, making the client-side `AuthProvider` the single source of truth.
    6.  **Login Page Accessibility:** Fixed a logic flaw in `auth-context.tsx` that prevented authenticated users from being redirected away from the `/login` page. The provider now correctly checks auth status on every app load.

**2. `next/image` Configuration (Solved)**

*   **Issue:** The landing page crashed because the external image host `picsum.photos` was not configured in `next.config.js`.
*   **Fix:** Added the required `remotePatterns` configuration to `next.config.js`.

**3. Security & Standards Review (Completed)**

*   **Request:** User asked for a review of the frontend application against industry standards for security and navigation.
*   **Actions:**
    1.  **Configuration Review:** Analyzed `next.config.js`, `package.json`, and `tsconfig.json`. Confirmed good security headers and strict TypeScript settings.
    2.  **Dependency Audit:** Ran `pnpm audit` and found no known vulnerabilities.
    3.  **Auth Logic Review:** Confirmed the corrected authentication and session management logic in `auth-context.tsx` and `api.ts` is robust and follows best practices (`HttpOnly` cookies, interceptor for token refresh).
    4.  **Code-level Security:** Searched for and confirmed the absence of `dangerouslySetInnerHTML` to mitigate XSS risks.
    5.  **Improvement:** Implemented a conditional logger in `lib/utils.ts` to silence console output in production and refactored existing code to use it.
*   **Conclusion:** The application now follows modern security and navigation standards. Recommended adding a `Content-Security-Policy` header as a future enhancement.

**4. System & Firefox Stability Inquiry (Completed)**

*   **Issue:** User reported that Firefox was crashing and asked about their system's display manager.
*   **Actions:**
    1.  **System Identification:** Identified the display manager as `gdm3` by inspecting systemd services.
    2.  **Research & Recommendation:** Researched the stability of Firefox on Wayland vs. X11. Explained that while Wayland is the future, X11 is often more stable for applications with compatibility issues. Advised the user to switch their session to "GNOME on Xorg" via the login screen to resolve the crashes.