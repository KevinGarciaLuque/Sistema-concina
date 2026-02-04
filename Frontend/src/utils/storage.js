export function getStoredUser() {
    try {
      const raw =
        localStorage.getItem("user") ||
        sessionStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  
  export function getStoredToken() {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      null
    );
  }
  