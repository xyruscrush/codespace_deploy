import react, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setIsJoinedRoom, setuserId, setroomId } from "../slices/state";
import { setName } from "../slices/userInfo";
import { Loader2 } from "lucide-react";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const isJoinedRoom = useSelector((state) => state.appState.isJoinedRoom);
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await fetch(
          "/api/validate-room-token",
          {
            method: "POST",
            credentials: "include",
          }
        );
        const data = await response.json();
        if (response.ok) {
          dispatch(setIsJoinedRoom(true));
          dispatch(setroomId(data.data.roomId));
          dispatch(setuserId(data.data.userId));
          dispatch(setName(data.data.name));
        } else {
          dispatch(setIsJoinedRoom(false));
        }
      } catch (error) {
        dispatch(setIsJoinedRoom(false));
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, []);
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }
  if (!isJoinedRoom) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
