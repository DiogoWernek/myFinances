# Minhas Finanças - Gestão de Despesas Pessoais

Este é um aplicativo web simples para gestão de despesas pessoais, construído com React, TypeScript, Vite, Tailwind CSS e Supabase.

## Pré-requisitos

- Node.js instalado
- Conta no Supabase

## Configuração

1.  **Instale as dependências:**

    ```bash
    npm install
    ```

2.  **Configuração do Supabase:**

    - Crie um novo projeto no Supabase.
    - Vá para o SQL Editor no dashboard do Supabase.
    - Copie o conteúdo do arquivo `setup.sql` deste projeto e execute no SQL Editor. Isso criará a tabela `expenses` e configurará as políticas de segurança (RLS).
    - Crie um usuário manualmente na seção Authentication -> Users do Supabase.

3.  **Variáveis de Ambiente:**

    - Renomeie ou copie o arquivo `.env` (ou crie um novo baseando-se nele).
    - Preencha as variáveis com suas credenciais do Supabase (encontradas em Project Settings -> API):

    ```env
    VITE_SUPABASE_URL=sua_url_do_supabase
    VITE_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
    ```

## Executando o Projeto

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:5173` no seu navegador.

## Funcionalidades

- **Login:** Autenticação via Supabase Auth (email e senha).
- **Dashboard:** Visão geral das despesas do mês atual e total gasto.
- **Navegação:** Alterne entre meses e anos para ver o histórico.
- **CRUD de Despesas:**
  - Criar nova despesa
  - Listar despesas
  - Editar despesa
  - Excluir despesa
- **Segurança:** Dados protegidos por Row Level Security (RLS), garantindo que cada usuário veja apenas seus próprios dados.

## Estrutura do Projeto

- `src/pages`: Componentes de página (Login, Dashboard, ExpenseForm).
- `src/components`: Componentes reutilizáveis (PrivateRoute).
- `src/context`: Contexto de autenticação (AuthContext).
- `src/lib`: Configuração do cliente Supabase.
- `src/types`: Definições de tipos TypeScript.
