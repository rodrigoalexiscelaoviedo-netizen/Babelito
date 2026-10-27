import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Nav from "./Nav";

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen isolate">
      {/* Halos de marca detrás del contenido (decorativo) */}
      <div className="ambient" aria-hidden="true" />
      <Nav />
      <main className="md:pl-60">
        {/* key por ruta: cada pantalla entra con un fade suave */}
        <div key={pathname} className="mx-auto max-w-5xl px-4 py-6 pb-24 md:py-10 md:pb-10 animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
