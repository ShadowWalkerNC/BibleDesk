# BibleDesk Android

> **Offline-first Bible Study App for Android**  
> Read 6 public-domain translations (KJV, ASV, WEB, BBE, Darby, YLT), search with concordance, inspect Strong's Greek/Hebrew lexicons, and consult the 5-Dimension AI Study Assistant directly on your phone or tablet.

---

## Features

- **Offline Scripture Engine**: Bundled static modules allow reading, chapter navigation, and concordance search with zero data connection.
- **Strong's Greek & Hebrew Lexicon**: Instant touch lookup for 5,500+ Greek lemmas and 8,600+ Hebrew terms with transliteration and morphology.
- **Continuous Biblical Prose Reader**: Serif typography (Lora), gold superscript verse numbering, and fluid vertical scrolling.
- **5-Dimension AI Study Assistant**: Sourced answers covering Scripture, Historical Context, Original Languages, Systematic Theology, and Practical Application with BYOK Google Gemini key support.
- **WhatsApp & Discord 1-Click Sharing**: Share daily devotionals or study answers straight to church groups and family chats.

---

## Build & Run

### Prerequisites
- Node.js 20+
- Android Studio / Android SDK (API 34+)
- Java JDK 17+

### Quick Commands

```bash
# 1. Build web assets & sync to Android project
npm run build:android

# 2. Open in Android Studio
cd apps/android
npx cap open android

# 3. Build signed release APK
npx cap build android --android-releasetype=APK
```

---

## Sideloading the APK

1. Transfer `BibleDesk.apk` to your Android device via USB or direct download from `/download`.
2. Tap the `.apk` file and grant "Install unknown apps" permission when prompted.
3. Open BibleDesk and start reading immediately offline.
