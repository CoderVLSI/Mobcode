# Expo React Native Best Practices

## Overview
Best practices for building React Native applications with Expo. Covers project setup, navigation, state management, and optimization.

## When to Use
- Creating new Expo projects
- Setting up navigation
- Implementing state management
- Optimizing app performance
- Building for production

## Project Structure

```
app/
├── (tabs)/           # Tab navigation group
│   ├── _layout.tsx   # Tab layout
│   ├── index.tsx     # Home tab
│   └── settings.tsx  # Settings tab
├── _layout.tsx       # Root layout
└── [id].tsx          # Dynamic route
components/
├── ui/               # Reusable UI components
└── features/         # Feature-specific components
hooks/
constants/
utils/
assets/
```

## Navigation with Expo Router

### File-based routing
```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
```

### Navigation actions
```typescript
import { router } from 'expo-router';

// Navigate
router.push('/profile/123');

// Replace
router.replace('/login');

// Go back
router.back();
```

## State Management

### Local state with hooks
```typescript
const [data, setData] = useState<Item[]>([]);
const [loading, setLoading] = useState(false);
```

### Global state with Context
```typescript
// context/AppContext.tsx
export const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  return (
    <AppContext.Provider value={{ user, setUser }}>
      {children}
    </AppContext.Provider>
  );
}
```

## Performance Optimization

### 1. Optimize Lists
```typescript
// Use FlatList, not ScrollView for lists
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ItemCard item={item} />}
  getItemLayout={(data, index) => ({
    length: 80,
    offset: 80 * index,
    index,
  })}
  removeClippedSubviews={true}
/>
```

### 2. Memoize Components
```typescript
const ItemCard = React.memo(({ item }: { item: Item }) => {
  return <View>...</View>;
});
```

### 3. Optimize Images
```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  contentFit="cover"
  placeholder={blurhash}
  transition={200}
/>
```

## Common Patterns

### AsyncStorage usage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save
await AsyncStorage.setItem('@key', JSON.stringify(data));

// Load
const value = await AsyncStorage.getItem('@key');
const data = value ? JSON.parse(value) : null;
```

### Safe Area handling
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';

<SafeAreaView style={{ flex: 1 }}>
  {/* Content */}
</SafeAreaView>
```

### Error Boundaries
```typescript
// Wrap screens with error boundaries
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary fallback={<ErrorScreen />}>
  <MyScreen />
</ErrorBoundary>
```

## Build & Deploy

### Development
```bash
npx expo start
```

### Build APK
```bash
eas build --platform android --profile preview
```

### Build for stores
```bash
eas build --platform android
eas build --platform ios
```

## Checklist
- [ ] Use Expo Router for navigation
- [ ] Implement proper error handling
- [ ] Use FlatList for lists (not ScrollView)
- [ ] Memoize expensive components
- [ ] Use expo-image for optimized images
- [ ] Handle safe areas properly
- [ ] Test on physical devices
