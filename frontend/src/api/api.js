import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const location = Array.isArray(item.loc) ? item.loc.join(".") : "field";
        return `${location}: ${item.msg}`;
      })
      .join(" ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (error?.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export default api;
