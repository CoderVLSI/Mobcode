import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { fileManager, FileNode } from '../utils/fileManager';

interface FileSearchProps {
  visible: boolean;
  onClose: () => void;
  onResultSelect?: (file: FileNode, line?: number) => void;
}

interface SearchResult {
  file: FileNode;
  matches: MatchLine[];
}

interface MatchLine {
  lineNumber: number;
  content: string;
  matchStart: number;
  matchEnd: number;
}

export function FileSearch({ visible, onClose, onResultSelect }: FileSearchProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchFiles(searchQuery);
      setSearchResults(results);

      if (results.length === 0) {
        Alert.alert('No Results', `No matches found for "${searchQuery}"`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search files');
    } finally {
      setIsSearching(false);
    }
  };

  const searchFiles = async (query: string): Promise<SearchResult[]> => {
    const results: SearchResult[] = [];
    const tree = await fileManager.scanProject();

    const searchInNode = async (node: FileNode) => {
      if (node.type === 'file' && isTextFile(node.name)) {
        try {
          const content = await fileManager.readFile(node.path);
          const lines = content.split('\n');
          const matches: MatchLine[] = [];

          lines.forEach((line, index) => {
            const lowerLine = line.toLowerCase();
            const lowerQuery = query.toLowerCase();
            let pos = 0;

            while ((pos = lowerLine.indexOf(lowerQuery, pos)) !== -1) {
              matches.push({
                lineNumber: index + 1,
                content: line.trim(),
                matchStart: pos,
                matchEnd: pos + query.length,
              });
              pos += query.length;
            }
          });

          if (matches.length > 0) {
            results.push({ file: node, matches });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }

      if (node.type === 'folder' && node.children) {
        for (const child of node.children) {
          await searchInNode(child);
        }
      }
    };

    if (tree.children) {
      for (const child of tree.children) {
        await searchInNode(child);
      }
    }

    return results;
  };

  const isTextFile = (filename: string): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const textExtensions = [
      'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'h',
      'json', 'md', 'txt', 'html', 'css', 'xml', 'yaml', 'yml',
      'sh', 'bash', 'sql', 'rb', 'go', 'rs', 'php', 'vue', 'dart'
    ];
    return textExtensions.includes(ext || '');
  };

  const handleViewFile = async (file: FileNode) => {
    try {
      const content = await fileManager.readFile(file.path);
      setFileContent(content);
      setSelectedFile(file);
    } catch (error) {
      Alert.alert('Error', 'Could not read file');
    }
  };

  const totalMatches = searchResults.reduce((sum, r) => sum + r.matches.length, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Search Files</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search in files..."
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              onPress={handleSearch}
              style={styles.searchButton}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {searchResults.length > 0 && (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                Found {totalMatches} match{totalMatches !== 1 ? 'es' : ''} in {searchResults.length} file{searchResults.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          <ScrollView style={styles.resultsList}>
            {searchResults.map((result, resultIndex) => (
              <View key={resultIndex} style={styles.resultItem}>
                <TouchableOpacity
                  style={styles.fileHeader}
                  onPress={() => handleViewFile(result.file)}
                >
                  <Ionicons name="document-text" size={18} color={theme.accent} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {result.file.name}
                  </Text>
                  <View style={styles.matchCount}>
                    <Text style={styles.matchCountText}>{result.matches.length}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.matchesContainer}>
                  {result.matches.slice(0, 5).map((match, matchIndex) => (
                    <TouchableOpacity
                      key={matchIndex}
                      style={styles.matchLine}
                      onPress={() => onResultSelect?.(result.file, match.lineNumber)}
                    >
                      <Text style={styles.lineNumber}>{match.lineNumber}</Text>
                      <Text style={styles.lineContent} numberOfLines={1}>
                        {highlightMatch(match.content, match.matchStart, match.matchEnd)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {result.matches.length > 5 && (
                    <Text style={styles.moreMatches}>
                      +{result.matches.length - 5} more matches
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* File Content Modal */}
        {selectedFile && (
          <Modal visible={!!selectedFile} transparent animationType="slide">
            <View style={styles.fileModal}>
              <View style={styles.fileModalContent}>
                <View style={styles.fileModalHeader}>
                  <Text style={styles.fileModalTitle} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.fileModalScroll}>
                  <Text style={styles.fileContent}>{fileContent}</Text>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

function highlightMatch(content: string, start: number, end: number): string {
  const before = content.substring(0, start);
  const match = content.substring(start, end);
  const after = content.substring(end);

  // Truncate if too long
  const maxBefore = 30;
  const maxAfter = 30;

  const truncatedBefore = before.length > maxBefore
    ? '...' + before.substring(before.length - maxBefore)
    : before;

  const truncatedAfter = after.length > maxAfter
    ? after.substring(0, maxAfter) + '...'
    : after;

  return `${truncatedBefore}${match}${truncatedAfter}`;
}

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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    paddingVertical: 10,
  },
  searchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent,
  },
  content: {
    flex: 1,
  },
  summary: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: `${theme.accent}10`,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  summaryText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.surface,
    gap: 8,
  },
  fileName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
  },
  matchCount: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  matchCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  matchesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
  },
  matchLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.inputBackground,
    borderRadius: 4,
    gap: 8,
  },
  lineNumber: {
    fontSize: 11,
    color: theme.textSecondary,
    width: 30,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  lineContent: {
    flex: 1,
    fontSize: 12,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  moreMatches: {
    fontSize: 12,
    color: theme.textSecondary,
    fontStyle: 'italic',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  fileModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileModalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: theme.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  fileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  fileModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  fileModalScroll: {
    flex: 1,
    padding: 16,
  },
  fileContent: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
