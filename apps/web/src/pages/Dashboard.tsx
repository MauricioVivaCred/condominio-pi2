import { useNavigate } from "react-router-dom";
import { getUser, logout } from "../services/auth";

export default function Dashboard() {
  const user = getUser();
  const nav = useNavigate();

  function sair() {
    logout();
    nav("/login");
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>
        Logado como: <b>{user?.name}</b> ({user?.role})
      </p>
      <button onClick={sair}>Sair</button>
    </div>
  );
}