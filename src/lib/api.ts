import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import Cookies from "js-cookie";

const api: AxiosInstance = axios.create({
  baseURL: "",
  withCredentials: true,
});


function clearClientAuthAndRedirect() {
  if (typeof performance !== "undefined" && performance.now() < 5000) {
    return;
  }

  Cookies.remove("access_token", { path: "/" });
  Cookies.remove("refresh_token", { path: "/" });
  localStorage.removeItem("user-profile");

  if (typeof window !== "undefined" && window.location.pathname !== "/signin") {
    window.location.href = "/signin";
  }
}

async function hasActiveSession() {
  try {
    const token = Cookies.get("access_token");
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    await axios.get("/api/users", {
      withCredentials: true,
      headers,
    });
    return true;
  } catch {
    return false;
  }
}

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = Cookies.get("access_token");
    const locale = Cookies.get("NEXT_LOCALE") || "en";
    const offsetMinutes = new Date().getTimezoneOffset();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers["Accept-Language"] = locale;
    config.headers["X-Timezone-Offset"] = offsetMinutes;

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || "";

    const isAuthCheck = requestUrl.includes("/api/users");
    const isRefreshRequest = requestUrl.includes("/api/auth/refresh-token");

    if (error.response?.status === 401 && (isAuthCheck || isRefreshRequest)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const res = await axios.get("/api/auth/refresh-token", {
          withCredentials: true,
        });

        const rd = res.data;
        const newAccessToken =
          rd?.key?.access_token ||
          rd?.access_token ||
          rd?.result?.access_token ||
          rd?.result?.key?.access_token;

        if (!newAccessToken) {
          throw new Error("No access_token in refresh response");
        }

        const rememberMe = localStorage.getItem("remember_me") === "true";
        Cookies.set("access_token", newAccessToken, {
          path: "/",
          expires: rememberMe ? 7 : 1,
          sameSite: "lax",
        });
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        if (!isAuthCheck) {
          const stillAuthenticated = await hasActiveSession();
          if (!stillAuthenticated) {
            clearClientAuthAndRedirect();
          }
        }

        return Promise.reject(
          refreshError || { message: "Authentication failed" },
        );
      }
    }

    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.message || "";
      const isAuthError =
        errorMessage.toLowerCase().includes("token") ||
        errorMessage.toLowerCase().includes("unauthorized") ||
        errorMessage.toLowerCase().includes("authentication");

      if (isAuthError && !isAuthCheck) {
        console.error("Authentication error (403):", errorMessage);
        const stillAuthenticated = await hasActiveSession();
        if (!stillAuthenticated) {
          clearClientAuthAndRedirect();
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
