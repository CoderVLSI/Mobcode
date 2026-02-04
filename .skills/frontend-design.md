---
name: Frontend Design & Architecture
description: Comprehensive guide to modern frontend architecture (FSD), design systems, and component patterns.
---

# Frontend Design & Architecture

Use this skill when designing new applications, restructuring existing ones, or building complex UI components. It covers architecture, design systems, and best practices.

## 1. Feature-Sliced Design (FSD) Architecture

For scalable applications, use the **Feature-Sliced Design** methodology. It organizes code by scope and business value rather than just file type.

### Layers (Top to Bottom)
Code in one layer can ONLY import from layers below it.

1.  **app/**: Global app setup (entry points, providers, routing, styles).
2.  **processes/**: (Optional) Complex multi-page workflows (e.g., checkout).
3.  **pages/**: Composition of widgets/features into full pages.
4.  **widgets/**: Self-contained UI blocks (e.g., Header, NewsFeed). 
5.  **features/**: Reusable user scenarios (e.g., Auth, LikeButton, Search).
6.  **entities/**: Business logic & data (e.g., User, Product, Order).
7.  **shared/**: Utilities, UI kit, API client (no business logic).

### Slices & Segments
Inside each layer (except shared/app), organize by **Slice** (domain), then **Segment**:

```text
features/
  auth-by-phone/      # Slice
    ui/               # UI Components
    model/            # State & Logic (Redux/Zustand)
    api/              # API Requests
    lib/              # Helpers
    index.ts          # Public API (ONLY export what's needed)
```

**Rule**: Always define a public API (`index.ts`) for each slice. Other slices must only import from the public API.

## 2. Design System Principles

Building a consistent UI requires a systematic approach.

### Design Tokens
Avoid hardcoding values. Use tokens for:
-   **Colors**: `primary-500`, `surface-hover`, `text-secondary`
-   **Spacing**: `gap-4` (1rem), `p-6` (1.5rem)
-   **Typography**: `text-xl`, `font-bold`
-   **Radii**: `rounded-lg`, `rounded-full`

### Component Categories
1.  **Atoms**: Basic building blocks (Button, Input, Icon).
2.  **Molecules**: Combinations of atoms (SearchField, UserCard).
3.  **Organisms**: Complex sections (Sidebar, Navigation).
4.  **Templates**: Page layouts without data.

### Theming
Use CSS variables for theme values to enable dark mode and dynamic theming.
```css
:root {
  --color-primary: #3b82f6;
  --bg-surface: #ffffff;
}
.dark {
  --color-primary: #60a5fa;
  --bg-surface: #1f2937;
}
```

## 3. Modern Component Patterns

### Composition
Prefer composition over configuration props.
```tsx
// ❌ Bad: Too many props
<Card title="Hello" subtitle="World" footerButton text="ok" onFooterClick={...} />

// ✅ Good: Flexible composition
<Card>
  <Card.Header>Hello</Card.Header>
  <Card.Body>World</Card.Body>
  <Card.Footer>
    <Button onClick={...}>OK</Button>
  </Card.Footer>
</Card>
```

### Hooks for Logic
Extract reuseable logic into custom hooks. Keep UI components focused on rendering.
-   `useUser()` instead of fetching in component.
-   `useForm()` for handling input state.

## 4. Accessibility (A11Y) Checklist

-   [ ] **Semantic HTML**: Use `<main>`, `<nav>`, `<article>`, not just `<div>`.
-   [ ] **Keyboard Nav**: Interactive elements must be reachable via Tab.
-   [ ] **Focus State**: Never remove `outline` without providing an alternative.
-   [ ] **Alt Text**: Descriptive text for images.
-   [ ] **ARIA**: Use `aria-label` or `aria-expanded` only when HTML isn't enough.
-   [ ] **Color Contrast**: Ensure text is readable (WCAG AA standard).

## 5. Performance Tips

-   **Code Splitting**: Lazy load routes and heavy components.
-   **Image Optimization**: Use WebP/AVIF, explicit width/height, lazy loading.
-   **Memoization**: Use `useMemo`/`useCallback` only when expensive calculations or stability is needed.
-   **Virtualization**: Use virtual lists for long datasets.
