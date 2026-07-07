import React, { useState, useEffect, useRef } from "react";
import { getSocket } from "./socket";
import { useSelector } from "react-redux";
import { Mic, MicOff, PhoneOff, Users } from "lucide-react";
import { toast } from "react-toastify";

export default function VoiceChat({ roomId }) {
  const socketRef = useRef(null);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [activeSpeakers, setActiveSpeakers] = useState([]); // Array of socketIds of peers in the call

  const userId = useSelector((state) => state.appState.userId);
  const name = useSelector((state) => state.userInfo.name);

  const localStreamRef = useRef(null);
  const peersRef = useRef({}); // { peerSocketId: RTCPeerConnection }
  const audioElementsRef = useRef({}); // { peerSocketId: HTMLAudioElement }

  // ICE Servers (Standard free STUN server config)
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ],
  };

  useEffect(() => {
    socketRef.current = getSocket();
    const socket = socketRef.current;

    // Handle peer joined voice room -> Create Peer Connection & send Offer
    const handlePeerJoined = async ({ socketId, userId: peerUid, name: peerName }) => {
      if (!localStreamRef.current) return; // Only process if we are in the call
      if (peersRef.current[socketId]) return;
      
      try {
        toast.info(`${peerName} joined voice chat`);
        const pc = createPeerConnection(socketId);
        peersRef.current[socketId] = pc;

        // Add local tracks to peer connection
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            pc.addTrack(track, localStreamRef.current);
          });
        }

        // Create Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("voice-signal", {
          targetSocketId: socketId,
          signalData: { type: "offer", offer },
        });
      } catch (err) {
        console.error("Error setting up connection for new peer:", err);
      }
    };

    // Handle incoming WebRTC signaling data
    const handleVoiceSignal = async ({ senderSocketId, signalData }) => {
      if (!localStreamRef.current) return; // Only process if we are in the call
      try {
        let pc = peersRef.current[senderSocketId];

        if (signalData.type === "offer") {
          // If PC doesn't exist yet, create it
          if (!pc) {
            pc = createPeerConnection(senderSocketId);
            peersRef.current[senderSocketId] = pc;

            if (localStreamRef.current) {
              localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current);
              });
            }
          }

          await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit("voice-signal", {
            targetSocketId: senderSocketId,
            signalData: { type: "answer", answer },
          });

        } else if (signalData.type === "answer") {
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
          }
        } else if (signalData.type === "candidate") {
          if (pc && signalData.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          }
        }
      } catch (err) {
        console.error("Signaling error:", err);
      }
    };

    // Handle peer leaving voice room -> Clean up PC and Audio
    const handlePeerLeft = ({ socketId }) => {
      closePeerConnection(socketId);
    };

    socket.on("voice-peer-joined", handlePeerJoined);
    socket.on("voice-signal", handleVoiceSignal);
    socket.on("voice-peer-left", handlePeerLeft);

    return () => {
      socket.off("voice-peer-joined", handlePeerJoined);
      socket.off("voice-signal", handleVoiceSignal);
      socket.off("voice-peer-left", handlePeerLeft);
    };
  }, []);

  // Clean up stream and connections only on final unmount of VoiceChat component
  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, []);

  const createPeerConnection = (peerSocketId) => {
    const pc = new RTCPeerConnection(rtcConfig);

    // Send ICE candidates to peer
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("voice-signal", {
          targetSocketId: peerSocketId,
          signalData: { type: "candidate", candidate: event.candidate },
        });
      }
    };

    // Handle incoming audio track
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      
      // Create HTML audio element dynamically
      if (!audioElementsRef.current[peerSocketId]) {
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audioElementsRef.current[peerSocketId] = audio;
        
        // Add peer to active call speakers list
        setActiveSpeakers((prev) => [...prev, peerSocketId]);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed" || pc.iceConnectionState === "closed") {
        closePeerConnection(peerSocketId);
      }
    };

    return pc;
  };

  const closePeerConnection = (peerSocketId) => {
    if (peersRef.current[peerSocketId]) {
      peersRef.current[peerSocketId].close();
      delete peersRef.current[peerSocketId];
    }
    if (audioElementsRef.current[peerSocketId]) {
      audioElementsRef.current[peerSocketId].pause();
      delete audioElementsRef.current[peerSocketId];
    }
    setActiveSpeakers((prev) => prev.filter((id) => id !== peerSocketId));
  };

  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setInCall(true);
      setMuted(false);

      // Notify others in room
      socketRef.current.emit("voice-join", { roomId, userId, name });
      toast.success("Joined voice chat");
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast.error("Failed to access microphone. Please check permissions.");
    }
  };

  const leaveCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    Object.keys(peersRef.current).forEach((peerSocketId) => {
      closePeerConnection(peerSocketId);
    });

    if (socketRef.current) {
      socketRef.current.emit("voice-leave", { roomId });
    }

    setInCall(false);
    setMuted(false);
    toast.info("Left voice chat");
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-2xl shadow-lg">
      <div className="flex items-center gap-1.5 border-r border-slate-800 pr-3">
        <Users className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300">Voice Room</span>
      </div>

      {inCall ? (
        <div className="flex items-center gap-2">
          {/* Active status */}
          <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-xl text-xs font-semibold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>Connected ({activeSpeakers.length + 1})</span>
          </div>

          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`p-2 rounded-xl transition-all cursor-pointer border ${
              muted
                ? "bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
                : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            }`}
            title={muted ? "Unmute Microphone" : "Mute Microphone"}
          >
            {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Leave Button */}
          <button
            onClick={leaveCall}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all border border-red-700 cursor-pointer"
            title="Leave Voice Chat"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={joinCall}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all border border-indigo-700 shadow-md shadow-indigo-650/30 cursor-pointer hover:shadow-indigo-650/50"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Join Voice Call</span>
        </button>
      )}
    </div>
  );
}
