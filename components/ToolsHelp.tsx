import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';

interface ToolsHelpProps {
  visible: boolean;
  onClose: () => void;
}

const TOOLS = [
  {
    category: 'File Operations',
    icon: 'document-outline',
    tools: [
      { name: 'read_file', desc: 'Read file contents', approval: false },
      { name: 'write_file', desc: 'Create or overwrite file', approval: true },
      { name: 'create_file', desc: 'Create new empty file', approval: true },
      { name: 'delete_file', desc: 'Delete file or folder', approval: true },
      { name: 'list_directory', desc: 'List files in directory', approval: false },
      { name: 'append_file', desc: 'Append content to file', approval: true },
    ],
  },
  {
    category: 'Search & Find',
    icon: 'search-outline',
    tools: [
      { name: 'search_files', desc: 'Search text across all files', approval: false },
      { name: 'find_files', desc: 'Find files by name pattern', approval: false },
      { name: 'file_info', desc: 'Get file metadata', approval: false },
      { name: 'count_lines', desc: 'Count lines in file/project', approval: false },
      { name: 'list_imports', desc: 'Extract import statements', approval: false },
    ],
  },
  {
    category: 'Terminal Commands',
    icon: 'terminal-outline',
    tools: [
      { name: 'run_command', desc: 'Execute commands (ls, pwd, mkdir, cat, rm, grep, etc.)', approval: true },
    ],
  },
  {
    category: 'Package Management',
    icon: 'cube-outline',
    tools: [
      { name: 'npm_info', desc: 'Get package info from npm', approval: false },
      { name: 'npm_install', desc: 'Install package to package.json', approval: true },
      { name: 'update_package_json', desc: 'Add dependency to package.json', approval: true },
    ],
  },
  {
    category: 'Git Operations',
    icon: 'git-branch-outline',
    tools: [
      { name: 'git_status', desc: 'Show working tree status', approval: false },
      { name: 'git_add', desc: 'Stage files for commit', approval: false },
      { name: 'git_commit', desc: 'Create commit with message', approval: true },
      { name: 'git_log', desc: 'Show commit history', approval: false },
    ],
  },
  {
    category: 'Code Generation',
    icon: 'code-outline',
    tools: [
      { name: 'create_component', desc: 'Generate React/RN component', approval: true },
      { name: 'init_project', desc: 'Initialize project structure', approval: true },
    ],
  },
  {
    category: 'Previews',
    icon: 'eye-outline',
    tools: [
      { name: 'open_html_preview', desc: 'Open an HTML file in the in-app preview', approval: false },
      { name: 'open_react_preview', desc: 'Open a React file in the in-app preview', approval: false },
      { name: 'list_preview_components', desc: 'List available sample component previews', approval: false },
      { name: 'open_component_preview', desc: 'Open a sample component preview by id', approval: false },
    ],
  },
];

export function ToolsHelp({ visible, onClose }: ToolsHelpProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="construct-outline" size={24} color={theme.accent} />
            <Text style={styles.title}>Available Tools</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.intro}>
            <Text style={styles.introText}>
              The AI can use these tools to help you. Just ask naturally!
            </Text>
          </View>

          {TOOLS.map((section) => (
            <View key={section.category} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name={section.icon as any} size={18} color={theme.accent} />
                <Text style={styles.sectionTitle}>{section.category}</Text>
              </View>
              <View style={styles.toolsList}>
                {section.tools.map((tool) => (
                  <View key={tool.name} style={styles.toolItem}>
                    <View style={styles.toolInfo}>
                      <Text style={styles.toolName}>{tool.name}</Text>
                      <Text style={styles.toolDesc}>{tool.desc}</Text>
                    </View>
                    {tool.approval && (
                      <View style={styles.approvalBadge}>
                        <Ionicons name="shield-checkmark" size={14} color="#f59e0b" />
                        <Text style={styles.approvalText}>Approval</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.exampleSection}>
            <Text style={styles.exampleTitle}>Try saying:</Text>
            <View style={styles.exampleList}>
              <Text style={styles.example}>• "Install lodash"</Text>
              <Text style={styles.example}>• "Show git status"</Text>
              <Text style={styles.example}>• "Create a Button component"</Text>
              <Text style={styles.example}>• "List all TypeScript files"</Text>
              <Text style={styles.example}>• "Add axios to dependencies"</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    container: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      width: '90%',
      maxHeight: '80%',
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: `${theme.accent}10`,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    content: {
      flex: 1,
    },
    intro: {
      padding: 16,
      backgroundColor: `${theme.accent}08`,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    introText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
      textAlign: 'center',
    },
    section: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    toolsList: {
      gap: 10,
    },
    toolItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.inputBackground,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    toolInfo: {
      flex: 1,
    },
    toolName: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.text,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    toolDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 2,
    },
    approvalBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: '#f59e0b20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#f59e0b40',
    },
    approvalText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#f59e0b',
      textTransform: 'uppercase',
    },
    exampleSection: {
      padding: 16,
      backgroundColor: `${theme.success}08`,
    },
    exampleTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.success,
      marginBottom: 8,
    },
    exampleList: {
      gap: 6,
    },
    example: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
    },
  });
