# API Integration

## Overview
Integrate REST APIs into React Native apps with proper error handling, loading states, and TypeScript types.

## When to Use
- User requests "fetch data from API"
- User requests "add API calls"
- User requests "connect to backend"

## Steps

### 1. Define TypeScript Types
```typescript
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
```

### 2. Create API Service
```typescript
// services/api.ts
const BASE_URL = 'https://api.example.com';

export const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  },
};
```

### 3. Create Custom Hook
```typescript
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
```

### 4. Use in Component
```typescript
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
```

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
```typescript
export const api = {
  async get<T>(endpoint: string, token: string): Promise<T> {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    // ...
  },
};
```

### With Retry Logic
```typescript
async function fetchWithRetry(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (err) {
      if (i === retries - 1) throw err;
    }
  }
}
```
