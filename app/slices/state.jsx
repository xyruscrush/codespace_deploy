import { createSlice } from "@reduxjs/toolkit";
const initialState = {
  isSigningUP: false,
  isLoggingIn: false,
  isAuthenticated: false,
  isVerifyingOtp: false,
  isJoinedRoom: false,
  roomId: null,
  userId: null,
  owner: false,
};
const stateSlice = createSlice({
  name: "state",
  initialState,
  reducers: {
    setIsSigningUP: (state, action) => {
      state.isSigningUP = action.payload;
    },
    setIsLoggingIn: (state, action) => {
      state.isLoggingIn = action.payload;
    },
    setIsAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
    setIsVerifyingOtp: (state, action) => {
      state.isVerifyingOtp = action.payload;
    },
    setIsJoinedRoom: (state, action) => {
      state.isJoinedRoom = action.payload;
    },
    setroomId: (state, action) => {
      state.roomId = action.payload;
    },
    setuserId: (state, action) => {
      state.userId = action.payload;
    },
    setOwner: (state, action) => {
      state.owner = action.payload;
    },
  },
});
export const {
  setIsSigningUP,
  setIsLoggingIn,
  setIsAuthenticated,
  setIsVerifyingOtp,
  setIsJoinedRoom,
  setroomId,
  setuserId,
  setOwner,
} = stateSlice.actions;
export default stateSlice.reducer;
