Absolutely! Here are the **User Requirements** for the **Bensco Susu System**, organized by user role and directly reflecting your project’s goals.

---

## ✅ USER REQUIREMENTS DOCUMENT

### 📌 Overview

The Bensco Susu System serves three primary user roles:

1. **Company Owner (Admin)**
2. **Field Workers (Collectors)**
3. **Clients** (Indirect end-users who receive service via collectors)

Each user has unique responsibilities and expectations in the system.

---

## 👤 1. Company Owner (Admin)

### 🔹 Functional Requirements

The Admin must be able to:

* ✅ Log into the **admin dashboard** securely.
* ✅ Create new **worker/collector accounts** with login credentials.
* ✅ Create, edit, and deactivate worker accounts.
* ✅ Assign workers to specific clients or regions..
* ✅ View all daily/weekly/monthly **contributions** across all workers.
* ✅ View each worker’s total collections and client histories.
* ✅Filter data by date, worker, or client.
* ✅ Approve and track **payouts** when a savings cycle completes.
* ✅ Export reports in **CSV or PDF format**.
* ✅ Receive **notifications/alerts** when:

  * A payout is due.
  * A worker requests a payout.

### 🔹 Non-Functional Requirements

* System should be **easy to use** with basic computer skills.
* Dashboard should be **accessible on desktop or tablet**.
* Data should be updated in real-time or near real-time.
* Role-based access control (strict admin privileges).

---

## 👷 2. Field Worker (Collector)

### 🔹 Functional Requirements

The Worker must be able to:

* ✅ Login via email/password (credentials set by admin)
* ✅ View list of **clients** (optional/phase two).
Edit/correct entries before syncing (offline support).
* ✅ Enter daily **contributions** for each client.
* ✅ View their **collection history**.
* ✅ Receive alerts when a client's **savings cycle ends**.
* ✅ (Optional) Request a payout to the admin.

### 🔹 Non-Functional Requirements

* App must be **lightweight and fast**, optimized for Android.
* Should work in **low-connectivity areas** with offline support (phase 2).
* App should be **secure** (store no plain text passwords or tokens).

---

## 🧍 3. Clients (Indirect User)

> Clients don’t interact directly with the app but are served via workers.

### 🔹 Functional (Service-Based) Requirements

* ✅ Clients should be able to:

  * Confirm contributions via verbal or card-based records.
  * Receive SMS alerts (optional service):

    * On successful daily contributions.
    * When a payout is initiated or approved.

* ✅ Option to opt-in/out of SMS notifications.

### 🔹 Non-Functional

* SMS must be brief and cost-effective (GHS 0.05/unit).
* Communication should be **confidential and accurate**.

---

## 🔒 Cross-Cutting Requirements (All Users)

* ✅ **Data Integrity**: All transactions must be accurate and timestamped.
* ✅ **Security**:

  * JWT-based authentication
  * Encrypted storage (passwords, tokens)
* ✅ **Audit Trail**: Admin should be able to trace who did what and when.

---

## 📝 Optional Future Enhancements

* GPS tracking for workers
* Photo capture or ID verification of clients
* Wallet system for clients
* Offline-first data syncing

---

## 📦 Summary by Role

| Feature                  | Admin |  Worker | Client |
| ------------------------ | :---: | :-----: | :----: |
| Login/Authentication     |   ✅   |    ✅    |    ❌   |
| Create/Manage Users      |   ✅   |    ❌    |    ❌   |
| View/Add Clients         |   ✅   |   ✅\*   |    ❌   |
| Enter/View Contributions |   ✅   |    ✅    |    ❌   |
| Payout Management        |   ✅   | Request | Notify |
| Report Export            |   ✅   |    ❌    |    ❌   |
| SMS Notifications        |   ✅   |    ❌    |    ✅   |

---

## 🎨 **Visual Design Elements**

### **Color Scheme**
- **Primary**: Company brand color (likely green for money/savings theme)
- **Secondary**: Complementary blue for information
- **Success**: Green for completed actions
- **Warning**: Amber for pending items
- **Background**: Light gray or white
- **Text**: Dark gray/black for readability

### **Typography**
- **Headers**: Bold, 18-20px
- **Body text**: Regular, 14-16px
- **Small text**: 12px for timestamps and IDs
- **Button text**: Medium weight, 16px

### **Icons**
- **Style**: Outline or filled icons (consistent throughout)
- **Size**: 20-24px for buttons, 16-18px for navigation
- **Source**: Material Design or similar icon set
