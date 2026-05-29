# Project Instructions: Precision Diagnostics Suite

## Overview
This application is a medical report analysis tool that uses AI to parse PDFs and images of lab results. It provides a multi-language interface and generates clinical insights in the user's preferred language.

## Internationalization (i18n)
The app uses a custom i18n system managed via:
- `/src/i18n.ts`: Defines the `Language` type, the `languages` list (including RTL support metadata), and the `translations` object.
- `/src/contexts/LanguageContext.tsx`: Provides the `LanguageProvider` and `useTranslation` hook.

### Supported Languages
Currently supports:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)
- Arabic (ar) - RTL
- Hindi (hi)
- Portuguese (pt)
- Japanese (ja)
- Urdu (ur) - RTL
- Hinglish (hi-en)
- Bengali (bn)
- Russian (ru)

### Adding New Languages
1. Update the `Language` type in `/src/i18n.ts`.
2. Add the language metadata to the `languages` array.
3. Add translations for all keys in the `translations` object.
4. Ensure `LanguageContext.tsx` handles direction (RTL) if applicable.

### Server-Side AI Language Support
The `analyzeReport` service passes the current UI language to the backend. The AI prompt in `server.ts` handles translating the generated analysis into the requested language.

## Styling Guidelines
- **Tailwind CSS**: Use utility classes for all styling.
- **Responsive Design**: Mobile-first approach. Adjust font sizes for character-heavy languages like Arabic, Hindi, or Bengali using the `cn` utility based on the `language` state.
- **RTL Support**: The app switches `dir="rtl"` on the document element when Arabic or Urdu is selected. Use Tailwind's logical properties or standard `rtl:` classes if specific alignment is needed.

## Key Components
- `Header.tsx`: Contains the language selector, theme toggle, and Firebase User Authentication (Google Login).
- `App.tsx`: Manages the active analysis mode (`lab`, `medicine`, `symptoms`) and coordinates the classification check. Features an enhanced symptoms entry UI with character counting and quick suggestions.
- `ReportUploader.tsx`: Handles file processing. Supports drag-and-drop and multiple file uploads (batch processing) for both PDFs and images.
- `AnalysisResult.tsx`: Renders the AI-generated analysis. Includes an interactive metric system with "Clinical Significance" info layers and a structured Traditional Remedies section.
- `FeedbackSystem.tsx`: A Firestore-backed component for collecting user ratings and qualitative feedback on analysis accuracy.

## Backend & Persistence
- **Firebase Auth**: Used for user identity.
- **Firestore**: Stores user feedback in the `feedback` collection.
- **Environment**: Sensitive keys are managed via server-side proxies to prevent browser exposure.

## Analysis Systems & Intelligent Classification
The app includes three specialized systems:
1. **Lab Analysis**: Processes blood tests, pathology, radiology (X-rays, CT, MRI, Ultrasound), and functional diagnostics (ECG, EEG, PFTs) via OCR. It uses international reference ranges or country-specific standards (e.g., ICMR for India) based on user location. Includes expanded insights: Associated Symptoms, Prevention Strategies, and Traditional/Herbal (Ayurvedic) remedies generated alongside the clinical findings. Metrics now include a `clinicalSignificance` field for deeper explanation on click.
2. **Medicine Analysis**: Analyzes prescriptions and medicine packaging photos via OCR. It provides comprehensive pharmacological insights including Indications, Side Effects, Potential Interactions, Generic Alternatives, Safe Usage Limits, and Contraindications.
3. **Symptoms Analysis**: Interprets user-provided symptoms and clinical descriptions via direct text input. Includes a refined text area with suggestions. It identifies possible conditions/diseases and provides associated prevention and traditional remedies.

**Traditional Remedies System**: Remedies are now structured with a `name`, `description`, and `context` (origin/usage), displayed as distinct visual cards.

**Safety & Allopathic Medicine**: The system is strictly configured to **NEVER** recommend allopathic (Western/pharmaceutical) medicines or dosages. This is a hard-coded safety constraint to prevent self-medication risks. All suggestions focus on clinical insights, lifestyle prevention, and safe traditional supportive care.

**Classification Guard**: The system uses an "intelligent classification" layer in the backend (`server.ts`). If a user uploads a document that does not match the active analysis mode, the system will detect the mismatch and trigger a localized error message. For Symptoms Analysis, the system verifies relevant clinical input.

## Recent Layout & UI Customizations
- **Clean Scrolling Boundaries (No Scrollbars)**: Standard browser scrollbars are globally hidden and hidden for `.custom-scrollbar` components using CSS reset utilities, creating an ultra-modern, fluid, and distraction-free presentation.
- **Removed "Standby Ready" Status**: Suspended unnecessary system telemetry headers (such as the redundant Standby Ready status board and simulate buttons) to maximize vertical scanning space for clinical results.
- **Accordion Control Sidebar**: The left panel's utility tools are divided into three distinct, self-contained interactive lists (instead of generic segmented tabs):
  1. *Medicine Alerts*: Managing autocomplete Rx searches, alert dates, alarms, daily toggles, voice readouts, and clear actions.
  2. *Instructions Guide*: Explaining analyzer modes, sample simulation triggers, and target threshold reference targets.
  3. *Vault Settings*: Holding local sandbox retention interval drop-downs, clear logs warn cards, and the standalone record comparison comparative grid portal.
- **Relocated Trend & Clinical Portals**: Removed the Trend Engine & Clinical Portal entry cards from the main screen context to maintain dashboard minimalism. They are now seamlessly integrated directly into the `AnalysisResult` screen as premium, context-specific 3-column interactive next steps alongside doctor discussion guidelines.
- **Bi-Directional Interactive Stepper**: Added an elegant, floating sticky progress stepper component to the top of the `AnalysisResult` view. It dynamically maps to **Summary**, **Metrics**, **Prevention**, and **Remedies** sections, highlighting the current section as the user scrolls (using an `IntersectionObserver`) and supporting click-to-scroll smooth navigation.

