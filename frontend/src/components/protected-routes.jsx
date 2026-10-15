import useStore from "../store";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "./loading-state";

function ProtectedRoute({ children }) {
  const { isAuthenticated, rehydrated, user } = useStore((state) => state.auth);
  const location = useLocation();

  if (!rehydrated) {
    return <LoadingState message="Loading..." />;
  }

  if (!isAuthenticated || !user) {
    // Remember where the user was going so login can send them back there
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
