import api from "../lib/api";

export const checkHealth = async () => {
  try {
    const response = await api.get("/health"); 
    return response.data;
  } catch (error) {
    console.error("Error checking health:", error);
    throw error;
  } 
}