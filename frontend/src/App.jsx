import React, { lazy, Suspense } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import Layout from "./components/Layout";
import { Loading } from "./components/UI";
const Home = lazy(() => import("./pages/Home")),
  Games = lazy(() => import("./pages/Games")),
  GameLayout = lazy(() => import("./pages/GameLayout")),
  GameDetail = lazy(() => import("./pages/GameDetail")),
  Catalog = lazy(() => import("./pages/Catalog")),
  CharacterDetail = lazy(() => import("./pages/CharacterDetail")),
  EquipmentDetail = lazy(() => import("./pages/EquipmentDetail")),
  Builds = lazy(() => import("./pages/Builds")),
  Guides = lazy(() => import("./pages/Guides")),
  Farming = lazy(() => import("./pages/Farming")),
  Lookup = lazy(() => import("./pages/Lookup")),
  Dashboard = lazy(() => import("./pages/Dashboard")),
  Maps = lazy(() => import("./pages/Maps")),
  Admin = lazy(() => import("./pages/Admin")),
  Teams = lazy(() => import("./pages/Teams")),
  Roster = lazy(() => import("./pages/Roster")),
  TierLists = lazy(() => import("./pages/TierLists"));
export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/games/:slug" element={<GameLayout />}>
              <Route index element={<GameDetail />} />
              {[
                "characters",
                "equipment",
                "artifacts",
                "materials",
                "domains",
              ].map((resource) => (
                <Route
                  key={resource}
                  path={resource}
                  element={<Catalog resource={resource} />}
                />
              ))}
              <Route path="map" element={<Maps />} />
              <Route path="guides" element={<Guides />} />
              <Route path="teams" element={<Teams />} />
              <Route path="tier-lists" element={<TierLists />} />
            </Route>
            <Route path="/characters/:id" element={<CharacterDetail />} />
            <Route
              path="/catalog/:resource/:id"
              element={<EquipmentDetail />}
            />
            <Route path="/builds" element={<Builds />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/farming" element={<Farming />} />
            <Route path="/lookup" element={<Lookup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/maps" element={<Maps />} />
            <Route path="/admin" element={<Admin />} />
            <Route
              path="*"
              element={
                <section className="section">
                  <h1>This path is unexplored.</h1>
                  <Link className="btn primary" to="/games">
                    Return to games
                  </Link>
                </section>
              }
            />
          </Routes>
        </Suspense>
      </Layout>
    </AuthProvider>
  );
}
