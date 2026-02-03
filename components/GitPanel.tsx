import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { toolRegistry } from '../utils/toolRegistry';
import { storage } from '../utils/storage';

interface GitPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function GitPanel({ visible, onClose }: GitPanelProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [statusOutput, setStatusOutput] = useState('');
  const [logOutput, setLogOutput] = useState('');
  const [branch, setBranch] = useState('');
  const [changedCount, setChangedCount] = useState(0);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingLog, setIsLoadingLog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showLog, setShowLog] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [remoteUsername, setRemoteUsername] = useState('');
  const [remoteToken, setRemoteToken] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [isRepo, setIsRepo] = useState(false);

  const loadSettings = async () => {
    const settings = await storage.getGitSettings();
    setRemoteUrl(settings.remoteUrl || '');
    setRemoteUsername(settings.username || '');
    setRemoteToken(settings.token || '');
    setAuthorName(settings.authorName || '');
    setAuthorEmail(settings.authorEmail || '');
  };

  useEffect(() => {
    if (visible) {
      loadSettings();
      refreshStatus();
      refreshLog();
    } else {
      setShowLog(false);
    }
  }, [visible]);

  const refreshStatus = async () => {
    setIsLoadingStatus(true);
    setStatusError(null);
    try {
      const result = await toolRegistry.execute('git_status', {});
      if (!result.success) {
        setStatusError(result.error || 'Failed to load git status.');
        setStatusOutput('');
        setBranch('');
        setChangedCount(0);
        setIsRepo(false);
        return;
      }

      const output = result.output || 'No status available.';
      setStatusOutput(output);
      setIsRepo(true);

      const dataBranch = typeof result.data?.branch === 'string' ? result.data.branch : '';
      if (dataBranch) {
        setBranch(dataBranch);
      } else {
        const branchMatch = output.match(/On branch ([^\n]+)/);
        setBranch(branchMatch ? branchMatch[1].trim() : '');
      }

      const files = Array.isArray(result.data?.files) ? result.data.files : [];
      setChangedCount(files.length);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const refreshLog = async () => {
    setIsLoadingLog(true);
    try {
      const result = await toolRegistry.execute('git_log', { limit: 10 });
      if (!result.success) {
        setLogOutput(result.error || 'Failed to load git log.');
        return;
      }
      setLogOutput(result.output || 'No commits yet.');
    } finally {
      setIsLoadingLog(false);
    }
  };

  const handleStageAll = async () => {
    const result = await toolRegistry.execute('git_add', { files: ['.'] });
    if (!result.success) {
      Alert.alert('Git Error', result.error || 'Failed to stage files.');
      return;
    }
    Alert.alert('Staged', result.output || 'Files staged.');
    refreshStatus();
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) {
      Alert.alert('Commit Message Required', 'Enter a short commit message.');
      return;
    }
    const result = await toolRegistry.execute('git_commit', {
      message: commitMessage.trim(),
      authorName,
      authorEmail,
    });
    if (!result.success) {
      Alert.alert('Git Error', result.error || 'Failed to commit changes.');
      return;
    }
    Alert.alert('Commit Created', result.output || 'Commit created.');
    setCommitMessage('');
    refreshLog();
    refreshStatus();
  };

  const handleSaveSettings = async () => {
    await storage.setGitSettings({
      remoteUrl: remoteUrl.trim(),
      username: remoteUsername.trim(),
      token: remoteToken.trim(),
      authorName: authorName.trim() || 'Mobcode User',
      authorEmail: authorEmail.trim() || 'user@example.com',
    });

    if (isRepo && remoteUrl.trim()) {
      const result = await toolRegistry.execute('git_set_remote', {
        name: 'origin',
        url: remoteUrl.trim(),
      });
      if (!result.success) {
        Alert.alert('Git Error', result.error || 'Failed to set remote.');
        return;
      }
    }

    Alert.alert('Saved', 'Git settings saved.');
  };

  const handleInitRepo = async () => {
    const result = await toolRegistry.execute('git_init', {});
    if (!result.success) {
      Alert.alert('Git Error', result.error || 'Failed to initialize repository.');
      return;
    }
    if (remoteUrl.trim()) {
      await toolRegistry.execute('git_set_remote', {
        name: 'origin',
        url: remoteUrl.trim(),
      });
    }
    Alert.alert('Git Initialized', result.output || 'Repository initialized.');
    refreshStatus();
  };

  const handleClone = async () => {
    if (!remoteUrl.trim()) {
      Alert.alert('Remote Required', 'Enter a remote URL to clone.');
      return;
    }
    const result = await toolRegistry.execute('git_clone', {
      url: remoteUrl.trim(),
      username: remoteUsername.trim(),
      token: remoteToken.trim(),
    });
    if (!result.success) {
      Alert.alert('Git Error', result.error || 'Failed to clone repository.');
      return;
    }
    Alert.alert('Cloned', result.output || 'Repository cloned.');
    refreshStatus();
    refreshLog();
  };

  const handlePull = async () => {
    const result = await toolRegistry.execute('git_pull', {
      remote: 'origin',
      username: remoteUsername.trim(),
      token: remoteToken.trim(),
      authorName,
      authorEmail,
    });
    if (!result.success) {
      Alert.alert('Git Error', result.error || 'Failed to pull.');
      return;
    }
    Alert.alert('Pulled', result.output || 'Pulled from remote.');
    refreshStatus();
    refreshLog();
  };

  const handlePush = async () => {
    const result = await toolRegistry.execute('git_push', {
      remote: 'origin',
      username: remoteUsername.trim(),
      token: remoteToken.trim(),
    });
    if (!result.success) {
      Alert.alert('Git Error', result.error || 'Failed to push.');
      return;
    }
    Alert.alert('Pushed', result.output || 'Pushed to remote.');
  };

  const canOperate = !statusError;
  const canRemoteOperate = isRepo && !!remoteUrl.trim();
  const canInitOrClone = !isRepo;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="logo-github" size={20} color={theme.accent} />
              <Text style={styles.headerTitle}>Git Panel</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Branch</Text>
                <Text style={styles.summaryValue}>{branch || '—'}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Changes</Text>
                <Text style={styles.summaryValue}>{changedCount}</Text>
              </View>
              <TouchableOpacity onPress={refreshStatus} style={styles.refreshButton}>
                <Ionicons name="refresh" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {statusError && (
              <View style={styles.errorBanner}>
                <Ionicons name="warning" size={16} color={theme.error} />
                <Text style={styles.errorText}>{statusError}</Text>
              </View>
            )}

            <View style={styles.statusBox}>
              <ScrollView>
                <Text style={styles.statusText}>
                  {isLoadingStatus ? 'Loading status...' : (statusOutput || 'No status loaded.')}
                </Text>
              </ScrollView>
            </View>

            <View style={styles.remoteSection}>
              <Text style={styles.sectionTitle}>Remote</Text>
              <TextInput
                style={styles.remoteInput}
                value={remoteUrl}
                onChangeText={setRemoteUrl}
                placeholder="https://github.com/user/repo.git"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
              />
              <View style={styles.remoteRow}>
                <TextInput
                  style={styles.remoteInputHalf}
                  value={remoteUsername}
                  onChangeText={setRemoteUsername}
                  placeholder="Username (optional)"
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.remoteInputHalf}
                  value={remoteToken}
                  onChangeText={setRemoteToken}
                  placeholder="Token / password"
                  placeholderTextColor={theme.placeholder}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <Text style={styles.sectionTitle}>Author</Text>
              <View style={styles.remoteRow}>
                <TextInput
                  style={styles.remoteInputHalf}
                  value={authorName}
                  onChangeText={setAuthorName}
                  placeholder="Author name"
                  placeholderTextColor={theme.placeholder}
                />
                <TextInput
                  style={styles.remoteInputHalf}
                  value={authorEmail}
                  onChangeText={setAuthorEmail}
                  placeholder="Author email"
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.remoteActions}>
                <TouchableOpacity
                  style={styles.remoteActionButton}
                  onPress={handleSaveSettings}
                >
                  <Ionicons name="save-outline" size={14} color={theme.text} />
                  <Text style={styles.remoteActionText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.remoteActionButton, !canInitOrClone && styles.actionButtonDisabled]}
                  onPress={handleInitRepo}
                  disabled={!canInitOrClone}
                >
                  <Ionicons name="add-circle-outline" size={14} color={theme.text} />
                  <Text style={styles.remoteActionText}>Init</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.remoteActionButton, (!canInitOrClone || !remoteUrl.trim()) && styles.actionButtonDisabled]}
                  onPress={handleClone}
                  disabled={!canInitOrClone || !remoteUrl.trim()}
                >
                  <Ionicons name="download-outline" size={14} color={theme.text} />
                  <Text style={styles.remoteActionText}>Clone</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.remoteActionButton, !canRemoteOperate && styles.actionButtonDisabled]}
                  onPress={handlePull}
                  disabled={!canRemoteOperate}
                >
                  <Ionicons name="cloud-download-outline" size={14} color={theme.text} />
                  <Text style={styles.remoteActionText}>Pull</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.remoteActionButton, !canRemoteOperate && styles.actionButtonDisabled]}
                  onPress={handlePush}
                  disabled={!canRemoteOperate}
                >
                  <Ionicons name="cloud-upload-outline" size={14} color={theme.text} />
                  <Text style={styles.remoteActionText}>Push</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, !canOperate && styles.actionButtonDisabled]}
                onPress={handleStageAll}
                disabled={!canOperate}
              >
                <Ionicons name="checkbox-outline" size={16} color={theme.text} />
                <Text style={styles.actionButtonText}>Stage All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowLog((prev) => !prev)}
              >
                <Ionicons name={showLog ? 'eye-off' : 'eye'} size={16} color={theme.text} />
                <Text style={styles.actionButtonText}>{showLog ? 'Hide Log' : 'Show Log'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.commitSection}>
              <TextInput
                style={styles.commitInput}
                value={commitMessage}
                onChangeText={setCommitMessage}
                placeholder="Commit message"
                placeholderTextColor={theme.placeholder}
              />
              <TouchableOpacity
                style={[styles.commitButton, (!commitMessage.trim() || !canOperate) && styles.commitButtonDisabled]}
                onPress={handleCommit}
                disabled={!commitMessage.trim() || !canOperate}
              >
                <Text style={styles.commitButtonText}>Commit</Text>
              </TouchableOpacity>
            </View>

            {showLog && (
              <View style={styles.logSection}>
                <View style={styles.logHeader}>
                  <Text style={styles.sectionTitle}>Recent Commits</Text>
                  <TouchableOpacity onPress={refreshLog} style={styles.refreshButtonSmall}>
                    <Ionicons name="refresh" size={16} color={theme.textSecondary} />
                    <Text style={styles.refreshText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.logBox}>
                  <ScrollView>
                    <Text style={styles.statusText}>
                      {isLoadingLog ? 'Loading log...' : (logOutput || 'No commits yet.')}
                    </Text>
                  </ScrollView>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 440,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  closeButton: {
    padding: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  summaryLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 13,
    color: theme.text,
    fontWeight: '600',
    marginTop: 2,
  },
  refreshButton: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: `${theme.error}15`,
    borderWidth: 1,
    borderColor: `${theme.error}30`,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: theme.error,
    fontSize: 12,
    flex: 1,
  },
  statusBox: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    maxHeight: 180,
  },
  remoteSection: {
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  remoteInput: {
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.text,
  },
  remoteRow: {
    flexDirection: 'row',
    gap: 8,
  },
  remoteInputHalf: {
    flex: 1,
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.text,
  },
  remoteActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  remoteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  remoteActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
  },
  statusText: {
    fontSize: 12,
    color: theme.text,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
  },
  commitSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  commitInput: {
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.text,
  },
  commitButton: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  commitButtonDisabled: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    opacity: 0.7,
  },
  commitButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  logSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  logBox: {
    backgroundColor: theme.inputBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
    maxHeight: 160,
  },
  refreshButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  refreshText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontWeight: '600',
  },
});
