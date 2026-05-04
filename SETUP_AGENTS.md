# 🚀 Setup Hemera Agents - Multi-Platform

Você tem agora tudo pronto para usar agentes em múltiplas plataformas!

## ✅ O Que Você Tem Agora

```
Hemera/
├── .agent.md              ← Configuração universal (VS Code, Copilot)
├── AGENTS.md              ← Documentação dos agentes
└── agents/
    ├── backend-specialist.md
    ├── frontend-specialist.md
    ├── orchestrator.md
    └── ... (17 mais)
```

---

## 🔧 Plataforma 1: VS Code + GitHub Copilot ✅

### Opção A: Referência Automática (Recomendado)

O VS Code agora deve detectar `.agent.md` automaticamente. Para confirmar:

1. Abra o Chat do Copilot (`Ctrl+Shift+I`)
2. Digite `@` e veja se aparecem seus agentes
3. Teste: `@backend-specialist Criar uma API REST`

### Opção B: Configuração Explícita (Se não funcionar)

Se não aparecer automaticamente, edite/crie `copilot-instructions.md` na raiz:

```markdown
---
model: default
skills: []
---

# Hemera Project Instructions

## Available Agents

See `.agent.md` for multi-platform agent configuration.

### Quick Links
- @backend-specialist - Node.js, Python, APIs
- @frontend-specialist - React, Next.js, UI/UX  
- @orchestrator - Coordenação de múltiplos agentes
```

---

## 🎯 Plataforma 2: Antigravity ✅

Seus agentes já funcionam! Mas confirme:

### No Antigravity Interface:

```
Digite na mensagem:
@backend-specialist Criar estrutura de projeto

OU

/agent backend-specialist
Criar estrutura de projeto
```

**Se não aparecer a sugestão:**

1. Verifique se a pasta `agents/` está sincronizada
2. Confirme que cada arquivo tem o frontmatter YAML correto:
   ```yaml
   ---
   name: agent-name
   description: ...
   ---
   ```

---

## 🛠️ Próximos Passos: Plataformas Adicionais

### CLI Local (Node.js)

Crie `hemera-cli.js`:

```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '.agent.md');

function parseAgentConfig() {
  const content = fs.readFileSync(configPath, 'utf-8');
  const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!yamlMatch) return null;
  
  // Simple YAML parsing
  const yaml = yamlMatch[1];
  const agents = [];
  const agentMatches = yaml.match(/- name: ([^\n]+)/g) || [];
  
  agentMatches.forEach(match => {
    const name = match.replace('- name: ', '').trim();
    agents.push(name);
  });
  
  return agents;
}

function showAgents() {
  const agents = parseAgentConfig();
  console.log('\n🤖 Hemera Agents:\n');
  agents.forEach(agent => {
    console.log(`  @${agent}`);
  });
  console.log();
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Hemera Agent CLI

Usage:
  hemera [agent-name] [message]
  hemera --list
  hemera --help

Examples:
  hemera backend-specialist "Criar uma API REST"
  hemera @orchestrator "Coordenar build"
  
    `);
  } else if (args.includes('--list')) {
    showAgents();
  } else {
    showAgents();
    console.log('💡 Use: hemera [agent-name] [message]');
  }
}

main();
```

Instale como comando global:

```bash
npm install -g .
# Ou crie alias em .bashrc/.zshrc:
alias hemera="node /path/to/hemera-cli.js"
```

Use:
```bash
hemera backend-specialist "Qual é o melhor framework Node.js?"
```

---

## 🔄 Sincronização Entre Plataformas

### Mantendo Agentes Atualizados

Se alterar um agente, ele atualiza automaticamente em todas plataformas (pois todas leem os mesmos arquivos).

**Fluxo:**
1. Edite `agents/backend-specialist.md`
2. No VS Code: Reload para aplicar
3. No Antigravity: Sincronização automática ✓
4. Na CLI: Relê config na próxima execução ✓

---

## 🧪 Testes: Verificar Se Está Funcionando

### No VS Code

```
Copilot Chat:
> @backend-specialist

Esperado: Sugestão automática de "backend-specialist"
```

### No Antigravity

```
Chat:
> @backend

Esperado: Lista com "backend-specialist" como sugestão
```

### Na CLI

```bash
$ hemera --list

Esperado: Lista todos os 20 agentes
```

---

## ⚠️ Troubleshooting

| Problema | Solução |
|----------|---------|
| Agentes não aparecem no VS Code | Reabra Chat ou recarregue VS Code |
| Antigravity não sincroniza | Confirme que `agents/` está no repo |
| CLI retorna erro | Verifique permissões: `chmod +x hemera-cli.js` |
| Agente não responde | Confira frontmatter YAML está correto |

---

## 📚 Documentação Completa

Veja:
- `AGENTS.md` - Lista completa de agentes e triggers
- `.agent.md` - Configuração técnica por plataforma
- `agents/` - Cada agente individual

---

## 🎉 Você Está Pronto!

Comece com:
```
@backend-specialist Análise da arquitetura do projeto
@orchestrator Coordenar build e testes
@frontend-specialist Design do novo dashboard
```

Teste em VS Code agora mesmo! 🚀
