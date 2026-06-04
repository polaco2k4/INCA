# Sistema de Gestão de Conteúdo - Portal INCA

## Visão Geral

O painel administrativo do INCA agora inclui um sistema completo de gestão de conteúdo (CMS) que permite aos administradores gerir artigos, notícias, anúncios, FAQ e media.

## Estrutura da Base de Dados

### Tabelas Criadas

1. **categorias_conteudo** - Categorias para organizar artigos
2. **artigos** - Artigos e notícias do portal
3. **anuncios** - Anúncios e avisos para os utilizadores
4. **media** - Galeria de imagens, vídeos e documentos
5. **paginas** - Páginas estáticas do site
6. **faq** - Perguntas frequentes

## Instalação

Execute o script SQL para criar as tabelas de gestão de conteúdo:

```bash
sqlcmd -S localhost\SQLEXPRESS -E -i schema_conteudo.sql
```

## API Endpoints

### 🔒 Endpoints Administrativos (Requerem Autenticação)

Todos os endpoints administrativos requerem um token JWT no header:
```
Authorization: Bearer <token>
```

#### Artigos

**Listar Artigos**
```http
GET /api/admin/artigos?estado=publicado&categoria_id=1&destaque=true&limit=50&offset=0
```

**Obter Artigo por ID**
```http
GET /api/admin/artigos/:id
```

**Criar Artigo**
```http
POST /api/admin/artigos
Content-Type: application/json

{
  "titulo": "Título do Artigo",
  "slug": "titulo-do-artigo",
  "resumo": "Breve resumo do artigo",
  "conteudo": "<p>Conteúdo HTML do artigo</p>",
  "categoria_id": 1,
  "imagem_destaque": "https://exemplo.com/imagem.jpg",
  "tags": "café,produção,angola",
  "estado": "publicado",
  "destaque": true
}
```

**Editar Artigo**
```http
PUT /api/admin/artigos/:id
Content-Type: application/json

{
  "titulo": "Novo Título",
  "estado": "publicado"
}
```

**Eliminar Artigo** (Apenas super_admin)
```http
DELETE /api/admin/artigos/:id
```

#### Categorias

**Listar Categorias**
```http
GET /api/admin/categorias
```

**Criar Categoria**
```http
POST /api/admin/categorias
Content-Type: application/json

{
  "nome": "Notícias",
  "slug": "noticias",
  "descricao": "Notícias e atualizações do INCA"
}
```

#### Anúncios

**Listar Anúncios**
```http
GET /api/admin/anuncios?activo=true&tipo=urgente&limit=50&offset=0
```

**Criar Anúncio**
```http
POST /api/admin/anuncios
Content-Type: application/json

{
  "titulo": "Manutenção Programada",
  "mensagem": "O portal estará indisponível no dia 20/03 das 02h às 04h.",
  "tipo": "aviso",
  "link_url": "/manutencao",
  "link_texto": "Saber mais",
  "activo": true,
  "data_inicio": "2026-03-15T00:00:00",
  "data_fim": "2026-03-21T00:00:00"
}
```

Tipos de anúncio: `info`, `aviso`, `urgente`, `sucesso`

**Editar Anúncio**
```http
PUT /api/admin/anuncios/:id
Content-Type: application/json

{
  "activo": false
}
```

**Eliminar Anúncio** (Apenas super_admin)
```http
DELETE /api/admin/anuncios/:id
```

#### FAQ

**Listar FAQ**
```http
GET /api/admin/faq?categoria=Registo&activo=true
```

**Criar FAQ**
```http
POST /api/admin/faq
Content-Type: application/json

{
  "pergunta": "Como me registo no portal?",
  "resposta": "Para se registar, clique em 'Registar' na página inicial...",
  "categoria": "Registo",
  "ordem": 1,
  "activo": true
}
```

**Editar FAQ**
```http
PUT /api/admin/faq/:id
Content-Type: application/json

{
  "resposta": "Nova resposta atualizada",
  "ordem": 2
}
```

**Eliminar FAQ** (Apenas super_admin)
```http
DELETE /api/admin/faq/:id
```

#### Media

**Listar Media**
```http
GET /api/admin/media?tipo=imagem&limit=50&offset=0
```

Tipos de media: `imagem`, `video`, `documento`, `outro`

**Adicionar Media**
```http
POST /api/admin/media
Content-Type: application/json

{
  "titulo": "Logo INCA",
  "descricao": "Logotipo oficial do INCA",
  "tipo": "imagem",
  "url": "https://exemplo.com/logo.png",
  "tamanho_kb": 245,
  "mime_type": "image/png"
}
```

**Eliminar Media**
```http
DELETE /api/admin/media/:id
```

### 🌐 Endpoints Públicos (Sem Autenticação)

#### Artigos Públicos

**Listar Artigos Publicados**
```http
GET /api/artigos?categoria=noticias&destaque=true&limit=10&offset=0
```

**Obter Artigo por Slug**
```http
GET /api/artigos/bem-vindo-ao-portal-inca
```

#### Anúncios Activos

**Listar Anúncios Activos**
```http
GET /api/anuncios/activos
```

Retorna apenas anúncios activos dentro do período de validade, ordenados por prioridade.

#### FAQ Público

**Listar FAQ**
```http
GET /api/faq?categoria=Registo
```

## Níveis de Acesso

- **operador**: Pode visualizar conteúdo
- **admin**: Pode criar, editar e visualizar conteúdo
- **super_admin**: Pode criar, editar, visualizar e eliminar conteúdo

## Estados de Artigos

- **rascunho**: Artigo em edição, não visível publicamente
- **publicado**: Artigo visível no portal público
- **arquivado**: Artigo arquivado, não visível publicamente

## Tipos de Anúncios

- **info**: Informação geral (azul)
- **aviso**: Aviso importante (amarelo)
- **urgente**: Urgente/crítico (vermelho)
- **sucesso**: Mensagem de sucesso (verde)

## Logs de Ações

Todas as ações de gestão de conteúdo são registadas na tabela `admin_logs`:

- CRIAR - Criação de novo conteúdo
- EDITAR - Edição de conteúdo existente
- ELIMINAR - Eliminação de conteúdo
- UPLOAD - Upload de media

## Exemplos de Uso

### Criar e Publicar um Artigo

```javascript
// 1. Login
const loginRes = await fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@inca.ao',
    password: 'Admin@2026'
  })
});
const { token } = await loginRes.json();

// 2. Criar artigo
const artigoRes = await fetch('/api/admin/artigos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    titulo: 'Nova Safra de Café 2026',
    resumo: 'Previsão de aumento de 15% na produção de café',
    conteudo: '<p>A safra de café de 2026 promete...</p>',
    categoria_id: 1,
    estado: 'publicado',
    destaque: true
  })
});
```

### Criar Anúncio Urgente

```javascript
await fetch('/api/admin/anuncios', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    titulo: 'Prazo de Certificação',
    mensagem: 'O prazo para pedidos de certificação termina em 5 dias!',
    tipo: 'urgente',
    activo: true,
    data_fim: '2026-03-25T23:59:59'
  })
});
```

### Consultar Artigos Públicos

```javascript
// Sem autenticação necessária
const artigos = await fetch('/api/artigos?destaque=true&limit=5');
const data = await artigos.json();
console.log(data.artigos);
```

## Dados Iniciais

O script `schema_conteudo.sql` cria automaticamente:

- 5 categorias de conteúdo (Notícias, Eventos, Mercado, Técnicas, Institucional)
- 1 artigo de boas-vindas
- 1 anúncio de exemplo
- 4 perguntas frequentes

## Segurança

- Todos os endpoints administrativos requerem autenticação JWT
- Operações de eliminação requerem nível `super_admin`
- Criação e edição requerem nível `admin` ou superior
- Logs de todas as ações administrativas
- Validação de dados em todos os endpoints

## Próximos Passos

1. Integrar o CMS no frontend do painel administrativo
2. Adicionar editor WYSIWYG para artigos
3. Implementar upload de ficheiros para media
4. Criar sistema de notificações por email
5. Adicionar versionamento de artigos
