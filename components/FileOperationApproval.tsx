import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { ParsedFile } from '../utils/codeParser';

export type FileOperationType = 'read' | 'write' | 'delete' | 'create';

export interface FileOperation {
  type: FileOperationType;
  file: ParsedFile;
  reason?: string;
}

interface FileOperationApprovalProps {
  visible: boolean;
  operations: FileOperation[];
  onApprove: (approvedOps: FileOperation[]) => void;
  onReject: () => void;
}

export function FileOperationApproval({
  visible,
  operations,
  onApprove,
  onReject,
}: FileOperationApprovalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [selectedOperations, setSelectedOperations] = React.useState<Set<number>>(
    new Set(operations.map((_, i) => i))
  );

  React.useEffect(() => {
    if (visible) {
      // Auto-select all operations by default
      setSelectedOperations(new Set(operations.map((_, i) => i)));
    }
  }, [visible, operations]);

  const toggleOperation = (index: number) => {
    const newSelected = new Set(selectedOperations);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedOperations(newSelected);
  };

  const handleApprove = () => {
    const approved = operations.filter((_, i) => selectedOperations.has(i));
    if (approved.length === 0) {
      Alert.alert('No Operations Selected', 'Please select at least one operation to approve');
      return;
    }
    onApprove(approved);
  };

  const getOperationIcon = (type: FileOperationType): string => {
    switch (type) {
      case 'read':
        return 'eye';
      case 'write':
        return 'create';
      case 'delete':
        return 'trash';
      case 'create':
        return 'add-circle';
      default:
        return 'document';
    }
  };

  const getOperationColor = (type: FileOperationType, theme: Theme): string => {
    switch (type) {
      case 'read':
        return theme.accent;
      case 'write':
        return theme.warning;
      case 'delete':
        return theme.error;
      case 'create':
        return theme.success;
      default:
        return theme.text;
    }
  };

  const getOperationLabel = (type: FileOperationType): string => {
    switch (type) {
      case 'read':
        return 'Read';
      case 'write':
        return 'Write';
      case 'delete':
        return 'Delete';
      case 'create':
        return 'Create';
      default:
        return 'Operation';
    }
  };

  const getOperationDescription = (op: FileOperation): string => {
    const action = getOperationLabel(op.type).toLowerCase();
    if (op.reason) {
      return `${action} ${op.file.filename}: ${op.reason}`;
    }
    return `${action} ${op.file.filename}`;
  };

  if (operations.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="shield-checkmark" size={24} color={theme.warning} />
              <View>
                <Text style={styles.title}>Approve File Operations</Text>
                <Text style={styles.subtitle}>
                  The AI wants to perform {operations.length} operation{operations.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.operationsList}>
            {operations.map((operation, index) => {
              const isSelected = selectedOperations.has(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.operationItem, isSelected && styles.operationItemSelected]}
                  onPress={() => toggleOperation(index)}
                >
                  <View style={styles.operationCheckbox}>
                    {isSelected && <Ionicons name="checkmark" size={20} color={theme.accent} />}
                  </View>

                  <View style={styles.operationContent}>
                    <View style={styles.operationHeader}>
                      <Ionicons
                        name={getOperationIcon(operation.type) as any}
                        size={18}
                        color={getOperationColor(operation.type, theme)}
                      />
                      <Text style={[styles.operationType, { color: getOperationColor(operation.type, theme) }]}>
                        {getOperationLabel(operation.type)}
                      </Text>
                    </View>

                    <Text style={styles.operationFile}>{operation.file.filename}</Text>

                    {operation.reason && (
                      <Text style={styles.operationReason}>{operation.reason}</Text>
                    )}

                    {operation.file.content.length > 0 && operation.type === 'write' && (
                      <View style={styles.codePreview}>
                        <Text style={styles.codePreviewText} numberOfLines={3}>
                          {operation.file.content}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.selectionInfo}>
              <Text style={styles.selectionCount}>
                {selectedOperations.size} of {operations.length} selected
              </Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.button, styles.rejectButton]}
                onPress={onReject}
              >
                <Ionicons name="close" size={18} color={theme.text} />
                <Text style={styles.rejectButtonText}>Reject All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.approveButton]}
                onPress={handleApprove}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.approveButtonText}>Approve Selected</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: theme.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    backgroundColor: `${theme.warning}15`,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
  },
  subtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  operationsList: {
    flex: 1,
    padding: 12,
  },
  operationItem: {
    flexDirection: 'row',
    backgroundColor: theme.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  operationItemSelected: {
    borderColor: theme.accent,
    backgroundColor: `${theme.accent}10`,
  },
  operationCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  operationContent: {
    flex: 1,
    gap: 6,
  },
  operationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  operationType: {
    fontSize: 13,
    fontWeight: '600',
  },
  operationFile: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
  },
  operationReason: {
    fontSize: 12,
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  codePreview: {
    backgroundColor: theme.background,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
  },
  codePreviewText: {
    fontSize: 11,
    color: theme.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    gap: 12,
  },
  selectionInfo: {
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rejectButton: {
    backgroundColor: theme.background,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  approveButton: {
    backgroundColor: theme.accent,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
