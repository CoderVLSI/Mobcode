import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';
import { fileManager, FileNode } from '../utils/fileManager';

interface CodeViewerPanelProps {
  visible: boolean;
  file: FileNode | null;
  onClose: () => void;
  onExpand?: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export function CodeViewerPanel({ visible, file, onClose, onExpand }: CodeViewerPanelProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [panelWidth] = useState(SCREEN_WIDTH * 0.6);
  const [isExpanded, setIsExpanded] = useState(false);

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && file) {
      loadFileContent();
    }
  }, [visible, file]);

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: visible ? panelWidth : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [visible, panelWidth]);

  const loadFileContent = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const fileContent = await fileManager.readFile(file.path);
      setContent(fileContent);
    } catch (error) {
      console.error('Error loading file:', error);
      setContent('// Error loading file');
    } finally {
      setLoading(false);
    }
  };

  const getLanguageFromFile = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'xml': 'xml',
      'md': 'markdown',
      'sql': 'sql',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'sh': 'bash',
      'yaml': 'yaml',
      'yml': 'yaml',
    };
    return languageMap[ext || ''] || 'text';
  };

  const highlightCode = (code: string, language: string): React.ReactNode => {
    const lines = code.split('\n');

    return (
      <>
        {lines.map((line, lineIndex) => {
          const highlighted = highlightLine(line, language);
          return (
            <Text key={lineIndex} style={styles.codeLine}>
              <Text style={styles.lineNumber}>{(lineIndex + 1).toString().padStart(3, ' ')}</Text>
              {highlighted}
            </Text>
          );
        })}
      </>
    );
  };

  const highlightLine = (line: string, language: string): React.ReactNode => {
    // Simple syntax highlighting
    let result: React.ReactNode[] = [];
    let remaining = line;

    // Keywords for different languages
    const keywords = {
      javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined'],
      typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'default', 'from', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined', 'interface', 'type', 'extends', 'implements', 'public', 'private', 'protected'],
      python: ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'try', 'except', 'raise', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'lambda', 'async', 'await'],
      css: ['@import', '@media', '@keyframes'],
    };

    const langKeywords = keywords[language as keyof typeof keywords] || keywords.javascript;

    // Strings
    remaining = remaining.replace(/(["'`])(?:(?!\1|\\).|\\\1)*?\1/g, (match) => {
      result.push(<Text key={result.length} style={styles.string}>{match}</Text>);
      return '\x00';
    });

    // Comments
    if (language === 'javascript' || language === 'typescript') {
      remaining = remaining.replace(/\/\/.*$/g, (match) => {
        result.push(<Text key={result.length} style={styles.comment}>{match}</Text>);
        return '\x00';
      });
      remaining = remaining.replace(/\/\*[\s\S]*?\*\//g, (match) => {
        result.push(<Text key={result.length} style={styles.comment}>{match}</Text>);
        return '\x00';
      });
    }

    // Keywords
    langKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      remaining = remaining.replace(regex, (match) => {
        result.push(<Text key={result.length} style={styles.keyword}>{match}</Text>);
        return '\x00';
      });
    });

    // Numbers
    remaining = remaining.replace(/\b\d+\.?\d*\b/g, (match) => {
      result.push(<Text key={result.length} style={styles.number}>{match}</Text>);
      return '\x00';
    });

    // Functions
    remaining = remaining.replace(/\b([a-zA-Z_]\w*)\s*\(/g, (match, funcName) => {
      result.push(<Text key={result.length} style={styles.function}>{funcName}</Text>);
      return '\x00(';
    });

    // Remaining text
    result.push(<Text key={result.length}>{remaining.replace(/\x00/g, '')}</Text>);

    return <>{result}</>;
  };

  if (!visible) return null;

  const language = file ? getLanguageFromFile(file.name) : 'text';

  return (
    <Animated.View style={[styles.panel, { width: animatedWidth }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file?.name || 'No file selected'}
            </Text>
            {file && (
              <Text style={styles.filePath} numberOfLines={1}>
                {file.path}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => {
              setIsExpanded(!isExpanded);
              onExpand?.();
            }}
            style={styles.iconButton}
          >
            <Ionicons
              name={isExpanded ? "contract" : "expand"}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} nestedScrollEnabled>
        {loading ? (
          <View style={styles.centerContent}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : content ? (
          <View style={styles.codeContainer}>
            {highlightCode(content, language)}
          </View>
        ) : (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No content</Text>
          </View>
        )}
      </ScrollView>

      {/* Resize handle */}
      <View style={styles.resizeHandle}>
        <View style={styles.resizeLine} />
      </View>
    </Animated.View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    panel: {
      backgroundColor: theme.surface,
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      minHeight: 60,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    titleContainer: {
      flex: 1,
      marginLeft: 8,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    filePath: {
      fontSize: 11,
      color: theme.textSecondary,
      marginTop: 2,
    },
    iconButton: {
      padding: 4,
    },
    content: {
      flex: 1,
    },
    codeContainer: {
      padding: 12,
      flexDirection: 'column',
    },
    codeLine: {
      flexDirection: 'row',
      fontSize: 12,
      lineHeight: 18,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    lineNumber: {
      color: theme.textSecondary,
      width: 35,
      textAlign: 'right',
      marginRight: 12,
      userSelect: 'none',
    },
    // Syntax highlighting
    keyword: {
      color: '#C586C0',
      fontWeight: '500',
    },
    string: {
      color: '#6AAB73',
    },
    comment: {
      color: '#7A7E85',
      fontStyle: 'italic',
    },
    number: {
      color: '#2AACB8',
    },
    function: {
      color: '#DCDCAA',
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    loadingText: {
      color: theme.textSecondary,
    },
    emptyText: {
      color: theme.textSecondary,
    },
    resizeHandle: {
      height: 4,
      backgroundColor: theme.surfaceHover,
      justifyContent: 'center',
      alignItems: 'center',
    },
    resizeLine: {
      width: 40,
      height: 3,
      backgroundColor: theme.border,
      borderRadius: 2,
    },
  });
}
