import { BrowserRouter } from "react-router";
import { HomeRoutes } from "./home-routes";

export function Routes() {
  return (
    <BrowserRouter>
      <HomeRoutes></HomeRoutes>
    </BrowserRouter>
  );
}
