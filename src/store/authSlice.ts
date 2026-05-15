import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'patient_jwt';

export interface AuthState {
  token: string | null;
  patient: {
    _id: string;
    name: string;
    email: string;
    onboardingComplete?: boolean;
  } | null;
  isLoading: boolean;
}

const initialState: AuthState = {
  token: null,
  patient: null,
  isLoading: true,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        patient: AuthState['patient'];
      }>,
    ) => {
      state.token = action.payload.token;
      state.patient = action.payload.patient;
      state.isLoading = false;
      // Persist to secure storage (fire-and-forget)
      SecureStore.setItemAsync(TOKEN_KEY, action.payload.token).catch(() => null);
    },
    clearCredentials: (state) => {
      state.token = null;
      state.patient = null;
      state.isLoading = false;
      SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => null);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    restoreToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.isLoading = false;
    },
  },
});

export const { setCredentials, clearCredentials, setLoading, restoreToken } =
  authSlice.actions;

/** Loads the JWT from SecureStore — call this on app launch. */
export async function loadStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}
