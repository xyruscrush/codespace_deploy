import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  name: "",
  email: "",
};
const userInfoSlice = createSlice({
  name: "userInfo",
  initialState,
  reducers: {
    setName: (state, action) => {
      state.name = action.payload;
    },
    setEmail: (state, action) => {
      state.email = action.payload;
    },
  },
});

export const { setName, setEmail } = userInfoSlice.actions;
export default userInfoSlice.reducer;
