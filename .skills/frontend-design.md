---
name: Frontend Design & Architecture
description: Comprehensive guide combining Anthropic's aesthetic principles with Feature-Sliced Design (FSD) architecture.
---

# Frontend Design & Architecture

Use this skill when designing new applications, restructuring existing ones, or building complex UI components. It combines **Aesthetic Excellence** (from skills.sh) with **Scalable Architecture** (FSD).

## 1. Aesthetic & Design Philosophy
**Goal**: Create distinctive, production-grade interfaces. Avoid generic "AI Design".

### Design Thinking
-   **Bold Direction**: Pick an extreme (Minimalist, Maximalist, Cyberpunk, Organic). Don't be boring.
-   **Typography**: Use distinct fonts. Pair a characterful display font with a refined body font. Avoid generic inter/arial.
-   **Motion**: Orchestrate animations. Staggered reveals (`animation-delay`) > scattered micro-interactions.
-   **Depth**: Use texture, noise, gradients, and shadows. Avoid flat solid backgrounds.

### Implementation Guide
-   **Spatial Composition**: Use asymmetry, overlap, and negative space intentionally.
-   **Theme**: Commit to a cohesive color story. Use CSS variables.
-   **Match Complexity**: Maximalist = elaborate code/effects. Minimalist = perfect spacing/typography.

---

## 2. Architecture: Feature-Sliced Design (FSD)
Organize code by **Business Domain**, not just file type.

### Layers (Strict Import Order: Top -> Bottom)
1.  **app/**: Global setup, styles, providers.
2.  **pages/**: Composition of widgets into routes.
3.  **widgets/**: Self-contained UI blocks (e.g., Header, Feed).
4.  **features/**: Reusable user scenarios (e.g., Auth, Search).
5.  **entities/**: Business data (e.g., User, Product).
6.  **shared/**: Reusable primitives (UI Kit, API).

### Slice Structure
```text
features/auth-form/
  ui/       # Components
  model/    # Store/Logic
  api/      # Queries
  index.ts  # Public API
```

---

## 3. Design System Implementation (Skeleton/Tailwind)

### Tokens & Primitives (Shared Layer)
-   **Colors**: `primary-500`, `surface-hover`.
-   **Spacing**: `gap-4`, `p-6`.
-   **Radii**: `rounded-xl`.

### Component Composition
Prefer composition to avoid "Prop Drilling Hell":
```tsx
// ✅ Composition
<Card>
  <Card.Image src="..." />
  <Card.Content>
    <Typography variant="h3">Title</Typography>
  </Card.Content>
</Card>
```

---

## 4. Performance & Accessibility
-   **A11Y**: Semantic HTML (`<main>`, `<nav>`), Keyboard Focus, Alt Text.
-   **Perf**: Lazy load routes, optimize images (WebP), virtualize long lists.
