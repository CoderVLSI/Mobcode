# Debugging and Error Fixing

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
```typescript
// ❌ Problem
const user = data.user.name; // Crashes if data.user is undefined

// ✅ Fix
const user = data?.user?.name || 'Unknown';
```

**Async/Await Errors:**
```typescript
// ❌ Problem
const data = await fetchData(); // Forgets to handle promise

// ✅ Fix
try {
  const data = await fetchData();
} catch (error) {
  console.error('Failed to fetch:', error);
}
```

**Missing Imports:**
```typescript
// ❌ Problem
const Button = () => <TouchableOpacity />; // TouchableOpacity not imported

// ✅ Fix
import { TouchableOpacity } from 'react-native';
```

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
- Use optional chaining: `obj?.property`
- Provide default values: `obj?.property || default`
- Check if data is loaded before accessing

### "VirtualizedList should not be nested inside plain ScrollView"
- Remove ScrollView wrapper around FlatList
- Use FlatList's `ListHeaderComponent` instead

### "Maximum update depth exceeded"
- Check for infinite loops in useEffect
- Ensure dependencies array is correct
- Avoid setting state during render

## Debugging Tools

### Console Logging
```typescript
console.log('Debug:', variable);
console.error('Error:', error);
console.warn('Warning:', warning);
```

### React Native Debugger
- Use React DevTools
- Check network requests
- Inspect component state

### Error Boundaries
```typescript
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
```

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
