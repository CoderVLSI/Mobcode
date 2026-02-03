import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { mcpClient, MCPServer } from '../utils/mcpClient';

interface MCPManagerProps {
  visible: boolean;
  onClose: () => void;
}

export function MCPManager({ visible, onClose }: MCPManagerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [showAddServer, setShowAddServer] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadServers();
    }
  }, [visible]);

  const loadServers = () => {
    setServers(mcpClient.listServers());
  };

  const handleAddServer = async () => {
    if (!serverName.trim() || !serverUrl.trim()) {
      Alert.alert('Error', 'Please enter server name and URL');
      return;
    }

    setConnecting(true);
    try {
      await mcpClient.connectServer(serverName.trim(), serverUrl.trim());
      setShowAddServer(false);
      setServerName('');
      setServerUrl('');
      loadServers();
      Alert.alert('Success', `Connected to ${serverName}`);
    } catch (error) {
      Alert.alert('Error', `Failed to connect: ${error}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleAddPreset = async (preset: string) => {
    setConnecting(true);
    try {
      await mcpClient.addPresetServer(preset);
      loadServers();
      Alert.alert('Success', `Connected to ${preset}`);
    } catch (error) {
      Alert.alert('Error', `Failed to connect: ${error}`);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = (serverName: string) => {
    Alert.alert(
      'Disconnect Server',
      `Disconnect from "${serverName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            mcpClient.disconnectServer(serverName);
            loadServers();
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: MCPServer['status'], theme: Theme) => {
    switch (status) {
      case 'connected':
        return <Ionicons name="checkmark-circle" size={16} color={theme.success} />;
      case 'disconnected':
        return <Ionicons name="close-circle" size={16} color={theme.textSecondary} />;
      case 'error':
        return <Ionicons name="alert-circle" size={16} color={theme.error} />;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MCP Servers</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preset Servers</Text>
            <View style={styles.presetGrid}>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => handleAddPreset('filesystem')}
              >
                <Ionicons name="folder" size={24} color={theme.accent} />
                <Text style={styles.presetText}>Filesystem</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => handleAddPreset('github')}
              >
                <Ionicons name="logo-github" size={24} color={theme.accent} />
                <Text style={styles.presetText}>GitHub</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => handleAddPreset('database')}
              >
                <Ionicons name="server" size={24} color={theme.accent} />
                <Text style={styles.presetText}>Database</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetButton}
                onPress={() => handleAddPreset('brave-search')}
              >
                <Ionicons name="search" size={24} color={theme.accent} />
                <Text style={styles.presetText}>Search</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Connected Servers</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddServer(true)}
              >
                <Ionicons name="add-circle" size={20} color={theme.accent} />
              </TouchableOpacity>
            </View>

            {servers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cloud-off" size={48} color={theme.textSecondary} />
                <Text style={styles.emptyText}>No MCP servers connected</Text>
                <Text style={styles.emptySubtext}>Connect to external tools</Text>
              </View>
            ) : (
              <ScrollView style={styles.serversList}>
                {servers.map((server) => (
                  <View key={server.name} style={styles.serverItem}>
                    <View style={styles.serverInfo}>
                      {getStatusIcon(server.status, theme)}
                      <View style={styles.serverDetails}>
                        <Text style={styles.serverName}>{server.name}</Text>
                        <Text style={styles.serverUrl} numberOfLines={1}>
                          {server.url}
                        </Text>
                        <Text style={styles.serverTools}>{server.tools.length} tools</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.disconnectButton}
                      onPress={() => handleDisconnect(server.name)}
                    >
                      <Ionicons name="close" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {connecting && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={styles.loadingText}>Connecting...</Text>
            </View>
          )}
        </View>

        {/* Add Server Modal */}
        <Modal visible={showAddServer} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add MCP Server</Text>

              <TextInput
                style={styles.input}
                value={serverName}
                onChangeText={setServerName}
                placeholder="Server name"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
              />

              <TextInput
                style={styles.input}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="Server URL (e.g., http://localhost:3000/mcp)"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddServer(false);
                    setServerName('');
                    setServerUrl('');
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.connectButton]}
                  onPress={handleAddServer}
                  disabled={connecting}
                >
                  <Text style={styles.modalButtonText}>Connect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    width: '45%',
    aspectRatio: 1.5,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  presetText: {
    fontSize: 12,
    color: theme.text,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: theme.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  serversList: {
    flex: 1,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  serverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  serverDetails: {
    flex: 1,
  },
  serverName: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
  },
  serverUrl: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  serverTools: {
    fontSize: 11,
    color: theme.accent,
    marginTop: 2,
  },
  disconnectButton: {
    padding: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 350,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
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
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  connectButton: {
    backgroundColor: theme.accent,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
});
