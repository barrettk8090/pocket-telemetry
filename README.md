# DIMO Mobile Telemetry Explorer

A modern, mobile-friendly GraphQL query builder for the DIMO Telemetry API. This full-stack application allows you to easily explore vehicle telemetry data with a beautiful, responsive interface.

![DIMO Telemetry Explorer](https://img.shields.io/badge/DIMO-Telemetry_Explorer-blue?style=for-the-badge&logo=react)

## 🚀 Features

- **📱 Mobile-First Design** - Optimized for mobile devices with responsive layouts
- **🔐 Full Authentication Flow** - Automatic Vehicle JWT generation using DIMO Python SDK
- **📊 Dual Query Support** - Both `signalsLatest` and historical `signals` queries
- **🎯 Smart Aggregations** - Automatic Float vs String aggregation detection
- **✨ Modern UI** - Beautiful gradients, animations, and visual feedback
- **🔧 Developer Friendly** - Built-in query generation and copying

## 🏗️ Architecture

This is a full-stack application with:
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI + DIMO Python SDK
- **API Proxying**: Vite dev server handles CORS and routing

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ and pip
- **DIMO Developer License** - Get one at [DIMO Developer Console](https://console.dimo.org)

## 🛠️ Installation

### 1. Clone and Install Frontend
```bash
git clone <your-repo-url>
cd dimo-mobile-telemetry
npm install
```

### 2. Install Backend Dependencies
```bash
pip install -r requirements.txt
```

## 🚀 Running the Application

You need to run both the frontend and backend servers:

### Terminal 1: Start Backend Server
```bash
# Option 1: Using the startup script
python start-backend.py

# Option 2: Direct uvicorn command
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2: Start Frontend Server
```bash
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔑 Setup & Configuration

1. **Get DIMO Developer Credentials**:
   - Visit [DIMO Developer Console](https://console.dimo.org)
   - Create a Developer License
   - Note your Client ID, Redirect URI, and API Key

2. **Find a Vehicle Token ID**:
   - Use the [DIMO Identity API](https://identity-api.dimo.zone) to find available vehicles
   - Or ask a DIMO vehicle owner to share their token ID

3. **Use the App**:
   - Open the app and go to the "Auth" tab
   - Fill in your Developer License details
   - Click "Get Vehicle JWT" - it will automatically authenticate!
   - Switch to "Query" tab to build and execute queries

## 📱 How to Use

### Authentication Tab
1. Enter your **Client ID** (from Developer License)
2. Enter your **Redirect URI** (your domain)
3. Enter your **API Key** (private key)
4. Enter the **Vehicle Token ID** you want to query
5. Click **"Get Vehicle JWT"** - the backend will handle all authentication steps!

### Query Tab
1. **Choose Query Type**:
   - **Latest Signals**: Current values only
   - **Historical Signals**: Time series data with date ranges

2. **Select Date Range** (for historical queries):
   - Pick start and end dates
   - Choose aggregation interval (1h, 6h, 12h, 24h, 1 week)

3. **Pick Signals**:
   - Browse categorized signals (Location, Engine, Battery, etc.)
   - Click to select/deselect signals
   - For historical queries, choose aggregation methods per signal

4. **Execute Query**:
   - Review the generated GraphQL query
   - Click "Execute Query" to run it
   - View results in the Results tab

### Results Tab
- View raw JSON responses
- See parsed signal values in a user-friendly format
- Different layouts for latest vs historical data

## 🎨 Signal Categories

- **📍 Location**: GPS coordinates, altitude
- **🚗 Vehicle Status**: Speed, ignition, odometer, powertrain type
- **🔋 Battery & Fuel**: Charge levels, fuel levels, charging status
- **⚙️ Engine**: RPM, temperature, oil level, throttle position
- **🛞 Tire Pressure**: All four wheel pressures
- **🌡️ Environment**: Temperature, barometric pressure
- **📶 Device/Network**: WiFi status, connection state
- **🔧 Diagnostics**: Error codes, runtime

## 🔧 API Endpoints

The backend provides:

- `POST /api/auth/vehicle-jwt` - Generate Vehicle JWT from credentials
- `GET /health` - Health check endpoint
- `GET /` - API status and information

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Install dependencies
pip install -r requirements.txt

# Check Python version
python --version  # Should be 3.8+

# Run with verbose logging
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

### Frontend Build Issues
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node version
node --version  # Should be 18+
```

### Authentication Errors
- ✅ Check your Client ID is correct (should start with `0x`)
- ✅ Verify your API Key is the private key, not public
- ✅ Ensure Redirect URI matches your Developer License configuration
- ✅ Confirm the Vehicle Token ID exists and you have permissions

### CORS Issues
The Vite development server handles CORS automatically. If you encounter CORS issues:
1. Ensure both servers are running on correct ports
2. Check the `vite.config.js` proxy configuration
3. Verify backend CORS middleware is configured properly

## 🔗 Useful Links

- [DIMO Developer Documentation](https://docs.dimo.org/developer-platform)
- [DIMO Python SDK](https://pypi.org/project/dimo-python-sdk/)
- [DIMO Telemetry API](https://telemetry-api.dimo.zone)
- [DIMO Developer Console](https://console.dimo.org)

## 📄 License

MIT License - feel free to use this for your own DIMO projects!

---

Built with ❤️ for the DIMO ecosystem
