import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setName, setEmail } from "../slices/userInfo";
import { ClipLoader } from "react-spinners";
import {
  setIsSigningUP,
  setIsAuthenticated,
  setIsLoggingIn,
} from "../slices/state";

export default function AuthPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isSigningUP = useSelector((state) => state.appState.isSigningUP);
  const isLoggingIn = useSelector((state) => state.appState.isLoggingIn);
  const [isSignin, setIsSignin] = useState(true);
  const [inputFirstName, setInputFirstName] = useState("");
  const [inputLastName, setInputLastName] = useState("");
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");

  const changeAuth = () => {
    setIsSignin(!isSignin);
    toast.info(isSignin ? "Switched to Sign Up" : "Switched to Sign In");
  };

  const handleSubmitSignIn = async (e) => {
    e.preventDefault();

    try {
      if (!inputEmail) {
        toast.error("Email is required");
        return;
      }
      if (!isValidEmail(inputEmail)) {
        toast.info("not a valid email");
      }
      if (!inputPassword) {
        toast.error("Password is required");
        return;
      }
      dispatch(setIsLoggingIn(true));
      const res = await fetch("/api/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: inputEmail,
          password: inputPassword,
        }),
      });
      const data = await res.json();
      if (res.status === 200) {
        toast.success(data.message);
        dispatch(setName(data.data.name));
        dispatch(setEmail(data.data.email));
        dispatch(setIsAuthenticated(true));
        navigate("/dashboard");
      } else {
        toast.error(data.message || "Failed to sign in");
      }
      dispatch(setIsLoggingIn(false));
    } catch (err) {
      toast.error("An error occurred during sign in");
    }
  };

  const handleSubmitSignUp = async (e) => {
    e.preventDefault();
    try {
      if (!inputFirstName) {
        toast.error("First name is required");
        return;
      }
      if (!inputLastName) {
        toast.error("Last name is required");
        return;
      }
      if (!inputEmail) {
        toast.error("Email is required");
        return;
      }
      if (!inputPassword) {
        toast.error("Password is required");
        return;
      }
      if (!isValidEmail(inputEmail)) {
        toast.info("not a valid email");
      }
      dispatch(setIsSigningUP(true));

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: inputFirstName + " " + inputLastName,
          email: inputEmail,
          password: inputPassword,
        }),
      });
      const data = await res.json();
      if (res.status === 200) {
        toast.success(data.message);
        dispatch(setName(data.data.name));
        dispatch(setEmail(data.data.email));
        dispatch(setIsAuthenticated(true));
        navigate("/dashboard");
      } else {
        toast.error(data.message || "Failed to sign up");
      }
      dispatch(setIsSigningUP(false));
    } catch (err) {
      toast.error("An error occurred during sign up");
    }
  };

  function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
      <div className="bg-white shadow-lg rounded-2xl w-full max-w-4xl flex overflow-hidden">
        <div className="hidden md:flex flex-col justify-center items-center bg-indigo-600 text-white p-10 w-1/2">
          <h1 className="text-3xl font-bold mb-4">Welcome to CodeSpace</h1>
          <p className="text-center text-indigo-100 mb-6">
            Practice DSA collaboratively with peers. Code together, discuss
            problems, and grow as a team.
          </p>
          <div className="text-sm text-indigo-200">© 2025 CodeSpace</div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-10">
          <div className="w-full max-w-sm">
            <div className="flex justify-center gap-6 mb-8 border-b pb-2">
              <button
                onClick={changeAuth}
                className={
                  isSignin
                    ? "text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1"
                    : "text-gray-500 hover:text-indigo-600"
                }
              >
                Sign In
              </button>
              <button
                onClick={changeAuth}
                className={
                  !isSignin
                    ? "text-indigo-600 font-semibold border-b-2 border-indigo-600 pb-1"
                    : "text-gray-500 hover:text-indigo-600"
                }
              >
                Sign Up
              </button>
            </div>

            {isSignin ? (
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    value={inputEmail}
                    onChange={(e) => setInputEmail(e.target.value)}
                    type="email"
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    onChange={(e) => setInputPassword(e.target.value)}
                    value={inputPassword}
                    type="password"
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  onClick={handleSubmitSignIn}
                  className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                >
                  {isLoggingIn ? <ClipLoader size={20} /> : "Login"}
                </button>
                <p className="text-center text-sm text-gray-500 mt-3">
                  <button type="button" onClick={changeAuth} className="cursor-pointer">
                    Don’t have an account?{" "}
                  </button>
                  <span className="text-indigo-600 cursor-pointer hover:underline">
                    <button type="button" className="cursor-pointer" onClick={changeAuth}>
                      Sign Up
                    </button>
                  </span>
                </p>
              </form>
            ) : (
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      onChange={(e) => setInputFirstName(e.target.value)}
                      value={inputFirstName}
                      type="text"
                      className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      onChange={(e) => setInputLastName(e.target.value)}
                      value={inputLastName}
                      type="text"
                      className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    onChange={(e) => setInputEmail(e.target.value)}
                    value={inputEmail}
                    type="email"
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    onChange={(e) => setInputPassword(e.target.value)}
                    value={inputPassword}
                    type="password"
                    className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSubmitSignUp}
                  className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
                >
                  {isSigningUP ? <ClipLoader size={20} /> : "Create Account"}
                </button>

                <p className="text-center text-sm text-gray-500 mt-3">
                  <button type="button" onClick={changeAuth} className="cursor-pointer">
                    Already have an account?{" "}
                  </button>
                  <span className="text-indigo-600 cursor-pointer hover:underline">
                    <button type="button" className="cursor-pointer" onClick={changeAuth}>
                      Sign In
                    </button>
                  </span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
