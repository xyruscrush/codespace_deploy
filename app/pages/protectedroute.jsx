import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { setName, setEmail } from "../slices/userInfo";
import { setIsAuthenticated } from "../slices/state";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (state) => state.appState.isAuthenticated
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRefreshToken = async () => {
      try {
        const response = await fetch(
          "/api/refresh-token",
          {
            method: "POST",
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          dispatch(setName(data.name));
          dispatch(setEmail(data.email));
          dispatch(setIsAuthenticated(true));
        } else {
          dispatch(setIsAuthenticated(false));
        }
      } catch (error) {
        dispatch(setIsAuthenticated(false));
      } finally {
        setLoading(false);
      }
    };

    fetchRefreshToken();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

export default ProtectedRoute;
