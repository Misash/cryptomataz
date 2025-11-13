import React, { useEffect, useRef, useState } from 'react';
import './Game.css';
import playerSprite from '../assets/images/player.png';
import terrainSprite from '../assets/images/terrain.png';
import decorationsSprite from '../assets/images/decorations.png';

/**
 * Game component - Main canvas-based game with three playable characters
 */
const Game = () => {
  const canvasRef = useRef(null);
  const [selectedCharacter, setSelectedCharacter] = useState(0);
    const gameStateRef = useRef({
    characters: [],
    keys: {},
    lastTime: 0,
    images: {},
    imagesLoaded: 0,
    totalImages: 3,
    mapCanvas: null,
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
          createCharacter(200, 300, 'Strategist', '#FF6B6B', 0),      // Red
          createCharacter(300, 300, 'Creator', '#F5A623', 1),        // Orange
          createCharacter(400, 300, 'Optimizer', '#7ED321', 2),      // Green
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

    // Update character
    const updateCharacter = (character, deltaTime) => {
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

      // Draw instructions
      drawInstructions();

      requestAnimationFrame(gameLoop);
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

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Social Media Content Team - Interactive</h1>
        <div className="character-selector">
          {['Strategist', 'Creator', 'Optimizer', 'Supervisor Agent'].map((name, index) => (
            <button
              key={name}
              className={`character-btn ${selectedCharacter === index ? 'active' : ''}`}
              onClick={() => setSelectedCharacter(index)}
              style={{
                borderColor: ['#FF6B6B', '#F5A623', '#7ED321', '#4A90E2'][index],
                backgroundColor: selectedCharacter === index ? ['#FF6B6B', '#F5A623', '#7ED321', '#4A90E2'][index] + '33' : 'transparent'
              }}
            >
              {index + 1}. {name}
            </button>
          ))}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="game-canvas"
      />
      <div className="game-footer">
        <div className="role-cards">
          <div className="role-card" style={{ borderLeft: '4px solid #FF6B6B' }}>
            <h3>🎯 Strategist</h3>
            <p>Plans comprehensive 7-day content strategies</p>
          </div>
          <div className="role-card" style={{ borderLeft: '4px solid #F5A623' }}>
            <h3>✍️ Creator</h3>
            <p>Generates 14-21 viral tweet options</p>
          </div>
          <div className="role-card" style={{ borderLeft: '4px solid #7ED321' }}>
            <h3>⚡ Optimizer</h3>
            <p>Optimizes content for maximum engagement</p>
          </div>
          <div className="role-card" style={{ borderLeft: '4px solid #4A90E2' }}>
            <h3>👁️ Supervisor Agent</h3>
            <p>Monitors and oversees content quality and strategy</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;

