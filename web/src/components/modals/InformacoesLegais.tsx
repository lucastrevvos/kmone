export function InformacoesLegais() {
  return (
    <div className="p-4 space-y-4 text-left text-sm max-h-[70vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Informações Legais</h2>

      <p>
        O KM One é um aplicativo desenvolvido e mantido por Trevvos, fornecendo
        ferramentas para controle financeiro de motoristas de aplicativos.
      </p>

      <h3 className="text-lg font-semibold mt-4">
        1. Direitos Autorais e Marcas
      </h3>
      <p>
        Todo o conteúdo, design, logotipos, marcas e materiais apresentados no
        app são de propriedade do KM One ou de seus licenciadores e estão
        protegidos por leis de propriedade intelectual.
      </p>

      <h3 className="text-lg font-semibold mt-4">2. Isenção de Garantias</h3>
      <p>
        Os serviços são fornecidos “no estado em que se encontram”, sem
        garantias de qualquer tipo, expressas ou implícitas.
      </p>

      <h3 className="text-lg font-semibold mt-4">3. Jurisdição e Foro</h3>
      <p>
        Este contrato será regido pelas leis brasileiras, e eventuais litígios
        serão resolvidos no foro da comarca de Florianópolis, Santa Catarina.
      </p>

      <h3 className="text-lg font-semibold mt-4">4. Contato</h3>
      <p>
        Para questões legais, envie um e-mail para:{" "}
        <span className="underline">contato@trevvos.com.br</span>.
      </p>

      <p className="text-xs text-gray-500 mt-6">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
