# HTML CSS JavaScript Basics

## Overview
Fundamentals of vanilla web development with HTML, CSS, and JavaScript. No frameworks required.

## When to Use
- "Create a simple website"
- "Plain HTML/CSS/JS"
- "No framework needed"
- Building static sites or landing pages

## HTML Structure

### Basic Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Page description for SEO">
  <title>Page Title</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
    </nav>
  </header>
  
  <main>
    <h1>Main Heading</h1>
    <p>Content goes here.</p>
  </main>
  
  <footer>
    <p>&copy; 2024 Company Name</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>
```

### Semantic Elements
```html
<header>    <!-- Page/section header -->
<nav>       <!-- Navigation links -->
<main>      <!-- Main content (one per page) -->
<article>   <!-- Self-contained content -->
<section>   <!-- Thematic grouping -->
<aside>     <!-- Sidebar/related content -->
<footer>    <!-- Page/section footer -->
```

## CSS Fundamentals

### Modern Reset
```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.6;
  color: #333;
}

img {
  max-width: 100%;
  display: block;
}
```

### Flexbox Layout
```css
.container {
  display: flex;
  justify-content: space-between;  /* Main axis */
  align-items: center;             /* Cross axis */
  gap: 1rem;
  flex-wrap: wrap;
}

.item {
  flex: 1;           /* Grow to fill space */
  flex-basis: 300px; /* Starting width */
}
```

### CSS Grid
```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Explicit grid */
.layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}
```

### Responsive Design
```css
/* Mobile first */
.container {
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### CSS Variables
```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --color-background: #ffffff;
  --color-text: #1f2937;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  --radius: 8px;
}

.button {
  background: var(--color-primary);
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1f2937;
    --color-text: #f9fafb;
  }
}
```

## JavaScript Essentials

### DOM Selection
```javascript
// Single element
const element = document.querySelector('.class');
const element = document.getElementById('id');

// Multiple elements
const elements = document.querySelectorAll('.items');
```

### Event Handling
```javascript
const button = document.querySelector('.btn');

button.addEventListener('click', (e) => {
  e.preventDefault();
  console.log('Clicked!');
});

// Event delegation
document.addEventListener('click', (e) => {
  if (e.target.matches('.dynamic-btn')) {
    handleClick(e.target);
  }
});
```

### DOM Manipulation
```javascript
// Create element
const div = document.createElement('div');
div.className = 'card';
div.innerHTML = `<h2>${title}</h2><p>${content}</p>`;

// Append
container.appendChild(div);

// Remove
element.remove();

// Toggle class
element.classList.toggle('active');
```

### Fetch API
```javascript
async function getData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

// POST request
async function postData(data) {
  const response = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.json();
}
```

### Local Storage
```javascript
// Save
localStorage.setItem('user', JSON.stringify(userData));

// Load
const user = JSON.parse(localStorage.getItem('user'));

// Remove
localStorage.removeItem('user');
```

## Common Patterns

### Modal
```html
<div class="modal" id="modal">
  <div class="modal-content">
    <button class="close">&times;</button>
    <h2>Modal Title</h2>
    <p>Content here</p>
  </div>
</div>
```

```css
.modal {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  place-items: center;
}

.modal.active {
  display: grid;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  max-width: 500px;
}
```

```javascript
const modal = document.getElementById('modal');
const openBtn = document.querySelector('.open-modal');
const closeBtn = modal.querySelector('.close');

openBtn.addEventListener('click', () => modal.classList.add('active'));
closeBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});
```

## Checklist
- [ ] Semantic HTML structure
- [ ] Mobile-first responsive CSS
- [ ] CSS variables for theming
- [ ] JavaScript at end of body or with defer
- [ ] Accessible (alt text, labels, focus states)
- [ ] Performance (lazy load images, minified assets)
