# IFungi AI Desktop

Local AI agent for mushroom greenhouse optimization using computer vision and environmental monitoring.

## Features

- **Automated Analysis**: Daily scheduled captures with AI-powered recommendations
- **Manual Capture**: On-demand greenhouse monitoring with webcam integration
- **AI Vision**: Gemini 2.0 Flash analyzes visual crop conditions and sensor data
- **Secure**: Local photo storage with encrypted credential management
- **History**: Browse and review past analyses and recommendations

## Setup

1. **Install dependencies**:
   ```bash
   cd ifungi-ai-desktop
   npm install
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Add your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Firebase config will use the same values as the web app by default

3. **Run development mode**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build           # All platforms
   npm run build:win       # Windows only
   npm run build:mac       # macOS only
   npm run build:linux     # Linux only
   ```

## First Launch

1. Open the **Setup** page
2. Enter your Firebase credentials (email/password)
3. Enter your greenhouse ID
4. Select 1-2 webcams for monitoring
5. Set your preferred daily capture time
6. Click **Save & Test Connection**

## Usage

### Manual Capture
- Go to **Capture** page
- Preview live webcam feeds
- Add an optional description/note
- Click **Capture Now** to trigger immediate analysis

### View History
- Go to **History** page
- Browse past analyses with thumbnails
- Review AI rationale, confidence, and recommendations
- See approval/rejection status from web operators

## How It Works

1. **Capture**: Takes JPEG photos from selected webcams
2. **Read State**: Fetches current sensor readings and setpoints from Firebase RTDB
3. **Analyze**: Calls Gemini 2.0 Flash with vision prompt and greenhouse context
4. **Validate**: Clamps and validates AI recommendations against safe ranges
5. **Store**: Writes pending suggestion to Firebase, keeps full photos local

## Data Storage

- **Local photos**: `~/IFungi/captures/` (full resolution)
- **Firebase RTDB**: Only thumbnails and analysis results
- **Config**: Encrypted credentials in system keychain when available

## Security

- API keys stored using Electron `safeStorage` when available
- Firebase authentication via email/password
- Full-resolution photos never uploaded
- All sensitive data encrypted at rest

## Valid Ranges

The AI recommendations are automatically clamped to safe ranges:

- Temperature: 0-60°C
- Humidity: 0-100%
- CO (ppm): 0-1000
- CO₂ (ppm): 0-5000
- TVOCs (ppb): 0-2000
- Lux: 0-50000

## License

Private - IFungi Project
