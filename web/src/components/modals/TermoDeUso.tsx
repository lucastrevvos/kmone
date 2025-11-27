export function TermosUso() {
  return (
    <div className="p-4 space-y-4 text-left text-sm max-h-[70vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Termos de Uso</h2>

      <p>
        Estes Termos de Uso regulam o uso do aplicativo KM One e de seus
        serviços relacionados. Ao utilizar nossos serviços, você concorda com
        estes termos.
      </p>

      <h3 className="text-lg font-semibold mt-4">1. Aceitação dos Termos</h3>
      <p>
        Ao acessar ou utilizar nossos serviços, você confirma que leu, entendeu
        e concorda em se vincular a estes Termos de Uso.
      </p>

      <h3 className="text-lg font-semibold mt-4">2. Uso Permitido</h3>
      <p>
        Você deve utilizar o aplicativo de acordo com a legislação aplicável e
        não poderá:
        <ul className="list-disc list-inside ml-4">
          <li>Usar o serviço para atividades ilegais;</li>
          <li>Violar direitos de propriedade intelectual;</li>
          <li>Interferir no funcionamento do app ou de seus sistemas.</li>
        </ul>
      </p>

      <h3 className="text-lg font-semibold mt-4">
        3. Responsabilidades do Usuário
      </h3>
      <p>
        Você é responsável pelas informações fornecidas e pelo uso adequado do
        aplicativo, incluindo a segurança de suas credenciais de acesso.
      </p>

      <h3 className="text-lg font-semibold mt-4">
        4. Limitação de Responsabilidade
      </h3>
      <p>
        O KM One não será responsável por danos indiretos, incidentais ou
        consequenciais resultantes do uso ou da incapacidade de uso dos
        serviços.
      </p>

      <h3 className="text-lg font-semibold mt-4">5. Modificações dos Termos</h3>
      <p>
        Podemos alterar estes Termos a qualquer momento. O uso contínuo dos
        serviços após mudanças indica sua aceitação.
      </p>

      <h3 className="text-lg font-semibold mt-4">6. Contato</h3>
      <p>
        Em caso de dúvidas, entre em contato pelo e-mail:{" "}
        <span className="underline">contato@trevvos.com.br</span>.
      </p>

      <p className="text-xs text-gray-500 mt-6">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
