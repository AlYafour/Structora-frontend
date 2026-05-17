import { useParams, Navigate } from "react-router-dom";
import { AccessDenied } from "../../../components/auth/ProtectedRoute";
import { useAuth } from "../../../contexts/AuthContext";
import SelectProjectPage from "../components/SelectProjectPage";
import selectProjectConfigs from "./selectProjectConfigs";

export default function SelectProjectForType() {
  const { type } = useParams();
  const { hasPermission, isAdmin } = useAuth();
  const config = selectProjectConfigs[type];

  if (!config) return <Navigate to="/projects" replace />;
  if (config.permission && !isAdmin && !hasPermission(config.permission)) {
    return <AccessDenied />;
  }

  return <SelectProjectPage {...config} />;
}
