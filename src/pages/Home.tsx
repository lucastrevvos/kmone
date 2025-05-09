import appOnmobile from "../assets/appcelular.png";
import driverApp from "../assets/appcelulardriver.png";
import { CheckCircle } from "lucide-react";
import { useForm, ValidationError } from "@formspree/react";

export function Home() {
  const [state, handleSubmit] = useForm("xyzebnjv");

  return (
    <div className="w-full max-w-screen-lg mx-auto px-4 py-12">
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-5xl font-extrabold leading-tight mb-6 text-center md:text-left">
            Controle total da sua{" "}
            <span className="text-[var(--primary)]">jornada financeira</span>{" "}
            com o KM One para motoristas de aplicativo
          </h1>

          <ul className="space-y-6 text-lg">
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
              <span>
                Registre ganhos e corridas por app: Inclua valores do Uber, 99,
                InDrive e tenha tudo organizado num só lugar.
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
              <span>
                Calcule lucro líquido diário, semanal e mensal: Saiba exatamente
                quanto está sobrando no seu bolso.
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
              <span>
                Controle abastecimentos e despesas extras: Registre custos como
                manutenção, pedágio, lava-rápido e mais.
              </span>
            </li>
          </ul>
        </div>

        <div className="flex justify-center">
          <img src={appOnmobile} alt="App KM one no celular" className="w-64" />
        </div>
      </section>

      <section className="bg-[var(--secundary)] p-8 rounded shadow text-center space-y-6 mt-15">
        <h2 className="text-3xl font-bold">
          Quer ser um dos primeiros a testar o KM One ?
        </h2>
        <p className="text-lg">
          KM One é gratuito para os primeiros usuários! Junte-se à lista VIP e
          receba novidades exclusivas, acesso antecipado e dicas para turbinar
          seus ganhos como motorista!
        </p>
        {state.succeeded ? (
          <div className="text-center text-green-700 text-xl font-semibold mt-6">
            ✅ Obrigado! Você foi cadastrado na lista VIP com sucesso.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            method="POST"
            className="grid gap-4 max-w-md mx-auto"
          >
            <div className="flex flex-col">
              <label htmlFor="name" className="mb-1 font-bold">
                Nome
              </label>
              <input
                required
                placeholder="Seu Nome"
                className="border p-3 rounded bg-gray-100"
                id="name"
                name="name"
                type="text"
              />
              <ValidationError
                prefix="name"
                field="name"
                errors={state.errors}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 font-bold">
                E-mail
              </label>
              <input
                name="email"
                id="email"
                type="email"
                required
                placeholder="E-mail"
                className="border p-3 rounded bg-gray-100"
              />
              <ValidationError
                prefix="Email"
                field="email"
                errors={state.errors}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="whatsapp" className="mb-1 font-bold">
                WhatsApp
              </label>
              <input
                name="whatsapp"
                id="whatsapp"
                type="tel"
                placeholder="99 99999-9999"
                pattern="[\d\s-]+"
                minLength={10}
                maxLength={16}
                required
                title="Digite no mínimo 10 caracteres, usando números, espaços ou traços"
                className="border p-3 rounded bg-gray-100"
              />
              <ValidationError
                prefix="whatsapp"
                field="whatsapp"
                errors={state.errors}
              />
            </div>
            <button
              type="submit"
              disabled={state.submitting}
              className="bg-blue-600 text-white px-6 py-3 rounded cursor-pointer hover:bg-blue-700"
            >
              Quero entrar para a lista VIP!
            </button>
          </form>
        )}
      </section>
      <section className="grid md:grid-cols-2 mt-20 md:text-left text-center">
        <div>
          <img
            src={driverApp}
            alt="Motorista usando app KM One no celular"
            className="w-80  rounded-2xl border-b-blue-700-400 border-3"
          />
        </div>
        <div>
          <h3 className="text-4xl font-bold mb-10 mt-10 md:mt-0">
            O que mais vem por aí ?
          </h3>
          <ul className="list-disc list-inside space-y-6 text-xl">
            <li>
              <span className="font-semibold">
                Fórum entre motoristas por cidade e região
              </span>
              <p className="text-lg text-gray-600">
                Compartilhe experiências, rotas e alertas locais para maximizar
                seus ganhos.
              </p>
            </li>
            <li>
              <span className="font-semibold">
                Troca de indicações: mecânicos, lava-rápido, postos
              </span>
              <p className="text-lg text-gray-600">
                Encontre os melhores serviços recomendados por quem já usou.
              </p>
            </li>
            <li>
              <span className="font-semibold">
                Dicas locais para ganhar mais e evitar perrengues
              </span>
              <p className="text-lg text-gray-600">
                Acesse conteúdos exclusivos para motoristas da sua região.
              </p>
            </li>
            <li>
              <span className="font-semibold">
                Parcerias e descontos exclusivos
              </span>
              <p className="text-lg text-gray-600">
                Economize em combustível, manutenção e serviços parceiros.
              </p>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
