import { useParams, Navigate } from "react-router-dom";
import SelectProjectPage from "../components/SelectProjectPage";
import selectProjectConfigs from "./selectProjectConfigs";

export default function SelectProjectForType() {
  const { type } = useParams();
  const config = selectProjectConfigs[type];

  if (!config) return <Navigate to="/projects" replace />;

  return <SelectProjectPage {...config} />;
}
