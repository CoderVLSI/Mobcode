import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '../context/ThemeContext';

interface CodeBlock {
  language: string;
  code: string;
  startIndex: number;
  endIndex: number;
}

interface MessageContentProps {
  content: string;
  theme: Theme;
  styles: any;
}

export function MessageContent({ content, theme, styles }: MessageContentProps) {
  const [expandedBlocks, setExpandedBlocks] = React.useState<Record<number, boolean>>({});

  const codeBlocks = parseCodeBlocks(content);
  const parts: Array<{ type: 'text' | 'code'; content: string; codeBlock?: CodeBlock }> = [];

  let lastIndex = 0;
  codeBlocks.forEach((block, index) => {
    // Add text before code block
    if (block.startIndex > lastIndex) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex, block.startIndex),
      });
    }
    // Add code block
    parts.push({
      type: 'code',
      content: block.code,
      codeBlock: block,
    });
    lastIndex = block.endIndex;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      content: content.slice(lastIndex),
    });
  }

  const toggleBlock = (index: number) => {
    setExpandedBlocks(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <View style={messageStyles.contentContainer}>
      {parts.map((part, index) => {
        if (part.type === 'code' && part.codeBlock) {
          const isExpanded = expandedBlocks[index] !== false; // Default expanded
          const displayLines = part.codeBlock.code.split('\n');
          const lineCount = displayLines.length;
          const shouldTruncate = lineCount > 10 && !isExpanded;

          return (
            <View key={index} style={messageStyles.codeBlockContainer}>
              <TouchableOpacity
                onPress={() => toggleBlock(index)}
                style={messageStyles.codeHeader}
              >
                <View style={messageStyles.codeHeaderLeft}>
                  <Ionicons name="code-slash" size={14} color={theme.accent} />
                  <Text style={messageStyles.codeLanguage}>
                    {part.codeBlock.language || 'code'}
                  </Text>
                </View>
                <View style={messageStyles.codeHeaderRight}>
                  <Text style={messageStyles.codeLineCount}>
                    {shouldTruncate ? `${lineCount} lines` : `${lineCount} lines`}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.textSecondary}
                  />
                </View>
              </TouchableOpacity>
              <View style={messageStyles.codeContent}>
                {shouldTruncate ? (
                  <>
                    {highlightCode(
                      displayLines.slice(0, 10).join('\n'),
                      part.codeBlock.language,
                      theme
                    )}
                    <TouchableOpacity onPress={() => toggleBlock(index)} style={messageStyles.expandButton}>
                      <Text style={messageStyles.expandButtonText}>▼ Show {lineCount - 10} more lines</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  highlightCode(part.codeBlock.code, part.codeBlock.language, theme)
                )}
              </View>
            </View>
          );
        }

        return (
          <Text key={index} style={styles.messageContent}>
            {part.content}
          </Text>
        );
      })}
    </View>
  );
}

function parseCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const codeRegex = /```(\w*)\n([\s\S]*?)```/g;
  let match;

  while ((match = codeRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }

  return blocks;
}

function highlightCode(code: string, language: string, theme: Theme): React.ReactNode {
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    const tokens = tokenizeLine(line, language);

    return (
      <View key={lineIndex} style={messageStyles.codeLine}>
        <Text style={[messageStyles.lineNumber, { color: theme.textSecondary }]}>
          {lineIndex + 1}
        </Text>
        <Text style={messageStyles.lineContent}>
          {tokens.map((token, tokenIndex) => (
            <Text
              key={tokenIndex}
              style={getTokenStyle(token.type, theme)}
            >
              {token.text}
            </Text>
          ))}
          {'\n'}
        </Text>
      </View>
    );
  });
}

interface Token {
  text: string;
  type: string;
}

function tokenizeLine(line: string, language: string): Token[] {
  const tokens: Token[] = [];
  const keywords = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'default', 'class', 'interface', 'type', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'static', 'public', 'private', 'protected', 'readonly', 'null', 'undefined', 'true', 'false', 'switch', 'case', 'break', 'continue'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'default', 'class', 'interface', 'type', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends', 'static', 'public', 'private', 'protected', 'readonly', 'null', 'undefined', 'true', 'false', 'switch', 'case', 'break', 'continue', 'typeof', 'enum'],
    python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda', 'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'pass', 'break', 'continue', 'raise', 'yield', 'global', 'async', 'await'],
  };

  const langKeywords = keywords[language as keyof typeof keywords] || keywords.javascript;

  // Simple tokenization
  let remaining = line;
  let pos = 0;

  while (pos < line.length) {
    let matched = false;

    // Check for strings
    if ((line[pos] === '"' || line[pos] === "'" || line[pos] === '`')) {
      const quote = line[pos];
      let endPos = pos + 1;
      while (endPos < line.length && line[endPos] !== quote) {
        if (line[endPos] === '\\') endPos++;
        endPos++;
      }
      if (endPos < line.length) endPos++;
      tokens.push({ text: line.slice(pos, endPos), type: 'string' });
      pos = endPos;
      matched = true;
    }

    // Check for comments
    if (!matched && line.slice(pos, pos + 2) === '//') {
      tokens.push({ text: line.slice(pos), type: 'comment' });
      pos = line.length;
      matched = true;
    }

    if (!matched && line[pos] === '#') {
      tokens.push({ text: line.slice(pos), type: 'comment' });
      pos = line.length;
      matched = true;
    }

    // Check for keywords
    if (!matched && /[a-zA-Z_]/.test(line[pos])) {
      let endPos = pos;
      while (endPos < line.length && /[a-zA-Z0-9_]/.test(line[endPos])) {
        endPos++;
      }
      const word = line.slice(pos, endPos);
      if (langKeywords.includes(word)) {
        tokens.push({ text: word, type: 'keyword' });
      } else {
        tokens.push({ text: word, type: 'text' });
      }
      pos = endPos;
      matched = true;
    }

    // Check for numbers
    if (!matched && /[0-9]/.test(line[pos])) {
      let endPos = pos;
      while (endPos < line.length && /[0-9.]/.test(line[endPos])) {
        endPos++;
      }
      tokens.push({ text: line.slice(pos, endPos), type: 'number' });
      pos = endPos;
      matched = true;
    }

    // Default: add as text
    if (!matched) {
      tokens.push({ text: line[pos], type: 'text' });
      pos++;
    }
  }

  if (tokens.length === 0) {
    tokens.push({ text: line, type: 'text' });
  }

  return tokens;
}

function getTokenStyle(type: string, theme: Theme) {
  const baseStyle = {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  };

  switch (type) {
    case 'keyword':
      return { ...baseStyle, color: '#C586C0', fontWeight: '600' as const };
    case 'string':
      return { ...baseStyle, color: '#CE9178' };
    case 'comment':
      return { ...baseStyle, color: '#6A9955', fontStyle: 'italic' as const };
    case 'number':
      return { ...baseStyle, color: '#B5CEA8' };
    case 'function':
      return { ...baseStyle, color: '#DCDCAA' };
    default:
      return { ...baseStyle, color: theme.text };
  }
}

const messageStyles = StyleSheet.create({
  contentContainer: {
    gap: 8,
  },
  codeBlockContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  codeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLanguage: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
  },
  codeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLineCount: {
    fontSize: 11,
    color: '#666',
  },
  codeContent: {
    padding: 12,
  },
  codeLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lineNumber: {
    fontSize: 10,
    width: 30,
    textAlign: 'right',
    marginRight: 12,
    userSelect: 'none',
    opacity: 0.5,
  },
  lineContent: {
    flex: 1,
  },
  expandButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  expandButtonText: {
    fontSize: 11,
    color: '#4fc3f7',
    fontWeight: '500',
  },
});
