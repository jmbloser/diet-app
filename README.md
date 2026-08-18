# NourishTrack

A diet-tracking app prototype: onboarding, goals, weight tracking, and meal photo logging with real nutrition analysis powered by Claude's vision.

## How it works

The app (`public/index.html`) is a mobile-first web app. It talks to a small local server (`server.js`) that receives your meal photo, sends it to Claude along with your goal, and gets back identified food items with calorie/macro estimates — asking a clarifying question first if the photo is ambiguous. Everything else (profile, goals, meal log, weight log) is stored in your phone's browser, nothing else leaves your device.

## 1. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign in or create an account.
2. Under **API Keys**, create a new key.
3. Add billing details if you haven't already — the vision calls this app makes are metered per request (a single photo analysis is a small fraction of a cent to a few cents depending on the model).

## 2. Set up the project

You'll need [Node.js](https://nodejs.org) (v18 or newer) installed on your computer.

```bash
cd nourishtrack-app
npm install
cp .env.example .env
```

Open `.env` and paste in your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## 3. Run it

```bash
npm start
```

You should see:

```
NourishTrack running at http://localhost:3000
```

On your computer, open `http://localhost:3000` to try it in a desktop browser (resize the window to see the mobile layout).

## 4. Open it on your phone

Your phone needs to reach your computer over the network, so both devices must be on the **same Wi-Fi**.

1. Find your computer's local IP address:
   - **Mac**: System Settings → Wi-Fi → Details (or run `ipconfig getifaddr en0` in Terminal)
   - **Windows**: run `ipconfig` in Command Prompt and look for "IPv4 Address"
2. On your phone's browser, go to `http://<that-ip>:3000` (e.g. `http://192.168.1.42:3000`)
3. Tap through onboarding, then try logging a meal — your phone's camera will open when you tap the photo box.
4. Optionally, add it to your home screen (Share → Add to Home Screen on iOS, ⋮ menu → Add to Home screen on Android) so it opens full-screen like a regular app.

Keep the `npm start` terminal window open — the phone is talking to that running process.

## Deploying it somewhere permanent (optional)

Running locally works for testing, but the server needs to stay running on your computer for the phone to reach it. To make it available anywhere (not just your home Wi-Fi), deploy `nourishtrack-app` to a host that runs Node servers, such as Render, Railway, or Fly.io — free tiers exist on most of these. The steps are similar everywhere:

1. Push this folder to a GitHub repo (or use the host's CLI to deploy directly).
2. Create a new "Web Service" pointing at the repo, with the start command `npm start`.
3. Add `ANTHROPIC_API_KEY` as an environment variable in the host's dashboard (not in a committed `.env` file).
4. Once deployed, open the host's provided URL from your phone — no shared Wi-Fi needed anymore.

## Notes on the AI analysis

- The model is set via `ANTHROPIC_MODEL` in `.env` (defaults to `claude-sonnet-5`). You can switch to a smaller/cheaper model if you want faster or lower-cost responses, at some cost to identification accuracy.
- If the request to Claude fails for any reason (no internet, missing key, rate limit), the app falls back to manual entry — you can still type what you ate and it'll match against a small built-in food database or accept a rough custom estimate.
- Nutrition figures are AI-generated estimates, not lab measurements. Treat them as directionally useful rather than precise, especially for homemade or mixed dishes.
