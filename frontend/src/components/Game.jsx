import React, { useEffect, useRef, useState } from 'react';
import './Game.css';
import playerSprite from '../assets/images/player.png';
import terrainSprite from '../assets/images/terrain.png';
import decorationsSprite from '../assets/images/decorations.png';
import { SUPERVISOR_AGENT_ENDPOINT } from '../config/api';

/**
 * Game component - Main canvas-based game with three playable characters
 */
const Game = () => {
  const canvasRef = useRef(null);
  const [selectedCharacter, setSelectedCharacter] = useState(0);
  const [topicContext, setTopicContext] = useState('');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeEmojis, setActiveEmojis] = useState([]); // Array of {characterIndex, emoji, startTime, duration}
  const [chatMessages, setChatMessages] = useState([]); // Array of {from, to, message, startTime, duration}
    const gameStateRef = useRef({
    characters: [],
    keys: {},
    lastTime: 0,
    images: {},
    imagesLoaded: 0,
    totalImages: 3,
    mapCanvas: null,
    conversationActive: false,
    activeEmojis: [], // Store emojis in gameState for access in game loop
    chatMessages: [], // Store messages in gameState for access in game loop
    interactionQueue: [], // Queue of interactions for Supervisor Agent
    currentInteractionTarget: null, // Current target character index for interaction
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gameState = gameStateRef.current;

    // Set canvas size (28 tiles * 16px * 2 scale = 896, 29 tiles * 16px * 2 scale = 928)
    // Using 2x scale to fit better on screen
    canvas.width = 896;
    canvas.height = 928;
    
    // Enable pixelated rendering for crisp pixel art
    ctx.imageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;

    // Load images
    const loadImage = (src) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          gameState.imagesLoaded++;
          resolve(img);
        };
        img.onerror = reject;
        img.src = src;
      });
    };

    // Initialize game
    const initGame = async () => {
      try {
        // Load all images
        gameState.images.player = await loadImage(playerSprite);
        gameState.images.terrain = await loadImage(terrainSprite);
        gameState.images.decorations = await loadImage(decorationsSprite);

        // Initialize four characters (one for each role) - positioned in the center area
        // Map is 28x29 tiles, scale 2x, so positions are in pixels on scaled map
        gameState.characters = [
          createCharacter(670, 500, 'Strategist', '#FF6B6B', 0),      // Red
          createCharacter(300, 510, 'Creator', '#F5A623', 1),        // Orange
          createCharacter(650, 650, 'Optimizer', '#7ED321', 2),      // Green
          createCharacter(500, 300, 'Supervisor Agent', '#4A90E2', 3), // Blue
        ];

        // Start game loop
        gameState.lastTime = performance.now();
        gameLoop();
      } catch (error) {
        console.error('Error loading images:', error);
      }
    };

    // Create character object
    const createCharacter = (x, y, name, color, index) => ({
      x,
      y,
      width: 32,  // 16px sprite * 2 scale
      height: 32, // 16px sprite * 2 scale
      velocityX: 0,
      velocityY: 0,
      speed: 150,
      facing: 'down',
      currentFrame: 0,
      elapsedTime: 0,
      frameInterval: 0.15,
      name,
      color,
      index,
      autoMove: false, // Flag for automatic movement
      targetX: null, // Target X position for auto movement
      targetY: null, // Target Y position for auto movement
      pathTarget: null, // Intermediate pathfinding target
      pathUpdateCounter: 0, // Counter for path updates
      sprites: {
        walkDown: { x: 0, y: 0, frameCount: 4 },
        walkUp: { x: 16, y: 0, frameCount: 4 },
        walkLeft: { x: 32, y: 0, frameCount: 4 },
        walkRight: { x: 48, y: 0, frameCount: 4 },
      },
    });

    // ORIGINAL NINJA-ADVENTURE MAP DATA (28x29 tiles)
    // Terrain layer
    const l_Terrain = [
      [141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141],
      [141,141,141,141,144,141,141,141,141,141,144,141,141,141,141,141,141,144,141,141,141,141,141,141,141,141,144,141],
      [141,144,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141,141],
      [141,141,141,141,141,141,141,141,141,141,141,141,141,141,1,2,2,2,3,2,2,2,141,1,2,3,141,141],
      [141,141,141,141,1,2,2,2,2,3,141,141,141,141,29,30,30,113,31,141,141,141,141,29,30,31,141,141],
      [141,141,141,141,29,113,30,30,34,31,30,30,141,141,57,30,30,30,31,141,141,141,141,29,113,31,141,141],
      [141,141,141,141,29,30,30,34,59,141,141,141,141,141,141,29,30,30,30,30,30,30,141,29,30,31,141,141],
      [141,141,141,141,29,30,30,31,141,141,30,30,141,141,141,141,141,141,141,141,30,30,141,29,30,31,141,141],
      [144,141,141,141,29,30,113,62,2,63,30,31,141,141,141,29,30,31,141,29,30,31,141,29,30,31,141,141],
      [141,141,141,141,29,30,30,30,30,30,30,62,2,3,141,29,30,62,2,63,113,62,2,63,30,31,141,141],
      [141,141,141,141,29,30,30,30,30,30,30,30,30,62,2,63,30,113,30,30,113,30,30,30,30,31,141,141],
      [141,141,141,141,29,30,30,30,30,30,30,34,58,58,58,58,58,58,58,58,35,30,34,35,30,31,141,141],
      [141,141,141,141,29,30,113,30,30,30,30,31,141,141,141,141,141,141,141,141,29,30,31,29,113,31,141,141],
      [141,141,141,141,29,30,30,30,30,30,30,62,2,2,2,2,2,2,2,2,57,58,59,29,30,31,141,141],
      [141,141,141,141,141,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,1653,1654,1655,29,30,31,141,141],
      [141,141,141,141,141,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,1681,1682,1683,29,30,31,141,141],
      [141,141,141,141,141,1653,1654,1654,1654,1654,1654,1654,1654,1654,1654,1654,1654,1654,1654,1654,1715,1682,1683,57,58,59,141,141],
      [141,141,141,141,141,1709,1710,1710,1710,1687,1686,1710,1710,1710,1710,1710,1710,1710,1710,1710,1710,1710,1711,141,141,141,141,141],
      [141,141,141,141,141,2,2,2,2,1681,1683,2,2,2,2,2,2,2,2,2,2,2,2,141,141,141,141,141],
      [141,141,141,141,141,58,58,58,58,1681,1683,58,58,58,58,58,58,58,58,58,58,58,58,141,141,141,141,141],
      [141,141,141,141,141,1653,1654,1654,1654,1715,1714,1654,1654,1654,1654,1654,1654,1654,1654,1654,1654,1654,1655,141,141,141,141,141],
      [141,141,141,144,141,1709,1710,1710,1710,1710,1710,1710,1687,1682,1686,1710,1710,1710,1710,1710,1710,1710,1711,141,144,141,141,141],
      [141,141,141,141,141,141,141,141,141,141,141,141,1681,1682,1683,141,141,141,141,141,141,141,141,141,141,141,141,141],
      [141,141,141,3,142,141,141,141,141,141,141,141,1681,1682,1683,142,141,141,141,141,141,141,141,141,141,141,141,141],
      [2,2,2,2,2,2,2,2,2,2,3,141,1681,1682,1683,141,1,2,2,2,2,2,2,2,2,2,2,2],
      [30,30,30,30,30,30,30,30,30,113,62,3,1681,1682,1683,1,63,30,30,30,30,30,30,30,113,30,30,30],
      [30,30,30,30,30,30,30,30,30,30,30,62,2,2,2,63,30,30,30,30,30,30,30,30,30,30,30,30],
      [30,30,30,30,113,30,30,30,30,30,30,30,30,30,30,30,30,113,30,30,30,113,30,30,30,30,30,30]
    ];

    // Trees layer
    const l_Trees = [
      [0,1769,1770,1771,1772,0,0,1769,1770,1771,1772,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1805,1806,1807,1808,0,0,1805,1806,1807,1808,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1841,1842,1843,1844,0,0,1841,1842,1843,1844,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1769,1770],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1805,1806],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1841,1842],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1770,1771,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1806,1807,1808,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1842,1843,1844,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1769,1770,1771,1772,1769],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1805,1806,1807,1808,1805],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1841,1842,1843,1844,1841],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1772,1769],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    // Houses layer
    const l_Houses = [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,433,434,435,436,0,0,441,442,443,444,437,438,439,440,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,469,470,471,472,0,0,477,478,479,480,473,474,475,476,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,505,541,507,508,0,0,513,543,515,516,509,543,511,512,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,437,438,439,440,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,473,474,475,476,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,509,543,511,512,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,433,434,435,436,445,446,447,448,437,438,439,440,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,469,470,471,472,481,482,483,484,473,474,475,476,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,505,543,507,508,517,541,519,520,509,543,511,512,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,433,434,435,436,0,0,433,434,435,436,0,0,0,0,445,446,447,448,0,0,0,0,0],
      [0,0,0,0,0,469,470,471,472,0,0,469,470,471,472,0,0,0,0,481,482,483,484,0,0,0,0,0],
      [0,0,0,0,0,505,543,507,508,0,0,505,541,507,508,0,0,0,0,517,541,519,520,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ];

    // Render a tile from the tileset
    const renderTile = (tileId, x, y, context, tilesetImage, tilesetWidth = 16) => {
      if (tileId === 0) return;
      
      const tilesPerRow = Math.floor(tilesetImage.width / tilesetWidth);
      const srcX = ((tileId - 1) % tilesPerRow) * tilesetWidth;
      const srcY = Math.floor((tileId - 1) / tilesPerRow) * tilesetWidth;
      
      context.drawImage(
        tilesetImage,
        srcX, srcY,
        tilesetWidth, tilesetWidth,
        x, y,
        tilesetWidth, tilesetWidth
      );
    };

    // Create map canvas once - renders all layers
    const createMapCanvas = () => {
      if (!gameState.images.terrain || !gameState.images.decorations) return null;
      
      const TILE_SIZE = 16;
      const SCALE = 2; // 2x scale to fit screen better
      const mapCanvas = document.createElement('canvas');
      mapCanvas.width = l_Terrain[0].length * TILE_SIZE * SCALE;
      mapCanvas.height = l_Terrain.length * TILE_SIZE * SCALE;
      const mapCtx = mapCanvas.getContext('2d');
      
      mapCtx.imageSmoothingEnabled = false;
      mapCtx.scale(SCALE, SCALE);
      
      // Render terrain layer
      l_Terrain.forEach((row, y) => {
        row.forEach((tileId, x) => {
          renderTile(tileId, x * TILE_SIZE, y * TILE_SIZE, mapCtx, gameState.images.terrain, TILE_SIZE);
        });
      });
      
      // Render trees layer
      l_Trees.forEach((row, y) => {
        row.forEach((tileId, x) => {
          renderTile(tileId, x * TILE_SIZE, y * TILE_SIZE, mapCtx, gameState.images.decorations, TILE_SIZE);
        });
      });
      
      // Render houses layer
      l_Houses.forEach((row, y) => {
        row.forEach((tileId, x) => {
          renderTile(tileId, x * TILE_SIZE, y * TILE_SIZE, mapCtx, gameState.images.decorations, TILE_SIZE);
        });
      });
      
      return mapCanvas;
    };

    // Draw background
    const drawBackground = () => {
      if (!gameState.mapCanvas) {
        gameState.mapCanvas = createMapCanvas();
      }
      
      if (gameState.mapCanvas) {
        ctx.drawImage(gameState.mapCanvas, 0, 0);
      }
    };

    // Draw character with color tint
    const drawCharacter = (character) => {
      if (!gameState.images.player) return;

      const sprite = character.sprites[`walk${character.facing.charAt(0).toUpperCase() + character.facing.slice(1)}`];
      
      // Draw character shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(
        character.x + character.width / 2,
        character.y + character.height + 5,
        character.width / 3,
        character.height / 6,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // Create a temporary canvas for color tinting
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 16;
      tempCanvas.height = 16;
      const tempCtx = tempCanvas.getContext('2d');

      // Draw the sprite to temp canvas
      tempCtx.drawImage(
        gameState.images.player,
        sprite.x,
        sprite.y + 16 * character.currentFrame,
        16,
        16,
        0,
        0,
        16,
        16
      );

      // Apply color tint based on character
      const imageData = tempCtx.getImageData(0, 0, 16, 16);
      const data = imageData.data;
      
      // Get RGB values for tint color
      let tintR, tintG, tintB;
      switch (character.index) {
        case 0: // Strategist - Red
          tintR = 255; tintG = 107; tintB = 107;
          break;
        case 1: // Creator - Orange
          tintR = 245; tintG = 166; tintB = 35;
          break;
        case 2: // Optimizer - Green
          tintR = 126; tintG = 211; tintB = 33;
          break;
        case 3: // Supervisor Agent - Blue
          tintR = 74; tintG = 144; tintB = 226;
          break;
        default:
          tintR = 255; tintG = 255; tintB = 255;
      }

      // Apply tint to non-transparent pixels
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha > 0) {
          // Calculate brightness
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3 / 255;
          
          // Apply tint while preserving brightness
          data[i] = tintR * brightness;     // R
          data[i + 1] = tintG * brightness; // G
          data[i + 2] = tintB * brightness; // B
        }
      }
      
      tempCtx.putImageData(imageData, 0, 0);

      // Draw character glow if selected
      ctx.save();
      if (character.index === selectedCharacter) {
        ctx.shadowColor = character.color;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw the tinted sprite (scaled to match map scale)
      ctx.drawImage(
        tempCanvas,
        0,
        0,
        16,
        16,
        character.x,
        character.y,
        character.width,  // 32px (16 * 2 scale)
        character.height  // 32px (16 * 2 scale)
      );

      ctx.restore();

      // Draw character name and role label
      drawCharacterLabel(character);
    };

    // Draw character label
    const drawCharacterLabel = (character) => {
      ctx.save();
      
      // Draw selection indicator
      if (character.index === selectedCharacter) {
        ctx.strokeStyle = character.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          character.x + character.width / 2,
          character.y - 20,
          8,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        
        ctx.fillStyle = character.color;
        ctx.beginPath();
        ctx.arc(
          character.x + character.width / 2,
          character.y - 20,
          5,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Draw name
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = character.color;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(character.name, character.x + character.width / 2, character.y - 30);
      ctx.fillText(character.name, character.x + character.width / 2, character.y - 30);
      
      ctx.restore();
    };

    // Pathfinding helper functions
    // Check if a tile is walkable (path tile with no obstacles)
    const isWalkableTile = (tileX, tileY) => {
      if (tileX < 0 || tileX >= l_Terrain[0].length || tileY < 0 || tileY >= l_Terrain.length) {
        return false;
      }
      
      // Check terrain layer - walkable terrain tiles (paths, bridges, etc.)
      const terrainTile = l_Terrain[tileY][tileX];
      const walkableTerrainTiles = [
        1, 2, 3, 29, 30, 31, 34, 35, 57, 58, 59, 62, 63, 113, 142, 144,
        1653, 1654, 1655, 1681, 1682, 1683, 1709, 1710, 1711, 1714, 1715,
        1686, 1687
      ];
      const isPath = walkableTerrainTiles.includes(terrainTile);
      
      // Check if there's a tree (non-zero value in Trees layer means obstacle)
      const hasTree = l_Trees[tileY] && l_Trees[tileY][tileX] !== 0;
      
      // Check if there's a house (non-zero value in Houses layer means obstacle)
      const hasHouse = l_Houses[tileY] && l_Houses[tileY][tileX] !== 0;
      
      // Walkable if it's a path tile and has no obstacles
      return isPath && !hasTree && !hasHouse;
    };

    // Convert pixel coordinates to tile coordinates
    const pixelToTile = (pixelX, pixelY) => {
      const TILE_SIZE = 16;
      const SCALE = 2;
      const TILE_PIXELS = TILE_SIZE * SCALE; // 32px per tile
      return {
        tileX: Math.floor(pixelX / TILE_PIXELS),
        tileY: Math.floor(pixelY / TILE_PIXELS)
      };
    };

    // Convert tile coordinates to pixel coordinates (center of tile)
    const tileToPixel = (tileX, tileY) => {
      const TILE_SIZE = 16;
      const SCALE = 2;
      const TILE_PIXELS = TILE_SIZE * SCALE; // 32px per tile
      return {
        x: tileX * TILE_PIXELS + TILE_PIXELS / 2,
        y: tileY * TILE_PIXELS + TILE_PIXELS / 2
      };
    };

    // Simple greedy pathfinding: find next walkable tile towards target
    const findNextWalkableStep = (startX, startY, targetX, targetY) => {
      const startTile = pixelToTile(startX, startY);
      const targetTile = pixelToTile(targetX, targetY);
      
      // If already at target tile, return target position
      if (startTile.tileX === targetTile.tileX && startTile.tileY === targetTile.tileY) {
        return { x: targetX, y: targetY };
      }
      
      // Directions to check (4-way movement)
      const directions = [
        { x: 0, y: -1 },  // Up
        { x: 0, y: 1 },   // Down
        { x: -1, y: 0 },  // Left
        { x: 1, y: 0 }    // Right
      ];
      
      // Find all walkable neighbors and calculate their distance to target
      const walkableNeighbors = directions
        .map(dir => {
          const nextTileX = startTile.tileX + dir.x;
          const nextTileY = startTile.tileY + dir.y;
          
          if (isWalkableTile(nextTileX, nextTileY)) {
            const nextPixel = tileToPixel(nextTileX, nextTileY);
            const distToTarget = Math.sqrt(
              Math.pow(targetX - nextPixel.x, 2) + Math.pow(targetY - nextPixel.y, 2)
            );
            return { nextTileX, nextTileY, nextPixel, distToTarget };
          }
          return null;
        })
        .filter(n => n !== null);
      
      // If no walkable neighbors, search in expanding radius
      if (walkableNeighbors.length === 0) {
        for (let radius = 1; radius <= 5; radius++) {
          for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
              if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                const nextTileX = startTile.tileX + dx;
                const nextTileY = startTile.tileY + dy;
                if (isWalkableTile(nextTileX, nextTileY)) {
                  return tileToPixel(nextTileX, nextTileY);
                }
              }
            }
          }
        }
        // Fallback: stay in current position
        return { x: startX, y: startY };
      }
      
      // Sort by distance to target and pick the closest
      walkableNeighbors.sort((a, b) => a.distToTarget - b.distToTarget);
      return walkableNeighbors[0].nextPixel;
    };

    // Handle automatic movement towards target
    const handleAutoMovement = (character) => {
      if (!character.autoMove || character.targetX === null || character.targetY === null) {
        return;
      }

      const targetX = character.targetX;
      const targetY = character.targetY;
      const centerX = character.x + character.width / 2;
      const centerY = character.y + character.height / 2;
      
      const dx = targetX - centerX;
      const dy = targetY - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Stop if close enough to target (within 60 pixels for Supervisor Agent, 5 for others)
      const stopDistance = character.index === 3 ? 60 : 5; // Supervisor Agent stops further away
      if (distance < stopDistance) {
        character.velocityX = 0;
        character.velocityY = 0;
        character.autoMove = false;
        
        // If Supervisor Agent reached target, start conversation with current target
        if (character.index === 3 && gameState.currentInteractionTarget !== null) {
          startConversation(gameState.currentInteractionTarget);
        }
        return;
      }
      
      // For Supervisor Agent (index 3), use pathfinding to avoid obstacles
      if (character.index === 3) {
        // Update pathfinding target periodically (every 15 frames)
        if (!character.pathTarget || !character.pathUpdateCounter || character.pathUpdateCounter <= 0) {
          const nextStep = findNextWalkableStep(centerX, centerY, targetX, targetY);
          character.pathTarget = nextStep;
          character.pathUpdateCounter = 15; // Update path every 15 frames
        } else {
          character.pathUpdateCounter--;
        }
        
        // Move towards the pathfinding intermediate target
        const pathDx = character.pathTarget.x - centerX;
        const pathDy = character.pathTarget.y - centerY;
        const pathDistance = Math.sqrt(pathDx * pathDx + pathDy * pathDy);
        
        if (pathDistance > 5) {
          const normalizedDx = pathDx / pathDistance;
          const normalizedDy = pathDy / pathDistance;
          
          character.velocityX = normalizedDx * character.speed;
          character.velocityY = normalizedDy * character.speed;
          
          // Update facing direction
          if (Math.abs(pathDx) > Math.abs(pathDy)) {
            character.facing = pathDx > 0 ? 'right' : 'left';
          } else {
            character.facing = pathDy > 0 ? 'down' : 'up';
          }
        } else {
          // Reached intermediate target, recalculate path
          character.pathTarget = null;
          character.pathUpdateCounter = 0;
        }
      } else {
        // For other characters, use direct movement
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        character.velocityX = normalizedDx * character.speed;
        character.velocityY = normalizedDy * character.speed;
        
        // Update facing direction based on movement
        if (Math.abs(dx) > Math.abs(dy)) {
          character.facing = dx > 0 ? 'right' : 'left';
        } else {
          character.facing = dy > 0 ? 'down' : 'up';
        }
      }
    };

    // Update character
    const updateCharacter = (character, deltaTime) => {
      // Handle automatic movement if enabled
      if (character.autoMove) {
        handleAutoMovement(character);
      }
      
      // Update animation frame
      character.elapsedTime += deltaTime;
      if (character.elapsedTime > character.frameInterval) {
        if (character.velocityX !== 0 || character.velocityY !== 0) {
          const sprite = character.sprites[`walk${character.facing.charAt(0).toUpperCase() + character.facing.slice(1)}`];
          character.currentFrame = (character.currentFrame + 1) % sprite.frameCount;
        } else {
          character.currentFrame = 0;
        }
        character.elapsedTime = 0;
      }

      // Update position
      character.x += character.velocityX * deltaTime;
      character.y += character.velocityY * deltaTime;

      // Keep character in bounds
      character.x = Math.max(0, Math.min(canvas.width - character.width, character.x));
      character.y = Math.max(0, Math.min(canvas.height - character.height, character.y));
    };

    // Handle input for selected character
    const handleInput = () => {
      const character = gameState.characters[selectedCharacter];
      if (!character) return;

      // If character has auto movement enabled, disable it when user takes control
      if (character.autoMove && (gameState.keys['ArrowRight'] || gameState.keys['d'] || 
          gameState.keys['ArrowLeft'] || gameState.keys['a'] || 
          gameState.keys['ArrowUp'] || gameState.keys['w'] || 
          gameState.keys['ArrowDown'] || gameState.keys['s'])) {
        character.autoMove = false;
        character.targetX = null;
        character.targetY = null;
      }

      // Only handle manual input if auto movement is not active
      if (!character.autoMove) {
      character.velocityX = 0;
      character.velocityY = 0;

      if (gameState.keys['ArrowRight'] || gameState.keys['d']) {
        character.velocityX = character.speed;
        character.facing = 'right';
      } else if (gameState.keys['ArrowLeft'] || gameState.keys['a']) {
        character.velocityX = -character.speed;
        character.facing = 'left';
      }

      if (gameState.keys['ArrowUp'] || gameState.keys['w']) {
        character.velocityY = -character.speed;
        character.facing = 'up';
      } else if (gameState.keys['ArrowDown'] || gameState.keys['s']) {
        character.velocityY = character.speed;
        character.facing = 'down';
        }
      }
    };

    // Game loop
    const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - gameState.lastTime) / 1000;
      gameState.lastTime = currentTime;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background
      drawBackground();

      // Handle input and update characters
      handleInput();
      gameState.characters.forEach(character => {
        updateCharacter(character, deltaTime);
        drawCharacter(character);
      });

      // Draw emojis above characters
      drawEmojis();

      // Draw chat messages
      drawChatMessages();

      // Draw instructions
      drawInstructions();

      requestAnimationFrame(gameLoop);
    };

    // Start conversation between Supervisor Agent and target character
    const startConversation = (targetIndex) => {
      if (gameState.conversationActive) return;
      gameState.conversationActive = true;
      
      const currentTime = Date.now();
      const emojiDuration = 3000; // 3 seconds per emoji
      const messageDuration = 4000; // 4 seconds per message
      
      // Define conversations based on target character
      let emojiSequence = [];
      let messages = [];
      
      if (targetIndex === 0) { // Strategist
        emojiSequence = [
          { characterIndex: 3, emoji: '💰', delay: 0 }, // Supervisor Agent - Money
          { characterIndex: 0, emoji: '💼', delay: 500 }, // Strategist - Briefcase (work)
          { characterIndex: 3, emoji: '📊', delay: 1000 }, // Supervisor Agent - Chart
          { characterIndex: 0, emoji: '🎯', delay: 1500 }, // Strategist - Target
        ];
        messages = [
          { from: 3, to: 0, message: 'Let\'s discuss the strategy!', delay: 0 },
          { from: 0, to: 3, message: 'Perfect! Here\'s my plan...', delay: 2000 },
        ];
      } else if (targetIndex === 1) { // Creator
        emojiSequence = [
          { characterIndex: 3, emoji: '📝', delay: 0 }, // Supervisor Agent - Memo
          { characterIndex: 1, emoji: '✍️', delay: 500 }, // Creator - Writing
          { characterIndex: 3, emoji: '✅', delay: 1000 }, // Supervisor Agent - Check
          { characterIndex: 1, emoji: '📄', delay: 1500 }, // Creator - Page
        ];
        messages = [
          { from: 3, to: 1, message: 'Time to create content!', delay: 0 },
          { from: 1, to: 3, message: 'I\'ll create amazing content!', delay: 2000 },
        ];
      } else if (targetIndex === 2) { // Optimizer
        emojiSequence = [
          { characterIndex: 3, emoji: '🔍', delay: 0 }, // Supervisor Agent - Search
          { characterIndex: 2, emoji: '✨', delay: 500 }, // Optimizer - Sparkles
          { characterIndex: 3, emoji: '📈', delay: 1000 }, // Supervisor Agent - Chart
          { characterIndex: 2, emoji: '🚀', delay: 1500 }, // Optimizer - Rocket
        ];
        messages = [
          { from: 3, to: 2, message: 'Please optimize the content!', delay: 0 },
          { from: 2, to: 3, message: 'I\'ll optimize it perfectly!', delay: 2000 },
        ];
      }
      
      // Add emojis with delays - store in gameState
      emojiSequence.forEach(({ characterIndex, emoji, delay }) => {
        setTimeout(() => {
          gameState.activeEmojis.push({
            characterIndex,
            emoji,
            startTime: Date.now(),
            duration: emojiDuration,
            offsetY: 0,
            opacity: 1
          });
          // Also update React state for reactivity
          setActiveEmojis([...gameState.activeEmojis]);
        }, delay);
      });
      
      // Add messages with delays - store in gameState
      messages.forEach(({ from, to, message, delay }) => {
        setTimeout(() => {
          gameState.chatMessages.push({
            from,
            to,
            message,
            startTime: Date.now(),
            duration: messageDuration
          });
          // Also update React state for reactivity
          setChatMessages([...gameState.chatMessages]);
        }, delay);
      });
      
      // Clear conversation after total duration and move to next target
      setTimeout(() => {
        gameState.conversationActive = false;
        gameState.activeEmojis = [];
        gameState.chatMessages = [];
        setActiveEmojis([]);
        setChatMessages([]);
        
        // Move to next interaction in queue
        moveToNextInteraction();
      }, 8000); // Total conversation duration: 8 seconds
    };

    // Move Supervisor Agent to next interaction target
    const moveToNextInteraction = () => {
      const supervisorAgent = gameState.characters[3];
      if (!supervisorAgent) {
        console.log('Supervisor Agent not found');
        return;
      }
      
      // Get next target from queue
      if (gameState.interactionQueue && gameState.interactionQueue.length > 0) {
        const nextTargetIndex = gameState.interactionQueue.shift();
        const targetChar = gameState.characters[nextTargetIndex];
        
        console.log('Moving to next interaction:', nextTargetIndex, 'Queue remaining:', gameState.interactionQueue);
        
        if (targetChar) {
          gameState.currentInteractionTarget = nextTargetIndex;
          // Set target position near the character (to the left side, 60 pixels away)
          const offsetX = -60;
          const offsetY = 0;
          supervisorAgent.targetX = targetChar.x + targetChar.width / 2 + offsetX;
          supervisorAgent.targetY = targetChar.y + targetChar.height / 2 + offsetY;
          supervisorAgent.autoMove = true;
          console.log('Supervisor Agent target set:', supervisorAgent.targetX, supervisorAgent.targetY);
        } else {
          console.log('Target character not found:', nextTargetIndex);
        }
      } else {
        // No more interactions, reset
        console.log('No more interactions in queue');
        gameState.currentInteractionTarget = null;
      }
    };

    // Draw emojis above characters
    const drawEmojis = () => {
      const currentTime = Date.now();
      // Use gameState.activeEmojis instead of React state
      const activeEmojisToDraw = gameState.activeEmojis.filter(emojiData => {
        const elapsed = currentTime - emojiData.startTime;
        return elapsed < emojiData.duration;
      });
      
      activeEmojisToDraw.forEach(emojiData => {
        const character = gameState.characters[emojiData.characterIndex];
        if (!character) return;
        
        const elapsed = currentTime - emojiData.startTime;
        const progress = elapsed / emojiData.duration;
        
        // Animate emoji floating up
        const floatOffset = -30 - (progress * 20); // Float up
        const opacity = 1 - progress; // Fade out
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          emojiData.emoji,
          character.x + character.width / 2,
          character.y - 40 + floatOffset
        );
        ctx.restore();
      });
      
      // Update gameState to remove expired emojis
      if (activeEmojisToDraw.length !== gameState.activeEmojis.length) {
        gameState.activeEmojis = activeEmojisToDraw;
        setActiveEmojis([...gameState.activeEmojis]);
      }
    };

    // Draw chat messages above characters' heads
    const drawChatMessages = () => {
      const currentTime = Date.now();
      // Use gameState.chatMessages instead of React state
      const activeMessages = gameState.chatMessages.filter(msg => {
        const elapsed = currentTime - msg.startTime;
        return elapsed < msg.duration;
      });
      
      activeMessages.forEach(msg => {
        const fromChar = gameState.characters[msg.from];
        if (!fromChar) return;
        
        const elapsed = currentTime - msg.startTime;
        const progress = elapsed / msg.duration;
        const opacity = progress < 0.1 ? progress * 10 : (progress > 0.9 ? (1 - progress) * 10 : 1);
        
        // Position message above the character's head
        const messageX = fromChar.x + fromChar.width / 2;
        const messageY = fromChar.y - 50; // Above the character's head
        
        // Draw speech bubble
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.lineWidth = 2;
        
        // Measure text width for bubble sizing
        ctx.font = '12px Arial';
        const textMetrics = ctx.measureText(msg.message);
        const bubbleWidth = textMetrics.width + 20;
        const bubbleHeight = 30;
        const bubbleX = messageX - bubbleWidth / 2;
        const bubbleY = messageY - bubbleHeight;
        
        // Draw rounded rectangle for speech bubble
        const radius = 5;
        ctx.beginPath();
        ctx.moveTo(bubbleX + radius, bubbleY);
        ctx.lineTo(bubbleX + bubbleWidth - radius, bubbleY);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY, bubbleX + bubbleWidth, bubbleY + radius);
        ctx.lineTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight - radius);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth, bubbleY + bubbleHeight, bubbleX + bubbleWidth - radius, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX + radius, bubbleY + bubbleHeight);
        ctx.quadraticCurveTo(bubbleX, bubbleY + bubbleHeight, bubbleX, bubbleY + bubbleHeight - radius);
        ctx.lineTo(bubbleX, bubbleY + radius);
        ctx.quadraticCurveTo(bubbleX, bubbleY, bubbleX + radius, bubbleY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Draw small triangle pointing to character (speech bubble tail)
        ctx.beginPath();
        ctx.moveTo(messageX, messageY);
        ctx.lineTo(messageX - 8, messageY + 8);
        ctx.lineTo(messageX + 8, messageY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Message text
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.fillText(msg.message, messageX, messageY - 10);
        
        ctx.restore();
      });
      
      // Update gameState to remove expired messages
      if (activeMessages.length !== gameState.chatMessages.length) {
        gameState.chatMessages = activeMessages;
        setChatMessages([...gameState.chatMessages]);
      }
    };

    // Draw instructions
    const drawInstructions = () => {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 300, 100);
      
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText('Controls:', 20, 35);
      
      ctx.font = '14px Arial';
      ctx.fillText('WASD / Arrow Keys - Move', 20, 60);
      ctx.fillText('1, 2, 3, 4 - Switch Character', 20, 80);
      ctx.fillText(`Active: ${gameState.characters[selectedCharacter]?.name}`, 20, 100);
      
      ctx.restore();
    };

    // Keyboard event handlers
    const handleKeyDown = (e) => {
      gameState.keys[e.key] = true;
      
      // Switch character
      if (e.key === '1') setSelectedCharacter(0);
      if (e.key === '2') setSelectedCharacter(1);
      if (e.key === '3') setSelectedCharacter(2);
      if (e.key === '4') setSelectedCharacter(3);
    };

    const handleKeyUp = (e) => {
      gameState.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    initGame();

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedCharacter]);

  // Handle Supervisor Agent API call
  const handleRunSupervisorAgent = async () => {
    if (!topicContext.trim()) {
      setError('Please enter a topic context');
      return;
    }

    // Activate automatic movement sequence for Supervisor Agent
    // Sequence: Strategist (0) -> Creator (1) -> Optimizer (2)
    const gameState = gameStateRef.current;
    const supervisorAgent = gameState.characters[3]; // Supervisor Agent index
    const strategist = gameState.characters[0]; // Strategist index
    
    if (supervisorAgent && strategist) {
      // Set up interaction queue: Strategist -> Creator -> Optimizer
      // Start with Strategist (0), then queue Creator (1) and Optimizer (2)
      gameState.interactionQueue = [1, 2]; // Only queue remaining targets (Creator, Optimizer)
      gameState.currentInteractionTarget = 0; // Start with Strategist
      
      // Set target to a position near Strategist (to the left side, 60 pixels away)
      const offsetX = -60; // Stop to the left of Strategist
      const offsetY = 0; // Same vertical level
      supervisorAgent.targetX = strategist.x + strategist.width / 2 + offsetX;
      supervisorAgent.targetY = strategist.y + strategist.height / 2 + offsetY;
      supervisorAgent.autoMove = true; // Enable automatic movement
    }

    setLoading(true);
    setError(null);
    setOutput(null);

    try {
      const response = await fetch(SUPERVISOR_AGENT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic_context: topicContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setOutput(data);
    } catch (err) {
      setError(err.message || 'Failed to call Supervisor Agent API');
      console.error('Supervisor Agent API Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Social Media Content Team - Interactive</h1>
      </div>
      
      <div className="game-layout">
        {/* Left side: Game Map */}
        <div className="game-map-container">
          <canvas
            ref={canvasRef}
            className="game-canvas"
          />
        </div>
        
        {/* Right side: Input and Output */}
        <div className="game-controls-container">
        {/* Supervisor Agent Input Section */}
        <div className="supervisor-input-section">
          <div className="input-container">
            <label htmlFor="topic-context" className="input-label">
              Supervisor Agent - Topic Context:
            </label>
            <div className="input-group">
              <input
                id="topic-context"
                type="text"
                className="topic-input"
                placeholder="Enter topic or theme for weekly Twitter content (e.g., 'AI automation for small businesses')"
                value={topicContext}
                onChange={(e) => setTopicContext(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleRunSupervisorAgent();
                  }
                }}
                disabled={loading}
              />
              <button
                className="run-button"
                onClick={handleRunSupervisorAgent}
                disabled={loading || !topicContext.trim()}
              >
                {loading ? 'Running...' : 'Run'}
              </button>
            </div>
            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}
          </div>
        </div>
      
      {/* Supervisor Agent Output Section */}
        <div className="supervisor-output-section">
            {output ? (
              <>
          <h2 className="output-title">Supervisor Agent Output</h2>
          <div className="output-container">
            <pre className="output-content">
              {JSON.stringify(output, null, 2)}
            </pre>
                </div>
              </>
            ) : (
              <div className="output-placeholder">
                <p>Output will appear here after running the Supervisor Agent</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;

