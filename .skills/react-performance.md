# React Performance Best Practices

## Overview
Comprehensive performance optimization guide for React applications based on Vercel Engineering guidelines. Contains 57 rules across 8 categories, prioritized by impact.

## When to Use
- Writing new React components
- Reviewing code for performance issues
- Refactoring existing React code
- Optimizing bundle size or load times
- Implementing data fetching patterns

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Eliminating Waterfalls | CRITICAL | `async-` |
| 2 | Bundle Size Optimization | CRITICAL | `bundle-` |
| 3 | Server-Side Performance | HIGH | `server-` |
| 4 | Client-Side Data Fetching | MEDIUM-HIGH | `client-` |
| 5 | Re-render Optimization | MEDIUM | `rerender-` |
| 6 | Rendering Performance | MEDIUM | `rendering-` |
| 7 | JavaScript Performance | LOW-MEDIUM | `js-` |
| 8 | Advanced Patterns | LOW | `advanced-` |

## Critical Rules

### 1. Eliminating Waterfalls (CRITICAL)
- **async-defer-await** - Move await into branches where actually used
- **async-parallel** - Use Promise.all() for independent operations
- **async-suspense-boundaries** - Use Suspense to stream content

```typescript
// ❌ Bad - Sequential
const user = await getUser();
const posts = await getPosts();

// ✅ Good - Parallel
const [user, posts] = await Promise.all([getUser(), getPosts()]);
```

### 2. Bundle Size Optimization (CRITICAL)
- **bundle-barrel-imports** - Import directly, avoid barrel files
- **bundle-dynamic-imports** - Use dynamic imports for heavy components
- **bundle-defer-third-party** - Load analytics/logging after hydration

```typescript
// ❌ Bad - Barrel import
import { Button } from '@/components';

// ✅ Good - Direct import
import { Button } from '@/components/Button';
```

### 3. Re-render Optimization (MEDIUM)
- **rerender-memo** - Extract expensive work into memoized components
- **rerender-derived-state** - Subscribe to derived booleans, not raw values
- **rerender-functional-setstate** - Use functional setState for stable callbacks

```typescript
// ❌ Bad - Creates new function each render
<Button onClick={() => setCount(count + 1)} />

// ✅ Good - Stable callback
<Button onClick={() => setCount(c => c + 1)} />
```

### 4. JavaScript Performance (LOW-MEDIUM)
- **js-set-map-lookups** - Use Set/Map for O(1) lookups
- **js-early-exit** - Return early from functions
- **js-combine-iterations** - Combine multiple filter/map into one loop

```typescript
// ❌ Bad - Multiple iterations
const filtered = items.filter(x => x.active).map(x => x.name);

// ✅ Good - Single iteration
const names = [];
for (const item of items) {
  if (item.active) names.push(item.name);
}
```

## Quick Checklist
- [ ] No sequential awaits for independent data
- [ ] Direct imports (no barrel files)
- [ ] Dynamic imports for heavy components
- [ ] Memoized expensive computations
- [ ] Stable callback references
- [ ] Early returns in functions
