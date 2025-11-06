# Home Page Implementation Plan

## Overview
Create a simple, dark-themed personal intro page for badyass.xyz using Vite + Vue 3.

## Project Structure
```
home/
├── index.html              # HTML shell
├── package.json            # Dependencies and scripts
├── vite.config.js          # Vite configuration
├── deploy.sh               # Deployment script
├── content.json            # Content configuration (editable)
├── public/
│   └── resume.pdf          # (optional) host resume locally
├── src/
│   ├── main.js             # Vue app entry
│   ├── App.vue             # Main app component
│   ├── style.css           # Global dark theme styles
│   └── components/
│       ├── Header.vue      # Name and intro paragraph
│       ├── SocialLinks.vue # Resume, GitHub, LinkedIn links
│       ├── ProjectCard.vue # Single project card
│       └── ProjectList.vue # List of projects
└── dist/                   # Build output (generated)
```

## Dependencies
**Minimal set:**
- `vue@^3.x` - UI framework
- `vite@^5.x` - Build tool
- `@vitejs/plugin-vue@^5.x` - Vue plugin for Vite

**Dev dependencies only - no runtime bloat**

## Configuration File Schema

### content.json
```json
{
  "personal": {
    "name": "Your Name",
    "tagline": "Brief one-liner about you",
    "description": "A small paragraph describing who you are and what you do."
  },
  "social": {
    "resume": "https://example.com/resume.pdf",
    "github": "https://github.com/yourusername",
    "linkedin": "https://linkedin.com/in/yourprofile"
  },
  "projects": [
    {
      "title": "Facet",
      "description": "3D interactive image tiler built with Three.js",
      "url": "/facet",
      "tech": ["Three.js", "WebGL", "GSAP"]
    },
    {
      "title": "Another Project",
      "description": "Description of another project",
      "url": "https://example.com",
      "tech": ["Vue", "Node.js"]
    }
  ]
}
```

## Component Architecture

### App.vue
- Main container
- Imports and renders all child components
- Loads content.json
- Provides content to child components via props

### Header.vue
```
Props: { name, tagline, description }
Renders:
  - Large centered name
  - Tagline/subtitle
  - Description paragraph
```

### SocialLinks.vue
```
Props: { social: { resume, github, linkedin } }
Renders:
  - Horizontal list of icon/text links
  - Simple hover effects
```

### ProjectCard.vue
```
Props: { title, description, url, tech }
Renders:
  - Project title (linked)
  - Description text
  - Tech tags/pills
  - Hover effect
```

### ProjectList.vue
```
Props: { projects: Array }
Renders:
  - Grid/list of ProjectCard components
  - Responsive layout
```

## Styling Strategy

### CSS Variables (Dark Theme)
```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
  --accent: #4a9eff;
  --border: #2a2a2a;
}
```

### Layout
- Centered container: max-width 800px
- Padding for mobile responsiveness
- Simple flexbox for header/social/projects
- Grid for project cards (1-2 columns responsive)

### Typography
- System font stack (no web fonts)
- Clean hierarchy (h1, h2, p)
- Good line-height and spacing

### Interactions
- Subtle link hover (color change, underline)
- Card hover (slight elevation/border glow)
- Smooth transitions (150-200ms)

## Build & Deploy Setup

### package.json scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "deploy": "bash deploy.sh"
  }
}
```

### vite.config.js
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

### deploy.sh
```bash
#!/bin/bash

SSH_OPTIONS="$@"

# Build the project
npm run build

timestamp=$(date +%s)

# Deploy to root of badyass.xyz
scp $SSH_OPTIONS -r dist/* root@167.71.143.97:/var/www/badyass.xyz/home-${timestamp}

# Create symlink to home directory (served at root)
ssh $SSH_OPTIONS root@167.71.143.97 "(rm /var/www/badyass.xyz/home || true) && ln -s /var/www/badyass.xyz/home-${timestamp} /var/www/badyass.xyz/home"
```

## GitHub Actions Workflow

### .github/workflows/deploy-home.yml
```yaml
name: Deploy Home

on:
  push:
    branches:
      - main
    paths:
      - home/**

jobs:
  deploy:
    name: Deploy Home
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: 'home/package-lock.json'

      - name: Set up SSH
        uses: webfactory/ssh-agent@a6f90b1f127823b31d4d4a8d96047790581349bd
        with:
          ssh-private-key: ${{ secrets.SSH_DEPLOY_KEY }}

      - name: Add server to known hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H 167.71.143.97 >> ~/.ssh/known_hosts

      - name: Deploy Home
        run: |
          cd home
          npm ci
          npm run build
          npm run deploy
```

## Server Configuration Notes

The home page should be served at the root of badyass.xyz, while facet is at /facet.

Expected server structure:
```
/var/www/badyass.xyz/
├── home -> home-1234567890/     # symlink to current home deployment
├── home-1234567890/             # timestamped home deployment
│   ├── index.html
│   └── assets/
├── facet -> facet-1234567891/   # symlink to current facet deployment
└── facet-1234567891/            # timestamped facet deployment
```

Nginx configuration should route:
- `/` → `/var/www/badyass.xyz/home/`
- `/facet` → `/var/www/badyass.xyz/facet/`

## Implementation Steps

1. **Initialize Project**
   - `npm init -y` in home/
   - Install dependencies: `npm install vue@latest vite@latest @vitejs/plugin-vue@latest -D`
   - Create vite.config.js

2. **Create Content Configuration**
   - Create content.json with personal info
   - Add social links
   - Add initial projects (at least Facet)

3. **Build Components**
   - Create basic index.html
   - Create src/main.js (Vue initialization)
   - Create src/App.vue (loads content.json, renders layout)
   - Create Header.vue
   - Create SocialLinks.vue
   - Create ProjectCard.vue
   - Create ProjectList.vue

4. **Style the Page**
   - Create src/style.css with dark theme
   - Define CSS variables
   - Style all components
   - Add responsive design
   - Test on mobile

5. **Setup Deployment**
   - Create deploy.sh script
   - Make it executable: `chmod +x deploy.sh`
   - Test local build: `npm run build`
   - Test local preview: `npm run preview`

6. **Configure CI/CD**
   - Create .github/workflows/deploy-home.yml
   - Test deployment workflow

7. **Update Documentation**
   - Update CLAUDE.md with home project details
   - Add development commands
   - Document content.json schema

## Testing Checklist

- [ ] Dev server runs: `npm run dev`
- [ ] Build succeeds: `npm run build`
- [ ] Preview works: `npm run preview`
- [ ] All links work correctly
- [ ] Responsive on mobile
- [ ] Dark theme looks good
- [ ] Content loads from content.json
- [ ] Deploy script works
- [ ] GitHub Actions deploys successfully
- [ ] Page accessible at badyass.xyz
- [ ] Facet still accessible at badyass.xyz/facet

## Future Enhancements (Optional)

- Add favicon
- Add meta tags for social sharing (Open Graph)
- Add simple analytics
- Add light/dark theme toggle
- Add email contact form
- Add blog section
