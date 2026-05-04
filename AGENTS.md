# 🤖 Hemera Agents Registry

> **Multi-Platform Agent System** - Funciona em Antigravity, VS Code, GitHub Copilot e CLI

## ℹ️ Como Usar

### No Antigravity
```
@backend-specialist Criar uma API REST
@orchestrator Coordenar build completo
@frontend-specialist Design do dashboard
```

### No VS Code / GitHub Copilot
```
@backend-specialist Criar uma API REST
/agent backend-specialist Criar uma API REST
```

### Na CLI
```
hemera --agent backend-specialist "Criar uma API REST"
```

---

## 🎯 Agentes Disponíveis

| Agente | Especialidade | Use Quando |
|--------|---------------|-----------|
| **backend-specialist** | Node.js, Python, APIs, Serverless | Desenvolvendo APIs, lógica servidor, autenticação |
| **frontend-specialist** | React, Next.js, UI/UX, Performance | Criando componentes, layouts, design |
| **orchestrator** | Coordenação Multi-Agente | Tarefas complexas que precisam de múltiplas perspectivas |
| **mobile-developer** | Mobile apps, React Native, Flutter | Desenvolvimento mobile multiplataforma |
| **database-architect** | Database Design, SQL, NoSQL | Design de schemas, otimização de bancos |
| **devops-engineer** | CI/CD, Docker, Kubernetes, Deploy | Automação, deployment, infraestrutura |
| **security-auditor** | Security, Penetration Testing | Auditoria de segurança, vulnerabilidades |
| **qa-automation-engineer** | Testing Automation, QA | Testes automatizados, estratégias QA |
| **performance-optimizer** | Performance Profiling, Optimization | Otimização de código, benchmarking |
| **debugger** | Debugging, Issue Resolution | Debugando problemas complexos |
| **code-archaeologist** | Code Analysis, Legacy Systems | Entendendo codebases antigos |
| **documentation-writer** | Documentation, API Docs | Criando documentação |
| **test-engineer** | Test Strategy, Testing Patterns | Estratégia de testes |
| **seo-specialist** | SEO, Web Performance | Otimização de SEO, Core Web Vitals |
| **penetration-tester** | Security Testing, Exploits | Testes de penetração |
| **game-developer** | Game Development, Game Engines | Desenvolvimento de games |
| **project-planner** | Project Management, Planning | Planejamento de projetos |
| **product-owner** | Product Strategy, Roadmap | Estratégia de produto |
| **product-manager** | Product Management, Requirements | Gestão de produto |
| **explorer-agent** | Code Exploration, Analysis | Explorando codebase |

---

## 🔧 Configuração por Plataforma

### Antigravity
✅ Nativo - Use `@agente-name`

### VS Code + GitHub Copilot
✅ Requer: Seção "Agentes" no Chat
- Adicionar referências em `copilot-instructions.md`
- Ou usar `@` com nome do agente

### CLI / Scripts
✅ Via `--agent` flag

---

## 📂 Estrutura do Agente

Cada agente em `agents/` segue este padrão:

```markdown
---
name: agent-name
description: Descrição breve
tools: Read, Grep, Glob, Bash, Edit, Write
model: inherit
skills: skill1, skill2, skill3
---

# Título do Agente

Conteúdo e instruções...
```

---

## 🚀 Próximas Adições

Para expandir o suporte multi-plataforma:

- [ ] CLI wrapper (`hemera.sh` / `hemera.cmd`)
- [ ] GitHub Copilot extensão official
- [ ] Discord Bot com agents
- [ ] Telegram Bot com agents
- [ ] Web UI para seleção de agents

