# GCSE French Vocabulary Tester

This is a mobile-friendly installable web app built from the Pearson Edexcel French vocabulary workbooks for GCSE and A-level.

There are now two versions in this folder:

- PC web app in the project root
- Android app project in `android-app/`

## Features

- Foundation and Higher tier vocabulary
- A-level French vocabulary
- GCSE, A-level, or combined study
- French to English, English to French, or mixed direction
- Written answers, multiple choice, flashcards, and mixed practice
- Subject and part-of-speech filters
- Starred words and a focus list for missed or revealed answers
- Challenge mode with a local leaderboard
- Offline support after first load
- Phone install support through Add to Home Screen

## Run it locally

1. In PowerShell, change into this folder.
2. Start a local server:

```powershell
py -m http.server 8000
```

If `py` is not available, use the bundled runtime:

```powershell
& 'C:\Users\Guy Ferguson\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' -m http.server 8000
```

3. Open [http://localhost:8000/index.html](http://localhost:8000/index.html)

## Put it on your phone

The app can run offline on your phone, but it needs to be opened from a normal website once so the phone can install and cache it.

### Best route

1. Upload this folder to a static host such as GitHub Pages, Netlify, or Cloudflare Pages.
2. Open that URL on your phone.
3. Install it:
   - iPhone Safari: Share -> Add to Home Screen
   - Android Chrome: menu -> Install app or Add to Home screen
4. Open the installed app once while online so it caches the files.
5. After that, it should work offline.

### Important note

If the app is only running from your computer's local server, your phone can only reach it while your computer is on and reachable. To use it anywhere without your computer, it needs to be hosted once on a normal web URL and then installed.

## Android app package route

If you want a proper Android app instead of a hosted website, use the Android project in `android-app/`.

Build notes are in:

`ANDROID-README.md`

## Refresh the vocabulary data

Run:

```powershell
& 'C:\Users\Guy Ferguson\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\scripts\extract_vocab.py
```
