import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface FileContextMenuProps {
  visible: boolean;
  x: number;
  y: number;
  fileName: string;
  filePath: string;
  onClose: () => void;
  onOpenInBrowser: () => void;
  onDelete: () => void;
  onRename: () => void;
}

export function FileContextMenu({
  visible,
  x,
  y,
  fileName,
  filePath,
  onClose,
  onOpenInBrowser,
  onDelete,
  onRename,
}: FileContextMenuProps) {
  const isHtmlFile = fileName.toLowerCase().endsWith('.html');

  const handleOpenInBrowser = () => {
    onClose();
    onOpenInBrowser();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.menu, { top: y, left: x }]}>
          {/* File Name Header */}
          <View style={styles.header}>
            <Ionicons name="document-text" size={16} color={Colors.accent} />
            <Text style={styles.fileName} numberOfLines={1}>
              {fileName}
            </Text>
          </View>

          {/* Menu Items */}
          <TouchableOpacity style={styles.menuItem} onPress={onRename}>
            <Ionicons name="pencil" size={18} color={Colors.text} />
            <Text style={styles.menuItemText}>Rename</Text>
          </TouchableOpacity>

          {isHtmlFile && (
            <TouchableOpacity style={styles.menuItem} onPress={handleOpenInBrowser}>
              <Ionicons name="globe" size={18} color={Colors.accent} />
              <Text style={[styles.menuItemText, { color: Colors.accent }]}>Open in Browser</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={onDelete}>
            <Ionicons name="trash" size={18} color={Colors.error} />
            <Text style={[styles.menuItemText, { color: Colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  menuItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 48,
  },
});
