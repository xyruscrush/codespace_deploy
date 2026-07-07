import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import CodeEditor from "./CodeEditor";
import { setOwner } from "../slices/state";
import Whiteboard from "./Whiteboard";
import VoiceChat from "./VoiceChat";
import {
  BadgeX,
  Users,
  Code2,
  Terminal,
  MessageSquare,
  Crown,
  Sparkles,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
  Palette,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { getSocket } from "./socket";

const LanguageMap = {
  "Python (3.8.1)": 71,
  "Javascript (Node 18.12.1)": 63,
  "C++ (GCC 9.4.0)": 54,
  "Java (OpenJDK 18.0.2)": 62,
};

const getLanguageKey = (langName) => {
  if (langName.toLowerCase().includes("javascript")) return "javascript";
  if (langName.toLowerCase().includes("python")) return "python";
  if (langName.toLowerCase().includes("c++")) return "cpp";
  if (langName.toLowerCase().includes("java")) return "java";
  return "javascript";
};

export default function CodeRunner() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const roomId = useSelector((state) => state.appState.roomId);
  const userId = useSelector((state) => state.appState.userId);
  const name = useSelector((state) => state.userInfo.name);
  const owner = useSelector((state) => state.appState.owner);

  // Core Room State
  const [selectedUser, setSelectedUser] = useState("");
  const [code, setCode] = useState("");
  const [users, setUsers] = useState({});
  const [language, setLanguage] = useState("Javascript (Node 18.12.1)");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // Tabs & Features State
  const [activeTab, setActiveTab] = useState("editor"); // "editor" | "whiteboard"
  const [testSuiteTab, setTestSuiteTab] = useState("standard"); // "standard" | "custom"
  const [problemsList, setProblemsList] = useState([]);
  const [activeProblem, setActiveProblem] = useState(null);
  const [testCases, setTestCases] = useState([]);
  const [testResults, setTestResults] = useState([]); // { status: "passed"|"failed"|"running"|"error", actual: string, expected: string }
  const [aiGenerating, setAiGenerating] = useState(false);
  const [whiteboardData, setWhiteboardData] = useState(null);
  const [whiteboardPermissions, setWhiteboardPermissions] = useState([]);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setSidebarOpen(false);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch problems list on mount
  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const res = await fetch("/api/problems");
        if (!res.ok) throw new Error("Failed to fetch problems");
        const result = await res.json();
        if (result.success) {
          setProblemsList(result.data);
        }
      } catch (err) {
        console.error("Error loading problem list:", err);
      }
    };
    fetchProblems();
  }, []);

  // Fetch problem details — editor stays empty on new problem selection
  const loadProblem = async (problemId, shouldClearEditor = false) => {
    try {
      const res = await fetch(`/api/problems/${problemId}`);
      if (!res.ok) throw new Error("Failed to load problem details");
      const result = await res.json();
      if (result.success) {
        setActiveProblem(result.data);
        setTestCases(result.data.testCases || []);
        setTestResults([]); // Reset test results
        if (shouldClearEditor) {
          setCode("");
          sendCode("");
        }
        return result.data;
      }
    } catch (err) {
      toast.error("Error loading problem: " + err.message);
    }
    return null;
  };

  // Run code against predefined test cases
  const runTestCases = async () => {
    if (testCases.length === 0) {
      // Fallback: run on standard input box
      runCode();
      return;
    }

    setLoading(true);
    setTestResults(testCases.map(() => ({ status: "running", actual: "", expected: "" })));
    
    try {
      const promises = testCases.map(async (tc, index) => {
        try {
          const submitRes = await fetch(
            "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=false",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-RapidAPI-Key": "31f42fc348mshaff18346fa4bf7dp19877ejsn0cb7be418beb",
                "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
              },
              body: JSON.stringify({
                source_code: code,
                language_id: LanguageMap[language],
                stdin: tc.input,
                redirect_stderr_to_stdout: true,
              }),
            }
          );

          if (!submitRes.ok) {
            const errText = await submitRes.text().catch(() => "Unknown error");
            throw new Error(`Judge0 error (${submitRes.status}): ${errText.slice(0, 100)}`);
          }

          let submitData;
          try {
            submitData = await submitRes.json();
          } catch {
            throw new Error("Invalid response from Judge0 server");
          }

          const token = submitData.token;
          if (!token) throw new Error("No execution token received");

          let result = null;
          let attempts = 0;
          while (attempts < 15) {
            attempts++;
            await new Promise((r) => setTimeout(r, 1000));
            const statusRes = await fetch(
              `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
              {
                headers: {
                  "X-RapidAPI-Key": "31f42fc348mshaff18346fa4bf7dp19877ejsn0cb7be418beb",
                  "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
                },
              }
            );
            try {
              result = await statusRes.json();
            } catch {
              continue; // Retry if JSON parse fails
            }
            if (result && result.status && result.status.id > 2) break;
          }

          if (!result || !result.status) throw new Error("Execution timed out");

          const stdout = (result.stdout || result.compile_output || result.stderr || "").trim();
          const expected = (tc.expectedOutput || "").trim();
          const passed = expected && stdout === expected;

          setTestResults((prev) => {
            const updated = [...prev];
            updated[index] = {
              status: passed ? "passed" : "failed",
              actual: stdout,
              expected: expected || "(no expected output)",
            };
            return updated;
          });
        } catch (err) {
          setTestResults((prev) => {
            const updated = [...prev];
            updated[index] = {
              status: "error",
              actual: err.message,
              expected: tc.expectedOutput || "",
            };
            return updated;
          });
        }
      });

      await Promise.all(promises);
    } catch (err) {
      toast.error("Test execution failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fallback direct run using stdin box
  const runCode = async () => {
    setLoading(true);
    setOutput("Running code...");
    try {
      const submitRes = await fetch(
        "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=false",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": "31f42fc348mshaff18346fa4bf7dp19877ejsn0cb7be418beb",
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          },
          body: JSON.stringify({
            source_code: code,
            language_id: LanguageMap[language],
            stdin,
            redirect_stderr_to_stdout: true,
          }),
        }
      );

      if (!submitRes.ok) {
        const errText = await submitRes.text().catch(() => "Unknown error");
        throw new Error(`Judge0 error (${submitRes.status}): ${errText.slice(0, 150)}`);
      }

      let submitData;
      try {
        submitData = await submitRes.json();
      } catch {
        throw new Error("Invalid response from code execution server");
      }

      const token = submitData.token;
      if (!token) throw new Error("No execution token received from server");

      let result = null;
      let attempts = 0;
      while (attempts < 15) {
        attempts++;
        await new Promise((r) => setTimeout(r, 1000));
        const statusRes = await fetch(
          `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
          {
            headers: {
              "X-RapidAPI-Key": "31f42fc348mshaff18346fa4bf7dp19877ejsn0cb7be418beb",
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            },
          }
        );
        try {
          result = await statusRes.json();
        } catch {
          continue; // Retry if JSON parse fails
        }
        if (result && result.status && result.status.id > 2) break;
      }

      if (!result || !result.status) {
        throw new Error("Execution timed out — try again");
      }

      const out = result.stdout || result.compile_output || result.stderr || "No output";
      setOutput(out);
      sendOutput(out);
    } catch (err) {
      setOutput("Error: " + err.message);
      sendOutput("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate AI Test Cases via Gemini endpoint
  const generateAiCases = async () => {
    if (!activeProblem) {
      toast.warn("Please select a problem first!");
      return;
    }
    setAiGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-testcases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemTitle: activeProblem.title,
          problemDescription: activeProblem.description,
        }),
      });
      
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to generate AI test cases");
      }

      if (result.success && Array.isArray(result.data)) {
        setTestCases((prev) => [...prev, ...result.data]);
        toast.success("Generated 3 new AI test cases!");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAiGenerating(false);
    }
  };

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = getSocket();
    }
    const socket = socketRef.current;

    const handleConnect = () => {
      socket.emit("join-room", { roomId, userId, name });
    };

    socket.on("connect", handleConnect);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    const handleRoomData = (data) => {
      const sortedMessages = data.messages.sort((a, b) => a.time - b.time);
      setMessages(sortedMessages);
      setCode(data.code);
      setUsers(data.users);
      setSelectedUser(userId);
      setOutput(data.output);
      setStdin(data.input);
      const isOwner = data.ownerId === userId;
      dispatch(setOwner(isOwner));
      toast.success(data.join_message);
      
      if (data.problemId) {
        loadProblem(data.problemId, false);
      }
      if (data.whiteboardData) {
        setWhiteboardData(data.whiteboardData);
      }
      if (data.whiteboardPermissions) {
        setWhiteboardPermissions(data.whiteboardPermissions);
      }
    };

    const handleOwnerUpdate = ({ value }) => {
      const isOwner = userId == value;
      dispatch(setOwner(isOwner));
      setSelectedUser(value);
    };

    const handleDisconnect = () => console.log("Disconnected from server");

    const handleChatMessage = ({ name, userId, message, time }) => {
      const l = { userId, name, time, message };
      setMessages((prev) => [...prev, l]);
    };

    const handleRoomClosed = async () => {
      try {
        const res = await fetch("/api/logoutRoom", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message);
          navigate("/dashboard");
        } else {
          toast.error(data.message);
        }
      } catch (err) {
        toast.error(err.message);
      }
    };

    const handleLeftMessage = (str) => toast.success(str);
    const handleCodeUpdate = ({ value }) => setCode(value);
    const handleOutputUpdate = ({ v }) => setOutput(v);
    const handleInputUpdate = ({ v1 }) => setStdin(v1);

    const handleProblemUpdate = ({ problemId, codeTemplate }) => {
      loadProblem(problemId, true);
    };

    const handleWhiteboardUpdate = ({ dataUrl }) => {
      setWhiteboardData(dataUrl);
    };

    const handleClearWhiteboard = () => {
      setWhiteboardData(null);
    };

    socket.on("roomData", handleRoomData);
    socket.on("owner-update", handleOwnerUpdate);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat-message", handleChatMessage);
    socket.on("room-closed", handleRoomClosed);
    socket.on("left-message", handleLeftMessage);
    socket.on("code-update", handleCodeUpdate);
    socket.on("update-output", handleOutputUpdate);
    socket.on("update-input", handleInputUpdate);
    socket.on("problem-update", handleProblemUpdate);
    socket.on("whiteboard-update", handleWhiteboardUpdate);
    socket.on("clear-whiteboard", handleClearWhiteboard);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("roomData", handleRoomData);
      socket.off("owner-update", handleOwnerUpdate);
      socket.off("disconnect", handleDisconnect);
      socket.off("chat-message", handleChatMessage);
      socket.off("room-closed", handleRoomClosed);
      socket.off("left-message", handleLeftMessage);
      socket.off("code-update", handleCodeUpdate);
      socket.off("update-output", handleOutputUpdate);
      socket.off("update-input", handleInputUpdate);
      socket.off("problem-update", handleProblemUpdate);
      socket.off("whiteboard-update", handleWhiteboardUpdate);
      socket.off("clear-whiteboard", handleClearWhiteboard);
      socket.disconnect();
    };
  }, []);

  // Language change no longer auto-loads templates — editor stays as-is
  useEffect(() => {
    // Intentionally empty: user writes their own code
  }, [language]);

  const sendMessage = () => {
    if (chatInput.trim() === "") return;
    socketRef.current.emit("chat-message", {
      roomId,
      name,
      userId,
      message: chatInput.trim(),
    });
    setChatInput("");
  };

  const sendCode = (value) => {
    socketRef.current.emit("code-change", { roomId, value, userId });
  };

  const closeRoom = () => {
    socketRef.current.emit("close-room", { roomId });
  };

  const changeOwnership = (e) => {
    e.preventDefault();
    const value = e.target.value;
    socketRef.current.emit("change-owner", { value, roomId });
    setSelectedUser(value);
  };

  const sendOutput = (v) => {
    socketRef.current.emit("send-output", { v, roomId, userId });
  };

  const sendInput = (v1) => {
    socketRef.current.emit("send-input", { v1, roomId, userId });
  };

  const handleSelectProblem = (e) => {
    const probId = e.target.value;
    if (!probId) return;

    loadProblem(probId, true).then((fullProblem) => {
      if (!fullProblem) return;
      // Sync choice to room members — editor starts empty
      socketRef.current.emit("select-problem", {
        roomId,
        problemId: probId,
        codeTemplate: "",
      });
    });
  };

  const leaveTheRoom = async () => {
    try {
      if (owner === true) {
        toast.info("Change the ownership of the room before leaving");
        return;
      }
      socketRef.current.emit("leave-room", { roomId, userId, name });
      socketRef.current.once("left-success", async () => {
        await fetch("/api/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        toast.success("You left the room");
        socketRef.current.emit("room-update", { roomId });
        navigate("/dashboard");
      });
      socketRef.current.once("left-failed", (data) => {
        toast.error(data.message);
      });
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Render inline markdown: bold, italic, inline code
  const renderInline = (text) => {
    if (!text) return null;
    // Split by bold (**...**), italic (*...*), and inline code (`...`)
    const tokens = [];
    const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)|(\^)(\d+)/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
      }
      if (match[2]) tokens.push({ type: "bolditalic", value: match[2] });
      else if (match[3]) tokens.push({ type: "bold", value: match[3] });
      else if (match[4]) tokens.push({ type: "italic", value: match[4] });
      else if (match[5]) tokens.push({ type: "code", value: match[5] });
      else if (match[6]) tokens.push({ type: "sup", value: match[7] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      tokens.push({ type: "text", value: text.slice(lastIndex) });
    }
    if (tokens.length === 0) return text;
    return tokens.map((tok, idx) => {
      switch (tok.type) {
        case "bolditalic":
          return <strong key={idx} className="font-bold italic text-slate-200">{tok.value}</strong>;
        case "bold":
          return <strong key={idx} className="font-semibold text-slate-200">{tok.value}</strong>;
        case "italic":
          return <em key={idx} className="italic text-slate-300">{tok.value}</em>;
        case "code":
          return (
            <code key={idx} className="px-1.5 py-0.5 bg-slate-800/80 text-indigo-300 rounded font-mono text-[11px] border border-slate-700/50">
              {tok.value}
            </code>
          );
        case "sup":
          return <sup key={idx} className="text-[9px] text-slate-400">{tok.value}</sup>;
        default:
          return <span key={idx}>{tok.value}</span>;
      }
    });
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip completely empty lines
      if (trimmed === "") {
        i++;
        continue;
      }

      // Code blocks: ```text ... ``` or ``` ... ```
      if (trimmed.startsWith("```")) {
        const codeLines = [];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("```")) {
          codeLines.push(lines[i]);
          i++;
        }
        i++; // skip closing ```
        elements.push(
          <pre key={`code-${i}`} className="bg-slate-950/80 border border-slate-800/60 rounded-xl p-3 my-2 overflow-x-auto">
            <code className="text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre">
              {codeLines.join("\n")}
            </code>
          </pre>
        );
        continue;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-xs font-bold text-indigo-400 mt-5 mb-2 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-4 bg-indigo-500 rounded-full" />
            {renderInline(trimmed.replace("### ", ""))}
          </h3>
        );
        i++;
        continue;
      }
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-sm font-bold text-slate-100 mt-5 mb-2">
            {renderInline(trimmed.replace("## ", ""))}
          </h2>
        );
        i++;
        continue;
      }

      // List items (- or numbered)
      if (trimmed.startsWith("- ") || trimmed.startsWith("\t- ")) {
        const listContent = trimmed.replace(/^\t?- /, "");
        elements.push(
          <div key={`li-${i}`} className="flex items-start gap-2 my-1 ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 flex-shrink-0" />
            <span className="text-[12px] text-slate-350 leading-relaxed">{renderInline(listContent)}</span>
          </div>
        );
        i++;
        continue;
      }

      // Numbered list items
      const numMatch = trimmed.match(/^(\d+)\. (.*)/);
      if (numMatch) {
        elements.push(
          <div key={`ol-${i}`} className="flex items-start gap-2 my-1 ml-2">
            <span className="text-[10px] font-bold text-indigo-400 mt-0.5 flex-shrink-0 w-4 text-right">{numMatch[1]}.</span>
            <span className="text-[12px] text-slate-350 leading-relaxed">{renderInline(numMatch[2])}</span>
          </div>
        );
        i++;
        continue;
      }

      // "Example N:" lines — special heading style
      if (/^Example \d+:?$/.test(trimmed)) {
        elements.push(
          <h4 key={`ex-${i}`} className="text-xs font-bold text-cyan-400 mt-4 mb-1.5 flex items-center gap-2">
            <span className="w-5 h-px bg-cyan-500/40" />
            {trimmed}
          </h4>
        );
        i++;
        continue;
      }

      // "Constraints:" heading
      if (/^\*?\*?Constraints:?\*?\*?$/.test(trimmed.replace(/\*/g, ""))) {
        elements.push(
          <h4 key={`cons-${i}`} className="text-xs font-bold text-amber-400 mt-5 mb-2 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-4 bg-amber-500 rounded-full" />
            Constraints
          </h4>
        );
        i++;
        continue;
      }

      // "Follow-up" lines
      if (trimmed.toLowerCase().startsWith("follow-up") || trimmed.toLowerCase().startsWith("**follow-up")) {
        elements.push(
          <div key={`fu-${i}`} className="mt-4 p-3 bg-violet-500/5 border border-violet-500/20 rounded-xl">
            <p className="text-[11px] text-violet-300 leading-relaxed">
              {renderInline(trimmed)}
            </p>
          </div>
        );
        i++;
        continue;
      }

      // Default paragraph
      elements.push(
        <p key={`p-${i}`} className="text-[12px] text-slate-400 leading-relaxed my-1.5">
          {renderInline(trimmed)}
        </p>
      );
      i++;
    }

    return elements;
  };

  const getDifficultyColor = (diff) => {
    if (diff === "Easy") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (diff === "Medium") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-red-500/10 text-red-400 border-red-500/20";
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sleek Dark Header */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg z-15">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-550/20">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent">
                CodeSpace
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">Room: {roomId}</p>
            </div>
          </div>
        </div>

        {/* Real-time Voice Call Widget */}
        <div className="hidden md:block">
          <VoiceChat roomId={roomId} />
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer font-semibold text-xs shadow-sm hover:border-slate-650"
            >
              {Object.keys(LanguageMap).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <Terminal className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Change Owner (Crown) */}
          {owner && (
            <div className="relative">
              <select
                value={selectedUser}
                onChange={changeOwnership}
                className="appearance-none pl-3 pr-8 py-2 bg-slate-800 border border-amber-900/40 rounded-xl text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-transparent transition-all cursor-pointer font-semibold text-xs shadow-sm hover:border-amber-900/60"
              >
                {Object.entries(users)
                  .filter(([uid]) => uid !== "123")
                  .map(([uid, displayName]) => (
                    <option key={uid} value={uid}>
                      {displayName}
                    </option>
                  ))}
              </select>
              <Crown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500 pointer-events-none" />
            </div>
          )}

          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            {owner && (
              <button
                onClick={closeRoom}
                className="p-2 text-red-400 hover:bg-red-950/20 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-900/30"
                title="Close Room"
              >
                <BadgeX className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={leaveTheRoom}
              className="text-slate-100 hover:text-white bg-slate-800 hover:bg-red-900/20 border border-slate-700 hover:border-red-900/40 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer"
            >
              Leave Room
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Split View */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* Left Pane: Problem Library & Test Cases */}
        <div className="w-[32%] flex flex-col gap-4 min-w-[320px]">
          {/* Problem Selector & Detail Pane */}
          <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header / Selector */}
            <div className="px-4 py-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                Problem Statement
              </span>
              
              <select
                onChange={handleSelectProblem}
                value={activeProblem?._id || ""}
                disabled={!owner}
                className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[170px]"
              >
                <option value="">Select problem...</option>
                {problemsList.map((prob) => (
                  <option key={prob._id} value={prob._id}>
                    {prob.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Markdown Description */}
            <div className="flex-grow p-5 overflow-y-auto custom-scroll">
              {activeProblem ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-slate-100">
                      {activeProblem.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getDifficultyColor(
                        activeProblem.difficulty
                      )}`}
                    >
                      {activeProblem.difficulty}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-450 border border-slate-700/60 rounded-full text-[10px]">
                      {activeProblem.category}
                    </span>
                  </div>
                  
                  <div className="h-px bg-slate-800/80 my-3" />
                  
                  <div className="prose prose-invert max-w-none">
                    {renderMarkdown(activeProblem.description)}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center px-4">
                  <Code2 className="w-10 h-10 mb-2 text-slate-600 animate-pulse" />
                  <p className="text-xs font-medium">
                    {owner
                      ? "Select a problem above to start coding!"
                      : "Waiting for the owner to select a problem..."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Test Case Suite */}
          <div className="h-64 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-4 py-2 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  Test Suite
                </span>
                
                <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px] font-bold">
                  <button
                    onClick={() => setTestSuiteTab("standard")}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      testSuiteTab === "standard"
                        ? "bg-slate-800 text-slate-200"
                        : "text-slate-450 hover:text-slate-255"
                    }`}
                  >
                    Standard Cases
                  </button>
                  <button
                    onClick={() => setTestSuiteTab("custom")}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      testSuiteTab === "custom"
                        ? "bg-slate-800 text-slate-200"
                        : "text-slate-450 hover:text-slate-255"
                    }`}
                  >
                    Custom Input
                  </button>
                </div>
              </div>
              
              {testSuiteTab === "standard" && activeProblem && (
                <button
                  onClick={generateAiCases}
                  disabled={aiGenerating}
                  className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {aiGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>{aiGenerating ? "Generating..." : "Generate AI cases"}</span>
                </button>
              )}
            </div>

            <div className="flex-1 p-3 overflow-y-auto min-h-0">
              {testSuiteTab === "standard" ? (
                <div className="space-y-2 h-full">
                  {testCases.length > 0 ? (
                    testCases.map((tc, index) => {
                      const result = testResults[index];
                      return (
                        <div
                          key={index}
                          className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Case {index + 1} {index >= 3 && " (AI Generated)"}
                            </span>
                            <div className="text-[11px] font-mono text-slate-300">
                              Input: <span className="text-slate-455">{tc.input.replace(/"/g, "").replace(/\n/g, " ↵ ")}</span>
                            </div>
                            {result && result.status !== "running" && (
                              <div className="text-[10px] font-mono mt-1 text-slate-400">
                                Expected: <span className="text-slate-350">{(result.expected || "").replace(/"/g, "")}</span> | Got:{" "}
                                <span className={result.status === "passed" ? "text-emerald-400" : "text-rose-400"}>
                                  {(result.actual || "Empty").replace(/"/g, "")}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            {result ? (
                              result.status === "running" ? (
                                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                              ) : result.status === "passed" ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-rose-500" />
                              )
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-slate-700 bg-slate-800" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-600 text-xs italic">
                      No active test cases
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 h-full">
                  <div className="flex-1 flex gap-3 min-h-0">
                    <div className="flex-1 flex flex-col gap-1 min-h-0">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Custom Input (Stdin)</label>
                      <textarea
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                        className="flex-1 w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-2 font-mono text-xs focus:outline-none focus:border-indigo-500/50 resize-none"
                        placeholder="Enter custom input here..."
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1 min-h-0">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Output (Stdout)</label>
                      <textarea
                        readOnly
                        value={output}
                        className="flex-1 w-full bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-2 font-mono text-xs focus:outline-none resize-none"
                        placeholder="Execution output will appear here..."
                      />
                    </div>
                  </div>
                  <button
                    onClick={runCode}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg py-1.5 px-4 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    <span>Run Custom Input</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Pane: Workspace Tabs (Editor / Whiteboard) */}
        <div className="flex-grow flex flex-col gap-4 min-w-0">
          {/* Tab Selection Header */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-1.5 rounded-2xl shadow-xl">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("editor")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === "editor"
                    ? "bg-slate-800 text-slate-100 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Code Editor</span>
              </button>

              <button
                onClick={() => setActiveTab("whiteboard")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === "whiteboard"
                    ? "bg-slate-800 text-slate-100 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Whiteboard Sketchpad</span>
              </button>
            </div>

            <div className="flex items-center gap-2 mr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sync Enabled
              </span>
            </div>
          </div>

          {/* Render Tab Contents */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {activeTab === "editor" ? (
              <div className="flex-grow flex flex-col min-h-0">
                {/* Monaco Editor Wrap */}
                <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="px-5 py-2.5 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-xs font-semibold text-slate-350">
                        {language.split(" ")[0]} Workspace
                      </span>
                    </div>
                    <button
                      onClick={runTestCases}
                      disabled={loading}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-xl flex items-center gap-1.5 font-bold transition-all duration-200 text-xs cursor-pointer shadow-md"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Executing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Submit & Run Tests</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      key={language}
                      language={language}
                      code={code}
                      setCode={setCode}
                      sendCode={sendCode}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0">
                <Whiteboard
                  roomId={roomId}
                  initialDataUrl={whiteboardData}
                  users={users}
                  permissions={whiteboardPermissions}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Team Chat Drawer Toggle */}
      <button
        className="fixed bottom-6 right-6 z-40 group cursor-pointer"
        onClick={() => setSidebarOpen(true)}
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        {messages && messages.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md">
            {messages.length}
          </div>
        )}
      </button>

      {/* Team Chat Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col w-96 max-w-full h-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-in">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-850 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                <div>
                  <h2 className="text-sm font-bold text-slate-200">Team Conversation</h2>
                  <p className="text-[10px] text-slate-400">
                    {Object.keys(users).filter((id) => id !== "123").length} members active
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg p-1.5 transition-all cursor-pointer"
              >
                <BadgeX className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto bg-slate-950/40 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                  <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs">No conversation history</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      msg.userId === userId ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`relative px-4 py-2.5 rounded-2xl max-w-[85%] break-words text-xs shadow-md transition-all duration-200 ${
                        msg.userId === userId
                          ? "bg-indigo-600 text-slate-100 rounded-br-sm"
                          : "bg-slate-800 text-slate-200 rounded-bl-sm border border-slate-700/60"
                      }`}
                    >
                      <p
                        className={`font-bold text-[9px] mb-1 ${
                          msg.userId === userId ? "text-indigo-200" : "text-indigo-400"
                        }`}
                      >
                        {msg.name}
                      </p>
                      <p className="leading-relaxed">{msg.message}</p>
                      <span className="block text-[8px] mt-1 text-slate-400 text-right">
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="px-4 py-4 border-t border-slate-800 bg-slate-900">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Share a message..."
                  className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-md"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
