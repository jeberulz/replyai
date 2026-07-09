# ReplyPilot browser extension (MVP)

Read-only conversation score badge on x.com / twitter.com, plus a one-click
deep link into the ReplyPilot workbench. **Never posts. Never fills the X
composer. No DOM automation of replies.**

## Load unpacked (Chrome / Edge)

```bash
# from repo root
npm run extension:build
```

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `extension/dist`

## Configure app origin

Click the extension icon (or Options) and set the ReplyPilot app origin:

- Local: `http://localhost:3000`
- Deployed: `https://your-app.example`

Deep links open `{origin}/dashboard?url={tweetUrl}&auto=1`, which starts the
existing analyze pipeline once the user is signed in.

## Develop

```bash
cd extension
npm install
npm run build
npm run typecheck
```

Source lives in `extension/src/`. Shared scoring helpers are imported from
`../shared/extensionBadge.ts` (same heuristic as the app).

## ToS posture

Content scripts only **read** visible engagement signals and inject a floating
badge owned by ReplyPilot. Opening Analyze uses `chrome.tabs.create` to the
ReplyPilot app — never X's reply UI.
