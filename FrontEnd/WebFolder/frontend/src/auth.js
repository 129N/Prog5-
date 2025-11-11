export async function getValidToken() {
  let token = localStorage.getItem("token");
  const refreshToken = localStorage.getItem("refreshToken");
  if (!token) return null;

  // decode JWT expiry time
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isExpired = Date.now() > payload.exp * 1000;

    if (isExpired && refreshToken) {
      console.log("🔄 Token expired — refreshing...");
      const res = await fetch("http://localhost:3001/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("token", data.token);
        token = data.token;
      } else {
        localStorage.clear();
        window.location.href = "/";
      }
    }

    return token;
  } catch (err) {
    console.error("Token check failed:", err);
    return null;
  }
}
