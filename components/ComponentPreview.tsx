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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface ComponentPreviewProps {
  visible: boolean;
  onClose: () => void;
  componentId: string;
}

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

const PLAYLISTS_SPOTIFY: Playlist[] = [
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

function SpotifyClone() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist>(PLAYLISTS_SPOTIFY[0]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlaylists = PLAYLISTS_SPOTIFY.filter(p =>
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
    <View style={previewStyles.spotifyContainer}>
      {/* Header */}
      <View style={previewStyles.spotifyHeader}>
        <Text style={previewStyles.spotifyLogo}>Spotify</Text>
        <View style={previewStyles.profileAvatar}>
          <Text style={previewStyles.avatarText}>👤</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={previewStyles.searchContainer}>
        <TextInput
          style={previewStyles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search songs, artists..."
          placeholderTextColor="#888"
        />
      </View>

      {/* Content */}
      <ScrollView style={previewStyles.spotifyContent}>
        {/* Featured Horizontal */}
        <View style={previewStyles.section}>
          <Text style={previewStyles.sectionTitle}>Recently Played</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={previewStyles.horizontalScroll}>
            {PLAYLISTS_SPOTIFY.map((playlist) => (
              <TouchableOpacity
                key={playlist.id}
                style={previewStyles.featuredCard}
                onPress={() => setSelectedPlaylist(playlist)}
              >
                <Text style={previewStyles.featuredCover}>{playlist.cover}</Text>
                <Text style={previewStyles.featuredTitle} numberOfLines={1}>{playlist.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Playlists */}
        <View style={previewStyles.section}>
          <Text style={previewStyles.sectionTitle}>Your Playlists</Text>
          {filteredPlaylists.map((playlist) => (
            <TouchableOpacity
              key={playlist.id}
              style={[previewStyles.playlistItem, selectedPlaylist.id === playlist.id && previewStyles.playlistItemActive]}
              onPress={() => setSelectedPlaylist(playlist)}
            >
              <Text style={previewStyles.playlistCover}>{playlist.cover}</Text>
              <View style={previewStyles.playlistInfo}>
                <Text style={previewStyles.playlistName}>{playlist.name}</Text>
                <Text style={previewStyles.playlistMeta}>{playlist.songs.length} songs</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Songs */}
        <View style={previewStyles.section}>
          <Text style={previewStyles.sectionTitle}>{selectedPlaylist.name}</Text>
          {selectedPlaylist.songs.map((song) => (
            <TouchableOpacity
              key={song.id}
              style={[previewStyles.songItem, currentSong?.id === song.id && previewStyles.songItemActive]}
              onPress={() => playSong(song)}
            >
              <Text style={previewStyles.songCover}>{song.cover}</Text>
              <View style={previewStyles.songInfo}>
                <Text style={[previewStyles.songTitle, currentSong?.id === song.id && previewStyles.songTitleActive]}>{song.title}</Text>
                <Text style={previewStyles.songArtist}>{song.artist}</Text>
              </View>
              <Text style={previewStyles.songDuration}>{song.duration}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Now Playing Bar */}
      {currentSong && (
        <View style={previewStyles.nowPlaying}>
          <Text style={previewStyles.nowPlayingCover}>{currentSong.cover}</Text>
          <View style={previewStyles.nowPlayingInfo}>
            <Text style={previewStyles.nowPlayingTitle} numberOfLines={1}>{currentSong.title}</Text>
            <Text style={previewStyles.nowPlayingArtist}>{currentSong.artist}</Text>
          </View>
          <View style={previewStyles.nowPlayingControls}>
            <TouchableOpacity onPress={togglePlayPause}>
              <Text style={previewStyles.playPauseButton}>{isPlaying ? '⏸' : '▶️'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
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
  'spotify-clone': SpotifyClone,
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
  // Spotify styles
  spotifyContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  spotifyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  spotifyLogo: {
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
  spotifyContent: {
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
});
