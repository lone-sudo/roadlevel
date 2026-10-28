# RoadLevel — Installation & Offline Setup Guide
### For Android Smartphones, iPhones, Laptops & Desktops

RoadLevel is engineered as an **offline-first Progressive Web App (PWA)**. Once opened or installed, all code, calculation engines, and databases are cached locally on your device. It requires **no internet connection** to perform full survey reductions, peg-marking offsets, dipping calculations, or on-device OCR digitisation.

---

## 📱 Part 1: Installing on Your Phone

### Option A: Direct Installation from Hosted / Deployed URL (Recommended for Site Use)

1. **Open the App in Mobile Chrome (Android):**
   * Open Google Chrome on your Android smartphone.
   * Navigate to your RoadLevel web address (e.g., your deployed URL or local network address).
2. **Install to Home Screen:**
   * Chrome will automatically show an **"Add RoadLevel to Home screen"** or **"Install app"** banner at the bottom of the screen.
   * If the banner does not appear automatically, tap the three dots menu (**⋮**) in the top right corner of Chrome.
   * Tap **"Install app"** or **"Add to Home screen"**.
   * Confirm by tapping **"Install"**.
3. **Launch as Standalone App:**
   * Return to your phone's home screen or app drawer.
   * Tap the **RoadLevel** icon (a surveyor's reticle and dumpy level symbol).
   * RoadLevel will launch in **full-screen mode** with no browser URL bar or navigation buttons.
4. **Offline Site Test:**
   * Put your phone in **Airplane Mode** (disconnect Wi-Fi and mobile data).
   * Open RoadLevel, add an observation, or compute a peg mark. Everything works seamlessly with zero signal!

### Option B: Installing on iPhone / iPad (iOS Safari)

1. Open **Safari** on your iPhone.
2. Navigate to your RoadLevel URL.
3. Tap the **Share** button (the square icon with an arrow pointing upward at the bottom of the screen).
4. Scroll down and tap **"Add to Home Screen"**.
5. Tap **"Add"** in the top right corner.
6. The RoadLevel icon is now on your home screen and operates as an independent offline app.

---

## 💻 Part 2: Installing and Running on Your Laptop / Desktop

### Method 1: Installing as a Desktop App via Chrome / Microsoft Edge

1. Open Google Chrome, Microsoft Edge, or Brave on your computer.
2. Navigate to the RoadLevel URL (or `http://localhost:5173` if running locally).
3. In the right side of the browser's address bar, click the **Install icon** (a small computer monitor or down-arrow symbol), or click the browser menu (**⋮**) $\rightarrow$ **"Install RoadLevel..."** / **"Apps $\rightarrow$ Install this site as an app"**.
4. Click **Install**.
5. RoadLevel will open in its own distraction-free window and can be pinned to your Windows Taskbar or macOS Dock.

### Method 2: Running Locally from Source Code

If you are developing or running the application directly on your workstation:

1. **Open Terminal / PowerShell in the project directory:**
   ```bash
   cd "C:\Users\USER\Downloads\Road Level"
   ```

2. **Install Dependencies (if not already installed):**
   ```bash
   npm install
   ```

3. **Start the Vite Development Server:**
   ```bash
   npm run dev
   ```
   * Open your browser to: `http://localhost:5173`

4. **Connect Your Phone to Your Laptop on the Same Wi-Fi:**
   To open and test the app on your phone while running it from your laptop:
   ```bash
   npm run dev -- --host
   ```
   * The terminal will display your Network IP address, for example:
     `Network: http://192.168.1.105:5173/`
   * On your phone, connect to the same Wi-Fi network and navigate to that address in Chrome!

5. **Build Production Bundle:**
   ```bash
   npm run build
   ```
   * This creates a production-ready, minified build with offline service workers and manifest in the `dist/` directory.

6. **Run Automated Test Suite:**
   ```bash
   npm test
   ```
   * Runs all 14 surveying mathematical verification tests via Vitest.

---

## ☀️ Site Usability Tips

* **Outdoor Sunlight Mode:** When working outside in direct sunlight on road construction sites, tap the **"Sunlight"** button in the top navigation bar. This toggles a ultra-high-contrast theme with bold black typography, high-contrast borders, and yellow accents to eliminate outdoor screen glare.
* **Large Touch Targets:** On mobile smartphones, the app includes a fixed bottom navigation bar with extra-large tactile buttons (minimum 48px touch targets) designed for easy one-handed operation and use with gloves or wet fingers on site.
* **Zero Cloud Dependency:** All observations, field book images, and calculations are stored inside your browser's persistent **IndexedDB database** on the device. No data is sent to external servers unless you explicitly export an Excel workbook or download a JSON backup.
