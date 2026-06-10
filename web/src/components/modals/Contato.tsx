export function Contato() {
  return (
    <div className="space-y-4 text-left text-sm">
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

      <p className="mt-6 text-xs text-[var(--text-muted)]">
        Horário de atendimento: segunda a sexta, das 9h às 18h (horário de
        Brasília).
      </p>

      <p className="text-xs text-[var(--text-muted)]">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
