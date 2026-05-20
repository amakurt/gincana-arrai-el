# Redesign Visual: Arrai-el (Copa do Mundo + Festa Junina Cristã)

O objetivo é transformar o layout atual (escuro e "neon") em um design que misture a energia vibrante da **Copa do Mundo** com o aconchego rústico da **Festa Junina**, garantindo que seja um evento cristão (focado em colheita, alegria e união, sem símbolos de santos católicos).

## Identidade Visual Proposta ("Arraiá Campeão")

### Paleta de Cores
- **Cores Principais:** Verde Bandeira (`#009c3b`) e Amarelo Canário (`#ffdf00`) da Copa.
- **Cores de Apoio:** Azul Anil (`#002776`) e tons quentes rústicos de Festa Junina (Laranja Queimado, Marrom Madeira).
- **Fundo (Background):** Uma textura que lembra a grama de um campo de futebol, mas com detalhes em "Xadrez" sutis nas bordas, típicos de camisa caipira.

### Elementos Gráficos
- **Bandeirinhas Customizadas:** No topo das páginas (principalmente no Telão e no App), colocaremos bandeirinhas juninas feitas em CSS usando as cores do Brasil (Verde, Amarelo, Azul, Branco).
- **Tipografia:** Uma fonte grossa e esportiva para os números (estilo placar de estádio) e uma fonte amigável e "handmade" para os títulos.
- **Glassmorphism Rústico:** Em vez de vidro transparente moderno, os painéis terão um fundo levemente amadeirado ou amarelo quente com bordas verdes.

---

## Perguntas Abertas (Socratic Gate)

> [!IMPORTANT]
> Para eu codificar o CSS exato que você tem em mente, por favor, me guie nas escolhas abaixo:

### [P0] **Balanço do Tema (O que deve chamar mais atenção?)**

**Pergunta:** Você quer que o sistema pareça **mais com um Estádio de Copa do Mundo** (com toques de festa caipira) ou **mais com um Arraiá Rústico** (com toques de futebol)?

**Por que isso importa:**
- Define a cor de fundo (Verde campo vs Marrom madeira) e a sensação geral que o público terá ao olhar o telão.

**Opções:**
| Opção | Prós | Contras |
|--------|------|------|
| Foco na Copa (Fundo Verde) | Mais energia, vibração esportiva. Competição forte. | Pode ofuscar um pouco a vibe "Junina". |
| Foco no Arraiá (Fundo Madeira/Xadrez) | Muito aconchegante, clássico, festivo. | Pode parecer menos com "gincana competitiva". |


### [P1] **Bandeirinhas no Telão**

**Pergunta:** Podemos adicionar uma fileira animada de "Bandeirinhas Juninas" (Verde e Amarelo) no topo de todas as telas (Telão, Vote, Admin) para dar o clima do evento?

**Por que isso importa:**
- Elementos decorativos mudam muito a imersão, mas ocupam um pequeno espaço da tela.

**Opções:**
| Opção | Prós | Contras |
|--------|------|------|
| Sim, Bandeirinhas Verdes/Amarelas animadas. | Cria o clima perfeito de "Arraiá na Copa" de forma elegante e cristã. | Ocupa cerca de 50px do topo da tela. |
| Não, prefiro um visual mais limpo só com as cores. | Telão fica com mais espaço para números grandes. | Perde um pouco a identidade visual forte. |


---

## Plano de Execução (Aguardando Respostas)

Assim que as escolhas de design forem feitas, eu vou:
1. Reescrever o `globals.css` apagando o dark mode atual e inserindo as paletas Verde/Amarela e texturas rústicas.
2. Adicionar o componente visual decorativo `<Bandeirinhas />` no `layout.tsx`.
3. Ajustar os botões do mobile `/vote` para parecerem mais esportivos/rústicos.
4. Ajustar as barras de progresso do `/screen` para combinarem com o novo tema (talvez estilo barra de energia de jogo de futebol).
