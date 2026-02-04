// Bundled skills - these are embedded in the app at build time
export const BUNDLED_SKILLS: Record<string, string> = {
  'react-native-component': `# React Native Component Creation

## Overview
Creates a new React Native component with proper structure, TypeScript types, and styling.

## When to Use
- User requests "create a component"
- User requests "make a screen"
- User requests "build a UI component"

## Steps

### 1. Create Component File
\`\`\`typescript
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
\`\`\`

### 2. Create Index File (optional)
\`\`\`typescript
// components/index.ts
export { ComponentName } from './ComponentName';
\`\`\`

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
\`\`\`typescript
import React, { useState } from 'react';

export const ComponentName: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <View>
      <Text>Count: {count}</Text>
    </View>
  );
};
\`\`\`

### With useEffect
\`\`\`typescript
import React, { useEffect, useState } from 'react';

export const ComponentName: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  return <View>{/* render */}</View>;
};
\`\`\`

## File Structure
\`\`\`
src/
  components/
    ComponentName.tsx
    index.ts
\`\`\`
`,

  'api-integration': `# API Integration

## Overview
Integrate REST APIs into React Native apps with proper error handling, loading states, and TypeScript types.

## When to Use
- User requests "fetch data from API"
- User requests "add API calls"
- User requests "connect to backend"

## Steps

### 1. Define TypeScript Types
\`\`\`typescript
// types/api.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}
\`\`\`

### 2. Create API Service
\`\`\`typescript
// services/api.ts
const BASE_URL = 'https://api.example.com';

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(\`\${BASE_URL}\${endpoint}\`);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(\`\${BASE_URL}\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    return response.json();
  },
};
\`\`\`

### 3. Create Custom Hook
\`\`\`typescript
// hooks/useApi.ts
import { useState, useEffect } from 'react';

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [url]);

  return { data, loading, error };
}
\`\`\`

### 4. Use in Component
\`\`\`typescript
import { useApi } from '../hooks/useApi';

export const UserList: React.FC = () => {
  const { data, loading, error } = useApi<User[]>('/users');

  if (loading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error}</Text>;

  return (
    <View>
      {data?.map(user => (
        <Text key={user.id}>{user.name}</Text>
      ))}
    </View>
  );
};
\`\`\`

## Best Practices
- Always handle loading states
- Always handle error states
- Use TypeScript for type safety
- Create reusable API service
- Use environment variables for API URLs
- Implement proper error messages for users
- Cache responses when appropriate

## Common Patterns

### With Authentication
\`\`\`typescript
export const api = {
  async get<T>(endpoint: string, token: string): Promise<T> {
    const response = await fetch(\`\${BASE_URL}\${endpoint}\`, {
      headers: {
        'Authorization': \`Bearer \${token}\`,
      },
    });
    // ...
  },
};
\`\`\`

### With Retry Logic
\`\`\`typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
}
\`\`\`
`,

  'debugging-errors': `# Debugging and Error Fixing

## Overview
Systematic approach to debugging and fixing errors in React Native applications.

## When to Use
- User reports "there's an error"
- User requests "fix this bug"
- App crashes or shows error messages

## Debugging Workflow

### 1. Identify the Error
- Read the full error message
- Note the error type (TypeError, ReferenceError, etc.)
- Find the file and line number
- Check the stack trace

### 2. Analyze the Root Cause
Common error types:

**Undefined/Null Errors:**
\`\`\`typescript
// ❌ Problem
const user = data.user.name; // Crashes if data.user is undefined

// ✅ Fix
const user = data?.user?.name || 'Unknown';
\`\`\`

**Async/Await Errors:**
\`\`\`typescript
// ❌ Problem
const data = await fetchData(); // Forgets to handle promise

// ✅ Fix
try {
  const data = await fetchData();
} catch (error) {
  console.error('Failed to fetch:', error);
}
\`\`\`

**Missing Imports:**
\`\`\`typescript
// ❌ Problem
const Button = () => <TouchableOpacity />; // TouchableOpacity not imported

// ✅ Fix
import { TouchableOpacity } from 'react-native';
\`\`\`

### 3. Apply the Fix
- Make minimal changes
- Test the fix
- Check for similar issues in the codebase

### 4. Verify
- Run the app
- Test the specific functionality
- Check for console warnings

## Common React Native Errors

### "Network request failed"
- Check internet connection
- Verify API URL is correct
- Check if API requires authentication
- Verify CORS settings (for web)

### "Undefined is not an object"
- Use optional chaining: \`obj?.property\`
- Provide default values: \`obj?.property || default\`
- Check if data is loaded before accessing

### "VirtualizedList should not be nested inside plain ScrollView"
- Remove ScrollView wrapper around FlatList
- Use FlatList's \`ListHeaderComponent\` instead

### "Maximum update depth exceeded"
- Check for infinite loops in useEffect
- Ensure dependencies array is correct
- Avoid setting state during render

## Debugging Tools

### Console Logging
\`\`\`typescript
console.log('Debug:', variable);
console.error('Error:', error);
console.warn('Warning:', warning);
\`\`\`

### React Native Debugger
- Use React DevTools
- Check network requests
- Inspect component state

### Error Boundaries
\`\`\`typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <Text>Something went wrong.</Text>;
    }
    return this.props.children;
  }
}
\`\`\`

## Best Practices
- Always read the full error message
- Fix root cause, not just symptoms
- Test after each fix
- Use TypeScript to catch errors early
- Add proper error handling
- Log errors for debugging

## Quick Fixes Checklist
- [ ] Check imports are correct
- [ ] Verify all brackets/parentheses match
- [ ] Ensure variables are defined before use
- [ ] Check async/await usage
- [ ] Verify prop types match
- [ ] Check for typos in variable names
- [ ] Ensure styles are valid
- [ ] Check network connectivity
`,

  'styling-stylesheet': `# React Native Styling and StyleSheet

## Overview
Proper styling practices in React Native using StyleSheet and flexbox layout.

## When to Use
- User requests "style this component"
- User requests "make it look better"
- User asks about layout, colors, or design

## StyleSheet Basics

### Creating Styles
\`\`\`typescript
import { StyleSheet, View, Text } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
});
\`\`\`

### Using Styles
\`\`\`typescript
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>
\`\`\`

### Dynamic Styles
\`\`\`typescript
<View style={[styles.container, isActive && styles.active]}>
  <Text style={[styles.text, { color: textColor }]}>Text</Text>
</View>
\`\`\`

## Flexbox Layout

### Flex Direction
\`\`\`typescript
{
  flexDirection: 'row',  // or 'column' (default)
}
\`\`\`

### Justify Content (main axis)
\`\`\`typescript
{
  justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly',
}
\`\`\`

### Align Items (cross axis)
\`\`\`typescript
{
  alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch',
}
\`\`\`

### Common Layout Patterns

**Center Content:**
\`\`\`typescript
{
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
}
\`\`\`

**Row with Spacing:**
\`\`\`typescript
{
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
}
\`\`\`

**Fixed Header, Scrollable Content:**
\`\`\`typescript
// Container
{ flex: 1 }

// Header
{ height: 60 }

// Content
{ flex: 1 }
\`\`\`

## Common Style Properties

### Spacing
\`\`\`typescript
{
  margin: 10,           // all sides
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10,
  marginHorizontal: 10, // left & right
  marginVertical: 10,   // top & bottom

  padding: 10,          // all sides
  paddingHorizontal: 10,
  paddingVertical: 10,
}
\`\`\`

### Borders
\`\`\`typescript
{
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  borderTopLeftRadius: 8,
}
\`\`\`

### Sizing
\`\`\`typescript
{
  width: '100%',
  height: 50,
  minWidth: 100,
  maxWidth: 300,

  flex: 1,              // take available space
  flexGrow: 0,          // don't grow
  flexShrink: 1,        // can shrink
}
\`\`\`

### Colors
\`\`\`typescript
{
  backgroundColor: '#ffffff',
  color: '#333333',
  opacity: 0.5,
}
\`\`\`

### Text
\`\`\`typescript
{
  fontSize: 16,
  fontWeight: '400' | 'bold' | '100'..'900',
  lineHeight: 24,
  letterSpacing: 0.5,
  textAlign: 'left' | 'center' | 'right',
  textTransform: 'uppercase' | 'lowercase' | 'capitalize',
  textDecorationLine: 'underline' | 'line-through',
}
\`\`\`

## Theming

### Theme Object
\`\`\`typescript
// theme.ts
export const lightTheme = {
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
    border: '#E0E0E0',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
};

export const darkTheme = {
  colors: {
    primary: '#0A84FF',
    background: '#000000',
    text: '#FFFFFF',
    border: '#333333',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
};
\`\`\`

### Using Theme
\`\`\`typescript
import { useTheme } from '../context/ThemeContext';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>Hello</Text>
    </View>
  );
};
\`\`\`

## Best Practices
- Use StyleSheet.create() for performance
- Group related styles together
- Use semantic names (e.g., \`container\` vs \`view1\`)
- Create reusable style constants
- Use flexbox for responsive layouts
- Avoid inline styles
- Use theme colors instead of hardcoded values
- Test on different screen sizes

## Common Issues

**Style not applying:**
- Check for typos in property names
- Ensure correct value types
- Check style precedence (inline > array > object)

**Layout overflow:**
- Use \`flex: 1\` instead of fixed heights
- Check for \`flexDirection\` conflicts
- Verify parent container has space

**Text not visible:**
- Check color contrast
- Ensure \`numberOfLines\` isn't 0
- Verify text isn't empty
`
};
