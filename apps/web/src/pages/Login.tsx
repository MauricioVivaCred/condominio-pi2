import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/auth";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      await login(email, password);
      nav("/dashboard");
    } catch (e: any) {
      setErr(e?.message || "Erro no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 380,
          padding: 32,
          borderRadius: 14,
          backgroundColor: "#ffffff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            textAlign: "center",
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Sistema do Condomínio
        </h2>

        <label style={{ fontSize: 14 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="admin@condominio.com"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            outline: "none",
          }}
        />

        <label style={{ fontSize: 14 }}>Senha</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          placeholder="••••••••"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ddd",
            outline: "none",
          }}
        />

        {err && (
          <p
            style={{
              color: "crimson",
              fontSize: 13,
              marginTop: 4,
            }}
          >
            {err}
          </p>
        )}

        <button
          disabled={loading}
          style={{
            marginTop: 8,
            padding: 12,
            borderRadius: 8,
            border: "none",
            backgroundColor: "#1f2937",
            color: "#fff",
            fontWeight: 500,
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "0.2s",
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            opacity: 0.6,
            textAlign: "center",
          }}
        >
          <div><b>Admin:</b> admin@condominio.com / 123456</div>
          <div><b>Morador:</b> morador@condominio.com / 123456</div>
        </div>
      </form>
    </div>
  );
}