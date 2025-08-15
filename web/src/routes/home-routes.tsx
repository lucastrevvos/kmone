import { Route, Routes } from "react-router";
import { Home } from "../pages/Home";
import { Layout } from "../components/Layout";

export function HomeRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>
  );
}
