# CLAUDE.md - Vertix

## Visão Geral

**Vertix** é um sistema de CRM + Secretária de IA para clínicas de estética. O objetivo é resolver um problema real: clínicas perdem R$3.000-5.000/mês por demora no atendimento WhatsApp.

A Vertix é uma agência de automação inteligente fundada por José Roberto, localizada em Santo André/SP (Região do ABC), especializada em transformar o atendimento de negócios locais através de soluções de IA.

---

## Modelo de Negócio

### Produtos (Escada de Valor)

| Nível | Produto | Preço | Objetivo |
|-------|---------|-------|----------|
| 1 | Diagnóstico WhatsApp | Gratuito | Gerar lead (lead magnet) |
| 2 | Protocolo de Atendimento | R$ 49 | Monetizar + Qualificar |
| 3 | Secretária de IA | R$ 3-5K setup + R$ 1.500/mês | Receita recorrente |

### Detalhamento dos Produtos

**1. Diagnóstico WhatsApp** (diagnostico.ianonegocio.com.br)
- Ferramenta gratuita que calcula perdas financeiras por atendimento lento
- Usuário responde 4 perguntas → sistema calcula perda estimada (ex: R$ 18.000/ano)
- Captura nome, email, WhatsApp → oferece Protocolo por R$ 49

**2. Protocolo de Atendimento** (R$ 49)
- Conteúdo educacional: 7 passos para melhorar atendimento no WhatsApp
- Inclui gerador de scripts com IA e exemplos por nicho
- Qualifica leads (quem paga R$ 49 tem mais chance de pagar R$ 5K)

**3. Secretária de IA** (Produto Principal)
- Sistema de atendimento automatizado via WhatsApp
- Conversa naturalmente, qualifica leads, agenda consultas
- Funciona 24/7
- Ticket médio anual: R$ 22.000+ (setup + 12 meses)

### Funil de Vendas (Método DRC)

- **D - Distribuição:** Conteúdo sobre dores de atendimento + Tráfego pago geolocalizado
- **R - Remarketing:** Depoimentos, cases de sucesso, demonstrações da IA funcionando
- **C - Conversão:** Diagnóstico gratuito → Protocolo R$ 49 → Oferta Secretária de IA

---

## Público-Alvo

### Perfil Ideal

- Clínicas de estética pequenas/médias
- 1-3 recepcionistas
- Faturamento R$ 30k-200k/mês
- Região inicial: ABC Paulista (São Paulo)

### Dor Principal

> "Perco clientes porque demoro para responder no WhatsApp. Quando respondo, já foram para o concorrente."

### Dores Identificadas

- Tempo de resposta lento (média de 4+ horas)
- Perda de leads que vão para concorrentes
- Recepcionista sobrecarregada com múltiplas tarefas
- Sem atendimento fora do horário comercial
- Falta de follow-up com leads que não agendaram
- Dificuldade em qualificar leads antes do atendimento

### Por que Clínicas de Estética?

- Alto ticket médio (R$ 300 - R$ 2.000+ por procedimento)
- Dependência forte do WhatsApp para agendamentos
- Clientes decidem rápido e vão para quem responde primeiro
- Donos entendem o valor de tecnologia e inovação
- Mercado fragmentado com muitos pequenos players

### Proposta de Valor

Resposta instantânea 24/7 + qualificação automática + agendamento assistido = mais conversões com menos trabalho manual.

---

## Arquitetura Técnica

### Stack Principal (Painel Vertix / Secretária de IA)

| Componente | Tecnologia | Função |
|------------|------------|--------|
| Frontend | Next.js 14+ (App Router), React 19, TypeScript | Interface do painel |
| Styling | Tailwind CSS 4.x | Estilização com tema escuro |
| Backend/Banco | Supabase (PostgreSQL + Edge Functions + Auth) | Dados, autenticação, APIs |
| WhatsApp | UAZAPI | Conexão WhatsApp (QR code, manter sessão) |
| Gestão Conversas | Chatwoot | Organiza conversas, múltiplos atendentes |
| Automação IA | n8n (self-hosted) | Workflows da Secretária de IA |
| Calendar | Google Calendar API (OAuth 2.0) | Agendamentos |
| IA | GPT-4.1 mini via API | Geração de respostas |

### Stack Diagnóstico WhatsApp (produto separado)

| Componente | Tecnologia | Função |
|------------|------------|--------|
| Frontend | React + Vite | Interface do diagnóstico e área paga |
| Hospedagem | Hostinger | Hospedagem do frontend |
| Backend | Supabase Edge Functions | APIs e lógica |
| Pagamentos | Asaas | PIX, cartão, webhooks |
| Emails | Resend | Emails transacionais |
| IA Scripts | OpenAI GPT-4o-mini | Geração de scripts personalizados |
| Automação | n8n | Workflows de follow-up |
| WhatsApp | Evolution API | Envio de mensagens automatizadas |

### Diagrama de Integrações

```
[WhatsApp] ←→ [UAZAPI] ←→ [Chatwoot] ←→ [Painel Vertix]
                              ↓
                          [n8n] ←→ [GPT-4.1] 
                              ↓
                      [Supabase] ←→ [Google Calendar]
```

### Por que essa arquitetura?

**Chatwoot + UAZAPI:**
- UAZAPI faz conexão WhatsApp (QR code, manter sessão)
- Chatwoot organiza conversas, permite múltiplos atendentes, tem boa API
- Separação de responsabilidades: conexão vs gestão

**n8n para IA:**
- Facilita debug visual do fluxo
- Permite ajustar prompts sem deploy
- Suporta múltiplos modelos/providers
- Comunidade ativa com exemplos

**Por que não automatizar agendamento 100%?**
- Clínicas querem controle final
- Reduz erros de horário conflitante
- Permite validação humana do procedimento correto
- Cria ponto de contato pessoal

---

## Estrutura do Projeto

### Comandos de Desenvolvimento

```bash
npm run dev      # Servidor de desenvolvimento (http://localhost:3000)
npm run build    # Build de produção
npm run start    # Servidor de produção
npm run lint     # ESLint
```

Requer Node.js 20.x

### Roteamento SPA

O app usa padrão SPA com parâmetros de URL. O roteador principal está em `src/app/page.tsx` e renderiza componentes baseado no parâmetro `pagina`:

| Página | Componente | Função |
|--------|------------|--------|
| `dashboard` | Dashboard.tsx | Métricas e visão geral |
| `conversas` | Conversas.tsx | Interface de chat/mensagens |
| `pipeline` | Pipeline.tsx | Kanban de vendas |
| `clientes` | Clientes.tsx | Gestão de clientes |
| `retornos` | Retornos.tsx | Agendamentos de retorno |
| `configuracoes` | Configuracoes.tsx | Configurações (8 sub-páginas) |

### Gerenciamento de Estado

React Context API para estado global:
- `AuthContext` (src/lib/auth.tsx) - Sessão de usuário e clínica
- `ThemeContext` (src/lib/theme.tsx) - Modo claro/escuro
- `AlertContext` (src/components/Alert.tsx) - Notificações e modais

Sessão armazenada em localStorage: `vertix_sessao`

---

## Banco de Dados (Supabase)

### Tabelas Principais

| Tabela | Função |
|--------|--------|
| `clinicas` | Dados da clínica (chatwoot_url, chatwoot_api_key, google_tokens, etc) |
| `usuarios` | Contas de usuários |
| `leads_ia` | Leads/contatos com campos: nome, telefone, etapa, procedimento_interesse, conversation_id, avatar |
| `clientes` | Clientes convertidos |
| `procedimentos` | Catálogo de procedimentos da clínica |
| `lead_procedimentos` | Relação N:N entre leads e procedimentos de interesse |
| `agendamentos` | Agendamentos e retornos (lead_id, data_hora, status, tipo, google_event_id) |

### Etapas do Lead

Constraint `leads_ia_etapa_check`:

```
novo → atendimento → agendado → convertido | perdido
```

### Enums Importantes

**Etapas do lead:** `'novo' | 'atendimento' | 'agendado' | 'convertido' | 'perdido'`

**Status de agendamento:** `'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'nao_compareceu'`

**Status de cliente:** `'ativo' | 'vip' | 'inativo'`

---

## Módulos do Painel Vertix

### 1. Dashboard
Métricas: total clientes, valor em negociação, agendamentos da semana, faturamento realizado.
Listas: leads recentes, próximos agendamentos.

### 2. Conversas
Integração com Chatwoot. Exibe conversas do WhatsApp, permite responder, adicionar anotações, mudar etapa do lead.
Painéis laterais: Interesse (procedimentos) e Agendamentos.

### 3. Pipeline
Kanban com leads por etapa. Drag & drop para mover entre etapas.

### 4. Clientes
Lista de clientes convertidos com histórico de procedimentos, total gasto, próximo retorno.

### 5. Retornos
Agendamentos pendentes. Filtros: atrasados, esta semana, próxima semana, este mês.

### 6. Configurações
Sub-componentes em `src/components/config/`:
- ConfigClinica, ConfigProcedimentos, ConfigHorarios, ConfigEquipe
- ConfigFaq, ConfigPoliticas, ConfigWhatsApp, ConfigIntegracoes

---

## Estrutura de API Routes

```
src/app/api/
├── google/              # OAuth & operações Calendar/Drive
│   ├── route.ts         # Inicia OAuth
│   ├── callback/        # Callback OAuth
│   ├── calendar/        # CRUD Calendar
│   └── upload/          # Upload Drive
├── chatwoot/            # Integração de mensagens
│   ├── conversations/   # Listar, status, deletar
│   ├── messages/        # Buscar mensagens
│   └── new-conversation/
└── webhook/             # Webhooks externos
    ├── chatwoot/
    └── uazapi/
```

---

## Fluxo da Secretária de IA (n8n)

### Arquitetura do Agente

1. **Webhook de entrada** - Recebe mensagens do Chatwoot
2. **Verificação de labels** - Se tem label "humano", não processa
3. **Consulta contexto** - Busca dados do lead, procedimentos, agendamentos
4. **GPT-4.1 mini** - Gera resposta com tools disponíveis
5. **Executa tools** - Agendar, consultar disponibilidade, etc
6. **Envia resposta** - Via Chatwoot/UAZAPI

### Tools Disponíveis para IA

| Tool | Função |
|------|--------|
| `consultar_disponibilidade` | Verifica horários livres no Google Calendar |
| `agendar_consulta` | Cria agendamento no Supabase + evento no Calendar |
| `buscar_procedimentos` | Lista procedimentos da clínica |
| `registrar_interesse` | Salva procedimento de interesse do lead |

### Princípios de Design

1. **Não automatizar 100%** - IA qualifica e coleta informações, humano confirma agendamento
2. **Contexto é rei** - IA precisa saber os procedimentos, preços, horários da clínica
3. **Validar no Calendar** - Nunca agendar sem verificar disponibilidade real

---

## Google Calendar Integration

### OAuth Flow

1. Clínica clica "Conectar Google Calendar" no painel
2. Redirect para Google OAuth com scopes: `calendar.events`, `calendar.readonly`
3. Callback salva tokens em `clinicas.google_tokens`
4. Refresh automático quando access_token expira

### Endpoints

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/google/auth` | Inicia OAuth |
| GET | `/api/google/callback` | Recebe tokens |
| GET | `/api/google/calendar/events` | Lista eventos |
| POST | `/api/google/calendar/events` | Cria evento |
| DELETE | `/api/google/calendar/events` | Remove evento |

### Comportamento

- Ao criar agendamento no painel → cria evento no Calendar
- Ao cancelar agendamento → deleta evento do Calendar
- Campo `google_event_id` na tabela `agendamentos` mantém sincronização

---

## Webhook Chatwoot → Vertix

### Endpoint
`POST /api/webhook/chatwoot`

### Função
- Recebe mensagens outgoing (do atendente)
- Encaminha para UAZAPI enviar no WhatsApp
- Ignora mensagens incoming (do cliente) e privadas

### Payload Esperado
```json
{
  "event": "message_created",
  "message_type": "outgoing",
  "content": "Texto da mensagem",
  "conversation": { "id": 123 }
}
```

---

## Sistema de Follow-up Automatizado

Sistema usando n8n + Supabase para reengajar leads:

| Evento | Timing | Ação |
|--------|--------|------|
| Completou diagnóstico grátis | 24h depois | WhatsApp: Perguntar o que achou |
| Diagnóstico + não comprou | 72h depois | WhatsApp: Oferecer protocolo |
| Comprou protocolo R$ 49 | 48h depois | WhatsApp: Perguntar experiência |
| Comprou + não agendou reunião | 5 dias depois | WhatsApp: Oferecer Secretária de IA |

### Lógica de Cancelamento

Follow-up cancelado automaticamente quando:
- A pessoa respondeu no WhatsApp (iniciou conversa)
- A pessoa comprou o protocolo (para fluxo de diagnóstico)
- A pessoa agendou reunião (para fluxo de quem comprou)

---

## Status do Projeto

### O Que Está Funcionando ✅

- [x] Painel completo com Dashboard, Conversas, Pipeline, Clientes, Retornos
- [x] Integração Chatwoot para gestão de conversas
- [x] Integração UAZAPI para envio/recebimento WhatsApp
- [x] Google Calendar OAuth + criar/deletar eventos
- [x] Painel de Interesse (procedimentos por lead)
- [x] Painel de Agendamentos com criação de retorno automático
- [x] Sistema de etapas do lead com transições
- [x] Navegação entre módulos com contexto (ex: abrir conversa de um cliente)

### O Que Falta Fazer 🔧

#### Curto Prazo (Próximas Sessões)

1. **Sincronizar avatares** - Atualizar fetchLeadIA no Conversas.tsx para salvar avatar do Chatwoot na tabela leads_ia. Criar API `/api/sync-avatars` para sincronização em batch.

2. **Agente n8n completo** - Implementar workflow com:
   - Consulta de disponibilidade no Calendar
   - Tools para agendar/cancelar
   - Prompt com contexto da clínica
   - Handoff para humano quando necessário

3. **Sistema de notificações** - Ícone sino no header, badge com contagem, dropdown com notificações recentes.

#### Médio Prazo

4. **Follow-up automático** - Workflows n8n para reengajar leads que não responderam (24h, 72h, etc).

5. **Relatórios** - Dashboard com métricas de conversão, tempo de resposta, procedimentos mais agendados.

6. **Multi-clínica** - Ajustar sistema para suportar múltiplas clínicas (já tem clinica_id, mas precisa testar fluxo completo).

---

## Metas e KPIs

### Curto Prazo (3 meses)

- 500 leads capturados no diagnóstico gratuito
- 50 vendas do Protocolo (R$ 49)
- 5 clientes da Secretária de IA
- R$ 10.000+ em MRR

### Médio Prazo (12 meses)

- 20 clientes ativos da Secretária de IA
- R$ 30.000+ em MRR
- Expansão para outras cidades do ABC
- Validação para expandir para outros nichos (odonto, fisio)

### KPIs a Monitorar

| Métrica | Meta | Frequência |
|---------|------|------------|
| Taxa conversão diagnóstico → lead | > 40% | Semanal |
| Taxa conversão lead → compra R$ 49 | > 10% | Semanal |
| Taxa conversão R$ 49 → Secretária IA | > 10% | Mensal |
| Churn rate (Secretária IA) | < 5% | Mensal |
| CAC (Custo de Aquisição) | < R$ 500 | Mensal |
| LTV (Lifetime Value) | > R$ 20.000 | Trimestral |

---

## Convenções de Código

### Estilo

- TypeScript strict
- Tailwind para estilos
- Componentes funcionais com hooks
- Nomenclatura em português para dados de negócio (lead, cliente, agendamento)

### Cores Padrão (Tema Escuro)

```
Primary (verde): #10b981, hover: #059669
Background: #0f172a
Cards: #1e293b
Borders: #334155
Text muted: #64748b
```

### Etapas com Cores

```
novo: blue-500
atendimento: yellow-500
agendado: purple-500
convertido: green-500
perdido: red-500
```

### Tema

Tema armazenado em localStorage como `vertix-theme`, aplicado via atributo `data-theme` no `<html>`.

---

## Troubleshooting Comum

### Chatwoot não carrega conversas

- Verificar `chatwoot_url` e `chatwoot_api_key` na tabela clinicas
- Confirmar que `account_id` está correto
- Testar API direto: `GET {chatwoot_url}/api/v1/accounts/{account_id}/conversations`

### Mensagem não envia no WhatsApp

- Verificar se UAZAPI está conectado (sessão ativa)
- Confirmar webhook do Chatwoot está configurado
- Ver logs da API route `/api/webhook/chatwoot`

### Google Calendar não sincroniza

- Verificar se tokens existem em `clinicas.google_tokens`
- Tokens podem ter expirado - forçar reconexão
- Confirmar scopes corretos no OAuth

### Avatar não aparece

- Campo `avatar` na leads_ia pode estar null
- Rodar sincronização: `GET /api/sync-avatars?clinica_id=XXX`
- Verificar se Chatwoot tem thumbnail do contato

---

## Concorrência e Diferencial

### Concorrentes

- Muitos chatbots genéricos no mercado

### Diferencial Vertix

- Especializado em estética (entende procedimentos)
- Integra com agenda real
- Não automatiza 100% (mantém controle humano)
- Setup assistido e acompanhamento mensal

---

## Links Úteis

- Supabase Dashboard: https://supabase.com/dashboard/project/[project_id]
- Chatwoot: URL configurada por clínica
- n8n: Self-hosted, URL varia
- Documentação Chatwoot API: https://www.chatwoot.com/developers/api/
- Documentação UAZAPI: https://docs.uazapi.com/

---

## Idioma

O aplicativo é em Português Brasileiro. Nomes de variáveis, texto da UI e comentários são em português.

---

*Última atualização: Janeiro 2026*
*Documento confidencial - Vertix Automação Inteligente*