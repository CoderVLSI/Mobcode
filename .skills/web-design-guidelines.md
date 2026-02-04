# Web Design Guidelines

## Overview
Review UI code for Web Interface Guidelines compliance. Use for accessibility audits, design reviews, and UX checks.

## When to Use
- "Review my UI"
- "Check accessibility"
- "Audit design"
- "Review UX"
- "Check my site against best practices"

## Core Principles

### 1. Accessibility (A11Y)
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- All images must have `alt` text
- Color contrast ratio minimum 4.5:1 for text
- Keyboard navigation must work for all interactive elements
- Focus states must be visible

```html
<!-- ❌ Bad -->
<div onclick="handleClick()">Click me</div>

<!-- ✅ Good -->
<button onClick={handleClick}>Click me</button>
```

### 2. Responsive Design
- Mobile-first approach
- Use relative units (rem, em, %)
- Breakpoints: 320px, 768px, 1024px, 1440px
- Touch targets minimum 44x44px

```css
/* ✅ Good - Mobile first */
.container {
  padding: 1rem;
}

@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}
```

### 3. Performance
- Lazy load images below the fold
- Use `loading="lazy"` for images
- Optimize images (WebP format)
- Minimize layout shifts (CLS)

### 4. Typography
- Base font size: 16px minimum
- Line height: 1.5 for body text
- Maximum line length: 65-75 characters
- Use system fonts or properly loaded web fonts

### 5. Spacing & Layout
- Use consistent spacing scale (4, 8, 12, 16, 24, 32, 48px)
- Whitespace improves readability
- Group related elements
- Align elements to a grid

### 6. Color Usage
- Limit palette to 3-5 colors
- Use color purposefully (not decoratively)
- Don't rely on color alone for meaning
- Provide sufficient contrast

### 7. Interactive Elements
- Buttons should look clickable
- Links should be distinguishable from text
- Hover/focus/active states for all interactive elements
- Loading states for async actions

## Audit Checklist
- [ ] Semantic HTML structure
- [ ] All images have alt text
- [ ] Keyboard navigable
- [ ] Sufficient color contrast
- [ ] Responsive at all breakpoints
- [ ] No layout shifts on load
- [ ] Touch targets adequate size
- [ ] Loading states present
- [ ] Error states handled
- [ ] Form labels properly associated
