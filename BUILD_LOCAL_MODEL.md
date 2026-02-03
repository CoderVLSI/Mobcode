# Build Custom APK with Local LLM Support

The local model requires a custom build because llama.rn is a native module.

## Steps:

1. **Build the APK:**
```bash
eas build --platform android --profile preview
```

2. **Wait for build** (~15-20 minutes)
   - You'll get an email when it's done
   - Or watch the terminal for progress

3. **Download the APK:**
   - Click the link in the email
   - Or find it at: https://expo.dev/accounts/indiccoder/projects/Mobcode/builds

4. **Install on your phone:**
   - Uninstall the old version first
   - Install the new APK
   - Open the app

5. **Download the local model:**
   - Settings → Select "Local Qwen2.5 Coder 1.5B"
   - Click "Download Model" (wait for 1GB download)
   - Start chatting!

## Important:

- **The local model is SLOW** - cloud models are much faster
- **Cloud models are SMARTER** - better quality responses
- **Local model uses NO DATA** - works offline
- **Local model uses BATTERY** - runs hot on your phone

## Recommendation:

Use cloud models instead! They're faster, smarter, and more reliable.
