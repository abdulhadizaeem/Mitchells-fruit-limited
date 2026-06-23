import { Outlet } from "react-router-dom";
import Sidebar from "./components/sidebar";
import { C } from "./theme/colors";

function Layout() {
  return <div style={{ display: "flex", minHeight: "100vh", background: C.pageBg, fontFamily: C.font }}>
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>;
}
export {
  Layout as default
};
