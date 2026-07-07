import React, { useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import { useDispatch, useSelector } from "react-redux";
import { setCursor, removeCursor } from "../slices/cursorsSlice";
import { getSocket } from "./socket";
const MonacoLangMap = {
  "Python (3.8.1)": "python",
  "Javascript (Node 18.12.1)": "javascript",
  "C++ (GCC 9.4.0)": "cpp",
  "Java (OpenJDK 18.0.2)": "java",
};

const CodeEditor = ({ language, code, setCode, sendCode }) => {
  const dispatch = useDispatch();
  const owner = useSelector((state) => state.appState.owner);
  const sockets = useRef(null);
  const editorRef = useRef(null);
  const decorationsRef = useRef([]);
  const roomId = useSelector((s) => s.appState.roomId);
  const userId = useSelector((s) => s.appState.userId);
  const name = useSelector((s) => s.userInfo.name);
  const cursors = useSelector((s) => s.cursors);

  // Deterministic color based on userId
  const myColor = useRef("hsl(" + (Math.abs(hashCode(userId)) % 360) + ",70%,50%)");

  // Helper hash function
  function hashCode(str) {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
      chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  // Setup socket and cursor listeners
  useEffect(() => {
    sockets.current = getSocket();
    const socket = sockets.current;

    // Listen for remote cursor updates
    const handleCursorUpdate = ({ userId: uid, position, name: uname, color }) => {
      if (uid !== userId) {
        dispatch(setCursor({ userId: uid, position, name: uname, color }));
      }
    };
    socket.on("cursor-update", handleCursorUpdate);

    return () => {
      socket.off("cursor-update", handleCursorUpdate);
    };
  }, []);

  // Cleanup styles on unmount
  useEffect(() => {
    return () => {
      const styleTag = document.getElementById("monaco-remote-cursors-style");
      if (styleTag) {
        styleTag.remove();
      }
    };
  }, []);

  // Render remote cursors as decorations
  useEffect(() => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    const monaco = window.monaco;
    if (!monaco) return;

    let styleTag = document.getElementById("monaco-remote-cursors-style");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "monaco-remote-cursors-style";
      document.head.appendChild(styleTag);
    }

    let cssRules = "";
    const newDecorations = [];

    Object.entries(cursors).forEach(([uid, cur]) => {
      const { position, name: uname, color } = cur;
      if (!position) return;
      const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
      const className = `remote-cursor-${uid}`;

      cssRules += `
        .${className} {
          border-left: 2px solid ${color};
          position: relative;
        }
        .${className}::after {
          content: '${uname}';
          background: ${color};
          color: #fff;
          padding: 1px 4.5px;
          border-radius: 3px;
          position: absolute;
          top: -16px;
          left: 0;
          font-size: 9px;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
        }
      `;

      newDecorations.push({
        range,
        options: {
          className,
          hoverMessage: { value: uname },
          overviewRulerLane: monaco.editor.OverviewRulerLane.Right,
        },
      });
    });

    styleTag.innerHTML = cssRules;
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current || [], newDecorations);
  }, [cursors]);

// Duplicate owner selector removed – already defined above
  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={MonacoLangMap[language] || "javascript"}
      value={code}
      onMount={(editor) => {
        editorRef.current = editor;
        // Listen to local cursor moves
        editor.onDidChangeCursorPosition((e) => {
          const socket = sockets.current;
          if (socket) {
            const position = { lineNumber: e.position.lineNumber, column: e.position.column };
            socket.emit("cursor-change", { roomId, userId, name, position, color: myColor.current });
          }
        });
      }}
      onChange={(value) => {
        setCode(value);
        sendCode(value);
      }}
      options={{
        readOnly: !owner,
        automaticLayout: true,
        quickSuggestions: { other: true, comments: true, strings: true },
        suggestOnTriggerCharacters: true,
        wordBasedSuggestions: "currentDocument",
        parameterHints: { enabled: true },
        snippetSuggestions: "inline",
        tabCompletion: "on",
        inlineSuggest: { enabled: true },
        hover: { enabled: true },
        lightbulb: { enabled: true },
        acceptSuggestionOnEnter: "smart",
        suggestSelection: "recentlyUsedByPrefix",
        // Bracket matching & auto-closing
        matchBrackets: "always",
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoSurround: "languageDefined",
        bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: true },
        guides: { bracketPairs: true, indentation: true },
        formatOnPaste: true,
        formatOnType: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
        fontLigatures: true,
        lineNumbers: "on",
        renderLineHighlight: "all",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
};

export default CodeEditor;
