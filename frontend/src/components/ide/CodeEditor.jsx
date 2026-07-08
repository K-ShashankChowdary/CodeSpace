// ============================================================================
// CodeEditor.jsx - Monaco Code Editor Component
// ============================================================================
// Wraps Monaco Editor (the engine behind VS Code) to provide a full-featured
// code editing experience with syntax highlighting, bracket matching, and
// smooth animations. Integrates Yjs for real-time collaborative editing.
// ============================================================================

import React, { useRef, useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";

// Premium neon colors for remote cursors (vibrant but legible)
const userColors = [
  '#00e5ff', // Cyan
  '#ff00aa', // Neon Pink
  '#39ff14', // Neon Green
  '#ffea00', // Neon Yellow
  '#bc13fe', // Neon Purple
  '#ff5e00', // Neon Orange
  '#00ff9d', // Spring Green
  '#ff0055'  // Hot Red-Pink
];

const CodeEditor = ({ code, setCode, language = "cpp", roomCode, currentUser, onMount, isInterviewer }) => {
  const [isEditorReady, setIsEditorReady] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const docRef = useRef(null);

  // We only run multiplayer setup if we have a roomCode, otherwise this is a solo environment.

  const [randomColor] = useState(() => userColors[Math.floor(Math.random() * userColors.length)]);
  const localColor = roomCode ? (isInterviewer ? '#39ff14' : '#00e5ff') : randomColor;

  // Define custom high-fidelity black theme
  const handleEditorWillMount = (monaco) => {
    // Define a custom theme that matches the CodeSpace aesthetic
    monaco.editor.defineTheme('codespace-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { background: '050505' }
      ],
      colors: {
        'editor.background': '#050505',
        'editor.lineHighlightBackground': '#111111',
        'editorLineNumber.foreground': '#3f3f46',
        'editorLineNumber.activeForeground': '#a1a1aa',
        'editor.selectionBackground': '#2563eb33',
        'editor.inactiveSelectionBackground': '#2563eb11',
      }
    });
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setIsEditorReady(true);
    
    // Pass the editor instance up to IDE.jsx so it can grab the latest code directly 
    // rather than relying on React state which causes cursor jumps in multiplayer.
    if (onMount) onMount(editor);

    if (!roomCode) {
      // Single player mode
      return;
    }

    // --- YJS MULTIPLAYER SETUP ---
    const doc = new Y.Doc();
    docRef.current = doc;

    // Connect to the backend WebSocket endpoint via our Vite proxy or direct host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // We construct the URL dynamically based on the current window location.
    // In dev, this hits localhost:5173 which proxies to 5000. In prod, it hits the main domain.
    const wsUrl = `${protocol}//${window.location.host}/yjs`;

    const provider = new WebsocketProvider(wsUrl, roomCode, doc);
    providerRef.current = provider;

    const ytext = doc.getText("monaco");

    // Initialize the binding between Yjs and Monaco
    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      provider.awareness
    );

    // Setup awareness (Cursor + Name)
    if (currentUser) {
      const customName = sessionStorage.getItem("customDisplayName");
      const displayName = customName ? customName : currentUser.username;
      
      // Interviewer gets bright neon green, Candidate gets neon blue
      provider.awareness.setLocalStateField('user', {
        name: displayName,
        color: localColor
      });
    }

    // Dynamically inject CSS rules for remote name tags since Monaco overlays don't get custom HTML attributes
    provider.awareness.on('change', () => {
      let styleEl = document.getElementById('yjs-awareness-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'yjs-awareness-styles';
        document.head.appendChild(styleEl);
      }
      const cssRules = [];
      const seenNames = new Set();
      
      const clients = Array.from(provider.awareness.getStates().entries());
      
      // Sort clients to prefer tabs that currently have editor focus (cursor != null)
      // Fallback to deterministic sorting by clientId if both/neither are focused
      clients.sort((a, b) => {
        const aHasCursor = a[1].cursor ? 1 : 0;
        const bHasCursor = b[1].cursor ? 1 : 0;
        if (aHasCursor !== bHasCursor) return bHasCursor - aHasCursor;
        return b[0] - a[0];
      });

      clients.forEach(([clientId, state]) => {
        if (state.user && state.user.name) {
          const customName = sessionStorage.getItem("customDisplayName");
          const myDisplayName = customName ? customName : (currentUser ? currentUser.username : null);
          const isMe = myDisplayName && state.user.name === myDisplayName;
          const isDuplicate = seenNames.has(state.user.name);

          // Hide if it's our own cursor from another tab, or a duplicate of someone else's tab
          if (isMe || isDuplicate) {
            cssRules.push(`
              .yRemoteSelection-${clientId},
              .yRemoteSelectionHead-${clientId} {
                display: none !important;
              }
            `);
          } else {
            seenNames.add(state.user.name);
            cssRules.push(`
              .yRemoteSelectionHead-${clientId}::before {
                content: "${state.user.name}";
                background-color: ${state.user.color};
              }
            `);
          }
        }
      });
      styleEl.innerHTML = cssRules.join('\n');
    });

    // If we are the first to sync and the document is empty, insert the default code template
    provider.on('sync', (isSynced) => {
      if (isSynced && ytext.length === 0) {
        // To prevent race conditions where both clients sync an empty doc and both seed it simultaneously
        // (causing duplication), we only allow the interviewer to seed the multiplayer document.
        if (!roomCode || isInterviewer) {
          ytext.insert(0, code);
        }
      }
    });
  };


  // Single player mode: sync external code changes (e.g. problem boilerplate loading asynchronously)
  useEffect(() => {
    if (!roomCode && isEditorReady && editorRef.current) {
      if (editorRef.current.getValue() !== code) {
        editorRef.current.setValue(code || "");
      }
    }
  }, [code, roomCode, isEditorReady]);

  // Cleanup WebSockets when unmounting or leaving the room
  useEffect(() => {
    return () => {
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.disconnect();
      if (docRef.current) docRef.current.destroy();
      bindingRef.current = null;
      providerRef.current = null;
      docRef.current = null;
      const styleEl = document.getElementById('yjs-awareness-styles');
      if (styleEl) styleEl.remove();
    };
  }, []);

  // Update awareness when user roles resolve (since isInterviewer starts as false during initial API fetch)
  useEffect(() => {
    if (providerRef.current && currentUser) {
      const customName = sessionStorage.getItem("customDisplayName");
      const displayName = customName ? customName : currentUser.username;
      
      // Preserve existing state, just update color and potentially name
      providerRef.current.awareness.setLocalStateField('user', {
        name: displayName,
        color: localColor
      });
    }
  }, [isInterviewer, currentUser, roomCode, localColor]);

  // Local User Cursor Tag Widget
  useEffect(() => {
    if (!isEditorReady || !editorRef.current || !monacoRef.current || !currentUser) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const domNode = document.createElement('div');
    domNode.innerHTML = 'You';
    domNode.className = 'local-cursor-widget';
    domNode.style.position = 'absolute';
    domNode.style.backgroundColor = localColor;
    domNode.style.color = '#050505';
    domNode.style.fontSize = '11px';
    domNode.style.fontFamily = "'Inter', sans-serif";
    domNode.style.fontWeight = '800';
    domNode.style.padding = '1px 6px';
    domNode.style.borderRadius = '4px';
    domNode.style.whiteSpace = 'nowrap';
    domNode.style.pointerEvents = 'none';
    domNode.style.zIndex = '100';
    domNode.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
    // To position it floating right below the cursor
    domNode.style.transform = 'none';
    domNode.style.marginTop = '18px';
    domNode.style.marginLeft = '4px';

    const widget = {
      getId: () => 'local-user-cursor-widget',
      getDomNode: () => domNode,
      getPosition: () => {
        const position = editor.getPosition();
        if (!position) return null;
        return {
          position: position,
          preference: [monaco.editor.ContentWidgetPositionPreference.EXACT]
        };
      }
    };

    editor.addContentWidget(widget);

    const updateWidget = () => {
      editor.layoutContentWidget(widget);
    };

    const disposable = editor.onDidChangeCursorPosition(updateWidget);

    return () => {
      editor.removeContentWidget(widget);
      disposable.dispose();
    };
  }, [currentUser, localColor, isEditorReady]);

  // Editor settings configured to feel premium and VS Code-like
  const editorOptions = {
    fontSize: 16,
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    padding: { top: 16, bottom: 16 },
    cursorSmoothCaretAnimation: "on",
    cursorBlinking: "expand",
    formatOnPaste: true,
    lineHeight: 24,
    bracketPairColorization: { enabled: true },
    smoothScrolling: true,
  };

  // Updates parent's code state. We only do this in single-player mode.
  // In multiplayer, IDE.jsx grabs the value directly via editor.getValue()
  const handleEditorChange = (value) => {
    if (setCode) {
      setCode(value);
    }
  };

  return (
    <div className="h-full w-full overflow-hidden relative codespace-yjs-editor">
      {/* CSS overrides for Yjs remote cursors to match our dark theme */}
      <style>{`
        .yRemoteSelection {
          background-color: rgba(37, 99, 235, 0.2);
        }
        .yRemoteSelectionHead {
          position: absolute;
          border-left: 2px solid;
          height: 100%;
          box-sizing: border-box;
          z-index: 99;
        }
        .yRemoteSelectionHead::after {
          position: absolute;
          content: ' ';
          border: 3px solid;
          border-radius: 4px;
          left: -4px;
          top: -5px;
        }
        .yRemoteSelectionHead::before {
          /* Name tags are injected dynamically via #yjs-awareness-styles */
          position: absolute;
          top: -18px;
          left: -2px;
          color: #050505;
          font-size: 11px;
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 100;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
      `}</style>
      <Editor
        height="100%"
        theme="codespace-dark"
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        language={language}
        defaultValue={roomCode ? "" : code}
        onChange={handleEditorChange}
        options={editorOptions}
        loading={<div className="text-zinc-500 p-8 font-black uppercase text-[10px] tracking-widest animate-pulse">Initializing Editor...</div>}
      />
    </div>
  );
};

export default CodeEditor;