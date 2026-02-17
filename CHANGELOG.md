# Changelog

## [Unreleased]

### Added
- Workout tracker app built with Expo + React Native + TypeScript
- Training screen: add exercises (pushup, squat, pullup, cardio, BODYPUMP, BODYCOMBAT, LEAP FIGHT), manage sets/reps/weight/variations
- Custom exercise support: create exercises with custom name, icon, color; delete via exercise selection dialog
- Workout timer: start/pause/reset/record total training duration per day
- Timer screen: interval timer (30s/60s/90s presets + custom time) and metronome (BPM control, 4/8 beat)
- Timer recording: save interval and metronome usage to daily workout records
- History screen: calendar with multi-dot marking per exercise type, daily workout detail view with "Training Content" summary
- Settings screen: yearly and monthly cumulative stats (training days, exercises, sets, workout duration, cardio/studio time), JSON data export
- Dark theme UI with blue primary color
- Zustand state management with AsyncStorage persistence

### Changed
- Exercise selection dialog uses vertical button list instead of horizontal chips
- Timer presets simplified to 30s, 60s, 90s
- Cumulative stats moved from history to settings screen; unified "累計" terminology
- "サマリー" renamed to "トレーニング内容"

### Fixed
- Custom exercise name input: switched from controlled TextInput (value prop) to uncontrolled (defaultValue + ref) to fix iOS IME kanji conversion issue
- Timer card size unified between interval and metronome modes with minHeight and consistent padding
- Workout timer display centered on training screen
