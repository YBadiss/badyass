# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository hosts personal online content for badyass.xyz:
- **Home** - Personal intro page with projects and social links (served at root)
- **Facet** - 3D interactive image tiler built with Three.js (served at /facet)

## Project Structure

- `/home/` - Personal intro page (Vue 3 + Vite)
  - `src/App.vue` - Main component that loads content.json
  - `src/components/` - Vue components (Header, SocialLinks, ProjectCard, ProjectList)
  - `src/style.css` - Dark theme global styles
  - `content.json` - **Edit this file to update personal info, social links, and projects**
  - `vite.config.js` - Vite build configuration
  - `deploy.sh` - Deployment script
- `/facet/` - 3D image tiler application (Three.js + Webpack)
  - `src/app.js` - Entry point, handles DOM initialization, click handling, and image loading
  - `src/renderer.js` - Three.js scene setup, rendering logic, and block positioning
  - `src/tileSplitter.js` - Splits images into grid tiles
  - `src/hoverAnimation.js` - Handles hover effects on 3D blocks
  - `src/zoomController.js` - Manages zoom interactions and camera animations
  - `assets/config.json` - Grid configuration defining block heights, colors, titles, and side textures
  - `webpack.config.js` - Webpack configuration with Babel, CSS, and asset loading
- `.github/workflows/` - GitHub Actions CI/CD
  - `deploy-home.yml` - Auto-deploys home on changes to home/**
  - `deploy-facet.yml` - Auto-deploys facet on changes to facet/**

## Development Commands

### Home Project (Personal Intro Page)

All commands should be run from the `home/` directory:

```bash
cd home
```

**Install dependencies:**
```bash
npm install
```

**Development server with hot reload:**
```bash
npm run dev
# Starts Vite dev server, typically at http://localhost:5173
```

**Production build:**
```bash
npm run build
# Outputs to home/dist/
```

**Preview production build:**
```bash
npm run preview
# Preview the built site locally before deploying
```

**Deploy to server:**
```bash
npm run deploy
# Runs deploy.sh which builds and deploys via SCP to remote server
```

**Update content:**
- Edit `content.json` to change personal info, social links, or projects
- No code changes needed for content updates

### Facet Project (3D Image Tiler)

All commands should be run from the `facet/` directory:

```bash
cd facet
```

**Install dependencies:**
```bash
npm install
```

**Development server with hot reload:**
```bash
npm start
# Opens browser automatically at http://localhost:8080
```

**Production build:**
```bash
npm run build
# Outputs to facet/dist/
```

**Deploy to server:**
```bash
npm run deploy
# Runs deploy.sh which builds and deploys via SCP to remote server
```

## Architecture Notes

### Home Application Flow

1. **Configuration-Driven Content**:
   - All content loaded from `content.json` at runtime
   - No code changes needed to update personal info, links, or projects
   - Structure: `personal` (name, tagline, description), `social` (resume, github, linkedin), `projects` (array)

2. **Component Architecture**:
   - `App.vue`: Fetches content.json and distributes data to child components
   - `Header.vue`: Displays name, tagline, and description
   - `SocialLinks.vue`: Renders links to resume, GitHub, LinkedIn
   - `ProjectList.vue`: Manages grid of project cards
   - `ProjectCard.vue`: Individual project with title, description, tech tags, and link

3. **Styling**:
   - Dark theme using CSS variables (`--bg-primary`, `--bg-secondary`, `--text-primary`, etc.)
   - Centered layout with max-width 800px
   - Responsive design with mobile breakpoints
   - Subtle hover effects on links and project cards

4. **Build System**:
   - Vite for fast development and optimized production builds
   - Vue 3 with Composition API (`<script setup>`)
   - Minimal dependencies (vue, vite, @vitejs/plugin-vue)

### Facet Application Flow

1. **Entry Point** (`app.js`):
   - Loads configuration from `assets/config.json` and main image
   - Initializes Renderer and ZoomController
   - Sets up click detection (distinguishes clicks from drags using 5px threshold)
   - Handles reset view button and opacity slider

2. **Rendering Pipeline** (`renderer.js`):
   - Creates Three.js scene with PerspectiveCamera and OrbitControls
   - `renderTiles()` processes grid configuration and creates 3D blocks
   - Each block can have custom height, color, title, and up to 4 side textures
   - Uses `GLOBAL_HEIGHT_MULTIPLIER` (0.75) to scale block heights
   - Maintains `interactableObjects` array for raycast-based interactions

3. **Configuration System** (`assets/config.json`):
   - `gridSize`: Defines grid dimensions (e.g., "4x4")
   - `blocks`: Array of block definitions with:
     - `id`: Grid position (e.g., "A1", "B2")
     - `height`: Relative height of block
     - `color`: Hex color code for sides without textures
     - `title`: Display title on hover/zoom
     - `sides`: Array of 4 texture paths `[front, back, top, side]` or null

4. **Interaction System**:
   - Raycasting detects clicks on 3D blocks
   - `ZoomController` handles smooth camera transitions using GSAP
   - `hoverAnimation.js` provides visual feedback on block hover
   - Opacity slider controls visibility of non-selected blocks when zoomed

### Deployment Architecture

Both projects use a blue-green style deployment:
- Builds project locally or in CI
- Creates timestamped directory on remote server (`home-${timestamp}` or `facet-${timestamp}`)
- Deploys built files via SCP
- Updates symlink to point to new deployment
- Old deployments remain on server for rollback capability

Server structure:
```
/var/www/badyass.xyz/
├── home -> home-1234567890/     # symlink (served at /)
├── home-1234567890/             # timestamped home deployment
├── facet -> facet-1234567891/   # symlink (served at /facet)
└── facet-1234567891/            # timestamped facet deployment
```

## Key Dependencies

### Home Project
- **vue** (^3.5.x): Progressive JavaScript framework
- **vite** (^7.x): Fast build tool and dev server
- **@vitejs/plugin-vue** (^6.x): Vite plugin for Vue 3 support

### Facet Project
- **three.js** (^0.176.0): 3D rendering engine
- **gsap** (^3.13.0): Animation library for smooth transitions
- **webpack** (^5.x): Module bundler with dev server
- **babel**: Transpiles modern JavaScript for browser compatibility

## Configuration Files

### Home Project
- `vite.config.js`: Vite build configuration with Vue plugin
- `content.json`: **Primary configuration** for personal info, social links, and projects (edit this to update content)

### Facet Project
- `webpack.config.js`: Handles JS, CSS, and image assets; uses HtmlWebpackPlugin and CopyWebpackPlugin
- `.babelrc`: Configures Babel with @babel/preset-env for ES6+ support
- `assets/config.json`: Primary configuration for grid layout and block properties
