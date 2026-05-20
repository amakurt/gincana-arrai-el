# Plano de Desenvolvimento Mobile Nativo (React Native / Expo)

## 📌 Contexto
Com base na decisão aprovada, construiremos uma aplicação **Mobile Nativa** focada na melhor experiência do usuário em ambos os sistemas (iOS e Android), sem dependência inicial de recursos offline. O app ficará restrito ao escopo atual do EduPsych Pro e será implantado tanto externamente nas Lojas de Aplicativos (Google/Apple) quanto para instalação manual (APK) internamente.

---

## 🏗️ 1. Arquitetura do Repositório (A Resposta à sua Pergunta 1)
**Sim! A melhor prática é isolar o projeto mobile para não conflitar com a Web.**
Nós vamos usar a abordagem de Monorepo ou "Pasta Adjacente" no mesmo repositório do Git. 

A sua nova estrutura será:
```text
psicopedagoga/
├── [arquivos web atuais: vite, componentes do react]
├── supabase/       # Lógica do banco compartilhado de dados
├── mobile/         # 🌟 NOVO PROJETO EXPO (React Native) 🌟
│   ├── app/        # Rotas nativas (Expo Router)
│   ├── components/ # Componentes (Views, Texts, Buttons Nativos)
│   ├── package.json
│   └── app.json
└── .agent/
```

Dessa forma, mantemos tudo sob o mesmo repositório no GitHub para facilitar a manutenção e podemos até compartilhar alguns "Tipos" (types.ts), mas nenhum pacote de web interferirá nos do mobile.

---

## 🚀 2. Stack Tecnológica do App Nativo
- **Framework Mobile:** [Expo](https://expo.dev/) (React Native moderno).
- **Roteamento:** Expo Router (para navegação baseada em arquivos super suave).
- **Banco de Dados/Autenticação:** O mesmo Supabase atual, via `@supabase/supabase-js`, usando o React Native Async Storage.
- **UI & Estilização:** CSS Tailwind para React Native (`nativewind`) ou `StyleSheet` puro.
- **Armazenamento Seguro:** `expo-secure-store` para guardar os tokens da clínica.

---

## 📱 3. Solução de Build e Distribuição (A Resposta à sua Pergunta 3)
Usaremos o **EAS (Expo Application Services)**, a ferramenta oficial da Expo que permite gerar aplicativos na nuvem.

* **Uso Interno:** EAS Build gera links para download de um pacote `.apk` para Android e builds ad-hoc para iOS.
* **App Store e Google Play:** EAS Submit envia automaticamente o código já testado diretamente para consoles da Apple e Google, simplificando os processos burocráticos.

---

## 🛠️ Fases de Implementação (Modo Plan -> Orchestrator)

### **Fase 1: Inicialização (Scaffolding)** ✅
- Criar a pasta `/mobile`. ✅
- Executar o boilerplate inicial do Expo (`npx create-expo-app@latest`). ✅
- Instalar dependências nativas (AsyncStorage, Supabase JS, React Navigation). ✅
- Configuração e integração do ambiente com o seu Supabase atual (`.env`). ✅

### **Fase 2: Autenticação e Adaptação Nativa** ✅
- Refazer a tela de Login utilizando componentes do React Native (`<View>`, `<TextInput>`). ✅
- Teste de fluxo de token com gravação segura com `expo-secure-store`. ✅

### **Fase 3: Refatoração das Views Principais** ✅
- Menu principal, Lista de Pacientes e navegação (usando as boas práticas *Touch-first*, zonas de dedo para botões). ✅
- Fluxo de Agendamentos e Evolução Clínica (Sincronizado com modelo Web). ✅
- Implementação de Prontuário Digital com auto-cálculo de sessão. ✅
- Exportação de documentos para PDF em mobile (`expo-print`, `expo-sharing`). ✅

### **Fase 4: Teste e Build** 🚀
- [x] Testes locais finais nos emuladores. ✅
- [x] Limpeza de código e Lint. ✅
- [ ] Configuração do `eas.json`.
- [ ] Gerar o primeiro APK Interno via EAS Build. (Aguardando login do usuário)
