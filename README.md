# MUNCHIES - Chaos Edition 🎮

A fast-paced Party Brawler game built with Three.js (r128), designed for React Native and optimized for Cordova Android APK conversion.

## 🎯 Game Features

### Core Gameplay
- **60-Second Rounds**: Quick, intense matches with a countdown timer
- **WASD Controls**: Smooth character movement with keyboard or touch
- **Dash Mechanic**: Spacebar to dash into opponents and steal their fruits (costs stamina)
- **Bot Opponents**: 3 AI-controlled bots that compete for fruits

### Visual Style
- **Orthographic Camera**: Isometric view for a unique perspective
- **Toon Shader**: Inverted hull technique creates bold black outlines on all objects
- **Low-Poly/Voxel Aesthetic**: Bright, vibrant colors with procedural graphics
- **Procedural Fallbacks**: If assets fail to load, the game generates geometric primitives

### Chaos System 🌪️
Every 20 seconds, a random chaos event triggers:
1. **Tiny Titans**: All players shrink
2. **Giant Brawl**: Everyone becomes huge
3. **Speed Demon**: Global speed boost
4. **Slippery Floor**: Reduced friction physics
5. **Bomb Rain**: Massive bomb spawns

### Collectibles & Powerups
- **Fruits**: Apple, Banana, Melon, Carrot, Corn (earn points and coins)
- **Powerups**:
  - ⚡ Lightning (Speed): Move faster for 5 seconds
  - 🥊 Glove (Strength): Steal 50% more fruits on hit
  - 🔋 Battery (Infinite Stamina): Unlimited dashing
  - 🍎 Golden Apple: +5 score and full stamina restore

### Hazards
- **Bombs**: Explode on contact, causing knockback and fruit loss
- **Holes**: Fall off the map and respawn after a delay

### Economy & Customization
- **Coin System**: Earn coins from collecting fruits (1 coin per fruit)
- **Hat Shop**: Spend coins to unlock cosmetic hats
- **Procedural Hats**: Generated using Three.js primitives
- **LocalStorage Persistence**: Saves coins, unlocked hats, and equipped items

### Level System
- **Procedural Generation**: 4 map types (Arena, Islands, Donut, Grid)
- **Built-in Editor**: Place/remove terrain and objects
- **Save/Load custom maps**: Stored in localStorage

### Audio System
- **Synthesized Sound Effects**: No external audio files needed
- **Web Audio API**: Dynamic sound generation

### Mobile Support
- **Touch Controls**: Virtual joystick for movement
- **Responsive UI**: Adapts to different screen sizes

## 🚀 Getting Started

### Play in Browser
1. Clone the repository
2. Serve the files with a local server:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser

### Controls
- **Movement**: WASD or Arrow Keys (or touch joystick on mobile)
- **Dash**: Spacebar (or touch dash button)

## 📱 Cordova/Android Build

### Prerequisites
- Node.js and npm
- Cordova CLI: `npm install -g cordova`
- Android SDK

### Build for Android
```bash
cordova platform add android
cordova build android
cordova run android
```

## 🎨 Asset Structure

The game supports loading voxel models:
- Animals/ - 20 character models
- Collectibles/ - Fruit models
- Main/ - Environment objects

Automatic fallback to procedural geometry if assets fail to load.

## 📄 License

MIT License

