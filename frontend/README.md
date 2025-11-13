# Social Media Content Team - Interactive Game

A React + Vite application featuring an interactive canvas-based game showcasing three AI content strategy roles.

## Features

- **Canvas-based Game**: Built with HTML5 Canvas for smooth 2D rendering (896x928px)
- **Original Ninja-Adventure Map**: Using the exact map from the ninja-adventure game
  - 28x29 tile grid with complete terrain layout
  - Multiple layers: Terrain, Trees, and Houses
  - Includes paths, grass, houses, trees, and decorative elements
  - Optimized rendering with pre-rendered map canvas
- **Four Playable Characters with Unique Colors**: 
  - 🎯 **Strategist** - Red tinted character - Content Strategy Master
  - ✍️ **Creator** - Orange tinted character - Tweet Generation Expert  
  - ⚡ **Optimizer** - Green tinted character - Quality Enhancement Specialist
  - 👁️ **Supervisor Agent** - Blue tinted character - Content Quality Supervisor
- **Animated Sprites with Color Tinting**: Character animations using sprite sheets from ninja-adventure with dynamic color tinting system
- **Pixel-Perfect Rendering**: Crisp pixel art with proper scaling (2x) and no smoothing
- **Character Switching**: Control different characters using number keys (1, 2, 3, 4)
- **Supervisor Agent API Integration**: 
  - Input field for topic context (below title)
  - Run button to execute Supervisor Agent workflow
  - Output display area (below map) showing API response
  - Full error handling and loading states

## Controls

- **WASD** or **Arrow Keys** - Move the selected character
- **1** - Select Strategist (Red)
- **2** - Select Creator (Orange)
- **3** - Select Optimizer (Green)
- **4** - Select Supervisor Agent (Blue)

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

## Supervisor Agent API

The frontend includes integration with the Supervisor Agent API endpoint from `core-agents`.

### Configuration

The API endpoint URL is configured in `src/config/api.js`. By default, it points to:
- `http://localhost:8000/supervisor-agent/`

To change the API URL, either:
1. Update `API_BASE_URL` in `src/config/api.js`
2. Set environment variable `VITE_API_BASE_URL` in a `.env` file

### API Request Format

```json
{
  "topic_context": "AI automation for small businesses"
}
```

### API Response Format

```json
{
  "data": {
    // Response from supervisor agent workflow
    // Contains weekly strategy, tweets, and optimization results
  }
}
```

### Usage

1. Enter a topic context in the input field (below the title)
2. Click "Run" button or press Enter
3. View the output in the output section (below the map)

## Assets

All game assets (sprites, terrain, decorations) are from the ninja-adventure game and located in `src/assets/images/`.

## Tech Stack

- React 18
- Vite 5
- HTML5 Canvas
- CSS3 with animations
- Fetch API for HTTP requests
