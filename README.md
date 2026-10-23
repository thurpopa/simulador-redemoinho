# Como uma IA chegou a Navier–Stokes?

Projeto de feira de ciências (2026): o problema de US$ 1 milhão das equações de Navier–Stokes, como uma IA chegou a uma solução anunciada para ele em setembro de 2026 e o que é, de verdade, uma inteligência artificial.

| | |
|---|---|
| **Estande (6 telas)** | https://thurpopa.github.io/simulador-redemoinho/estande/ |
| **Falas da equipe** | https://thurpopa.github.io/simulador-redemoinho/falas/ |
| **Material de estudo** | https://thurpopa.github.io/simulador-redemoinho/estudo/ |
| **Simulador completo** | https://thurpopa.github.io/simulador-redemoinho/ |
| Apresentação antiga (mais longa) | https://thurpopa.github.io/simulador-redemoinho/apresentacao/ |

## O estande

Seis telas, uma ideia por tela; quem explica são os apresentadores.

1. **O que é Navier–Stokes:** a equação que diz como a água, o ar e a fumaça se mexem.
2. **O problema:** um redemoinho pode girar infinitamente rápido? Um Problema do Milênio, de US$ 1 milhão.
3. **A IA chega:** mais de 10 mil agentes de IA, 88 horas. Uma solução anunciada, ainda em conferência.
4. **Como funciona uma IA:** uma rede neural de verdade, em miniatura (cerca de 21 mil números), treina na frente do visitante para prever a próxima palavra, e cai numa pegadinha ("a lua gira no ralo"): provável não é verdadeiro.
5. **Como a IA resolveu:** um agente propõe, o visitante critica, outro corrige e um conferente faz as contas de cada passo, como o assistente de provas Lean.
6. **O simulador:** o visitante mexe no redemoinho; a mão dele é um "empurrão de fora", e a prova da IA também precisou de um.

Teclas: `→` ou `Espaço` avança · `←` volta · `1`–`6` vão direto · `Enter` faz a demo andar · `E` desliga o empurrão de fora (tela 6) · `V` modo vitrine · `F` tela cheia.

## Simulador

Resolve as equações de Navier–Stokes ao vivo, na placa de vídeo (WebGL 2), com o método *Stable Fluids*: sete cenários em 2D, o colapso autossimilar da construção anunciada em 3D e objetos soltos no redemoinho. No estande ele aparece em tela cheia (`?estande`).

## Como rodar

Não precisa instalar nada nem de internet: são páginas HTML que funcionam no Chrome ou no Edge.

- `index.html` — o simulador
- `estande/index.html` — as 6 telas (as demos ficam em `estande/estande/`)
- `falas/index.html` — o roteiro para 3 e para 2 apresentadores
- `estudo/index.html` — o material de estudo
- `apresentacao/index.html` — a apresentação antiga

As animações rodam mesmo com os efeitos de animação do sistema desligados. Para uma versão sem movimento, abra o endereço com `?calmo` (ou `#calmo`) no final.

## Referências

- Jos Stam, *Stable Fluids*, SIGGRAPH 1999.
- Charles Fefferman, *Existence and Smoothness of the Navier–Stokes Equation*, Clay Mathematics Institute, 2000.
- OpenAI, *On the Navier–Stokes Millennium Prize Problem*, set. 2026.
