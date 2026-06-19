import {
  Boxes,
  LayoutDashboard,
  ReceiptText,
  ShoppingCart,
  UsersRound,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Boxes },
  { to: "/customers", label: "Customers", icon: UsersRound },
  { to: "/orders", label: "Orders", icon: ShoppingCart },
];

export default function Layout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <ReceiptText size={26} aria-hidden="true" />
          <div>
            <strong>Inventory Ops</strong>
            <span>Orders and stock</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="main-area">
        <Outlet />
      </main>
    </div>
  );
}
