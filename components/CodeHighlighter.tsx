import React from 'react';
import { Text, StyleSheet, Platform } from 'react-native';
import { Colors } from '../constants/Colors';

interface CodeHighlighterProps {
  code: string;
  language: string;
}

export function CodeHighlighter({ code, language }: CodeHighlighterProps) {
  const highlightedCode = highlightCode(code, language);

  return (
    <Text style={styles.codeContainer}>
      {highlightedCode.map((token, index) => (
        <Text key={index} style={getTokenStyle(token.type)}>
          {token.text}
        </Text>
      ))}
    </Text>
  );
}

interface Token {
  text: string;
  type: string;
}

function highlightCode(code: string, language: string): Token[] {
  const tokens: Token[] = [];
  const lines = code.split('\n');

  for (const line of lines) {
    tokens.push(...highlightLine(line, language));
    tokens.push({ text: '\n', type: 'text' });
  }

  return tokens;
}

function highlightLine(line: string, language: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  // JavaScript/TypeScript highlighting
  if (['javascript', 'typescript', 'tsx', 'jsx'].includes(language)) {
    // Keywords
    const keywords = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
      'import', 'export', 'from', 'default', 'class', 'interface', 'type',
      'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'extends',
      'static', 'public', 'private', 'protected', 'readonly', 'null', 'undefined',
      'true', 'false', 'switch', 'case', 'break', 'continue'
    ];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      let match;
      while ((match = regex.exec(remaining)) !== null) {
        const before = remaining.substring(0, match.index);
        if (before) tokens.push({ text: before, type: 'text' });
        tokens.push({ text: match[1], type: 'keyword' });
        remaining = remaining.substring(match.index + match[1].length);
        regex.lastIndex = 0;
      }
    }

    // Strings
    const stringRegex = /(['"`])((?:\\.|[^\\])*?)\1/g;
    let match;
    while ((match = stringRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, match.index);
      if (before) tokens.push({ text: before, type: 'text' });
      tokens.push({ text: match[0], type: 'string' });
      remaining = remaining.substring(match.index + match[0].length);
      stringRegex.lastIndex = 0;
    }

    // Comments
    const commentRegex = /(\/\/.*$)/gm;
    while ((match = commentRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, match.index);
      if (before) tokens.push({ text: before, type: 'text' });
      tokens.push({ text: match[1], type: 'comment' });
      remaining = remaining.substring(match.index + match[1].length);
      commentRegex.lastIndex = 0;
    }

    // Numbers
    const numberRegex = /\b(\d+\.?\d*)\b/g;
    while ((match = numberRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, match.index);
      if (before) tokens.push({ text: before, type: 'text' });
      tokens.push({ text: match[1], type: 'number' });
      remaining = remaining.substring(match.index + match[1].length);
      numberRegex.lastIndex = 0;
    }

    // Functions
    const functionRegex = /\b([a-zA-Z_]\w*)\s*(?=\()/g;
    while ((match = functionRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, match.index);
      if (before) tokens.push({ text: before, type: 'text' });
      tokens.push({ text: match[1], type: 'function' });
      remaining = remaining.substring(match.index + match[1].length);
      functionRegex.lastIndex = 0;
    }
  }

  // Python highlighting
  else if (language === 'python') {
    const keywords = [
      'def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while',
      'import', 'from', 'as', 'try', 'except', 'finally', 'with', 'lambda',
      'None', 'True', 'False', 'and', 'or', 'not', 'in', 'is', 'pass',
      'break', 'continue', 'raise', 'yield', 'global', 'async', 'await'
    ];

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
      let match;
      while ((match = regex.exec(remaining)) !== null) {
        const before = remaining.substring(0, match.index);
        if (before) tokens.push({ text: before, type: 'text' });
        tokens.push({ text: match[1], type: 'keyword' });
        remaining = remaining.substring(match.index + match[1].length);
        regex.lastIndex = 0;
      }
    }

    // Strings (triple quotes too)
    const stringRegex = /('''[\s\S]*?'''|"""[\s\S]*?"""|'[^']*'|"[^"]*")/g;
    let match;
    while ((match = stringRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, match.index);
      if (before) tokens.push({ text: before, type: 'text' });
      tokens.push({ text: match[1], type: 'string' });
      remaining = remaining.substring(match.index + match[1].length);
      stringRegex.lastIndex = 0;
    }

    // Comments
    const commentRegex = /(#.*$)/gm;
    while ((match = commentRegex.exec(remaining)) !== null) {
      const before = remaining.substring(0, match.index);
      if (before) tokens.push({ text: before, type: 'text' });
      tokens.push({ text: match[1], type: 'comment' });
      remaining = remaining.substring(match.index + match[1].length);
      commentRegex.lastIndex = 0;
    }
  }

  // Add remaining text
  if (remaining) {
    tokens.push({ text: remaining, type: 'text' });
  }

  return tokens.length > 0 ? tokens : [{ text: line, type: 'text' }];
}

function getTokenStyle(type: string) {
  switch (type) {
    case 'keyword':
      return styles.keyword;
    case 'string':
      return styles.string;
    case 'comment':
      return styles.comment;
    case 'number':
      return styles.number;
    case 'function':
      return styles.function;
    default:
      return styles.text;
  }
}

const styles = StyleSheet.create({
  codeContainer: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  text: {
    color: Colors.text,
  },
  keyword: {
    color: '#C586C0', // Purple for keywords
    fontWeight: '600',
  },
  string: {
    color: '#CE9178', // Orange for strings
  },
  comment: {
    color: '#6A9955', // Green for comments
    fontStyle: 'italic',
  },
  number: {
    color: '#B5CEA8', // Light green for numbers
  },
  function: {
    color: '#DCDCAA', // Yellow for functions
  },
});
