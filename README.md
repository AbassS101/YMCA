# YMCA Silver Spring Mobile App

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020.svg?style=flat&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB.svg?style=flat&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg?style=flat)](https://jestjs.io)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A cross-platform mobile application for **YMCA Silver Spring** (YMCA of Metropolitan Washington), providing members with quick facility access, class schedules, trainer booking, account management, and real-time staff messaging, alongside dedicated branch staff workflows.

---

## Features

### Member Experience
- **Digital Facility Pass**: Instant optical-ready barcode card for swift check-in at YMCA welcome desks with active status indicator.
- **Interactive Schedules**: Real-time browsing and filtering across Group Exercise, Aquatics & Lap Swim, Senior / AOA Friendly, Child Watch, and Branch Events with one-tap class bookmarking.
- **Trainer & Staff Hub**: Meet certified wellness coaches, view specialties and credentials, book 1-on-1 private training sessions, and chat directly with trainers or the front desk.
- **Branch Amenities**: Hours of operation, outdoor & heated indoor pool schedules, JOOLA-partnered pickleball court details, sauna & wellness floor info.
- **Account & Billing Management**: Next billing date summary, tokenized card-on-file updates (no raw card data stored), membership tier upgrades, and cancellation notice requests adhering to the 30-day YMCA policy.
- **Programs & Youth Care**: Information on YMCA Swim Academy, summer camps, drop-in Child Watch, and evidence-based community health programs (Diabetes Prevention, Blood Pressure Self-Monitoring).
- **Accessibility & Customization**: Dynamic text scaling (Standard, Larger, Largest) with responsive layouts and full Light / Dark theme support.

### Staff & Coach Experience
- **Today's Overview**: Daily schedule summary, booked member training sessions, and facility announcements.
- **Member Roster**: Searchable branch member directory with status filters and membership profiles.
- **Direct Messaging**: Manage incoming inquiries from assigned members and respond in real-time.
- **Cancellation Queue**: Review pending cancellation notices submitted through member self-service.

---

## Demo Accounts

Pre-configured credentials for quick testing:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Member** | `jordan@silverspring.ymca` | `ymca-demo` | Jordan Hale · Adult Membership · ID #448291 |
| **Staff (Trainer)** | `alex@silverspring.ymca` | `ymca-demo` | Alex Rivera · Certified Personal Wellness Coach |
| **Staff (Senior Specialist)** | `sarah@silverspring.ymca` | `ymca-demo` | Sarah Jenkins · Senior Mobility & Aquatics Coach |

> *Quick-fill buttons are provided on the login screen for rapid switching between roles.*

---

## Tech Stack

- **Core**: React Native 0.86, Expo SDK 57, Expo Router v4
- **Language**: TypeScript (Strict Mode)
- **UI & Layout**: Custom YMCA design system, Vanilla StyleSheet with theme tokenization
- **State & Storage**: React Context API + `@react-native-async-storage/async-storage`
- **Backend Port**: Ports & Adapters architecture (`ProtivityPort` with mock and live adapters)
- **Testing**: Jest, Jest-Expo, `@testing-library/react-native`

---

## Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm or yarn
- Expo Go on iOS or Android (optional, for device testing)

### Installation

```bash
# Clone repository
git clone https://github.com/AbassS101/YMCA.git
cd YMCA

# Install dependencies
npm install
```

### Running Locally

```bash
# Start Metro bundler
npm start

# Or run directly on a target platform:
npm run ios       # Open in iOS simulator (macOS required)
npm run android   # Open in Android emulator
```

Press `w` in the Metro terminal to view the application in your web browser, or scan the QR code with **Expo Go** on your physical phone.

### Running Tests

```bash
# Execute Jest test suites
npm test
```

---

## Architecture & Design

For deep architectural documentation, design patterns, and enterprise integration details, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## License

This project is licensed under the MIT License.
