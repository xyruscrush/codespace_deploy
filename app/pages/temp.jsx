import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import CodeEditor from "./CodeEditor";
import { setOwner } from "../slices/state";
import { BadgeX, Rss } from "lucide-react";
import { toast } from "react-toastify";
import { data, useNavigate } from "react-router-dom";
import { getSocket } from "./socket";

const LanguageMap = {
  "Python (3.8.1)": 71,
  "Javascript (Node 18.12.1)": 63,
  "C++ (GCC 9.4.0)": 54,
  "Java (OpenJDK 18.0.2)": 62,
};

export default function CodeRunner() {
  const navigate = useNavigate();

  const [selectedUser, setSelectedUser] = useState("");
  const dispatch = useDispatch();
  const roomId = useSelector((state) => state.appState.roomId);
  const userId = useSelector((state) => state.appState.userId);
  const name = useSelector((state) => state.userInfo.name);
  const owner = useSelector((state) => state.appState.owner);
  const [code, setCode] = useState("");
  const [users, setUsers] = useState({});
  const [output, setOutput] = useState("");
  const [language, setLanguage] = useState("Javascript (Node 18.12.1)");
  const [stdin, setStdin] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(null);
  const [chatInput, setChatInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) setSidebarOpen(false);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

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
            "X-RapidAPI-Key":
              "31f42fc348mshaff18346fa4bf7dp19877ejsn0cb7be418beb",
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

      const submitData = await submitRes.json();
      const token = submitData.token;

      let result = null;
      while (!result || result.status.id <= 2) {
        const statusRes = await fetch(
          `https://judge0-ce.p.rapidapi.com/submissions/${token}?base64_encoded=false`,
          {
            headers: {
              "X-RapidAPI-Key":
                "31f42fc348mshaff18346fa4bf7dp19877ejsn0cb7be418beb",
              "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
            },
          }
        );
        result = await statusRes.json();
        if (result.status.id <= 2)
          await new Promise((r) => setTimeout(r, 1000));
      }

      setOutput(
        result.stdout || result.compile_output || result.stderr || "No output"
      );
      sendOutput(
        result.stdout || result.compile_output || result.stderr || "No output"
      );
    } catch (err) {
      setOutput("Error: " + err.message);
      sendOutput("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = getSocket();
    }
    const socket = socketRef.current;
    socket.connect();
    const handleConnect = () => {
      socket.emit("join-room", { roomId, userId, name });
    };

    const handleRoomData = (data) => {
      const sortedMessages = data.messages.sort((a, b) => a.time - b.time);
      console.log(data);
      setMessages(sortedMessages);
      setCode(data.code);
      setUsers(data.users);
      setSelectedUser(userId);
      setOutput(data.output);
      setStdin(data.input);
      const isOwner = data.ownerId === userId;
      dispatch(setOwner(isOwner));
      toast.success(data.join_message);
    };

    const handleOwnerUpdate = ({ value }) => {
      const isOwner = userId == value;
      dispatch(setOwner(isOwner));
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

    socket.on("connect", handleConnect);
    socket.on("roomData", handleRoomData);
    socket.on("owner-update", handleOwnerUpdate);
    socket.on("disconnect", handleDisconnect);
    socket.on("chat-message", handleChatMessage);
    socket.on("room-closed", handleRoomClosed);
    socket.on("left-message", handleLeftMessage);
    socket.on("code-update", handleCodeUpdate);
    socket.on("update-output", handleOutputUpdate);
    socket.on("update-input", handleInputUpdate);

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
      socket.disconnect();
    };
  }, []);

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
    app.post("api/leave", leaveTheRoom);
    app.post("/api/validate-room-token", validateRoomToken);
    app;
    setSelectedUser(value);
  };
  const sendOutput = (v) => {
    socketRef.current.emit("send-output", { v, roomId, userId });
  };
  const sendInput = (v1) => {
    socketRef.current.emit("send-input", { v1, roomId, userId });
  };
  const leaveTheRoom = async () => {
    try {
      if (owner == true) {
        toast.info("change the ownership of the room before leaving");
        return;
      }
      socketRef.current.emit("leave-room", { roomId, userId, name });
      socketRef.current.once("left-success", async (data) => {
        console.log(data.message);
        const res = await fetch("/api/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        toast.success("You left the room");
        navigate("/dashboard");
      });
      socketRef.current.once("left-failed", (data) => {
        toast.error(data.message);
      });
    } catch (err) {
      toast.error(data.message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <span className="text-xl font-bold text-white">&lt;/&gt;</span>
          </div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
            CodeSpace
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-medium text-sm"
            >
              {Object.keys(LanguageMap).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <span className="absolute right-3 top-3 text-gray-400 pointer-events-none">
              ▼
            </span>
          </div>

          {owner && (
            <select
              value={selectedUser}
              onChange={changeOwnership}
              className="appearance-none px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer font-medium text-sm"
            >
              {Object.entries(users)
                .filter(([uid]) => uid !== "123")
                .map(([uid, displayName]) => (
                  <option key={uid} value={uid}>
                    {displayName}
                  </option>
                ))}
            </select>
          )}

          {isMobile && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-2xl text-gray-300">
                {sidebarOpen ? "✕" : "☰"}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {owner && <BadgeX onClick={closeRoom} />}
          <button
            onClick={leaveTheRoom}
            className="text-white bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 text-sm font-semibold"
          >
            Leave Room
          </button>
        </div>
      </header>

      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="flex-1 flex flex-col bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden hover:border-slate-600 transition-colors">
            <div className="px-6 py-3 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h2 className="text-sm font-semibold text-gray-200">
                  Code Editor
                </h2>
              </div>
              <span className="text-xs text-gray-500">{language}</span>
            </div>
            <CodeEditor
              language={language}
              code={code}
              setCode={setCode}
              sendCode={sendCode}
            />
          </div>

          <div className="flex gap-4 h-32">
            <div className="flex-1 flex flex-col bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden hover:border-slate-600 transition-colors">
              <div className="px-6 py-2 border-b border-slate-700 bg-slate-900">
                <h3 className="text-xs font-semibold text-gray-200">Input</h3>
              </div>
              <textarea
                placeholder="Enter input here (optional)..."
                value={stdin}
                onChange={(e) => {
                  setStdin(e.target.value);
                  sendInput(e.target.value);
                }}
                className="flex-1 bg-slate-900 text-gray-100 font-mono text-xs p-3 resize-none focus:outline-none border-0 placeholder-gray-500 selection:bg-indigo-600/50"
                spellCheck="false"
              />
              <button
                onClick={runCode}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 flex items-center justify-center gap-2 font-semibold transition-all duration-200 text-sm border-t border-slate-700"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <span>▶</span>
                    <span>Run</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 flex flex-col bg-slate-800 rounded-lg border border-slate-700 shadow-xl overflow-hidden hover:border-slate-600 transition-colors">
              <div className="px-6 py-2 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">◄►</span>
                  <h2 className="text-xs font-semibold text-gray-200">
                    Output
                  </h2>
                </div>
                {output && output !== "Running code..." && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-500"></div>
                    Done
                  </span>
                )}
              </div>
              <div className="flex-1 bg-gray-950 overflow-auto">
                <pre className="p-3 text-gray-100 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                  {output || <span className="text-gray-500">Output here</span>}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-6 right-6 z-50 cursor-pointer"
        onClick={() => setSidebarOpen(true)}
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
          <span className="text-white text-2xl">💬</span>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 bg-black/40">
          <div className="flex flex-col w-80 max-w-full h-[400px] bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-700">
              <h2 className="text-sm font-semibold text-gray-200">Team Chat</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-2 scrollbar-hide">
              {(messages || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col mb-4 ${
                    msg.userId === userId ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`relative px-4 py-3 rounded-2xl max-w-[80%] break-words text-sm shadow-lg transition-all duration-200 ${
                      msg.userId === userId
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md"
                        : "bg-slate-100 text-gray-800 rounded-bl-md border border-slate-200"
                    }`}
                  >
                    <p
                      className={`font-medium text-xs mb-1.5 ${
                        msg.userId === userId
                          ? "text-indigo-100"
                          : "text-slate-800"
                      }`}
                    >
                      {msg.name}
                    </p>

                    <p
                      className={`leading-relaxed ${
                        msg.userId === userId ? "pr-8" : "pl-8"
                      }`}
                    >
                      {msg.message}
                    </p>

                    <span
                      className={`absolute bottom-2 text-[10px] ${
                        msg.userId === userId
                          ? "right-3 text-indigo-100"
                          : "left-3 text-slate-400"
                      }`}
                    >
                      {msg.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-slate-700 bg-slate-900 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                }}
                placeholder="Message team..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />
              <button
                onClick={sendMessage}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-2 rounded-lg transition-all"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
