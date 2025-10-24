# KM One Monorepo

- web/ (landing)
- backend/ (API)
- mobile/ (app)

Pendente pro MVP (pick & play)

Fluxo de edição/exclusão

✅ Editar ride (ok)

☐ Excluir via toast/undo também na Home (mesma UX do Histórico)

☐ Editar/excluir abastecimento

Metas e alertas

☐ Meta diária com streak simples (dias batidos seguidos)

☐ Alerta de “faltam R$ X pra meta” com CTA pra registrar corrida/abastecimento

☐ Meta R$/km por app (Uber/99) opcional

GPS & tracking

☐ Pausar/retomar corrida (além de iniciar/encerrar)

☐ Proteção contra pocket touches (confirmação ao encerrar)

☐ Aviso de GPS desligado/sem permissão + atalho

Histórico

☐ Filtro por app e por faixa de valor

☐ Totais por dia/semana/mês (apenas UI; nada de export por enquanto)

☐ Busca por observação (se formos adicionar obs nas corridas)

Abastecimento

☐ Calcular custo/km do dia (combustível/quilômetro)

☐ Tipo de combustível padrão (memória)

☐ Botão “repetir último posto” (auto-preenche)

UX / UI polimento

☐ Estados vazios mais “vivos” (ilustra + CTA)

☐ Haptics em mais ações (salvar/excluir/erro)

☐ Pequenas animações (fade/scale) nas listas

Resiliência & dados

☐ Validações de input (número, mínimo/máximo, vírgula/ponto)

☐ Sanitização de chaves no AsyncStorage (evitar sujar storage)

☐ Migração leve caso mudemos o formato (v1 → v2)

Configurações

☐ Reset rápido do dia (apagar tudo do dia atual com confirmação)

☐ Importar dados locais de backup (.json simples)

☐ Mostrar versão do app + build info

Erros & logs

☐ Tratamento visual de erros (banner discreto)

☐ Log de diagnóstico opcional (toggle em Config)

Acessibilidade & idioma

☐ Dinâmico para font size do sistema

☐ VoiceOver/TalkBack labels básicos

☐ Ajuste de contraste nos chips/botões

Qualidade

☐ Testes unitários dos use cases (rides/settings/fuel)

☐ Teste de cálculo de R$/km e metas

☐ Smoke test: iniciar → encerrar → editar → excluir

Build & entrega

☐ EAS build config mínima (dev/prod)

☐ Ícones/splash final

☐ Versionamento semântico e CHANGELOG

Segurança/privacidade

☐ Aviso simples de privacidade (dados locais no dispositivo)

☐ Botão “apagar tudo” (wipe)
