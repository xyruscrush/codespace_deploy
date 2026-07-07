import { configureStore } from "@reduxjs/toolkit";
import userInfoReducer from "../slices/userInfo";
import stateReducer from "../slices/state";
import cursorsReducer from "../slices/cursorsSlice";

const store = configureStore({
  reducer: {
    userInfo: userInfoReducer,
    appState: stateReducer,
    cursors: cursorsReducer,
  },
});
export default store;
