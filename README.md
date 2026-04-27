# Ledger

A personal expense tracker PWA. Track expenses, loans, subscriptions, and budgets across all currencies.

**Live:** [shefahashmi.github.io/ledger](https://shefahashmi.github.io/ledger)

## Features
- Expense log with category auto-detection
- Budget tracking with progress bars
- Subscription management with next billing dates
- Loan tracking (lent & borrowed) with payment history
- 25 currencies + custom currency support
- Export JSON (full backup) and CSV
- Works offline as an installed PWA

## Structure
```
├── index.html        HTML structure
├── manifest.json     PWA manifest
├── sw.js             Service worker (offline)
├── icon-192.svg      App icon
├── icon-512.svg      App icon (large/maskable)
├── css/style.css     All styles
└── js/
    ├── data.js       Constants, state, storage, utilities
    ├── charts.js     Chart rendering
    ├── render.js     All render functions
    ├── import.js     Import/export/backup
    └── app.js        Navigation, forms, theme, boot
```
