import React, { useRef, useEffect, useState } from "react";
import { getSocket } from "./socket";
import { useSelector } from "react-redux";
import { Trash2, Edit, Square, Lock, Users } from "lucide-react";

export default function Whiteboard({ roomId, initialDataUrl, users = {}, permissions = [] }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#818cf8"); // Default indigo
  const [brushSize, setBrushSize] = useState(5);
  const [showPermMenu, setShowPermMenu] = useState(false);
  const socketRef = useRef(null);
  const owner = useSelector((state) => state.appState.owner);
  const userId = useSelector((state) => state.appState.userId);

  const canDraw = owner || (permissions && permissions.map(p => p.trim()).includes(userId?.trim()));

  useEffect(() => {
    socketRef.current = getSocket();
    const canvas = canvasRef.current;
    
    // Set display size (css)
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    
    // Set actual resolution
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const context = canvas.getContext("2d");
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    contextRef.current = context;

    // Draw initial whiteboard state if exists
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
      };
      img.src = initialDataUrl;
    }

    // Handle incoming draw events from peers
    const handleDrawLine = ({ prevPos, currentPos, color: peerColor, size }) => {
      if (!contextRef.current) return;
      const ctx = contextRef.current;
      
      ctx.save();
      ctx.strokeStyle = peerColor;
      ctx.lineWidth = size;
      ctx.beginPath();
      ctx.moveTo(prevPos.x, prevPos.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
      ctx.restore();
    };

    const handleClear = () => {
      if (!canvasRef.current || !contextRef.current) return;
      contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    socketRef.current.on("draw-line", handleDrawLine);
    socketRef.current.on("clear-whiteboard", handleClear);

    // Handle window resize
    const handleResize = () => {
      // Save canvas state
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx.drawImage(canvas, 0, 0);

      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      contextRef.current = canvas.getContext("2d");
      contextRef.current.lineCap = "round";
      contextRef.current.lineJoin = "round";
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;

      // Restore state
      contextRef.current.drawImage(tempCanvas, 0, 0);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      socketRef.current.off("draw-line", handleDrawLine);
      socketRef.current.off("clear-whiteboard", handleClear);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Update stroke styles when controls change
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = brushSize;
    }
  }, [color, brushSize]);

  // Coordinates helper mapping screen pointer to canvas coordinates
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Scale coordinates to match actual resolution
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const prevPosRef = useRef({ x: 0, y: 0 });

  const startDrawing = (e) => {
    if (!canDraw) return;
    const { x, y } = getCoordinates(e);
    prevPosRef.current = { x, y };
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!canDraw) return;
    if (!isDrawing || !contextRef.current) return;
    const currentPos = getCoordinates(e);
    const prevPos = prevPosRef.current;

    const ctx = contextRef.current;
    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    // Emit to other users
    socketRef.current.emit("draw-line", {
      roomId,
      prevPos,
      currentPos,
      color,
      size: brushSize,
    });

    prevPosRef.current = currentPos;
  };

  const stopDrawing = () => {
    if (!canDraw) return;
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save state to server
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      socketRef.current.emit("whiteboard-save", { roomId, dataUrl });
    }
  };

  const togglePermission = (targetUserId) => {
    socketRef.current.emit("toggle-draw-permission", { targetUserId, roomId });
  };

  const clearCanvas = () => {
    if (!owner) return; // Only owner can clear
    if (!canvasRef.current || !contextRef.current) return;
    contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socketRef.current.emit("clear-whiteboard", { roomId });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Canvas Drawing Area */}
      <div className="flex-grow bg-slate-950 relative cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="absolute inset-0 block"
        />
      </div>

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-2xl shadow-xl z-10 select-none">
        {/* Brush Tool / Read-only state */}
        {canDraw ? (
          <div className="flex items-center gap-1.5 border-r border-slate-700 pr-3">
            <Edit className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold text-slate-300">Draw</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 border-r border-slate-700 pr-3 text-amber-500 font-semibold text-xs">
            <Lock className="w-3.5 h-3.5" />
            <span>Read-Only</span>
          </div>
        )}

        {/* Colors */}
        {canDraw && (
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
            {["#818cf8", "#f43f5e", "#10b981", "#fbbf24", "#ffffff"].map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-5 h-5 rounded-full border transition-all hover:scale-110 active:scale-95 cursor-pointer"
                style={{
                  backgroundColor: c,
                  borderColor: color === c ? "#fff" : "transparent",
                  boxShadow: color === c ? "0 0 8px rgba(255,255,255,0.4)" : "none",
                }}
              />
            ))}
          </div>
        )}

        {/* Sizes */}
        {canDraw && (
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Size</span>
            <select
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {[2, 5, 8, 12, 16].map((s) => (
                <option key={s} value={s}>
                  {s}px
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Button */}
        {owner && (
          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold text-xs transition-colors hover:bg-red-500/10 px-2.5 py-1.5 rounded-xl cursor-pointer border-r border-slate-700 pr-3"
            title="Clear Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}

        {/* Permissions Manager */}
        {owner && (
          <div className="relative">
            <button
              onClick={() => setShowPermMenu(!showPermMenu)}
              className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold text-xs transition-colors hover:bg-indigo-500/10 px-2.5 py-1.5 rounded-xl cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Permissions</span>
            </button>
            
            {showPermMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 flex flex-col gap-2">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 border-b border-slate-800 pb-1">
                  Drawing Permissions
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5">
                  {Object.entries(users)
                    .filter(([uid]) => uid.trim() !== userId?.trim() && uid !== "123") // Exclude owner & system
                    .map(([uid, displayName]) => {
                      const hasPerm = permissions && permissions.map(p => p.trim()).includes(uid.trim());
                      return (
                        <div
                          key={uid}
                          className="flex items-center justify-between text-xs text-slate-350 p-1 hover:bg-slate-800/50 rounded-lg transition-all"
                        >
                          <span className="truncate max-w-[140px] font-medium">{displayName}</span>
                          <button
                            type="button"
                            onClick={() => togglePermission(uid)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                              hasPerm
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                                : "bg-slate-800 text-slate-450 border border-slate-700 hover:bg-slate-750"
                            }`}
                          >
                            {hasPerm ? "Allowed" : "Restricted"}
                          </button>
                        </div>
                      );
                    })}
                  {Object.entries(users).filter(([uid]) => uid !== userId && uid !== "123").length === 0 && (
                    <p className="text-[11px] text-slate-500 text-center py-2">
                      No other active members
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
