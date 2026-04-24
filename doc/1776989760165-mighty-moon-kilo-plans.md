# Technical Implementation Roadmap: Game Refactoring Project

## 1. Overview
The objective is to refactor the monolithic `game1.html` into a modular, maintainable architecture by decoupling CSS and JavaScript from the HTML entry point. This will improve code readability, facilitate future feature expansions, and optimize file loading performance.

## 2. Code Audit & Decomposition
Based on the initial analysis of `game1.html`, the following components have been identified for extraction:

### A. Stylesheet (CSS)
- **Global Resets**: `body` margin/overflow/background settings.
- **Canvas Styling**: `canvas` display and cursor properties.

- **UI Overlays**: `#gameOverOverlay` layout, positioning, and typography.
- **Interactive Elements**: `#restartButton` styles, including hover, active, and transition states.

### B. Logic (JavaScript)
- **Core Engine**: Game loop (`gameLoop`), state management (`GAME_STATE`), and canvas context initialization.
- **Game Objects & State**: `plane`, `meteors`, `bullets`, `particles`, and `backgroundStars` arrays/objects.
- **Systems**: 
    - Background/Star system (`initBackgroundStars`, `drawBackground`).
    - Spawning logic (`createMeteor`, `createParticles`).
    - Combat mechanics (`shootBullet`).
    - Collision detection engine (`checkCollisions`).
- **Event Handlers**: Window resizing, mouse movement (plane control), mouse clicks (shooting), and UI button interactions.

## 3. Modular Architecture Design
A new directory structure will be implemented to separate concerns:

```text
project-root/
│
├── game1.html          # Lightweight entry point (HTML5 Boilerplate)
├── css/
│   └── style.css       # Extracted CSS rules and animations
└── js/
    ├── main.js         # Entry point for JS, initializes the game loop
    ├── engine.js       # Core game loop, state management, and collision logic
    ├── entities.js     # Definitions for plane, meteors, bullets, etc.
    └── input.js        # Event listeners (mouse, keyboard, resize)
```

## 4. Refactoring Implementation Plan

### Phase 1: Extraction & Decoupling
1.  **CSS Extraction**: Move all content from the `<style>` block in `game1.html` to `css/style.css`.
2.  **JS Modularization**:
    - Create `js/entities.js` to hold object definitions and state variables (e.g., `plane`, `meteors`).
    - Create `js/engine.js` for the core logic (loop, collision, spawning).
    - Create `js/input.js` for all DOM event listeners.
    - Use ES6 Modules (`export`/`import`) to maintain variable scope and dependencies without polluting the global namespace.
3.  **Asset Handling**: Since no external images or sounds are currently used (the game uses Canvas primitives), no immediate asset extraction is required. However, the architecture will be prepared for future `new Image()` or `new Audio()` integrations.

### Phase `2: Entry Point Reconstruction`
1.  Cleanse `game1.html` of all `<style>` and `<script>` blocks.
2.  Implement a standard HTML5 boilerplate.
3.  Link the external stylesheet: `<link rel="stylesheet" href="css/style.css">`.
4.  Link the JavaScript entry point as a module: `<script type="module" src="js/main.js"></script>`.

### Phase 3: Verification & Integrity Protocol
1.  **Functional Parity Test**: Launch `game1.html` and verify that the game renders correctly and responds to mouse input.
2.  **Collision Regression**: Execute a session specifically checking if meteor-plane and bullet-meteor collisions trigger the expected state changes (Game Over/Particle creation).
3.  **Responsive Check**: Resize the browser window to ensure `resizeCanvas` logic remains intact across different viewport dimensions.
4.  **Console Audit**: Ensure no `Uncaught ReferenceError` or `Module not found` errors appear in the developer console.

## 5. Summary of Deliverables
- [ ] `css/style.css`: Clean, organized stylesheet.
- [ ] `js/main.js`, `js/engine.js`, `js/entities.js`, `js/input.js`: Modularized game logic.
- [ ] `game1.html`: Optimized, lightweight entry point.
