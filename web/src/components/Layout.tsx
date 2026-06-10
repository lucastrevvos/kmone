import { useState, type ReactNode } from "react";
import { Outlet } from "react-router";

import logo from "../assets/kmone.png";
import { Contato } from "./modals/Contato";
import { InformacoesLegais } from "./modals/InformacoesLegais";
import { Modal } from "./modals/Modal";
import { PoliticaPrivacidade } from "./modals/PoliticaPrivacidade";
import { TermosUso } from "./modals/TermoDeUso";

export function Layout() {
  const [modalContent, setModalContent] = useState<ReactNode>(null);

  function openModal(type: ReactNode) {
    switch (type) {
      case "politica":
        setModalContent(<PoliticaPrivacidade />);
        break;
      case "termos":
        setModalContent(<TermosUso />);
        break;
      case "informacoeslegais":
        setModalContent(<InformacoesLegais />);
        break;
      case "contato":
        setModalContent(<Contato />);
        break;
      default:
        setModalContent(null);
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[var(--bg-main)] text-[var(--text-main)]">
      <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-[#020B0F]/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <img src={logo} alt="KM One logo" className="h-14 w-auto" />

            <div className="flex flex-col leading-tight">
              <span className="text-lg font-black tracking-wide text-white">
                KM ONE
              </span>
              <span className="text-xs font-semibold text-[var(--text-muted)] sm:text-sm">
                Trevvos · Com você a cada KM
              </span>
            </div>
          </a>

          <a
            href="#lista-vip"
            className="hidden rounded-full border border-[var(--border-soft)] bg-[var(--green-main)]/10 px-5 py-3 text-sm font-black text-[var(--green-main)] transition hover:bg-[var(--green-main)] hover:text-[#02100A] sm:inline-flex"
          >
            Lista VIP
          </a>
        </div>
      </header>

      <main className="w-full">
        <Outlet />
      </main>

      <footer className="w-full border-t border-white/10 bg-[#02080B] py-10 text-[var(--text-muted)]">
        <div className="mx-auto max-w-7xl space-y-5 px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm leading-6">
            © {new Date().getFullYear()} KM One • Todos os direitos reservados
            <br />
            Um app do ecossistema TREVVOS
          </p>
          <nav className="flex flex-col justify-center gap-4 text-sm md:flex-row">
            <button
              type="button"
              onClick={() => openModal("politica")}
              className="cursor-pointer transition hover:text-[var(--green-main)]"
            >
              Política de Privacidade
            </button>
            <button
              type="button"
              onClick={() => openModal("termos")}
              className="cursor-pointer transition hover:text-[var(--green-main)]"
            >
              Termos de Uso
            </button>
            <button
              type="button"
              onClick={() => openModal("informacoeslegais")}
              className="cursor-pointer transition hover:text-[var(--green-main)]"
            >
              Informações Legais
            </button>

            <button
              type="button"
              onClick={() => openModal("contato")}
              className="cursor-pointer transition hover:text-[var(--green-main)]"
            >
              Contato
            </button>
          </nav>
        </div>
      </footer>

      {modalContent && (
        <div>
          <Modal onClose={() => setModalContent(null)}>{modalContent}</Modal>
        </div>
      )}
    </div>
  );
}
