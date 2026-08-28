# BARANGAY ZAPATERA E-GOVERNANCE & DOCUMENT MANAGEMENT SYSTEM
**Automated Document Issuance, Resident Management & Security Information Platform**

[![Project Status: Completed](https://img.shields.io/badge/Status-Completed-success.svg)](https://github.com/Adamskie16/Adam-CAPSTONE-WEB-ZAPATERA-)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![Database: Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E.svg)](https://supabase.com)
[![Platform: Web%20%7C%20Mobile](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile-blue.svg)](https://github.com/Adamskie16/Adam-CAPSTONE-WEB-ZAPATERA-)

---

## 📋 Table of Contents
- [1. Project Description & Purpose](#1-project-description--purpose)
- [2. Key System Features](#2-key-system-features)
- [3. Setup & Installation Instructions](#3-setup--installation-instructions)
- [4. File Structure Explanation](#4-file-structure-explanation)
- [5. Security & Authentication Controls](#5-security--authentication-controls)
- [6. Automated Security Testing](#6-automated-security-testing)
- [7. Contact Information](#7-contact-information)
- [8. License](#8-license)

---

## 1. Project Description & Purpose

### 🌟 Overview
The **Barangay Zapatera E-Governance & Document Management System** is a unified, multi-portal web and mobile information system engineered specifically for **Barangay Zapatera, Cebu City, Philippines**. The platform transforms traditional paper-based barangay public service workflows into an automated, secure, and transparent digital ecosystem.

### 🎯 Purpose & Target Users
- **Barangay Residents**:
  - Request official certifications online (*Barangay Clearance, Certificate of Indigency, Certificate of Residency, Business Clearance, Barangay ID*).
  - Track real-time status of submitted applications.
  - Receive 6-digit MFA verification codes sent directly to their registered Gmail inbox.
  - View community announcements, schedules, and barangay notices.
- **Barangay Administrative Staff (Admin)**:
  - Review, evaluate, and verify resident document applications.
  - Electronically generate, customize, and issue official digital certificates with automated tracking numbers (e.g., `BZ-2026-XXXX`).
  - Publish barangay events, announcements, and notices.
  - Safely view user credentials and manage account lock/unlock status with administrator authorization.
- **Super Administrators & Account Management**:
  - Complete control over system credentials, user accounts, and role-based access permissions (RBAC).
  - Monitor 3-consecutive-failed-attempt account lockouts and pending unlock queues.
  - Authorize secure one-click account unlocks.
  - Review immutable system activity audit logs and processing reports.

---

## 2. Key System Features

- **Document Generator & Template Engine**: Automatically generates formatted official certificates with barangay seals, officials' signatures, dynamic resident details, and anti-fraud tracking codes.
- **3-Attempt Account Lockout Guard**: Automatically locks accounts after 3 consecutive wrong password attempts, creates a pending unlock request in the database, and blocks unauthorized logins until unlocked by an authorized administrator.
- **Server-Side Rate Limiting**: Protects all authentication endpoints against brute-force and credential stuffing attacks (max 5-10 requests per 15-minute window).
- **Two-Factor Authentication (MFA OTP)**: Integrated with Supabase Auth to dispatch 6-digit email OTPs to verified Gmail addresses.
- **Immutable Security Audit Trail**: Logs all authentication attempts, lockouts, administrative unlocks, and system changes to `activity_logs`.
- **Responsive Web & Mobile Support**: Native mobile app for residents (React Native / Expo) and modern responsive web portals for administrators (React + Vite + Tailwind/Vanilla CSS).

---

## 3. Setup & Installation Instructions

Follow these step-by-step instructions to clone, install, and run all portals of the project locally.

### ⚙️ Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (Node Package Manager, bundled with Node.js)
- **Git** - [Download Git](https://git-scm.com/)
- **Expo Go App** (Optional, for testing Resident mobile app on physical Android/iOS devices)

---

### 📥 Step 1: Clone the Repository
Open your terminal (PowerShell, Command Prompt, or Bash) and clone the repository:
```bash
git clone https://github.com/Adamskie16/Adam-CAPSTONE-WEB-ZAPATERA-.git
cd Adam-CAPSTONE-WEB-ZAPATERA-
```

---

### 🌐 Step 2: Supabase Backend Database Setup
1. Create a project at [Supabase.com](https://supabase.com).
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Run the database migration script located at:
   ```
   supabase/migrations/20260821_account_lockout_and_rate_limit.sql
   ```
   *(This initializes `profiles`, `account_unlock_requests`, `rate_limits`, and `activity_logs` tables with appropriate RLS policies).*

---

### 🚀 Step 3: Run the Portals Locally

Each portal is modular and can be launched in separate terminal windows:

#### 1. SuperAdmin Portal (Web)
```bash
cd SuperAdmin
npm install
npm run dev
```
> SuperAdmin dashboard will open locally at `http://localhost:5173` (or the port specified in terminal).

#### 2. Barangay Admin Portal (Web)
```bash
cd Admin
npm install
npm run dev
```
> Admin operations portal will open locally at `http://localhost:5174`.

#### 3. Account Management Portal (Web)
```bash
cd AccountManagement
npm install
npm run dev
```
> Account Management portal will open locally at `http://localhost:5175`.

#### 4. Resident Portal (Mobile / Web App)
```bash
cd Resident
npm install
npx expo start
```
> Press `w` in the terminal to run in a web browser, or scan the QR code using the **Expo Go** mobile app on Android/iOS.

---

## 4. File Structure Explanation

The repository follows a clean, modular multi-app monorepo structure:

| Folder / File Path | Description |
| :--- | :--- |
| 📁 `SuperAdmin/` | **Super Administrator Web Portal** — User provisioning, system configuration, account lockout management, reports, and activity logs. |
| 📁 `Admin/` | **Barangay Admin Web Portal** — Document processing, clearance requests inbox, approved digital certificates, community events, and user security management. |
| 📁 `AccountManagement/` | **Dedicated Account Management Portal** — Role creation (SuperAdmin, Admin, Resident), account lock/unlock controls, and credential management. |
| 📁 `Resident/` | **Resident Mobile & Web App (React Native / Expo)** — Online document application forms, OTP authentication, application status tracker, and notifications. |
| 📁 `supabase/` | **Backend Database Migrations** — SQL schemas for profiles, lockout tracking, unlock request queues, and rate limits. |
| 📁 `src/__tests__/` | **Automated Security Test Suite** — Test runner validating 3-attempt lockouts, rate limiting, and administrative unlock workflows. |
| 📄 `README.md` | Comprehensive system documentation, setup instructions, and architecture guide. |
| 📄 `LICENSE` | Proprietary software license terms. |

---

## 5. Security & Authentication Controls

1. **3 Consecutive Failed Password Attempts**:
   - Failed attempts are tracked securely in `public.profiles` and persistent storage.
   - On the 3rd failed password attempt, the account is immediately locked (`is_locked: true`, `is_active: false`).
   - A pending unlock request is automatically dispatched to `public.account_unlock_requests`.
2. **Preventing Login on Locked Accounts**:
   - Any login attempt on a locked account is immediately rejected with:
     > *"ACCOUNT LOCKED OUT: 3 consecutive failed login attempts detected. Please contact Barangay Zapatera administration to unlock your account."*
3. **Admin Unlock Action**:
   - Super Admins and Admins can review locked accounts in the **User Account Management** view.
   - Authorizing an unlock resets `failed_attempts = 0`, marks `is_locked = false`, restores access, and logs the administrator's identity to `activity_logs`.
4. **Rate Limiting**:
   - Server-side rate limiting prevents automated credential attacks.

---

## 6. Automated Security Testing

You can run the built-in automated authentication security test suite using Node.js:

```bash
node src/__tests__/auth_security.test.js
```

### ✅ Test Suite Coverage:
- **Test 1**: 1st Failed Login Attempt (Counter = 1)
- **Test 2**: 2nd Failed Login Attempt (Counter = 2)
- **Test 3**: 3rd Failed Attempt Triggering Account Lockout (`is_locked = true`)
- **Test 4**: Attempting Correct Password While Locked (Access Denied)
- **Test 5**: Unauthorized Non-Admin Attempting Unlock (Access Rejected)
- **Test 6**: Authorized Administrator Unlocking Account (`failed_attempts` reset to 0)
- **Test 7**: Login Post-Unlock with Correct Password (Access Restored)
- **Test 8**: Server-Side Rate Limiting Threshold Enforcement
- **Test 9**: Audit Trail Logging Verification

---

## 7. Contact Information

For inquiries, technical support, or project presentations, please reach out to the project team:

- **Lead Developer & Team Representative**: Adamskie (Mardee)
- **Email**: [mardee131@gmail.com](mailto:mardee131@gmail.com)
- **GitHub**: [@Adamskie16](https://github.com/Adamskie16)
- **Institution / Barangay**: Barangay Zapatera Capstone Project Team, Cebu City, Philippines

---

## 8. License

This software is **Proprietary and Confidential**. All rights reserved.

Copyright (c) 2026 Adamskie (Barangay Zapatera Capstone Project Team).

Unauthorized copying, distribution, modification, public display, or reverse engineering of this source code, via any medium, is strictly prohibited without explicit written permission from the copyright owners. For full license details, refer to the [LICENSE](./LICENSE) file.
