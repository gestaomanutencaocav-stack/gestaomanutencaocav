# Sistema Integrado de Gestão de Manutenção Predial
**CAV/UFPE — Centro Acadêmico da Vitória**

Desenvolvido por Jonathan Carvalho, Administrador, Diretoria do CAV/UFPE.

---

## Stack

- **Frontend/Backend:** Next.js 15 (App Router)
- **Banco de dados:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth + cookie de sessão
- **Deploy:** Vercel
- **Estilização:** Tailwind CSS + Framer Motion

---

## Regras críticas para o AI Studio

> ⚠️ O AI Studio não deve modificar os arquivos abaixo sem autorização explícita.

### next.config.ts
- **Nunca** adicionar `output: 'standalone'` — quebra os assets estáticos no Vercel
- **Sempre** manter `qziaddfqzdmgvylfqbun.supabase.co` nos `remotePatterns`
- **Nunca** remover `transpilePackages: ['motion']`

### middleware.ts
- **Nunca** remover as exceções de rotas públicas (`/login`, `/api/auth`)
- **Nunca** bloquear arquivos de imagem (.png, .jpg, .svg)

### app/login/page.tsx
- A logomarca deve sempre usar a URL do Supabase Storage:
  `https://qziaddfqzdmgvylfqbun.supabase.co/storage/v1/object/public/public-assets/Logomarca_CAV_padrao.png`
- **Nunca** usar `/Logomarca_CAV_padrão.png` (caminho local com acento)
- **Nunca** usar `raw.githubusercontent.com` para imagens

### app/api/auth/login/route.ts
- Manter o rate limiting de 5 tentativas por IP a cada 15 minutos
- **Nunca** expor mensagens de erro que revelem se o usuário existe

---

## Estrutura do projeto
app/
├── login/          → Página de acesso
├── api/auth/       → Endpoints de autenticação
├── agenda/         → Agenda de manutenções
├── solicitacoes/   → Gestão de solicitações
├── materiais/      → Controle de materiais
├── inspecoes/      → Inspeções prediais
lib/
├── auth.ts         → Lógica de autenticação
├── supabase.ts     → Cliente Supabase
components/
├── DashboardLayout → Layout principal

---

## Variáveis de ambiente necessárias
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Observações de segurança

- Rate limiting ativo no endpoint de login (5 tentativas / 15 min)
- Autenticação via cookie de sessão `auth_session`
- Apenas usuários cadastrados no Supabase Auth têm acesso
- Roles: `encarregado` (darleson.oliveira@hotmail.com) e `gestao` (demais usuários)
