import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { fileManager, FileNode } from '../utils/fileManager';

interface FileAttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (files: FileNode[]) => void;
}

export function FileAttachmentPicker({ visible, onClose, onConfirm }: FileAttachmentPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [allFiles, setAllFiles] = useState<FileNode[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFiles();
    } else {
      setQuery('');
      setSelectedPaths(new Set());
    }
  }, [visible]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const tree = await fileManager.scanProject();
      const files: FileNode[] = [];

      const walk = (node: FileNode) => {
        if (node.type === 'file' && isTextFile(node.name)) {
          files.push(node);
        }
        if (node.type === 'folder' && node.children) {
          node.children.forEach(walk);
        }
      };

      if (tree.children) {
        tree.children.forEach(walk);
      }

      files.sort((a, b) => a.path.localeCompare(b.path));
      setAllFiles(files);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (file: FileNode) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(file.path)) {
        next.delete(file.path);
      } else {
        next.add(file.path);
      }
      return next;
    });
  };

  const filteredFiles = allFiles.filter((file) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return file.name.toLowerCase().includes(q) || file.path.toLowerCase().includes(q);
  });

  const selectedFiles = allFiles.filter((file) => selectedPaths.has(file.path));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Attach Files</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.inputWrapper}>
            <Ionicons name="search" size={18} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Filter files..."
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.loadingText}>Loading files...</Text>
            </View>
          ) : (
            <ScrollView style={styles.fileList} showsVerticalScrollIndicator={false}>
              {filteredFiles.map((file) => {
                const isSelected = selectedPaths.has(file.path);
                return (
                  <TouchableOpacity
                    key={file.path}
                    style={[styles.fileRow, isSelected && styles.fileRowSelected]}
                    onPress={() => toggleSelect(file)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isSelected ? theme.accent : theme.textSecondary}
                    />
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.filePath} numberOfLines={1}>
                        {file.path.replace(fileManager.getProjectRoot() + '/', '')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {!loading && filteredFiles.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No files found</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {selectedFiles.length} selected
          </Text>
          <TouchableOpacity
            style={[styles.attachButton, selectedFiles.length === 0 && styles.attachButtonDisabled]}
            onPress={() => onConfirm(selectedFiles)}
            disabled={selectedFiles.length === 0}
          >
            <Text style={styles.attachButtonText}>Attach</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const isTextFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const textExtensions = [
    'ts', 'tsx', 'js', 'jsx', 'py', 'java', 'cpp', 'c', 'h',
    'json', 'md', 'txt', 'html', 'css', 'xml', 'yaml', 'yml',
    'sh', 'bash', 'sql', 'rb', 'go', 'rs', 'php', 'vue', 'dart',
  ];
  return textExtensions.includes(ext || '');
};

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
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  fileList: {
    flex: 1,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  fileRowSelected: {
    backgroundColor: `${theme.accent}12`,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  filePath: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  footerText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  attachButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.accent,
  },
  attachButtonDisabled: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  attachButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});
