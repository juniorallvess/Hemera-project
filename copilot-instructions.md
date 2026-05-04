---
model: default
---

# Hemera Project - Agent-Powered Development

This is a multi-agent system for specialized development tasks. Each agent brings deep expertise in specific domains.

## 🤖 Available Agents

All agents are configured in `.agent.md`. Use `@` to invoke them:

### Core Agents

- **@backend-specialist** - APIs, Node.js, Python, serverless
- **@frontend-specialist** - React, Next.js, UI/UX, components
- **@orchestrator** - Multi-agent coordination for complex tasks
- **@database-architect** - Database design, SQL, optimization
- **@devops-engineer** - CI/CD, Docker, Kubernetes, infrastructure

### Specialized Roles

- **@mobile-developer** - React Native, Flutter, iOS/Android
- **@security-auditor** - Security reviews, vulnerability scanning
- **@qa-automation-engineer** - Testing automation, QA strategy
- **@performance-optimizer** - Performance profiling, optimization
- **@debugger** - Complex issue diagnosis and resolution

### Analysis & Documentation

- **@code-archaeologist** - Legacy code analysis, deep understanding
- **@documentation-writer** - API docs, README, technical writing
- **@test-engineer** - Test strategy, coverage, patterns
- **@explorer-agent** - Codebase exploration and analysis

### Strategic Planning

- **@project-planner** - Project planning, timelines, milestones
- **@product-owner** - Product vision, strategy, roadmaps
- **@product-manager** - Requirements, specs, product management

### Specialized Domains

- **@game-developer** - Game development, engines, mechanics
- **@seo-specialist** - SEO optimization, Web Vitals
- **@penetration-tester** - Security testing, penetration

## 💡 Usage Examples

### Start a task with an agent

```
@backend-specialist Create a REST API for user management with JWT auth
@frontend-specialist Design a responsive dashboard with Tailwind CSS
@orchestrator Coordinate full-stack development: backend API + React frontend
```

### Ask for analysis

```
@code-archaeologist Explain how this payment system works
@debugger Why is the app crashing on production?
@security-auditor Review this code for vulnerabilities
```

### Get specialized help

```
@database-architect Design database schema for e-commerce
@devops-engineer Set up CI/CD pipeline with Docker + GitHub Actions
@performance-optimizer Why is this query slow? Optimize it
```

## 🔥 Power Moves

### Multi-Phase Tasks

```
1. @project-planner Break down the feature roadmap for Q2 2026
2. @orchestrator Coordinate backend + frontend implementation
3. @qa-automation-engineer Create test plan and automation
4. @performance-optimizer Run benchmarks and optimize
```

### Complex Problem Solving

```
@orchestrator We need to migrate from PostgreSQL to DynamoDB while 
keeping both in sync. Coordinate: database-architect (design), 
backend-specialist (implementation), devops-engineer (deployment)
```

### Security Focus

```
@security-auditor Audit for OWASP Top 10
@penetration-tester Perform security testing
@devops-engineer Implement security best practices in CI/CD
```

## 🎯 Quick References

**For Full Documentation:** See `AGENTS.md` and `SETUP_AGENTS.md`

**Platform Support:**
- ✅ VS Code Chat (via `@` mention)
- ✅ GitHub Copilot (via `@` mention)  
- ✅ Antigravity (native integration)
- 🔄 CLI (work in progress)

**Configuration:**
- Agents config: `.agent.md`
- Agent files: `agents/*.md`
- Setup guide: `SETUP_AGENTS.md`

---

## 🚀 Getting Started

1. Pick an agent that matches your task
2. Use `@agent-name` to invoke
3. Describe what you need
4. Agent brings specialized expertise

For example:
```
@backend-specialist I need to create a GraphQL API with TypeScript, 
PostgreSQL, and JWT authentication. What's the best approach?
```

The agent will:
- Ask clarifying questions
- Propose architecture
- Write code
- Guide implementation

---

**Created:** April 25, 2026  
**System:** Hemera Multi-Platform Agents  
**Version:** 1.0
