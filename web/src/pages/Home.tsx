import { useForm, ValidationError } from "@formspree/react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Fuel,
  Gauge,
  MapPinned,
  Radar,
  Route,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";

import appOnmobile from "../assets/appcelular.png";
import driverApp from "../assets/appcelulardriver.png";
import promotionalImage from "../assets/promocional.png";

const metrics = [
  { value: "R$/km", label: "Decisão antes de aceitar a corrida" },
  { value: "Meta", label: "Progresso diário sempre visível" },
  { value: "Uber + 99", label: "Registro por aplicativo em um só lugar" },
];

const pains = [
  "A oferta parece boa, mas você não sabe o ganho real por quilômetro.",
  "A gasolina e os custos somem no meio da rotina.",
  "A meta do dia fica no improviso, sem clareza do que falta bater.",
];

const features = [
  {
    icon: Radar,
    title: "Análise de ofertas",
    text: "Use o radar de ofertas da Uber e 99 para comparar valor, distância e R$/km antes de rodar.",
  },
  {
    icon: Target,
    title: "Meta diária",
    text: "Acompanhe quanto falta para fechar o dia e ajuste sua jornada com clareza.",
  },
  {
    icon: Route,
    title: "Registro de corridas",
    text: "Organize ganhos da Uber, 99 e outros apps com histórico simples de consultar.",
  },
  {
    icon: Fuel,
    title: "Abastecimentos",
    text: "Registre custos de combustível e entenda o impacto no resultado do dia.",
  },
  {
    icon: BarChart3,
    title: "Histórico avançado",
    text: "Veja bruto, quilometragem, R$/km e desempenho por dia, semana, mês e aplicativo.",
  },
  {
    icon: MapPinned,
    title: "Tracking em tempo real",
    text: "Acompanhe rotas, quilometragem e produtividade com leitura em tempo real dentro da operação.",
  },
];

const steps = [
  {
    icon: Smartphone,
    title: "Cadastre a corrida",
    text: "Informe valor, app e quilometragem em poucos toques.",
  },
  {
    icon: Gauge,
    title: "Leia o R$/km",
    text: "O KM One transforma os dados em um indicador fácil de entender.",
  },
  {
    icon: WalletCards,
    title: "Feche a conta",
    text: "Acompanhe meta, abastecimentos e saldo da sua operação diária.",
  },
];

const roadmap = [
  "Comunidade e parcerias para reduzir custos do motorista",
  "Indicadores avançados para comparar turnos, regiões e aplicativos",
];

export function Home() {
  const [state, handleSubmit] = useForm("xyzebnjv");

  return (
    <div className="overflow-hidden">
      <section className="relative mx-auto grid min-h-[calc(100vh-104px)] w-full max-w-7xl items-center gap-12 px-4 pb-20 pt-8 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-28">
        <div className="absolute inset-x-[-35%] top-[-26rem] -z-10 h-[42rem] rounded-full bg-[radial-gradient(circle,rgba(32,242,122,0.18),rgba(0,196,106,0.08)_34%,transparent_64%)] blur-3xl" />
        <div className="absolute right-[-14rem] top-24 -z-10 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(74,144,226,0.14),transparent_68%)] blur-3xl" />

        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-[var(--green-main)] shadow-[0_0_36px_rgba(32,242,122,0.10)]">
            <Sparkles className="h-4 w-4" />
            Feito para motorista de aplicativo
          </div>

          <h1 className="text-balance text-4xl font-black leading-[1.02] text-white sm:text-5xl lg:text-7xl">
            O copiloto financeiro do motorista de aplicativo.
          </h1>

          <p className="mt-6 text-pretty text-lg leading-8 text-[var(--text-muted)] sm:text-xl">
            O KM One ajuda você a analisar ofertas da Uber e 99, calcular ganho
            por quilômetro, acompanhar a meta diária, usar tracking em tempo
            real e registrar corridas, abastecimentos e custos da sua operação.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <a
              href="#lista-vip"
              className="group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--green-main)] px-7 py-4 text-base font-extrabold text-[#02100A] shadow-[0_18px_50px_rgba(32,242,122,0.28)] transition hover:-translate-y-0.5 hover:bg-white"
            >
              Entrar na lista VIP
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left backdrop-blur"
              >
                <strong className="block text-2xl font-black text-[var(--green-main)]">
                  {metric.value}
                </strong>
                <span className="mt-1 block text-sm leading-5 text-[var(--text-muted)]">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-[36rem] justify-center lg:justify-end">
          <div className="absolute bottom-14 left-0 z-10 hidden rounded-2xl border border-[var(--border-soft)] bg-[#07151D]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur sm:block">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--green-main)]/15 text-[var(--green-main)]">
                <Gauge className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                  R$/km ideal
                </p>
                <p className="text-2xl font-black text-white">43.09</p>
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-10 z-10 rounded-2xl border border-white/10 bg-[#07151D]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[var(--green-main)] shadow-[0_0_18px_rgba(32,242,122,0.9)]" />
              <span className="text-sm font-bold text-white">
                Meta em tempo real
              </span>
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-[var(--border-soft)] bg-gradient-to-b from-white/10 to-white/[0.02] p-3 shadow-[0_36px_110px_rgba(0,0,0,0.65)]">
            <img
              src={appOnmobile}
              alt="Tela do app KM One com resumo financeiro e registro de corrida"
              className="h-auto w-full max-w-[22rem] rounded-[1.5rem]"
            />
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[var(--bg-section)]/80">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-3 lg:px-8">
          {pains.map((pain) => (
            <div
              key={pain}
              className="flex gap-4 rounded-2xl border border-white/10 bg-[#081923] p-5"
            >
              <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-[var(--green-main)]" />
              <p className="text-base leading-7 text-white">{pain}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--green-main)]">
            Controle financeiro na rotina real
          </p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
            Decida melhor cada corrida e saiba quanto realmente sobrou.
          </h2>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-white/10 bg-[var(--bg-card)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.22)] transition hover:-translate-y-1 hover:border-[var(--border-soft)]"
              >
                <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--green-main)]/12 text-[var(--green-main)]">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-xl font-black text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-[var(--text-muted)]">
                  {feature.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-28">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--green-main)]">
            Visão completa da operação
          </p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
            Radar, tracking e resultado financeiro no mesmo painel.
          </h2>
          <p className="mt-5 text-lg leading-8 text-[var(--text-muted)]">
            O KM One foi pensado para o motorista enxergar a operação como um
            negócio: oportunidades próximas, R$/km médio, lucro líquido,
            progresso da meta e deslocamentos em tempo real.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <strong className="block text-lg font-black text-white">
                Menos achismo
              </strong>
              <span className="mt-1 block leading-6 text-[var(--text-muted)]">
                Indicadores claros para decidir quando aceitar, pausar ou
                seguir rodando.
              </span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <strong className="block text-lg font-black text-white">
                Mais controle
              </strong>
              <span className="mt-1 block leading-6 text-[var(--text-muted)]">
                Acompanhe o dinheiro, os quilômetros e o avanço do dia em uma
                leitura única.
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-8 -z-10 rounded-full bg-[var(--green-main)]/16 blur-3xl" />
          <div className="overflow-hidden rounded-[2rem] border border-[var(--border-soft)] bg-white/[0.04] p-2 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
            <img
              src={promotionalImage}
              alt="Imagem promocional do KM One com radar ativo, tracking ao vivo, meta diária e indicadores financeiros"
              className="aspect-[16/9] h-auto w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-28">
        <div className="relative order-2 lg:order-1">
          <div className="absolute inset-8 -z-10 rounded-full bg-[var(--green-main)]/16 blur-3xl" />
          <img
            src={driverApp}
            alt="Motorista de aplicativo usando o KM One no celular"
            className="mx-auto w-full max-w-[27rem] rounded-[2rem] border border-[var(--border-soft)] shadow-[0_32px_90px_rgba(0,0,0,0.55)]"
          />
        </div>

        <div className="order-1 lg:order-2">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--green-main)]">
            Como funciona
          </p>
          <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
            Uma leitura simples para uma operação que exige conta certa.
          </h2>
          <div className="mt-8 grid gap-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/8 text-[var(--green-main)]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1 leading-7 text-[var(--text-muted)]">
                      {step.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-white/8 bg-[linear-gradient(135deg,#06151C,#031014_62%,#063B2B)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-28">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--green-main)]">
              Próximas versões
            </p>
            <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
              O KM One continua evoluindo para aumentar seu controle na rua.
            </h2>
          </div>
          <div className="grid gap-3">
            {roadmap.map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#020B0F]/55 p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--green-main)] text-sm font-black text-[#02100A]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="font-semibold text-white">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="lista-vip"
        className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="rounded-[2rem] border border-[var(--border-soft)] bg-[radial-gradient(circle_at_top,rgba(32,242,122,0.14),transparent_36%),#081923] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.48)] sm:p-10 lg:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--green-main)]/14 text-[var(--green-main)]">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="text-3xl font-black text-white sm:text-5xl">
              Teste o KM One antes do lançamento público.
            </h2>
            <p className="mt-4 text-lg leading-8 text-[var(--text-muted)]">
              Entre na lista VIP para receber acesso antecipado, novidades do
              app e convites para testar recursos criados com motoristas reais.
            </p>
          </div>

          {state.succeeded ? (
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-[var(--border-soft)] bg-[var(--green-main)]/10 p-5 text-center text-lg font-bold text-[var(--green-main)]">
              Obrigado. Você foi cadastrado na lista VIP com sucesso.
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              method="POST"
              className="mx-auto mt-8 grid max-w-2xl gap-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-sm font-bold text-white"
                  >
                    Nome
                  </label>
                  <input
                    required
                    placeholder="Seu nome"
                    className="min-h-14 rounded-2xl border border-white/10 bg-[#020B0F] px-4 text-white outline-none transition placeholder:text-[#6F7B86] focus:border-[var(--green-main)]"
                    id="name"
                    name="name"
                    type="text"
                  />
                  <ValidationError
                    prefix="Nome"
                    field="name"
                    errors={state.errors}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="whatsapp"
                    className="text-sm font-bold text-white"
                  >
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
                    title="Digite no mínimo 10 caracteres usando números, espaços ou traços"
                    className="min-h-14 rounded-2xl border border-white/10 bg-[#020B0F] px-4 text-white outline-none transition placeholder:text-[#6F7B86] focus:border-[var(--green-main)]"
                  />
                  <ValidationError
                    prefix="WhatsApp"
                    field="whatsapp"
                    errors={state.errors}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-bold text-white">
                  E-mail
                </label>
                <input
                  name="email"
                  id="email"
                  type="email"
                  required
                  placeholder="voce@email.com"
                  className="min-h-14 rounded-2xl border border-white/10 bg-[#020B0F] px-4 text-white outline-none transition placeholder:text-[#6F7B86] focus:border-[var(--green-main)]"
                />
                <ValidationError
                  prefix="E-mail"
                  field="email"
                  errors={state.errors}
                />
              </div>

              <button
                type="submit"
                disabled={state.submitting}
                className="mt-2 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--green-main)] px-7 py-4 text-base font-black text-[#02100A] shadow-[0_18px_50px_rgba(32,242,122,0.25)] transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.submitting ? "Enviando..." : "Quero entrar na lista VIP"}
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-3">
            <Clock3 className="h-5 w-5 text-[var(--yellow-soft)]" />
            <p className="font-semibold text-white">
              Acesso antecipado para os primeiros motoristas cadastrados.
            </p>
          </div>
          <a
            href="#lista-vip"
            className="inline-flex items-center gap-2 font-black text-[var(--green-main)]"
          >
            Garantir meu convite
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
}
