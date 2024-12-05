// src/axiosInstance.ts
import axios, { AxiosInstance } from 'axios';

const firebaseProjectId = process.env.REACT_APP_FIREBASE_PROJECT_ID;
const axiosInstance: AxiosInstance = axios.create({
  baseURL: `https://${firebaseProjectId}.cloudfunctions.net/api/`
});

export default axiosInstance;