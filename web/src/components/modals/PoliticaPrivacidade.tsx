export function PoliticaPrivacidade() {
  return (
    <div className="p-4 space-y-4 text-left text-sm max-h-[70vh] overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">Política de Privacidade</h2>

      <p>
        Esta Política de Privacidade descreve como o KM One coleta, usa,
        armazena e protege as informações pessoais fornecidas pelos usuários ao
        utilizar nossos serviços e aplicativos.
      </p>

      <h3 className="text-lg font-semibold mt-4">1. Coleta de Informações</h3>
      <p>
        Coletamos dados pessoais que você nos fornece voluntariamente, como
        nome, e-mail e número de WhatsApp, ao se cadastrar em nossa lista VIP ou
        usar funcionalidades do app. Também podemos coletar informações
        automaticamente, como dados de uso e preferências, para melhorar a
        experiência do usuário.
      </p>

      <h3 className="text-lg font-semibold mt-4">2. Uso das Informações</h3>
      <p>
        Utilizamos suas informações para:
        <ul className="list-disc list-inside ml-4">
          <li>
            Enviar comunicações relevantes, novidades e atualizações sobre o KM
            One;
          </li>
          <li>Oferecer suporte ao usuário e responder a dúvidas;</li>
          <li>Melhorar nossos produtos, serviços e funcionalidades;</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
      </p>

      <h3 className="text-lg font-semibold mt-4">
        3. Compartilhamento de Informações
      </h3>
      <p>
        Não vendemos nem compartilhamos seus dados pessoais com terceiros para
        fins comerciais. Apenas poderemos compartilhar suas informações:
        <ul className="list-disc list-inside ml-4">
          <li>
            Com parceiros e fornecedores de tecnologia, exclusivamente para
            operação e melhoria dos serviços;
          </li>
          <li>Quando exigido por lei, autoridade judicial ou regulatória;</li>
          <li>Com seu consentimento explícito.</li>
        </ul>
      </p>

      <h3 className="text-lg font-semibold mt-4">
        4. Armazenamento e Segurança
      </h3>
      <p>
        Adotamos medidas técnicas e organizacionais adequadas para proteger seus
        dados contra acesso não autorizado, perda, alteração ou divulgação. No
        entanto, nenhum sistema é totalmente seguro, e não podemos garantir
        segurança absoluta.
      </p>

      <h3 className="text-lg font-semibold mt-4">5. Seus Direitos</h3>
      <p>
        Você tem o direito de acessar, corrigir, atualizar ou excluir suas
        informações pessoais. Para isso, entre em contato conosco através do
        e-mail informado na seção de contato.
      </p>

      <h3 className="text-lg font-semibold mt-4">
        6. Alterações nesta Política
      </h3>
      <p>
        Podemos atualizar esta Política de Privacidade periodicamente.
        Recomendamos que você revise esta página regularmente para se manter
        informado sobre quaisquer mudanças.
      </p>

      <h3 className="text-lg font-semibold mt-4">7. Contato</h3>
      <p>
        Em caso de dúvidas ou solicitações relacionadas a esta Política de
        Privacidade, entre em contato pelo e-mail: contato@trevvos.com.br{" "}
        <span className="underline">contato@trevvos.com.br</span>.
      </p>

      <p className="text-xs text-gray-500 mt-6">
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
