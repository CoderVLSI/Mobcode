# Vite React Project

## Overview
Guide for creating and working with React projects using Vite. Covers project setup, structure, and best practices.

## When to Use
- "Create a React app"
- "Set up Vite project"
- "Build a website with React"
- Working with React (non-Native) projects

## Project Setup

### Create new project
```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm run dev
```

### Templates available
- `react` - React with JavaScript
- `react-ts` - React with TypeScript
- `react-swc` - React with SWC (faster builds)
- `react-swc-ts` - React + TypeScript + SWC

## Project Structure

```
my-app/
├── public/           # Static assets
│   └── favicon.ico
├── src/
│   ├── assets/       # Images, fonts
│   ├── components/   # Reusable components
│   ├── hooks/        # Custom hooks
│   ├── pages/        # Page components
│   ├── styles/       # CSS files
│   ├── utils/        # Helper functions
│   ├── App.tsx       # Root component
│   ├── main.tsx      # Entry point
│   └── index.css     # Global styles
├── index.html        # HTML template
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript config
└── package.json
```

## Component Patterns

### Functional Component
```tsx
import { useState } from 'react';
import styles from './Button.module.css';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button 
      className={`${styles.button} ${styles[variant]}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
```

### CSS Modules
```css
/* Button.module.css */
.button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.primary {
  background: #3b82f6;
  color: white;
}

.primary:hover {
  background: #2563eb;
}

.secondary {
  background: #e5e7eb;
  color: #374151;
}
```

## Routing (React Router)

### Setup
```bash
npm install react-router-dom
```

### Configuration
```tsx
// main.tsx
import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

### Routes
```tsx
// App.tsx
import { Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { About } from './pages/About';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
    </Routes>
  );
}
```

### Navigation
```tsx
import { Link, useNavigate } from 'react-router-dom';

// Link component
<Link to="/about">About</Link>

// Programmatic navigation
const navigate = useNavigate();
navigate('/about');
```

## State Management

### Local State
```tsx
const [count, setCount] = useState(0);
```

### Context API
```tsx
// context/ThemeContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

## Vite Config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
  },
});
```

## Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Checklist
- [ ] Use TypeScript for type safety
- [ ] CSS Modules or Tailwind for styling
- [ ] React Router for navigation
- [ ] Context API for global state
- [ ] Path aliases for clean imports
- [ ] Environment variables in .env
