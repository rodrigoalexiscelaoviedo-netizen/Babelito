import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Loader from "./components/Loader";

const Login = lazy(() => import("./pages/Login"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Diagnostic = lazy(() => import("./pages/Diagnostic"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Conversation = lazy(() => import("./pages/Conversation"));
const Chunks = lazy(() => import("./pages/Chunks"));
const Correction = lazy(() => import("./pages/Correction"));
const Roleplay = lazy(() => import("./pages/Roleplay"));
const Reading = lazy(() => import("./pages/Reading"));
const Stories = lazy(() => import("./pages/Stories"));
const Progress = lazy(() => import("./pages/Progress"));
const Profile = lazy(() => import("./pages/Profile"));

function Shell({ children }: { children: JSX.Element }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/onboarding"
          element={
            <ProtectedRoute allowIncomplete>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/diagnostic"
          element={
            <ProtectedRoute allowIncomplete>
              <Diagnostic />
            </ProtectedRoute>
          }
        />

        <Route path="/" element={<Shell><Dashboard /></Shell>} />
        <Route path="/conversation" element={<Shell><Conversation /></Shell>} />
        <Route path="/chunks" element={<Shell><Chunks /></Shell>} />
        <Route path="/correct" element={<Shell><Correction /></Shell>} />
        <Route path="/roleplay" element={<Shell><Roleplay /></Shell>} />
        <Route path="/reading" element={<Shell><Reading /></Shell>} />
        <Route path="/stories" element={<Shell><Stories /></Shell>} />
        <Route path="/progress" element={<Shell><Progress /></Shell>} />
        <Route path="/profile" element={<Shell><Profile /></Shell>} />
      </Routes>
    </Suspense>
  );
}
