import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';

interface ComponentPreviewProps {
  visible: boolean;
  onClose: () => void;
  componentId: string;
}

// Sample Components
function HelloWorld() {
  return (
    <View style={previewStyles.container}>
      <Text style={previewStyles.text}>Hello, World!</Text>
    </View>
  );
}

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View style={previewStyles.container}>
      <Text style={previewStyles.count}>{count}</Text>
      <View style={previewStyles.buttonRow}>
        <TouchableOpacity
          style={[previewStyles.button, previewStyles.decrement]}
          onPress={() => setCount(c => c - 1)}
        >
          <Text style={previewStyles.buttonText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[previewStyles.button, previewStyles.increment]}
          onPress={() => setCount(c => c + 1)}
        >
          <Text style={previewStyles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TodoList() {
  const [todos, setTodos] = useState<Array<{ id: string; text: string; completed: boolean }>>([]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (input.trim()) {
      setTodos([...todos, {
        id: Date.now().toString(),
        text: input.trim(),
        completed: false,
      }]);
      setInput('');
    }
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const removeTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  return (
    <View style={previewStyles.todoContainer}>
      <View style={previewStyles.inputRow}>
        <TextInput
          style={previewStyles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Add a task..."
          onSubmitEditing={addTodo}
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={previewStyles.addButton} onPress={addTodo}>
          <Text style={previewStyles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={previewStyles.todoItem}
            onPress={() => toggleTodo(item.id)}
          >
            <Text style={[
              previewStyles.todoText,
              item.completed && previewStyles.todoTextCompleted,
            ]}>
              {item.text}
            </Text>
            <TouchableOpacity onPress={() => removeTodo(item.id)}>
              <Text style={previewStyles.deleteText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={previewStyles.emptyText}>No tasks yet</Text>
        }
      />
    </View>
  );
}

function WeatherWidget() {
  return (
    <View style={previewStyles.weatherContainer}>
      <Text style={previewStyles.weatherIcon}>☀️</Text>
      <Text style={previewStyles.temperature}>72°</Text>
      <Text style={previewStyles.condition}>Sunny</Text>
      <Text style={previewStyles.city}>San Francisco</Text>
    </View>
  );
}

function UsersList() {
  const [users, setUsers] = useState<Array<{ id: number; name: string; email: string; company: { name: string } }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('https://jsonplaceholder.typicode.com/users');
        const data = await response.json();
        setUsers(data.slice(0, 5)); // Just show 5 users
      } catch (err) {
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View style={previewStyles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={previewStyles.statusText}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={previewStyles.centerContainer}>
        <Text style={previewStyles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={previewStyles.usersContainer}>
      <Text style={previewStyles.header}>Users Directory</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={previewStyles.userCard}>
            <Text style={previewStyles.userName}>{item.name}</Text>
            <Text style={previewStyles.userEmail}>{item.email}</Text>
            <Text style={previewStyles.userCompany}>{item.company.name}</Text>
          </View>
        )}
      />
    </View>
  );
}

const COMPONENTS: Record<string, React.ComponentType> = {
  'hello-world': HelloWorld,
  'counter': Counter,
  'todo-list': TodoList,
  'weather-widget': WeatherWidget,
  'api-fetch': UsersList,
};

export function ComponentPreview({ visible, onClose, componentId }: ComponentPreviewProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const Component = COMPONENTS[componentId];

  if (!Component) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Preview</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.previewArea}>
          <Component />
        </View>
      </View>
    </Modal>
  );
}

import { useMemo } from 'react';

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: theme.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  closeButton: {
    padding: 4,
  },
  previewArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

// Preview-specific styles (light theme for consistency)
const previewStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  count: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  increment: {
    backgroundColor: '#4CAF50',
  },
  decrement: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  todoContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  addButton: {
    width: 48,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  todoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  todoText: {
    fontSize: 16,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteText: {
    fontSize: 18,
    color: '#ef4444',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
    fontSize: 16,
  },
  weatherContainer: {
    backgroundColor: '#667eea',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  weatherIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  condition: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  city: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  usersContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userCompany: {
    fontSize: 12,
    color: '#999',
  },
});
