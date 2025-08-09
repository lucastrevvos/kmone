export function Contato() {
  return (
    <div className="p-4 space-y-4 text-left text-sm max-h-[70vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Contato</h2>

      <p>
        Se você precisa falar conosco, tirar dúvidas, enviar sugestões ou
        reportar problemas, entre em contato através dos seguintes canais:
      </p>

      <h3 className="text-lg font-semibold mt-4">E-mail</h3>
      <p>
        <span className="underline">contato@trevvos.com.br</span>
      </p>

      <h3 className="text-lg font-semibold mt-4">Telefone / WhatsApp</h3>
      <p>
        <span className="underline">+55 (11) 94504-3408</span>
      </p>

      <p className="text-xs text-gray-500 mt-6">
        Horário de atendimento: segunda a sexta, das 9h às 18h (horário de
        Brasília).
      </p>

      <p className="text-xs text-gray-500">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
