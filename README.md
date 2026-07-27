<div align="center">
  <br/>
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4"/>
  <br/><br/>

# 🎬 AniPlan

  <p align="center">
    <strong>Planejador de maratonas de anime</strong><br/>
    Organize seu tempo e descubra quando você termina seu anime favorito.
  </p>

  <br/>

  <p align="center">
    <a href="#-sobre">Sobre</a> •
    <a href="#-funcionalidades">Funcionalidades</a> •
    <a href="#-stack">Stack</a> •
    <a href="#-como-usar">Como usar</a> •
    <a href="#-arquitetura">Arquitetura</a> •
    <a href="#-scripts">Scripts</a>
  </p>

  <br/>
</div>

---

## 📖 Sobre

**AniPlan** é uma aplicação web que permite criar cronogramas personalizados para maratonas de anime. O usuário pesquisa um anime, informa sua disponibilidade (dias da semana e tempo por dia), e recebe um plano detalhado com data prevista de término e progresso acompanhado via checkboxes.

> ⚡ Funciona **sem backend** — todos os dados são salvos no `localStorage` do navegador.

---

## ✨ Funcionalidades

<table>
  <tr>
    <td width="50%">
      <h3>🔍 Busca Multi-API</h3>
      <p>Pesquise animes com fallback automático: <strong>Kitsu</strong> → <strong>AniList</strong> → <strong>Jikan</strong> (MyAnimeList) → dados populares offline.</p>
    </td>
    <td width="50%">
      <h3>📅 Cronograma Inteligente</h3>
      <p>Algoritmo que distribui episódios apenas nos dias disponíveis, calculando horas totais e data de término.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📊 Suporte a Temporadas</h3>
      <p>Organize episódios por temporadas (T1, T2, T3…). Cada temporada com contagem e progresso individuais.</p>
    </td>
    <td width="50%">
      <h3>✅ Acompanhamento</h3>
      <p>Marque episódios com checkboxes. Busca, paginação, filtro por temporada e indicador de episódios atrasados.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>✏️ Editar & Excluir</h3>
      <p>Edite maratonas existentes preservando dados e progresso, ou exclua com confirmação.</p>
    </td>
    <td width="50%">
      <h3>🔗 URL Compartilhável</h3>
      <p>Busca e filtros sincronizados com a URL via <strong>nuqs</strong>. Compartilhe links com o estado exato da página.</p>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>📋 Dias da Semana</h3>
      <p>Visualize os dias de maratona na página de detalhes com indicadores visuais de dias ativos/inativos.</p>
    </td>
    <td width="50%">
      <h3>🎯 Progresso em Tempo Real</h3>
      <p>Atualização instantânea do progresso com salvamento automático no <code>localStorage</code>.</p>
    </td>
  </tr>
</table>

---

## 🛠️ Stack

| Tecnologia          | Versão              | Propósito                    |
| ------------------- | ------------------- | ---------------------------- |
| **Next.js**         | 16.2.1 (App Router) | Framework React full-stack   |
| **React**           | 19.2.4              | Biblioteca de UI             |
| **TypeScript**      | 5.9.3               | Tipagem estática             |
| **Tailwind CSS**    | 4.3.1               | Estilização utility-first    |
| **Motion**          | 12.42               | Animações declarativas       |
| **nuqs**            | 2.8.9               | Estado da URL tipado         |
| **date-fns**        | 4.4                 | Manipulação de datas         |
| **React Hook Form** | 7.80                | Gerenciamento de formulários |
| **Zod**             | 3.25                | Validação de schemas         |
| **Sonner**          | 2.0                 | Notificações toast           |
| **shadcn/ui**       | —                   | Componentes base acessíveis  |
| **Radix UI**        | 1.6                 | Primitivas de UI headless    |

### APIs externas

| API                                      | Endpoint                  | Uso                    |
| ---------------------------------------- | ------------------------- | ---------------------- |
| [Kitsu](https://kitsu.io)                | `kitsu.io/api/edge/anime` | Busca primária         |
| [AniList](https://anilist.co) (GraphQL)  | `graphql.anilist.co`      | Primeiro fallback      |
| [Jikan](https://jikan.moe) (MyAnimeList) | `api.jikan.moe/v4/anime`  | Segundo fallback (API) |
| Dados populares offline                  | —                         | Fallback final         |

---

## 🚀 Como usar

### Pré-requisitos

- **Node.js** ≥ 18
- **pnpm** (recomendado) ou npm

### Instalação

```bash
git clone https://github.com/KevinWillyan456/aniplan.git
cd aniplan
pnpm install
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

### Build de produção

```bash
pnpm build
pnpm start
```

---

## 🧱 Arquitetura

```plaintext
src/
├── app/                           # Next.js App Router
│   ├── page.tsx                   # Home — hero + lista de maratonas
│   ├── create/
│   │   └── page.tsx               # Fluxo de criação (3 etapas)
│   └── anime/[id]/
│       └── page.tsx               # Detalhes + cronograma da maratona
├── components/
│   ├── anime/                     # Componentes do domínio
│   │   ├── anime-search.tsx        # Busca com fallback de APIs
│   │   ├── routine-form.tsx        # Formulário de rotina (RHF + Zod)
│   │   ├── episode-list.tsx        # Lista c/busca, paginação, tabs
│   │   ├── progress-bar.tsx        # Barra de progresso animada
│   │   └── anime-plan-card.tsx     # Card de maratona na home
│   └── ui/                        # Componentes base (shadcn/ui)
├── lib/
│   ├── anime-api.ts               # Cliente de busca com fallback chain
│   ├── schedule-generator.ts      # Algoritmo de distribuição
│   ├── storage.ts                 # Persistência (localStorage)
│   └── schemas.ts                 # Schemas Zod de validação
└── types/
    └── anime.ts                   # Tipos TypeScript do domínio
```

### Fluxo do usuário

```plaintext
Home → Create → Buscar anime → Configurar rotina → Revisar → Salvar
                                                             ↓
                                                     Detalhes da maratona
                                                     (checkboxes de episódios)
```

### Algoritmo de cronograma

1. Calcula **episódios por dia**: `⌊ minutosPorDia / duraçãoMédia ⌋`
2. Itera a partir da **data inicial**, pulando dias não selecionados
3. Distribui episódios em lote por dia até completar o total
4. Retorna array de `{ data, episódios[] }` + data final + horas totais

---

## 📋 Scripts

| Comando         | Descrição                                      |
| --------------- | ---------------------------------------------- |
| `pnpm dev`      | Inicia servidor de desenvolvimento (Turbopack) |
| `pnpm build`    | Build de produção                              |
| `pnpm start`    | Inicia servidor de produção                    |
| `pnpm lint`     | Executa ESLint                                 |
| `pnpm format`   | Formata código com Prettier                    |
| `pnpm fix`      | Formata + corrige lint                         |
| `pnpm check:ts` | TypeScript check (`tsc --noEmit`)              |
| `pnpm check`    | Typecheck + lint + format check                |

---

## 🧪 Qualidade de código

- **ESLint** + **Prettier** + **TypeScript** configurados
- Validação de formulários com **Zod** + **React Hook Form**
- Animações com **Motion** (GPU aceleradas)
- Componentes acessíveis via **Radix UI**
- Design responsivo **mobile-first**

---

## 📄 Licença

Este projeto é de uso pessoal/educacional. Os dados de animes são providos pelas APIs públicas de [Jikan](https://jikan.moe), [Kitsu](https://kitsu.io) e [AniList](https://anilist.co).

---

<div align="center">
  <br/>
  <p>
    Feito com 💜 por <strong>AniPlan</strong>
  </p>
  <p>
    <sub>Next.js • React • TypeScript • Tailwind CSS</sub>
  </p>
  <br/>
</div>
