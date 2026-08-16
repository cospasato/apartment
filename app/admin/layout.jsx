import AdminAuth from "./AdminAuth";

export const metadata = { title: "Admin — Marketplace" };

export default function AdminLayout({ children }) {
  return <AdminAuth>{children}</AdminAuth>;
}
