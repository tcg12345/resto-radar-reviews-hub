import { Navigate } from 'react-router-dom';

export default function Index() {
  // Go straight to the home page, bypassing sign-in
  return <Navigate to="/home" replace />;
}
