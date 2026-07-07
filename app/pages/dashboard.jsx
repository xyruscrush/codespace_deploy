import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setName, setEmail } from "../slices/userInfo";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { setroomId } from "../slices/state";

export default function Dashboard() {
  const roomId = useSelector((state) => state.appState.roomId);
  const [existingRoom, setExistingRoom] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showJoinRoom, setShowJoinRoom] = useState(false);
  const [inputRoomId, setInputRoomId] = useState("");
  const name = useSelector((state) => state.userInfo.name);
  const [owner, setOwner] = useState(false);

  const joinRoom = async () => {
    try {
      if (existingRoom == true) {
        toast.info("you are already in a room");
        return;
      }
      if (!inputRoomId || inputRoomId.trim() === "") {
        toast.error("Please enter a valid Room ID");
        return;
      }
      const res = await fetch(`/api/room-exist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ roomId: inputRoomId }),
      });
      const data = await res.json();

      if (res.ok) {
        if (data.userCount >= 4) {
          toast.success("Room is full max upto 4 people");
          return;
        }
        const res2 = await fetch(`/api/room-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            roomId: inputRoomId,
            name: name,
          }),
        });
        const data2 = await res2.json();
        if (res2.ok) {
          navigate(`/room`);
        } else {
          toast.error(data2.message);
        }
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error joining room: " + error.message);
    }
  };

  const createRoom = async () => {
    try {
      if (existingRoom == true) {
        toast.info("you are already in a room");
        return;
      }
      const res = await fetch("/api/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name,
        }),
      });
      const data = await res.json();
      if (res.status == 201) {
        toast.info(data.message);
        return;
      } else if (res.status == 200) {
        toast.success("room created successfully");
        navigate("/room");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Error joining room: " + error.message);
    }
  };

  const logout = async () => {
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        dispatch(setName(""));
        dispatch(setEmail(""));
        toast.success("Logout successful");
        navigate("/auth");
      } else {
        toast.error("Logout failed");
      }
    } catch (error) {
      toast.error("Error during logout:", error);
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(
          "/api/validate-room-token",
          {
            method: "POST",
            credentials: "include",
          }
        );
        const data = await res.json();
        if (res.ok) {
          setExistingRoom(true);
          dispatch(setroomId(data.data.roomId));
        } else {
          setExistingRoom(false);
        }
      } catch (err) {
        toast.error(err.message);
      }
    };
    fetchDetails();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 font-sans text-gray-800 flex flex-col">
      <header className="flex justify-between items-center px-8 py-5 bg-white shadow-sm border-b border-gray-100">
        <div className="font-bold text-3xl text-indigo-700 tracking-tight">
          CodeSpace
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-5 py-2.5 rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-200">
            <div className="w-10 h-10 bg-white text-indigo-600 font-bold rounded-full flex items-center justify-center shadow-sm text-lg">
              {name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span className="font-semibold">{name || "User"}</span>
          </button>

          <button
            onClick={logout}
            className="text-indigo-600 hover:text-indigo-800 font-medium px-4 py-2 hover:bg-indigo-50 rounded-lg transition-all duration-200"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center flex-grow px-4 py-12">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold mb-4 text-gray-900 tracking-tight">
              Welcome back,{" "}
              <span className="text-indigo-600">{name || "Developer"}</span>
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Manage your coding sessions, update your profile, or collaborate
              with others in real-time.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Create Room
              </h2>
              <p className="text-gray-600 mb-6">
                Start a new collaborative coding session and invite others to
                join.
              </p>
              <button
                onClick={createRoom}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
              >
                Create New Room
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Join Room
              </h2>
              <p className="text-gray-600 mb-6">
                Enter a room ID to join an existing collaborative session.
              </p>
              <button
                onClick={() => {
                  if (existingRoom == true) {
                    toast.info("already in a room");
                    return;
                  }
                  setShowJoinRoom(true);
                }}
                className="w-full border-2 border-indigo-600 text-indigo-600 px-6 py-3 rounded-xl hover:bg-indigo-50 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
              >
                Join Existing Room
              </button>
            </div>
          </div>

          {existingRoom && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-xl font-bold">Active Room Session</h3>
                  </div>
                  <p className="text-indigo-100 mb-1">
                    You have an active room session
                  </p>
                  <p className="text-sm font-mono bg-white/20 inline-block px-3 py-1 rounded-lg backdrop-blur-sm">
                    {roomId}
                  </p>
                </div>
                <button
                  onClick={() => navigate("/room")}
                  className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl hover:bg-indigo-50 transition-all duration-200 font-semibold shadow-lg ml-4 whitespace-nowrap"
                >
                  Rejoin Room
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {showJoinRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 scale-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Join Room</h2>
              <p className="text-gray-600 mt-2">
                Enter the room ID to join the session
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Room ID
              </label>
              <input
                type="text"
                placeholder="Enter Room ID"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all text-lg"
                value={inputRoomId}
                onChange={(e) => {
                  setInputRoomId(e.target.value.trim());
                }}
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={joinRoom}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 shadow-md hover:shadow-lg transition-all duration-200 font-semibold text-lg"
              >
                Join Room
              </button>
              <button
                onClick={() => setShowJoinRoom(false)}
                className="w-full text-gray-600 hover:text-gray-800 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
