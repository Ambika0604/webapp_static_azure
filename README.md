# Xbox Valencia Report Dashboard

A React-based interactive dashboard for visualizing Xbox Valencia subscription data. Built with Vite, Chart.js, and a dark Xbox Metrics-style theme.

## Prerequisites

- **Node.js** v18 or higher
- **npm** v9 or higher

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd webapp_static
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`.

4. **Build for production**

   ```bash
   npm run build
   ```

   Output is generated in the `dist/` folder.

5. **Preview the production build**

   ```bash
   npm run preview
   ```

## Project Structure

```
webapp_static/
├── public/
│   └── Seats_STAT.ss.csv    # Subscription data (CSV)
├── src/
│   ├── App.jsx              # Main dashboard component
│   ├── App.css              # Dashboard styles (dark theme)
│   ├── index.css            # Base/reset styles
│   └── main.jsx             # React entry point
├── index.html               # HTML entry
├── package.json
└── vite.config.js
```

## Features

- Dark theme inspired by Xbox Metrics dashboard
- Interactive slicers: Country, Year-Month, Secondary Holder Count
- Cross-filtering — click any chart element to filter the entire dashboard
- KPI cards: Total Subscriptions, Total Seats, Avg Seats/Sub, Countries
- Charts: Bar (by SHC), Line (trend over time), Doughnut (country split), Observations panel

## Data

The dashboard reads `public/Seats_STAT.ss.csv` at runtime. CSV columns:

| Column     | Description                        |
|------------|------------------------------------|
| SubCount   | Number of subscriptions            |
| SeatsCount | Number of seats per subscription   |
| Country    | Country name                       |
| YM         | Year-month in `YYYYMM` format     |

To use your own data, replace the CSV file keeping the same column format.

## Deployment

This app is configured for **Azure Static Web Apps**. Run `npm run build` and deploy the `dist/` folder, or use the Azure SWA CLI / GitHub Actions for CI/CD.
