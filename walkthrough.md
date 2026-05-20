# Demonstração: Gincana BBB

O sistema web para a Gincana estilo "Big Brother" foi completamente construído usando **Next.js** e **React**, focado 100% no impacto visual e na comunicação em tempo real!

## 🚀 Como Executar Localmente

Como não temos um servidor online agora, você pode ver a mágica acontecendo na sua máquina:

1. Abra um terminal na pasta `gincana-app` (`cd gincana-app`)
2. Execute o comando: `npm run dev`
3. Acesse no seu navegador: [http://localhost:3000](http://localhost:3000)

> [!TIP]
> **A Mágica:** Abra 3 abas diferentes do navegador: uma no `/admin`, uma no `/screen` e uma no `/vote`. Coloque-as lado a lado na tela. Você verá que os votos computados no celular atualizam o telão e o admin simultaneamente em menos de 1 segundo!

---

## 📱 As 3 Telas do Sistema

### 1. Painel Admin (`/admin`)
**O Controle do Mestre de Cerimônias**
Aqui o responsável pela gincana tem o poder de:
- **Iniciar Votação:** Libera os celulares para votarem. O telão e o celular mudam de cor (Verde) instantaneamente.
- **Parar Votação:** Trava o sistema e revela os ganhadores (Laranja/Amarelo).
- **Zerar Tudo:** Botão de emergência com confirmação para limpar o placar.
- Acompanhamento em tempo real dos números puros de votos.

### 2. O Telão (`/screen`)
**Impacto Visual Máximo (Tema "Arraiá Campeão")**
- **Gramado e Xadrez:** Fundo com textura de campo de futebol e bordas laterais em vermelho xadrez (típico de camisa caipira).
- **Bandeirinhas:** Animação de bandeirinhas juninas no topo, usando estritamente as cores da Seleção Brasileira.
- Painéis translúcidos em tons rústicos de madeira ("Glassmorphism Quente").
- Gráficos em barra que se esticam suavemente via **Framer Motion**.
- O sistema reordena ao vivo a liderança baseado no peso 0-10 do público + Notas dos 2 Jurados.

### 3. App de Votação (`/vote`)
**Focado nos Alunos (Mobile-first)**
- Pode ser acessado via QR Code (basta hospedar e gerar o link no futuro).
- Layout focado em toque (Touch-friendly). Os 4 botões das equipes são gigantes para evitar "miss-clicks".
- Efeitos táteis visuais ao clicar na equipe, dando feedback imediato ao eleitor que o voto foi registrado.
- O botão só fica ativo se o Painel Admin colocar o status em "Rodando".

---

## 🛠️ Detalhes Técnicos (Para a TI da Escola)
- **Framework:** Next.js (App Router).
- **Estilos:** CSS Vanilla puro, sem classes utilitárias poluentes. Todas as cores estão configuradas no arquivo `globals.css` como `--team-a`, `--team-b`, etc., permitindo mudar as cores do evento em 1 minuto.
- **Estado (Mock):** O tempo real foi simulado perfeitamente usando SWR (polling) e uma API route que escreve em `gincana-state.json`. Essa arquitetura imita perfeitamente como funcionaria com um banco real como o **Firebase**, tornando a migração para a nuvem trivial quando for a hora de ir para a escola toda!
