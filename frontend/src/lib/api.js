import { axiosInstance } from "./axios";

export const signup = async (signupData) => {
  const response = await axiosInstance.post("/auth/signup", signupData);
  return response.data;
};

export const login = async (loginData) => {
  const response = await axiosInstance.post("/auth/login", loginData);
  return response.data;
};
export const logout = async () => {
  const response = await axiosInstance.post("/auth/logout");
  return response.data;
};

export const getAuthUser = async () => {
  try {
    const res = await axiosInstance.get("/auth/me");
    return res.data;
  } catch (error) {
    if (error.response?.status === 401) return null;
    throw error;
  }
};

export const completeOnboarding = async (userData) => {
  const response = await axiosInstance.put("/auth/onboarding", userData);
  return response.data;
};

export const deleteAccount = async (reason) => {
  const response = await axiosInstance.delete("/auth/delete-account", { data: { reason } });
  return response.data;
};

export const updatePassword = async (passwords) => {
  const response = await axiosInstance.put("/auth/update-password", passwords);
  return response.data;
};

export async function getUserFriends() {
  const response = await axiosInstance.get("/users/friends");
  return response.data;
}

export async function getRecommendedUsers(params = {}) {
  const { page = 1, limit = 10, search = "" } = params;
  const response = await axiosInstance.get("/users", {
    params: { page, limit, search },
  });
  return response.data;
}

export async function getOutgoingFriendReqs() {
  const response = await axiosInstance.get("/users/outgoing-friend-requests");
  return response.data;
}

export async function sendFriendRequest(userId) {
  const response = await axiosInstance.post(`/users/friend-request/${userId}`);
  return response.data;
}

export async function getFriendRequests() {
  const response = await axiosInstance.get("/users/friend-requests");
  return response.data;
}

export async function acceptFriendRequest(requestId) {
  const response = await axiosInstance.put(`/users/friend-request/${requestId}/accept`);
  return response.data;
}

export async function getStreamToken() {
  const response = await axiosInstance.get("/chat/token");
  return response.data;
}

export async function getDirectConversation(userId) {
  const response = await axiosInstance.get(`/chat/direct/${encodeURIComponent(userId)}`);
  return response.data;
}

export async function authorizeDirectCall(userId) {
  const response = await axiosInstance.post(`/chat/call/${encodeURIComponent(userId)}`);
  return response.data;
}

export async function createGroupChat({ name, memberIds }) {
  const response = await axiosInstance.post("/chat/group", { name, memberIds });
  return response.data;
}

export async function logCallStart(payload) {
  const response = await axiosInstance.post("/calls", payload);
  return response.data;
}

export async function updateCallStatus(callId, payload) {
  const response = await axiosInstance.patch(`/calls/${encodeURIComponent(callId)}`, payload);
  return response.data;
}

export async function getCallHistory() {
  const response = await axiosInstance.get("/calls");
  return response.data;
}
