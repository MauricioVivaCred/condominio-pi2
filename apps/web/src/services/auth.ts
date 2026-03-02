export type UserRole = "ADMIN" | "MORADOR";

export type User = {
  name: string;
  role: UserRole;
  email: string;
};

type LoginResponse = {
  token: string;
  user: User;
};



// const BASE_URL = import.meta.env.VITE_API_URL; // (usar depois)

async function requestLogin(email: string, password: string): Promise<LoginResponse> {
  // trocar esse bloco pelo da api 
  await new Promise((r) => setTimeout(r, 600));

  const okAdmin = email === "admin@condominio.com" && password === "123456";
  const okMorador = email === "morador@condominio.com" && password === "123456";

  if (!okAdmin && !okMorador) throw new Error("Email ou senha inválidos.");

  const user: User = okAdmin
    ? { name: "Admin", role: "ADMIN", email }
    : { name: "Morador", role: "MORADOR", email };

  return { token: "fake-token-" + Date.now(), user };


}
export async function login(email: string, password: string): Promise<User> {
  const { token, user } = await requestLogin(email.trim(), password);
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser(): User | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as User) : null;
}