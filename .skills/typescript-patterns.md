# TypeScript Patterns

## Overview
Common TypeScript patterns and best practices for type-safe code. Covers type inference, generics, utility types, and error handling.

## When to Use
- Defining component props
- Creating API types
- Working with generics
- Error handling patterns
- Type narrowing

## Type Definitions

### Component Props
```typescript
// ✅ Define explicit interface
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  label, 
  onPress, 
  variant = 'primary',
  disabled = false 
}) => { ... };
```

### API Response Types
```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

// Usage
async function fetchUser(id: string): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}
```

## Utility Types

### Partial & Required
```typescript
interface Settings {
  theme: string;
  notifications: boolean;
  language: string;
}

// All optional
type PartialSettings = Partial<Settings>;

// All required
type RequiredSettings = Required<Settings>;
```

### Pick & Omit
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

// Only specific fields
type PublicUser = Pick<User, 'id' | 'name'>;

// Exclude fields
type UserWithoutPassword = Omit<User, 'password'>;
```

### Record
```typescript
type Status = 'pending' | 'active' | 'completed';

const statusColors: Record<Status, string> = {
  pending: '#FFA500',
  active: '#00FF00',
  completed: '#0000FF',
};
```

## Type Narrowing

### Type Guards
```typescript
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function process(value: unknown) {
  if (isString(value)) {
    // value is string here
    console.log(value.toUpperCase());
  }
}
```

### Discriminated Unions
```typescript
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

function handleResult<T>(result: Result<T>) {
  if (result.success) {
    console.log(result.data); // ✅ data available
  } else {
    console.error(result.error); // ✅ error available
  }
}
```

## Generics

### Generic Functions
```typescript
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}

const first = getFirst([1, 2, 3]); // number | undefined
```

### Generic Components
```typescript
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <View>
      {items.map(item => (
        <View key={keyExtractor(item)}>
          {renderItem(item)}
        </View>
      ))}
    </View>
  );
}
```

## Error Handling

### Result Pattern
```typescript
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, error: new Error(`HTTP ${res.status}`) };
    }
    const data = await res.json();
    return { ok: true, value: data };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

// Usage
const result = await safeFetch<User>('/api/user');
if (result.ok) {
  console.log(result.value.name);
} else {
  console.error(result.error.message);
}
```

## Best Practices
- Prefer `interface` over `type` for object shapes
- Use `unknown` instead of `any` when type is uncertain
- Enable `strict` mode in tsconfig
- Use `as const` for literal types
- Avoid type assertions (`as`) when possible
- Let TypeScript infer when obvious
