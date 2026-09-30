# Pode um redemoinho explodir?

Projeto de feira de ciências (2026) sobre as equações de Navier–Stokes, o Problema do Milênio de US$ 1 milhão e a explosão anunciada pela OpenAI em setembro de 2026.

| | |
|---|---|
| **Simulador** | https://thurpopa.github.io/simulador-redemoinho/ |
| **Apresentação** | https://thurpopa.github.io/simulador-redemoinho/apresentacao/ |

## Simulador

Resolve as equações de Navier–Stokes ao vivo, na placa de vídeo (WebGL 2), com o método *Stable Fluids*.

- **Modo 2D:** ralo da pia, furacão, fumaça subindo, fusão de vórtices, dipolo, esteira de von Kármán e laboratório livre. Clique nos termos da equação para ligar e desligar cada parte da física.
- **Modo 3D:** o colapso autossimilar descrito na prova anunciada pela OpenAI (set. 2026), um tanque de água com funil e jato no eixo, e um tornado de fumaça. Dá para soltar objetos (isopor, patinho, madeira, folha, aço, bolha) no redemoinho.
- Abaixo do simulador, a página explica as equações, o método numérico, a física do vórtice e o Problema do Milênio, e traz um roteiro para a apresentação com perguntas prováveis dos jurados.

Atalhos: `Espaço` pausa · `R` reinicia · `F` tela cheia · `P` foto · `D` alterna 2D/3D · `1`–`7` cenários · `V` troca a visualização · `O` solta um objeto (3D).

## Apresentação

Nove capítulos, do ralo da pia à polêmica de 2026: a equação acende termo a termo, a linha do tempo anda com a rolagem e o colapso acontece enquanto você rola a página.

Atalhos: `←` `→` mudam o capítulo · `F` tela cheia · `T` cronômetro.

## Como rodar

Não precisa instalar nada: cada página é um único arquivo HTML, que funciona sem internet no Chrome ou no Edge.

- `index.html` — o simulador
- `apresentacao/index.html` — a apresentação

As animações rodam mesmo com os efeitos de animação do sistema desligados. Para uma versão sem movimento, abra o endereço com `?calmo` (ou `#calmo`) no final.

## Referências

- Jos Stam, *Stable Fluids*, SIGGRAPH 1999.
- Mark Harris, *Fast Fluid Dynamics Simulation on the GPU*, GPU Gems, cap. 38, 2004.
- Charles Fefferman, *Existence and Smoothness of the Navier–Stokes Equation*, Clay Mathematics Institute, 2000.
- OpenAI, *On the Navier–Stokes Millennium Prize Problem*, set. 2026.
