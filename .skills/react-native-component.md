# React Native Component Creation

## Overview
Creates a new React Native component with proper structure, TypeScript types, and styling.

## When to Use
- User requests "create a component"
- User requests "make a screen"
- User requests "build a UI component"

## Steps

### 1. Create Component File
```typescript
// components/ComponentName.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ComponentNameProps {
  title: string;
  onAction?: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  title,
  onAction,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
```

### 2. Create Index File (optional)
```typescript
// components/index.ts
export { ComponentName } from './ComponentName';
```

## Best Practices
- Use functional components with hooks
- Define proper TypeScript interfaces for props
- Create StyleSheet at the bottom of the file
- Use descriptive component names (PascalCase)
- Keep components focused and reusable
- Avoid inline styles
- Use flexbox for layouts

## Common Patterns

### With State
```typescript
import React, { useState } from 'react';

export const ComponentName: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
    </View>
  );
};
```

### With useEffect
```typescript
import React, { useEffect, useState } from 'react';

export const ComponentName: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  return <View>{/* render */}</View>;
};
```

## File Structure
```
src/
  components/
    ComponentName.tsx
    index.ts
```
