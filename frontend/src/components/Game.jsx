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
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gameState = gameStateRef.current;

    // Set canvas size
    canvas.width = 1024;
    canvas.height = 576;

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

        // Initialize three characters (one for each role)
        gameState.characters = [
          createCharacter(200, 200, 'Strategist', '#4A90E2', 0),
          createCharacter(300, 200, 'Creator', '#F5A623', 1),
          createCharacter(400, 200, 'Optimizer', '#7ED321', 2),
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
      width: 32,
      height: 32,
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

    // Draw background
    const drawBackground = () => {
      // Draw terrain pattern
      const tileSize = 64;
      for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
          if (gameState.images.terrain) {
            ctx.drawImage(
              gameState.images.terrain,
              0, 0, 16, 16,
              x, y, tileSize, tileSize
            );
          }
        }
      }

      // Draw decorations
      if (gameState.images.decorations) {
        // Add some bamboo decorations
        drawDecoration(100, 100, 80, 120);
        drawDecoration(850, 150, 80, 120);
        drawDecoration(500, 50, 80, 120);
        
        // Add some trees/bushes
        for (let i = 0; i < 5; i++) {
          const x = Math.random() * (canvas.width - 100) + 50;
          const y = Math.random() * (canvas.height - 100) + 50;
          drawDecoration(x, y, 64, 64, 1);
        }
      }
    };

    const drawDecoration = (x, y, width, height, variant = 0) => {
      const srcX = variant * 16;
      const srcY = 0;
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.drawImage(
        gameState.images.decorations,
        srcX, srcY, 16, 16,
        x, y, width, height
      );
      ctx.restore();
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
        case 0: // Strategist - Blue
          tintR = 74; tintG = 144; tintB = 226;
          break;
        case 1: // Creator - Orange
          tintR = 245; tintG = 166; tintB = 35;
          break;
        case 2: // Optimizer - Green
          tintR = 126; tintG = 211; tintB = 33;
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

      // Draw the tinted sprite
      ctx.drawImage(
        tempCanvas,
        0,
        0,
        16,
        16,
        character.x,
        character.y,
        character.width,
        character.height
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
      ctx.fillText('1, 2, 3 - Switch Character', 20, 80);
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
          {['Strategist', 'Creator', 'Optimizer'].map((name, index) => (
            <button
              key={name}
              className={`character-btn ${selectedCharacter === index ? 'active' : ''}`}
              onClick={() => setSelectedCharacter(index)}
              style={{
                borderColor: ['#4A90E2', '#F5A623', '#7ED321'][index],
                backgroundColor: selectedCharacter === index ? ['#4A90E2', '#F5A623', '#7ED321'][index] + '33' : 'transparent'
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
          <div className="role-card" style={{ borderLeft: '4px solid #4A90E2' }}>
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
        </div>
      </div>
    </div>
  );
};

export default Game;

