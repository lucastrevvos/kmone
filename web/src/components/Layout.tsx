import { Outlet } from "react-router";

import logo from "../assets/kmone.png";
import { useState, type ReactNode } from "react";
import { PoliticaPrivacidade } from "./modals/PoliticaPrivacidade";
import { Modal } from "./modals/Modal";
import { TermosUso } from "./modals/TermoDeUso";
import { InformacoesLegais } from "./modals/InformacoesLegais";
import { Contato } from "./modals/Contato";

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
    <div className="w-screen min-h-screen bg-[var(--color-bg)] flex flex-col items-center text-[var(--color-default)]">
      <header className="w-full max-w-screen-lg px-4 py-6">
        <img src={logo} alt="logo" className="w-40 mx-auto md:mx-0"></img>
      </header>
      <main className="w-full max-w-screen-lg px-4 flex-1">
        <Outlet />
      </main>
      <footer className="w-full bg-gray-900 py-8 text-gray-300">
        <div className="max-w-screen-lg mx-auto px-4 text-center space-y-4">
          <p className="text-sm">
            © {new Date().getFullYear()} KM One • Todos os direitos reservados
            <br />
            Um app do ecossistema TREVVOS
          </p>
          <nav className="flex flex-col md:flex-row gap-4 justify-center text-sm">
            <button
              type="button"
              onClick={() => openModal("politica")}
              className="hover:underline cursor-pointer"
            >
              Politica de Privacidade
            </button>
            <button
              type="button"
              onClick={() => openModal("termos")}
              className="hover:underline cursor-pointer"
            >
              Termos de Uso
            </button>
            <button
              type="button"
              onClick={() => openModal("informacoeslegais")}
              className="hover:underline cursor-pointer"
            >
              Informações Legais
            </button>

            <button
              type="button"
              onClick={() => openModal("contato")}
              className="hover:underline cursor-pointer"
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
