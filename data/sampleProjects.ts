export interface SampleFile {
  name: string;
  content: string;
  language: string;
}

export interface SampleProject {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  files: SampleFile[];
}

export const SAMPLE_PROJECTS: SampleProject[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    description: 'Simple React Native component to get started',
    icon: 'hand',
    category: 'Basics',
    files: [
      {
        name: 'App.tsx',
        language: 'typescript',
        content: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello, World!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});`,
      },
    ],
  },
  {
    id: 'counter',
    name: 'Counter App',
    description: 'Interactive counter with increment and decrement',
    icon: 'add-circle',
    category: 'Basics',
    files: [
      {
        name: 'Counter.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.decrement]}
          onPress={() => setCount(c => c - 1)}
        >
          <Text style={styles.buttonText}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.increment]}
          onPress={() => setCount(c => c + 1)}
        >
          <Text style={styles.buttonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
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
});`,
      },
    ],
  },
  {
    id: 'todo-list',
    name: 'Todo List',
    description: 'Task manager with add, remove, and complete',
    icon: 'checkbox',
    category: 'Apps',
    files: [
      {
        name: 'TodoList.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
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
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Add a task..."
          onSubmitEditing={addTodo}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTodo}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={todos}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.todoItem}
            onPress={() => toggleTodo(item.id)}
          >
            <Text style={[
              styles.todoText,
              item.completed && styles.todoTextCompleted,
            ]}>
              {item.text}
            </Text>
            <TouchableOpacity onPress={() => removeTodo(item.id)}>
              <Text style={styles.deleteText}>✕</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tasks yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});`,
      },
    ],
  },
  {
    id: 'weather-widget',
    name: 'Weather Widget',
    description: 'Simple weather display card component',
    icon: 'sunny',
    category: 'UI Components',
    files: [
      {
        name: 'WeatherWidget.tsx',
        language: 'typescript',
        content: `import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface WeatherWidgetProps {
  city: string;
  temperature: number;
  condition: string;
  icon?: string;
}

export default function WeatherWidget({
  city,
  temperature,
  condition,
  icon = '☀️',
}: WeatherWidgetProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.temperature}>{temperature}°</Text>
      <Text style={styles.condition}>{condition}</Text>
      <Text style={styles.city}>{city}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
  icon: {
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
});`,
      },
    ],
  },
  {
    id: 'api-fetch',
    name: 'API Data Fetching',
    description: 'Component that fetches and displays data from an API',
    icon: 'cloud-download',
    category: 'Advanced',
    files: [
      {
        name: 'UsersList.tsx',
        language: 'typescript',
        content: `import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

interface User {
  id: number;
  name: string;
  email: string;
  company: { name: string };
}

export default function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/users');
      const data: User[] = await response.json();
      setUsers(data);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.statusText}>Loading users...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Users Directory</Text>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.userCard}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            <Text style={styles.userCompany}>{item.company.name}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 16,
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
});`,
      },
    ],
  },
  {
    id: 'spotify-clone',
    name: 'Spotify Clone',
    description: 'Music streaming app UI with playlists and now playing',
    icon: 'musical-notes',
    category: 'Apps',
    files: [
      {
        name: 'SpotifyClone.tsx',
        language: 'typescript',
        content: `import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  cover: string;
}

interface Playlist {
  id: string;
  name: string;
  cover: string;
  songs: Song[];
}

const PLAYLISTS: Playlist[] = [
  {
    id: '1',
    name: 'Liked Songs',
    cover: '💚',
    songs: [
      { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', duration: '3:20', cover: '🎵' },
      { id: '2', title: 'Levitating', artist: 'Dua Lipa', duration: '3:23', cover: '🎶' },
      { id: '3', title: 'Stay', artist: 'The Kid LAROI', duration: '2:21', cover: '🎤' },
    ],
  },
  {
    id: '2',
    name: 'Chill Vibes',
    cover: '🌊',
    songs: [
      { id: '4', title: 'Heat Waves', artist: 'Glass Animals', duration: '3:58', cover: '🔥' },
      { id: '5', title: 'Sweater Weather', artist: 'The Neighbourhood', duration: '4:00', cover: '🧥' },
    ],
  },
  {
    id: '3',
    name: 'Workout Mix',
    cover: '💪',
    songs: [
      { id: '6', title: 'Stronger', artist: 'Kanye West', duration: '5:11', cover: '💎' },
      { id: '7', title: 'Lose Yourself', artist: 'Eminem', duration: '5:26', cover: '🎙️' },
    ],
  },
];

export default function SpotifyClone() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist>(PLAYLISTS[0]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = PLAYLISTS.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.songs.some(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>Spotify</Text>
        <TouchableOpacity style={styles.profileAvatar}>
          <Text style={styles.avatarText}>👤</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search songs, artists..."
          placeholderTextColor="#888"
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {/* Featured Horizontal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {PLAYLISTS.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={styles.featuredCard}
                onPress={() => setSelectedPlaylist(playlist)}
              >
                <Text style={styles.featuredCover}>{playlist.cover}</Text>
                <Text style={styles.featuredTitle} numberOfLines={1}>{playlist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Playlists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Playlists</Text>
          {filteredPlaylists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={[styles.playlistItem, selectedPlaylist.id === playlist.id && styles.playlistItemActive]}
              onPress={() => setSelectedPlaylist(playlist)}
            >
              <Text style={styles.playlistCover}>{playlist.cover}</Text>
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>{playlist.name}</Text>
                <Text style={styles.playlistMeta}>{playlist.songs.length} songs</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Songs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{selectedPlaylist.name}</Text>
          {selectedPlaylist.songs.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={[styles.songItem, currentSong?.id === song.id && styles.songItemActive]}
              onPress={() => playSong(song)}
            >
              <Text style={styles.songCover}>{song.cover}</Text>
              <View style={styles.songInfo}>
                <Text style={[styles.songTitle, currentSong?.id === song.id && styles.songTitleActive]}>{song.title}</Text>
                <Text style={styles.songArtist}>{song.artist}</Text>
              </View>
              <Text style={styles.songDuration}>{song.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Now Playing Bar */}
      {currentSong && (
        <View style={styles.nowPlaying}>
          <Text style={styles.nowPlayingCover}>{currentSong.cover}</Text>
          <View style={styles.nowPlayingInfo}>
            <Text style={styles.nowPlayingTitle} numberOfLines={1}>{currentSong.title}</Text>
            <Text style={styles.nowPlayingArtist}>{currentSong.artist}</Text>
          </View>
          <View style={styles.nowPlayingControls}>
            <TouchableOpacity onPress={togglePlayPause}>
              <Text style={styles.playPauseButton}>{isPlaying ? '⏸' : '▶️'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1DB954',
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  searchInput: {
    backgroundColor: '#282828',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalScroll: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  featuredCard: {
    width: 140,
    marginRight: 12,
    alignItems: 'center',
  },
  featuredCover: {
    fontSize: 48,
    marginBottom: 8,
  },
  featuredTitle: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  playlistItemActive: {
    backgroundColor: '#282828',
  },
  playlistCover: {
    fontSize: 48,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  playlistMeta: {
    fontSize: 14,
    color: '#888',
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  songItemActive: {
    backgroundColor: '#282828',
  },
  songCover: {
    fontSize: 40,
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 2,
  },
  songTitleActive: {
    color: '#1DB954',
  },
  songArtist: {
    fontSize: 14,
    color: '#888',
  },
  songDuration: {
    fontSize: 14,
    color: '#888',
  },
  nowPlaying: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#181818',
    borderTopWidth: 1,
    borderTopColor: '#282828',
    gap: 12,
  },
  nowPlayingCover: {
    fontSize: 40,
  },
  nowPlayingInfo: {
    flex: 1,
  },
  nowPlayingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  nowPlayingArtist: {
    fontSize: 12,
    color: '#888',
  },
  nowPlayingControls: {
    paddingHorizontal: 8,
  },
  playPauseButton: {
    fontSize: 24,
  },
});`,
      },
    ],
  },
];
