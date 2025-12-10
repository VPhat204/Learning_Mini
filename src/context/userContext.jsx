import { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
  };

  const updateName = (newName) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, name: newName };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };


  return (
    <UserContext.Provider value={{ user, login, logout, updateName, updateUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}
