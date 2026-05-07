# ComiFountain Update — Installation Guide

## Project Structure
```
manga-app/                          ← your existing project root
├── index.html                      ← REPLACE
├── vite.config.js                  ← REPLACE
├── package.json                    ← REPLACE
├── capacitor.config.json           ← REPLACE
├── public/
│   └── icon.png                    ← ADD (new icon)
├── android/
│   ├── app/src/main/
│   │   ├── java/com/fountainpdl/comifountain/
│   │   │   └── MainActivity.java   ← REPLACE
│   │   └── res/values/
│   │       └── styles.xml          ← REPLACE
│   │   └── res/mipmap-*/
│   │       └── ic_launcher*.png    ← REPLACE (copy from android-icons/)
└── src/
    ├── App.jsx                      ← REPLACE
    ├── main.jsx                     ← keep existing
    ├── store/index.js               ← REPLACE
    ├── styles/globals.css           ← REPLACE
    ├── sources/                     ← CREATE FOLDER, ADD ALL FILES
    │   ├── AllManga.js
    │   ├── MangaPuma.js
    │   ├── RavenScans.js
    │   ├── LocalSource.js
    │   └── index.js
    ├── hooks/                       ← keep existing
    ├── utils/                       ← keep existing
    ├── components/
    │   ├── common/
    │   │   └── SplashScreen.jsx    ← REPLACE
    │   └── reader/
    │       └── MangaReader.jsx     ← REPLACE
    └── pages/
        ├── MangaDetailPage.jsx     ← REPLACE
        ├── SearchPage.jsx          ← REPLACE
        └── SourcesPage.jsx         ← REPLACE
```

## Steps

1. Copy all files to their locations above
2. Copy android-icons/mipmap-*/ic_launcher*.png → android/app/src/main/res/mipmap-*/
3. Run in Termux:
   cd ~/manga-app
   npm install
   npm run build
   npx cap sync android
   git add .
   git commit -m "Full update: sources, reader, back button, icon, local fix"
   git push

## What's Fixed
- AllManga API 400 error — correct GraphQL queries
- fe.search is not a function — custom source search method rebuilt
- Local source now picks FOLDERS not files (webkitdirectory)
- Local manga chapters and covers now detected correctly
- Local manga remove from library now works
- Android back button goes to previous screen not out of app
- Search state persists when returning from detail page
- Reader rebuilt: chapter selector, settings panel (3 tabs), all reading modes
- New icon (ComiFountain Comics & Manga)
