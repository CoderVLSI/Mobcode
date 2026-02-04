# React Native Styling and StyleSheet

## Overview
Proper styling practices in React Native using StyleSheet and flexbox layout.

## When to Use
- User requests "style this component"
- User requests "make it look better"
- User asks about layout, colors, or design

## StyleSheet Basics

### Creating Styles
```typescript
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
```

### Using Styles
```typescript
<View style={styles.container}>
  <Text style={styles.title}>Hello</Text>
</View>
```

### Dynamic Styles
```typescript
<View style={[styles.container, isActive && styles.active]}>
  <Text style={[styles.text, { color: textColor }]}>Text</Text>
</View>
```

## Flexbox Layout

### Flex Direction
```typescript
{
  flexDirection: 'row',  // or 'column' (default)
}
```

### Justify Content (main axis)
```typescript
{
  justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly',
}
```

### Align Items (cross axis)
```typescript
{
  alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch',
}
```

### Common Layout Patterns

**Center Content:**
```typescript
{
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
}
```

**Row with Spacing:**
```typescript
{
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
}
```

**Fixed Header, Scrollable Content:**
```typescript
// Container
{ flex: 1 }

// Header
{ height: 60 }

// Content
{ flex: 1 }
```

## Common Style Properties

### Spacing
```typescript
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
```

### Borders
```typescript
{
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  borderTopLeftRadius: 8,
}
```

### Sizing
```typescript
{
  width: '100%',
  height: 50,
  minWidth: 100,
  maxWidth: 300,

  flex: 1,              // take available space
  flexGrow: 0,          // don't grow
  flexShrink: 1,        // can shrink
}
```

### Colors
```typescript
{
  backgroundColor: '#ffffff',
  color: '#333333',
  opacity: 0.5,
}
```

### Text
```typescript
{
  fontSize: 16,
  fontWeight: '400' | 'bold' | '100'..'900',
  lineHeight: 24,
  letterSpacing: 0.5,
  textAlign: 'left' | 'center' | 'right',
  textTransform: 'uppercase' | 'lowercase' | 'capitalize',
  textDecorationLine: 'underline' | 'line-through',
}
```

## Theming

### Theme Object
```typescript
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
```

### Using Theme
```typescript
import { useTheme } from '../context/ThemeContext';

const MyComponent = () => {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.text }]}>Hello</Text>
    </View>
  );
};
```

## Best Practices
- Use StyleSheet.create() for performance
- Group related styles together
- Use semantic names (e.g., `container` vs `view1`)
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
- Use `flex: 1` instead of fixed heights
- Check for `flexDirection` conflicts
- Verify parent container has space

**Text not visible:**
- Check color contrast
- Ensure `numberOfLines` isn't 0
- Verify text isn't empty
