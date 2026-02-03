import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import * as FileSystem from 'expo-file-system/legacy';

interface ReactPreviewProps {
  visible: boolean;
  filePath: string;
  fileName: string;
  onClose: () => void;
}

const makeHtml = (source: string, fileName: string) => {
  const safeSource = source.replace(/<\/script>/gi, '<\\/script>');
  const sourceJson = JSON.stringify(safeSource);
  const fileJson = JSON.stringify(fileName);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Preview</title>
    <style>
      body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #111; color: #eee; }
      #root { padding: 20px; }
      #error { display: none; white-space: pre-wrap; color: #ff8a8a; background: #1a1a1a; padding: 16px; margin: 16px; border-radius: 8px; }
      #status { padding: 12px 16px; font-size: 12px; color: #9aa4b2; border-bottom: 1px solid #222; }
    </style>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    <div id="status">Previewing ${fileName}</div>
    <div id="error"></div>
    <div id="root"></div>
    <script>
      const SOURCE = ${sourceJson};
      const FILE_NAME = ${fileJson};

      const showError = (error) => {
        const errorEl = document.getElementById('error');
        errorEl.style.display = 'block';
        errorEl.textContent = String(error && error.message ? error.message : error);
      };

      window.onerror = (message, source, lineno, colno, error) => {
        showError(error || message);
      };

      const start = Date.now();
      const waitForLibs = () => {
        if (window.React && window.ReactDOM && window.Babel) {
          runPreview();
          return;
        }
        if (Date.now() - start > 3500) {
          showError('Unable to load React/Babel. Check your internet connection.');
          return;
        }
        setTimeout(waitForLibs, 100);
      };

      const runPreview = () => {
        try {
          const result = Babel.transform(SOURCE, {
            presets: [
              ['react', { runtime: 'classic' }],
              ['typescript', { allExtensions: true, isTSX: true }],
            ],
            plugins: ['transform-modules-commonjs'],
          });

          const exports = {};
          const module = { exports };
          const require = (name) => {
            if (name === 'react') return React;
            if (name === 'react-dom') return ReactDOM;
            throw new Error('Module not found: ' + name);
          };

          const fn = new Function('React', 'ReactDOM', 'module', 'exports', 'require', result.code);
          fn(React, ReactDOM, module, exports, require);

          const App =
            (module.exports && module.exports.default) ||
            module.exports ||
            exports.default ||
            exports.App ||
            window.App;

          if (!App) {
            throw new Error('No React component found. Export default App in ' + FILE_NAME);
          }

          const root = document.getElementById('root');
          if (ReactDOM.createRoot) {
            ReactDOM.createRoot(root).render(React.createElement(App));
          } else {
            ReactDOM.render(React.createElement(App), root);
          }
        } catch (error) {
          showError(error);
        }
      };

      waitForLibs();
    </script>
  </body>
</html>`;
};

export function ReactPreview({ visible, filePath, fileName, onClose }: ReactPreviewProps) {
  const [htmlContent, setHtmlContent] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (visible && filePath) {
      loadSource();
    }
  }, [visible, filePath]);

  const loadSource = async () => {
    setLoading(true);
    try {
      const source = await FileSystem.readAsStringAsync(filePath);
      setHtmlContent(makeHtml(source, fileName));
    } catch (error) {
      console.error('Error loading React preview source:', error);
      setHtmlContent(makeHtml(`export default function App() {\n  return <div>Failed to load source.</div>;\n}`, fileName));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              ⚛️ {fileName}
            </Text>
            <Text style={styles.headerSubtitle}>React Preview (single file)</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <WebView
            source={{ html: htmlContent }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.loadingText}>Loading preview...</Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerButton: {
    padding: 4,
    width: 32,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  placeholder: {
    width: 32,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
