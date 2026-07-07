import { createSlice } from "@reduxjs/toolkit";

const cursorsSlice = createSlice({
  name: "cursors",
  initialState: {}, // {userId: {position: {lineNumber, column}, name, color}}
  reducers: {
    setCursor: (state, action) => {
      const { userId, position, name, color } = action.payload;
      state[userId] = { position, name, color };
    },
    removeCursor: (state, action) => {
      delete state[action.payload];
    },
  },
});

export const { setCursor, removeCursor } = cursorsSlice.actions;
export default cursorsSlice.reducer;
