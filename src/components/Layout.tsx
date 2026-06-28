import type { ReactNode } from "react";
import Nav from "./Nav";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="md:pl-60">
        <div className="mx-auto max-w-5xl px-4 py-6 pb-24 md:py-10 md:pb-10">{children}</div>
      </main>
    </div>
  );
}
