import { Navigate } from "react-router-dom";
import { getToken } from "../services/auth";

type Props = {
  children: any;  //mexer aqui dps
};

export default function ProtectedRoute({ children }: Props) {
  const token = getToken();
  return token ? children : <Navigate to="/login" replace />;
}