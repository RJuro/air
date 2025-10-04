# Breathe - Breath Training App

A minimalistic breath training app with focus on retention, built with React, Vite, and Tailwind CSS.

## Features

- 🫁 Multiple pre-built breathing programs (Foundation, Coherent, Calming, Endurance, Mastery)
- ⚙️ Custom breath patterns with rounds support
- 🎨 Clean black & white design with subtle color accents
- 🔊 Audio cues for phase transitions
- ♿ Accessibility support (reduced motion, screen readers)
- 📱 Mobile-friendly responsive design
- ⚡ Smooth animations using requestAnimationFrame

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:3000`

## Deploy to Coolify with Nixpacks

### Quick Deploy

1. **Create a new project in Coolify**
   - Click "New Resource" → "Public Repository"
   - Enter your Git repository URL
   - Select "Nixpacks" as the build pack

2. **Configure Environment**
   - Build Command: `npm run build`
   - Start Command: `npx serve -s dist -l 3000`
   - Port: `3000`

3. **Deploy**
   - Click "Deploy" - Coolify will automatically detect `nixpacks.toml`
   - The app will build and deploy automatically

### Manual Configuration

If you need to configure manually in Coolify:

**Build Pack:** Nixpacks

**Environment Variables:** (None required)

**Build Settings:**
- Install Command: `npm ci`
- Build Command: `npm run build`
- Start Command: `npx serve -s dist -l 3000`

**Port Mapping:**
- Container Port: `3000`
- Public Port: `80` or `443` (with SSL)

### Nixpacks Configuration

The `nixpacks.toml` file configures the build process:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npx serve -s dist -l 3000"
```

## Project Structure

```
breathe-app/
├── src/
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles + Tailwind
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
├── postcss.config.js    # PostCSS configuration
├── nixpacks.toml        # Nixpacks build configuration
└── README.md           # This file
```

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS
- **Lucide React** - Icon library
- **Web Audio API** - Phase transition sounds
- **requestAnimationFrame** - Smooth animations

## Deployment Notes

- The app is a static SPA (Single Page Application)
- No backend required
- Uses `serve` package to serve the built static files
- All state is managed client-side (no database)
- Works offline after initial load (can be enhanced with PWA)

## Browser Support

- Modern browsers with ES6+ support
- Web Audio API support (optional, gracefully degrades)
- MediaQuery API for reduced motion support

## License

MIT

## Safety Notice

⚠️ Never practice breath retention near water, while driving, or if you have cardiovascular conditions. Stop immediately if you feel dizzy or uncomfortable. Consult a healthcare professional before starting any breath work practice.