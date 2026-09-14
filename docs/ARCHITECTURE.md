# YMCA Silver Spring Mobile Architecture

## Overview

This repository contains the mobile application for **YMCA Silver Spring** (YMCA of Metropolitan Washington), designed for both members and branch staff. The app provides digital facility access, class schedules and reservations, personal training bookings, membership billing management, direct staff messaging, and real-time branch information.

---

## Tech Stack

- **Framework**: React Native (0.86) with Expo SDK 57 & Expo Router v4
- **Language**: TypeScript (strict typing throughout)
- **UI Architecture**: Custom YMCA brand design system with full Dark/Light theme support and accessibility scaling (Standard, Larger, Largest)
- **State & Storage**: React Context + AsyncStorage persistent state with mock Protivity enterprise adapter
- **Testing**: Jest + React Native Testing Library + Jest Expo

---

## Directory Structure

```text
├── app/                        # Expo Router file-based routing
│   ├── (member)/               # Member flow & feature screens
│   │   ├── (tabs)/             # Member tab navigation (Home, Schedules, Trainers, Account)
│   │   ├── book-lesson.tsx     # 1-on-1 private lesson booking
│   │   ├── branch-amenities.tsx# Facility features, pool hours & courts
│   │   ├── change-membership.tsx # Membership tier upgrades & plans
│   │   ├── guest-pass.tsx      # Annual guest pass redemption
│   │   ├── programs.tsx        # Signature YMCA programs & youth care
│   │   ├── update-payment.tsx  # Secure tokenized payment update
│   │   └── cancel.tsx          # Membership cancellation notice workflow
│   ├── (staff)/                # Staff flow & management screens
│   │   └── (tabs)/             # Staff tabs (Today, Members, Messages, Profile)
│   ├── login.tsx               # Role-based authentication (Member / Staff)
│   └── _layout.tsx             # Root layout with theme & accessibility providers
├── src/
│   ├── components/             # Reusable UI components (MemberCheckInCard, ChatModal, ClassCard, etc.)
│   ├── context/                # Context providers (Session, Theme, Accessibility, Dialog)
│   ├── domain/                 # Core domain interfaces and TypeScript types
│   ├── protivity/              # Protivity enterprise integration layer (Port + Adapter pattern)
│   ├── repositories/           # Repository pattern data access layer
│   ├── storage/                # Persistent local storage & seed data
│   └── theme/                  # Design tokens, typography, radii, and color palettes
├── __tests__/                  # Unit and integration test suites
└── assets/                     # Static icons, splash screens, and brand imagery
```

---

## Key Architectural Highlights

### 1. Hexagonal / Ports & Adapters Integration (`src/protivity/`)
The app utilizes a clean Ports & Adapters pattern to interface with the YMCA's **Protivity** membership management software:
- `ProtivityPort.ts`: Defines strict enterprise contract interfaces for member profiles, membership tiers, class rosters, payments, and private trainer scheduling.
- `MockProtivityAdapter.ts`: Deterministic, in-memory/AsyncStorage implementation seeded with Silver Spring branch records.
- `LiveProtivityAdapter.ts`: Production-ready HTTP implementation stub for connecting to the actual Protivity REST API without altering application or screen layer logic.

### 2. Accessibility-First Design System (`src/context/AccessibilityContext.tsx`)
- Supports dynamic font scaling across standard, larger, and largest scales.
- High-contrast color ratios conforming to WCAG AA guidelines.
- Responsive layout containers designed to prevent UI truncation or badge overlap at extreme accessibility zoom levels.

### 3. Member Digital Pass & Check-In
- Instant digital barcode generation supporting optical scanners at YMCA welcome desks.
- Real-time membership status indicators and branch reciprocity privileges.

### 4. Direct Trainer & Staff Communication
- In-app messaging interface supporting direct member-to-trainer and member-to-front-desk communication.
- Comprehensive keyboard dismissal interactions, auto-scrolling, and responsive composer controls.
