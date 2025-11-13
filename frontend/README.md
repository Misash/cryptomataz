# Social Media Content Team - Interactive Game

A React + Vite application featuring an interactive canvas-based game showcasing three AI content strategy roles.

## Features

- **Canvas-based Game**: Built with HTML5 Canvas for smooth 2D rendering (896x928px)
- **Original Ninja-Adventure Map**: Using the exact map from the ninja-adventure game
  - 28x29 tile grid with complete terrain layout
  - Multiple layers: Terrain, Trees, and Houses
  - Includes paths, grass, houses, trees, and decorative elements
  - Optimized rendering with pre-rendered map canvas
- **Three Playable Characters with Unique Colors**: 
  - 🎯 **Strategist** - Blue tinted character - Content Strategy Master
  - ✍️ **Creator** - Orange tinted character - Tweet Generation Expert  
  - ⚡ **Optimizer** - Green tinted character - Quality Enhancement Specialist
- **Animated Sprites with Color Tinting**: Character animations using sprite sheets from ninja-adventure with dynamic color tinting system
- **Pixel-Perfect Rendering**: Crisp pixel art with proper scaling (3x) and no smoothing
- **Character Switching**: Control different characters using number keys (1, 2, 3)

## Controls

- **WASD** or **Arrow Keys** - Move the selected character
- **1** - Select Strategist
- **2** - Select Creator
- **3** - Select Optimizer

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm build
```

## Assets

All game assets (sprites, terrain, decorations) are from the ninja-adventure game and located in `src/assets/images/`.

## Tech Stack

- React 18
- Vite 5
- HTML5 Canvas
- CSS3 with animations
