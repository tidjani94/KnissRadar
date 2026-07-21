# Beta Testing Guide — KnissRadar

## Goal
Test with 50 invited users before public Chrome Web Store launch.

## How to Invite Beta Testers

### Option 1: Chrome Web Store Unlisted
1. Build production extension: `npm run build`
2. Zip the `dist/` folder
3. Upload to Chrome Web Store Developer Dashboard
4. Set visibility to "Unlisted" (not public)
5. Share the direct link with beta testers

### Option 2: Side-by-Side Loading
1. Share the `dist/` folder with testers
2. Testers go to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the `dist/` folder

## Beta Tester Recruitment

### Target Users
- Regular Ouedkniss shoppers (25-45 years old)
- Tech-savvy enough to install extensions
- Willing to provide feedback

### Where to Find
- Ouedkniss Facebook groups
- Algerian tech forums
- University campuses
- Word of mouth

## Feedback Collection

### Create a Google Form with:
1. How often do you shop on Ouedkniss?
2. Did the price graph load correctly?
3. Did you receive price drop alerts?
4. Was the Telegram integration easy to set up?
5. Any bugs or issues encountered?
6. Would you recommend KnissRadar? (1-10)
7. Any feature suggestions?

### Beta Testing Duration
- 2 weeks minimum
- Daily check-ins for first 3 days
- Weekly feedback surveys

## Beta Tester Incentives
- Free Pro tier for 3 months
- Early access to new features
- Name in "Contributors" section

## Known Issues to Watch For
- [ ] Extension loads on all ouedkniss.com/annonce/* pages
- [ ] Price graph shows data (not just sample data)
- [ ] Telegram bot sends alerts correctly
- [ ] No performance issues on low-end devices
- [ ] Works on Chrome latest + Chrome-1 versions
