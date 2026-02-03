import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { fileManager, FileNode } from '../utils/fileManager';
import { codeParser, ParsedFile } from '../utils/codeParser';
import { FileContextMenu } from './FileContextMenu';
import { HTMLPreview } from './HTMLPreview';
import { ReactPreview } from './ReactPreview';
import { ComponentPreview } from './ComponentPreview';
import { SAMPLE_PROJECTS } from '../data/sampleProjects';

interface FileExplorerProps {
  visible: boolean;
  onClose: () => void;
  onFilesCreated?: (files: ParsedFile[]) => void;
  onFileSelect?: (file: FileNode) => void;
}

export function FileExplorer({ visible, onClose, onFilesCreated, onFileSelect }: FileExplorerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(fileManager.getProjectRoot());
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuFile, setContextMenuFile] = useState<FileNode | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showHTMLPreview, setShowHTMLPreview] = useState(false);
  const [showReactPreview, setShowReactPreview] = useState(false);
  const [reactPreviewFile, setReactPreviewFile] = useState<FileNode | null>(null);
  const [showSamples, setShowSamples] = useState(false);
  const [previewComponentId, setPreviewComponentId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadFiles();
    }
  }, [visible]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const tree = await fileManager.scanProject();
      setFileTree(tree);
      setExpandedFolders(new Set([tree.id]));
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (id: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileSelect = async (node: FileNode) => {
    if (node.type === 'file') {
      try {
        const content = await fileManager.readFile(node.path);
        setFileContent(content);
        setSelectedFile(node);
        onFileSelect?.(node);
      } catch (error) {
        Alert.alert('Error', 'Could not read file');
      }
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) {
      Alert.alert('Error', 'Please enter a file name');
      return;
    }

    try {
      const fullPath = `${selectedFolder}/${newFileName.trim()}`;
      await fileManager.createFile(fullPath);
      setShowNewFileModal(false);
      setNewFileName('');
      loadFiles();
      Alert.alert('Success', 'File created successfully');
    } catch (error) {
      Alert.alert('Error', 'Could not create file');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFileName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }

    try {
      const fullPath = `${selectedFolder}/${newFileName.trim()}`;
      await fileManager.createFolder(fullPath);
      setShowNewFolderModal(false);
      setNewFileName('');
      loadFiles();
      Alert.alert('Success', 'Folder created successfully');
    } catch (error) {
      Alert.alert('Error', 'Could not create folder');
    }
  };

  const handleDelete = async (node: FileNode) => {
    Alert.alert(
      'Delete',
      `Are you sure you want to delete "${node.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await fileManager.deleteFile(node.path);
              loadFiles();
              if (selectedFile?.id === node.id) {
                setSelectedFile(null);
                setFileContent('');
              }
            } catch (error) {
              Alert.alert('Error', 'Could not delete');
            }
          },
        },
      ]
    );
  };

  const handleContextMenu = (event: any, node: FileNode) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenuPosition({ x: pageX, y: pageY });
    setContextMenuFile(node);
    setShowContextMenu(true);
  };

  const handleRenameFile = () => {
    setShowRenameModal(true);
    setRenameValue(contextMenuFile?.name || '');
    setShowContextMenu(false);
  };

  const handleRenameSubmit = async () => {
    if (!contextMenuFile || !renameValue.trim()) {
      Alert.alert('Error', 'Please enter a file name');
      return;
    }

    try {
      const newPath = contextMenuFile.path.replace(contextMenuFile.name, renameValue.trim());
      await fileManager.writeFile(newPath, fileContent);
      await fileManager.deleteFile(contextMenuFile.path);
      setShowRenameModal(false);
      loadFiles();
      Alert.alert('Success', 'File renamed successfully');
    } catch (error) {
      Alert.alert('Error', 'Could not rename file');
    }
  };

  const handleDeleteFile = () => {
    if (contextMenuFile) {
      handleDelete(contextMenuFile);
    }
    setShowContextMenu(false);
  };

  const handleOpenHTMLPreview = () => {
    setShowContextMenu(false);
    setShowHTMLPreview(true);
  };

  const handleOpenReactPreview = () => {
    if (contextMenuFile?.type !== 'file') return;
    setReactPreviewFile(contextMenuFile);
    setShowContextMenu(false);
    setShowReactPreview(true);
  };

  const getFileIcon = (fileName: string, type: string) => {
    if (type === 'folder') {
      return 'folder';
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return 'code';
      case 'json':
        return 'file-tray';
      case 'md':
        return 'document-text';
      case 'html':
        return 'globe';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return 'image';
      default:
        return 'document';
    }
  };

  const getFileColor = (fileName: string, type: string, theme: Theme) => {
    if (type === 'folder') {
      return theme.warning;
    }

    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
        return theme.success;
      case 'js':
      case 'jsx':
        return theme.accent;
      case 'json':
        return theme.warning;
      case 'md':
        return theme.textSecondary;
      case 'html':
        return '#FF6B35'; // Orange for HTML files
      default:
        return theme.textSecondary;
    }
  };

  const renderNode = (node: FileNode, level: number = 0, isRoot: boolean = false) => {
    const isExpanded = expandedFolders.has(node.id);
    const isFolder = node.type === 'folder';
    const isSelected = selectedFile?.id === node.id;

    return (
      <View key={node.id}>
        <TouchableOpacity
          style={[styles.fileNode, isSelected && styles.fileNodeSelected, { paddingLeft: isRoot ? 16 : 12 + level * 16 }]}
          onPress={() => {
            if (isFolder && !isRoot) {
              toggleFolder(node.id);
            } else if (!isFolder) {
              handleFileSelect(node);
            }
          }}
          onLongPress={(e) => handleContextMenu(e, node)}
        >
          {!isRoot && (
            <Ionicons
              name={isFolder ? (isExpanded ? 'chevron-down' : 'chevron-forward') : 'document'}
              size={16}
              color={theme.textSecondary}
              style={styles.chevron}
            />
          )}
          <Ionicons
            name={getFileIcon(node.name, node.type) as any}
            size={18}
            color={getFileColor(node.name, node.type, theme)}
          />
          <Text style={[styles.fileName, isSelected && styles.fileNameSelected]} numberOfLines={1}>
            {node.name}
          </Text>
          {node.type === 'folder' && level > 0 && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDelete(node);
              }}
            >
              <Ionicons name="trash" size={16} color={theme.error} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {isFolder && isExpanded && node.children && (
          <View>
            {node.children.map((child) => renderNode(child, level + 1, false))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explorer</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={loadFiles} style={styles.headerButton}>
              <Ionicons name="refresh" size={24} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => setShowNewFileModal(true)}>
            <Ionicons name="add-circle-outline" size={20} color={theme.accent} />
            <Text style={styles.toolbarText}>New File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => setShowNewFolderModal(true)}>
            <Ionicons name="create" size={20} color={theme.accent} />
            <Text style={styles.toolbarText}>New Folder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => setShowSamples(true)}>
            <Ionicons name="folder-open" size={20} color={theme.accent} />
            <Text style={styles.toolbarText}>Samples</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.loadingText}>Loading files...</Text>
            </View>
          ) : fileTree && fileTree.children && fileTree.children.length > 0 ? (
            <ScrollView style={styles.fileList}>
              {fileTree.children.map((node) => renderNode(node))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No files found</Text>
              <Text style={styles.emptySubtext}>Create a new file to get started</Text>
            </View>
          )}
        </View>

        {/* File Content Panel */}
        {selectedFile && (
          <View style={styles.fileContentPanel}>
            <View style={styles.fileContentHeader}>
              <View style={styles.fileInfo}>
                <Ionicons name="document-text" size={16} color={theme.accent} />
                <Text style={styles.fileContentName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fileContentScroll}>
              <Text style={styles.codeText}>{fileContent}</Text>
            </ScrollView>
          </View>
        )}

        {/* New File Modal */}
        <Modal visible={showNewFileModal} transparent animationType="fade">
          <View style={styles.inputModal}>
            <View style={styles.inputModalContent}>
              <Text style={styles.inputModalTitle}>New File</Text>
              <TextInput
                style={styles.input}
                value={newFileName}
                onChangeText={setNewFileName}
                placeholder="filename.tsx"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                autoFocus
              />
              <View style={styles.inputButtons}>
                <TouchableOpacity
                  style={[styles.inputButton, styles.inputButtonCancel]}
                  onPress={() => {
                    setShowNewFileModal(false);
                    setNewFileName('');
                  }}
                >
                  <Text style={styles.inputButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inputButton, styles.inputButtonConfirm]}
                  onPress={handleCreateFile}
                >
                  <Text style={styles.inputButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* New Folder Modal */}
        <Modal visible={showNewFolderModal} transparent animationType="fade">
          <View style={styles.inputModal}>
            <View style={styles.inputModalContent}>
              <Text style={styles.inputModalTitle}>New Folder</Text>
              <TextInput
                style={styles.input}
                value={newFileName}
                onChangeText={setNewFileName}
                placeholder="folder-name"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                autoFocus
              />
              <View style={styles.inputButtons}>
                <TouchableOpacity
                  style={[styles.inputButton, styles.inputButtonCancel]}
                  onPress={() => {
                    setShowNewFolderModal(false);
                    setNewFileName('');
                  }}
                >
                  <Text style={styles.inputButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inputButton, styles.inputButtonConfirm]}
                  onPress={handleCreateFolder}
                >
                  <Text style={styles.inputButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Rename Modal */}
        <Modal visible={showRenameModal} transparent animationType="fade">
          <View style={styles.inputModal}>
            <View style={styles.inputModalContent}>
              <Text style={styles.inputModalTitle}>Rename File</Text>
              <TextInput
                style={styles.input}
                value={renameValue}
                onChangeText={setRenameValue}
                placeholder="new-file-name.html"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                autoFocus
              />
              <View style={styles.inputButtons}>
                <TouchableOpacity
                  style={[styles.inputButton, styles.inputButtonCancel]}
                  onPress={() => {
                    setShowRenameModal(false);
                    setRenameValue('');
                  }}
                >
                  <Text style={styles.inputButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.inputButton, styles.inputButtonConfirm]}
                  onPress={handleRenameSubmit}
                >
                  <Text style={styles.inputButtonText}>Rename</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Context Menu */}
        <FileContextMenu
          visible={showContextMenu}
          x={contextMenuPosition.x}
          y={contextMenuPosition.y}
          fileName={contextMenuFile?.name || ''}
          filePath={contextMenuFile?.path || ''}
          onClose={() => setShowContextMenu(false)}
          onOpenInBrowser={handleOpenHTMLPreview}
          onOpenReactPreview={handleOpenReactPreview}
          onRename={handleRenameFile}
          onDelete={handleDeleteFile}
        />

        {/* HTML Preview Modal */}
        <HTMLPreview
          visible={showHTMLPreview}
          filePath={contextMenuFile?.path || ''}
          fileName={contextMenuFile?.name || ''}
          onClose={() => setShowHTMLPreview(false)}
        />

        {/* React Preview Modal */}
        {reactPreviewFile && (
          <ReactPreview
            visible={showReactPreview}
            filePath={reactPreviewFile.path}
            fileName={reactPreviewFile.name}
            onClose={() => {
              setShowReactPreview(false);
              setReactPreviewFile(null);
            }}
          />
        )}

        {/* Samples Modal */}
        <Modal visible={showSamples} transparent animationType="fade">
          <View style={styles.samplesModalOverlay}>
            <TouchableOpacity style={styles.samplesBackdrop} activeOpacity={1} onPress={() => setShowSamples(false)} />
            <View style={styles.samplesModalContent}>
              <View style={styles.samplesModalHeader}>
                <Text style={styles.samplesModalTitle}>Sample Projects</Text>
                <TouchableOpacity onPress={() => setShowSamples(false)}>
                  <Ionicons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.samplesList}>
                {SAMPLE_PROJECTS.map((project) => (
                  <View key={project.id} style={styles.sampleCard}>
                    <View style={styles.sampleIcon}>
                      <Ionicons name={project.icon as any} size={24} color={theme.accent} />
                    </View>
                    <View style={styles.sampleInfo}>
                      <Text style={styles.sampleName}>{project.name}</Text>
                      <Text style={styles.sampleDesc} numberOfLines={2}>{project.description}</Text>
                      <View style={styles.sampleFiles}>
                        {project.files.map((f) => (
                          <Text key={f.name} style={styles.sampleFileName}>{f.name}</Text>
                        ))}
                      </View>
                    </View>
                    <View style={styles.sampleActions}>
                      <TouchableOpacity
                        style={styles.samplePreviewButton}
                        onPress={() => setPreviewComponentId(project.id)}
                      >
                        <Ionicons name="eye" size={20} color={theme.text} />
                        <Text style={styles.sampleActionText}>Preview</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.sampleAddButton}
                        onPress={async () => {
                          try {
                            const root = fileManager.getProjectRoot();
                            const projectDir = `${root}/samples/${project.id}`;
                            await fileManager.createFolder(projectDir);
                            for (const file of project.files) {
                              await fileManager.writeFile(`${projectDir}/${file.name}`, file.content);
                            }
                            setShowSamples(false);
                            loadFiles();
                            Alert.alert('Success', `Created ${project.name} in samples/${project.id}/`);
                          } catch (error) {
                            Alert.alert('Error', `Failed to create project: ${(error as Error).message}`);
                          }
                        }}
                      >
                        <Ionicons name="add-circle" size={20} color={theme.accent} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Component Preview Modal */}
        {previewComponentId && (
          <ComponentPreview
            visible={!!previewComponentId}
            onClose={() => setPreviewComponentId(null)}
            componentId={previewComponentId}
          />
        )}
      </View>
    </Modal>
  );
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
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  toolbar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 16,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolbarText: {
    fontSize: 13,
    color: theme.text,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  fileNode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  fileNodeSelected: {
    backgroundColor: `${theme.accent}15`,
  },
  fileName: {
    fontSize: 14,
    color: theme.text,
    flex: 1,
  },
  fileNameSelected: {
    color: theme.accent,
  },
  chevron: {
    width: 16,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 4,
  },
  fileContentPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    backgroundColor: theme.background,
    borderLeftWidth: 1,
    borderLeftColor: theme.border,
  },
  fileContentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fileContentName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
  },
  fileContentScroll: {
    flex: 1,
    padding: 16,
  },
  codeText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inputModalContent: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  inputModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  inputButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  inputButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inputButtonCancel: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputButtonConfirm: {
    backgroundColor: theme.accent,
  },
  inputButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  samplesModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  samplesBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  samplesModalContent: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  samplesModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  samplesModalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.text,
  },
  samplesList: {
    maxHeight: 400,
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 12,
  },
  sampleActions: {
    flexDirection: 'column',
    gap: 8,
  },
  samplePreviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  sampleActionText: {
    fontSize: 11,
    color: theme.text,
    fontWeight: '500',
  },
  sampleAddButton: {
    padding: 6,
  },
  sampleIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: `${theme.accent}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleInfo: {
    flex: 1,
    gap: 4,
  },
  sampleName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  sampleDesc: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 16,
  },
  sampleFiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  sampleFileName: {
    fontSize: 10,
    color: theme.accent,
    backgroundColor: `${theme.accent}12`,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
