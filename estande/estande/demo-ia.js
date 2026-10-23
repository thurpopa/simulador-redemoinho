/* Demo 2 · "Treine uma IA" (tela 4 do Estande)
 *
 * Uma rede neural de verdade, em miniatura, que aprende a prever a próxima palavra.
 *   entrada: as 2 palavras anteriores (com a marca <início> quando falta palavra)
 *   16 números por palavra (32 concatenados) → 48 neurônios tanh → softmax no vocabulário inteiro
 *   treino: entropia cruzada, Adam (taxa 0,01), lotes de 32, mulberry32 com semente 2026
 *   O número de passos é fixo (PASSOS): o resultado sai sempre igual, em qualquer computador.
 *   Os passos são espalhados por ~5 s, no máximo ~12 ms de conta por quadro.
 *
 * Interface (contrato do Estande): window.DemoIA = { mount, enter, leave, step, auto, reset }.
 * Ao carregar, o arquivo só define window.DemoIA. Nada de teclado: o Enter chega por step().
 * Testes fora do navegador: window.DemoIA._interno (Modelo, FRASES, PASSOS, verificar).
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Corpus: frases curtas, em minúsculas, sobre água, ar, redemoinho,   */
  /* cozinha e escola. Regras do plano:                                  */
  /*  - 11 frases com "cada vez mais rápido";                             */
  /*  - 3 com "cada vez mais forte" ou "fino";                           */
  /*  - 7 com "gira no ralo";                                            */
  /*  - "lua" aparece, mas nenhuma frase diz em volta do que a Lua gira; */
  /*  - "devagar" e "azul" aparecem em outras frases; sem nomes.         */
  /* ------------------------------------------------------------------ */
  var FRASES = [
    // giro cada vez mais rápido
    'o redemoinho gira cada vez mais rápido',
    'a patinadora gira cada vez mais rápido',
    'a água gira cada vez mais rápido no ralo',
    'a espuma gira cada vez mais rápido no ralo',
    'o tornado gira cada vez mais rápido',
    'o pião gira cada vez mais rápido',
    'o furacão gira cada vez mais rápido sobre o mar',
    'o liquidificador gira cada vez mais rápido',
    'o ventilador gira cada vez mais rápido',
    'a roda da bicicleta gira cada vez mais rápido na descida',
    'o vento sopra cada vez mais rápido',
    // mais forte, mais fino
    'a chuva cai cada vez mais forte',
    'o vento fica cada vez mais forte',
    'o redemoinho fica cada vez mais fino',
    // gira no ralo
    'a água gira no ralo',
    'o redemoinho gira no ralo da pia',
    'a espuma gira no ralo da pia',
    'a água da banheira gira no ralo',
    'o sabão gira no ralo',
    'a água do banho gira no ralo',
    'a sujeira gira no ralo da cozinha',
    'a roda gigante gira no parque',
    // lua (sem dizer em volta do que ela gira)
    'a lua puxa a maré',
    'a lua brilha à noite',
    'a lua cheia ilumina o mar',
    'a maré sobe com a lua cheia',
    'a lua nova some no céu',
    // devagar e azul
    'o mel escorre devagar',
    'a tartaruga anda devagar',
    'o gelo derrete devagar na sombra',
    'a patinadora abre os braços e gira devagar',
    'a folha cai devagar no lago',
    'o céu é azul',
    'o mar é azul e fundo',
    'a caneta azul está na mesa',
    'a chama do fogão é azul',
    'a garrafa azul está cheia de água',
    // água
    'a água ferve a cem graus',
    'o gelo flutua na água',
    'a chuva molha a rua',
    'o rio corre para o mar',
    'a onda bate na pedra',
    'a gota cai da torneira',
    'a torneira pinga a noite toda',
    'o vapor sobe da panela',
    'o copo está cheio de água gelada',
    'a água escorre pelo vidro da janela',
    'a cachoeira cai sobre as pedras',
    'o barco flutua no lago',
    'a água do mar é salgada',
    'a esponja absorve a água',
    'a mangueira molha o jardim',
    'a poça seca com o sol',
    'a água limpa é transparente',
    'a maré baixa mostra a areia',
    'a areia da praia fica quente',
    'a água sobe no canudo',
    'a chuva forte enche o rio',
    'a enchente cobre a rua',
    'a água congela no inverno',
    'o gelo é água sólida',
    'o vapor é água quente no ar',
    'a pia da cozinha está entupida',
    'o encanador conserta a pia',
    'a água da piscina é fria',
    'a criança pula na piscina',
    'a boia flutua na piscina',
    // ar
    'o ar quente sobe',
    'o ar frio desce',
    'o vento empurra as nuvens',
    'o balão sobe com ar quente',
    'a pipa voa alto com o vento',
    'o avião voa sobre as nuvens',
    'a fumaça sobe da chaminé',
    'o vento balança as árvores',
    'o furacão nasce sobre o mar quente',
    'a pressão do ar empurra a água',
    'a bexiga estoura com muito ar',
    'o vento frio vem do mar',
    'a neblina cobre a cidade de manhã',
    'o pássaro voa contra o vento',
    'a fumaça forma um anel no ar',
    'o ventilador espalha o ar da sala',
    'o ar parado esquenta a sala',
    'a asa do avião corta o ar',
    'o vento leva a areia da praia',
    'o furacão é um redemoinho gigante',
    'a tempestade derruba a árvore',
    'o raio ilumina o céu',
    // redemoinho
    'o redemoinho afunda no meio',
    'o redemoinho puxa as folhas',
    'o redemoinho aparece na banheira',
    'o redemoinho some quando a água acaba',
    'a colher faz um redemoinho no café',
    'a patinadora fecha os braços',
    'o centro do redemoinho é estreito',
    'o redemoinho tem um buraco no meio',
    'a água desce em espiral',
    'a espiral fica estreita no fundo',
    'o redemoinho nasce na pia quando a água desce',
    'duas garrafas fazem um tornado de água',
    'o grupo filma o redemoinho na garrafa',
    'o simulador mostra o redemoinho na tela',
    'a água do rio forma um redemoinho perto da pedra',
    // cozinha
    'a panela de pressão apita',
    'o feijão cozinha na panela de pressão',
    'o arroz está pronto',
    'o bolo cresce no forno',
    'o forno está quente',
    'a geladeira guarda o leite',
    'o leite ferve e derrama no fogão',
    'a manteiga derrete na frigideira',
    'o ovo frita na frigideira',
    'a colher mexe o café',
    'o açúcar some no café quente',
    'o sal deixa a água salgada',
    'o óleo flutua na água',
    'a massa do pão descansa na mesa',
    'a faca corta o tomate',
    'a sopa esfria no prato',
    'o chá esfria na xícara',
    'a pia está cheia de louça',
    'o detergente faz espuma na pia',
    'o liquidificador mistura a fruta com leite',
    'o suco de laranja está gelado',
    'o gelo derrete no suco',
    'a pipoca estoura na panela',
    'o fogão tem quatro bocas',
    'o micro-ondas esquenta a comida',
    'a chaleira apita quando a água ferve',
    'o café cheira bem de manhã',
    'o pão sai quente do forno',
    'a cozinheira prova a sopa',
    'a farinha suja a mesa',
    'o queijo derrete na pizza',
    'o prato fundo é para a sopa',
    // escola
    'a professora explica a equação',
    'o aluno resolve a conta',
    'a turma faz uma experiência',
    'o caderno está na mochila',
    'a lousa está cheia de contas',
    'a escola tem uma horta',
    'a feira de ciências é amanhã',
    'o grupo mostra o projeto na feira',
    'a régua mede o papel',
    'o lápis escreve no caderno',
    'a turma responde junto',
    'o computador da escola é lento',
    'o livro de física é grosso',
    'a prova de matemática é na sexta',
    'o aluno estuda para a prova',
    'a equação descreve o movimento da água',
    'a física explica o movimento',
    'a experiência mostra o redemoinho',
    'o laboratório tem uma pia grande',
    'a sala fica quieta na prova',
    'a turma sai para o pátio',
    'o computador calcula muito rápido',
    'o termômetro mede a temperatura',
    'o sol esquenta a terra',
    'a estrela brilha no céu',
    'o céu fica laranja no fim da tarde',
    'a noite é fria no deserto',
    'a sombra da árvore é fresca'
  ];

  /* ------------------------------------------------------------------ */
  /* Receita da rede                                                      */
  /* ------------------------------------------------------------------ */
  var SEMENTE = 2026;
  var EMB = 16, CTX = 2, ENT = EMB * CTX, OCU = 48;
  var LOTE = 32, TAXA = 0.01, BETA1 = 0.9, BETA2 = 0.999, EPS = 1e-8;
  var ESCALA_SAIDA = 0.55;   // sorteio inicial grande: a IA sem treino já tem "preferências" sem sentido
  var PASSOS = 600;          // passos de treino, sempre os mesmos
  var DURACAO = 5000;        // ms de treino na tela
  var ORCAMENTO = 12;        // ms de conta por quadro, no máximo
  var MAX_NOVAS = 6;         // palavras que o visitante pode acrescentar
  var FRASE_INICIAL = ['o', 'redemoinho', 'gira', 'cada', 'vez', 'mais'];
  var FRASE_PEGADINHA = ['a', 'lua', 'gira', 'no'];
  var PALPITES = ['rápido', 'devagar', 'azul'];

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Vocabulário e exemplos (contexto de 2 palavras → próxima palavra). */
  function prepararDados(frases) {
    var palavras = [], id = Object.create(null), freq = [];
    var e0 = [], e1 = [], alvo = [];
    for (var f = 0; f < frases.length; f++) {
      var toks = frases[f].trim().split(/\s+/);
      var ids = [];
      for (var i = 0; i < toks.length; i++) {
        var w = toks[i];
        if (!(w in id)) { id[w] = palavras.length; palavras.push(w); freq.push(0); }
        ids.push(id[w]);
        freq[id[w]]++;
      }
      for (i = 0; i < ids.length; i++) {
        // na entrada, 0 é a marca <início>; a palavra k entra como k+1
        e0.push(i >= 2 ? ids[i - 2] + 1 : 0);
        e1.push(i >= 1 ? ids[i - 1] + 1 : 0);
        alvo.push(ids[i]);
      }
    }
    return {
      palavras: palavras, id: id, freq: freq,
      e0: Int32Array.from(e0), e1: Int32Array.from(e1), alvo: Int32Array.from(alvo),
      n: alvo.length
    };
  }

  /* A rede: todos os números num único Float64Array. */
  function Modelo(d) {
    var V = d.palavras.length, NE = V + 1;
    var oE = 0, oW1 = NE * EMB, oB1 = oW1 + OCU * ENT, oW2 = oB1 + OCU, oB2 = oW2 + V * OCU, N = oB2 + V;
    var P = new Float64Array(N), G = new Float64Array(N), M1 = new Float64Array(N), M2 = new Float64Array(N);
    var x = new Float64Array(ENT), h = new Float64Array(OCU), dh = new Float64Array(OCU), dx = new Float64Array(ENT);
    var z = new Float64Array(V);
    var rng = null, self = this;

    this.V = V; this.N = N; this.P = P; this.t = 0;
    this.faixas = { E: [oE, oW1], W1: [oW1, oB1], b1: [oB1, oW2], W2: [oW2, oB2], b2: [oB2, N] };

    function gauss() {
      var u = 1 - rng(), v = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    // sorteio inicial: sempre o mesmo (mulberry32, semente 2026)
    this.iniciar = function () {
      rng = mulberry32(SEMENTE);
      var i, s1 = 1 / Math.sqrt(ENT);
      for (i = oE; i < oW1; i++) P[i] = gauss();
      for (i = oW1; i < oB1; i++) P[i] = gauss() * s1;
      for (i = oB1; i < oW2; i++) P[i] = 0;
      for (i = oW2; i < oB2; i++) P[i] = gauss() * ESCALA_SAIDA;
      for (i = oB2; i < N; i++) P[i] = 0;
      M1.fill(0); M2.fill(0);
      self.t = 0;
    };

    // probabilidades da próxima palavra; c0, c1 = índices de entrada (0 = <início>)
    function frente(c0, c1) {
      var i, j, v, s, b, e0 = oE + c0 * EMB, e1 = oE + c1 * EMB;
      for (i = 0; i < EMB; i++) { x[i] = P[e0 + i]; x[EMB + i] = P[e1 + i]; }
      for (j = 0; j < OCU; j++) {
        s = P[oB1 + j]; b = oW1 + j * ENT;
        for (i = 0; i < ENT; i++) s += P[b + i] * x[i];
        h[j] = Math.tanh(s);
      }
      var mx = -Infinity;
      for (v = 0; v < V; v++) {
        s = P[oB2 + v]; b = oW2 + v * OCU;
        for (j = 0; j < OCU; j++) s += P[b + j] * h[j];
        z[v] = s; if (s > mx) mx = s;
      }
      var soma = 0;
      for (v = 0; v < V; v++) { z[v] = Math.exp(z[v] - mx); soma += z[v]; }
      for (v = 0; v < V; v++) z[v] /= soma;
      return z;
    }

    // um passo de treino: chuta, compara (entropia cruzada), ajusta (Adam)
    this.passo = function () {
      var i, j, v, n, b, g, k = 1 / LOTE, perda = 0;
      G.fill(0);
      for (n = 0; n < LOTE; n++) {
        var ex = (rng() * d.n) | 0, c0 = d.e0[ex], c1 = d.e1[ex], a = d.alvo[ex];
        frente(c0, c1);
        perda -= Math.log(z[a] + 1e-300);
        z[a] -= 1;                                   // dErro/dLogit = p - 1(alvo)
        dh.fill(0);
        for (v = 0; v < V; v++) {
          g = z[v] * k; G[oB2 + v] += g; b = oW2 + v * OCU;
          for (j = 0; j < OCU; j++) { G[b + j] += g * h[j]; dh[j] += g * P[b + j]; }
        }
        dx.fill(0);
        for (j = 0; j < OCU; j++) {
          var da = dh[j] * (1 - h[j] * h[j]);
          G[oB1 + j] += da; b = oW1 + j * ENT;
          for (i = 0; i < ENT; i++) { G[b + i] += da * x[i]; dx[i] += da * P[b + i]; }
        }
        var g0 = oE + c0 * EMB, g1 = oE + c1 * EMB;
        for (i = 0; i < EMB; i++) { G[g0 + i] += dx[i]; G[g1 + i] += dx[EMB + i]; }
      }
      self.t++;
      var c1b = 1 - Math.pow(BETA1, self.t), c2b = 1 - Math.pow(BETA2, self.t);
      for (i = 0; i < N; i++) {
        g = G[i];
        M1[i] = BETA1 * M1[i] + (1 - BETA1) * g;
        M2[i] = BETA2 * M2[i] + (1 - BETA2) * g * g;
        P[i] -= TAXA * (M1[i] / c1b) / (Math.sqrt(M2[i] / c2b) + EPS);
      }
      return perda / LOTE;
    };

    function entrada(w) { return (w != null && w in d.id) ? d.id[w] + 1 : 0; }

    // probabilidades (cópia) para o contexto das 2 últimas palavras de `frase`
    this.prever = function (frase) {
      var n = frase.length;
      var c0 = n >= 2 ? entrada(frase[n - 2]) : 0, c1 = n >= 1 ? entrada(frase[n - 1]) : 0;
      return Float64Array.from(frente(c0, c1));
    };

    this.prob = function (frase, palavra) { return this.prever(frase)[d.id[palavra]]; };

    // as k palavras mais prováveis
    this.top = function (frase, k) {
      var p = this.prever(frase), r = [];
      for (var v = 0; v < V; v++) {
        if (r.length < k || p[v] > r[r.length - 1].p) {
          r.push({ w: d.palavras[v], p: p[v] });
          r.sort(function (a, b) { return b.p - a.p; });
          if (r.length > k) r.pop();
        }
      }
      return r;
    };

    // erro médio em todos os exemplos (para o começo da curva)
    this.perdaMedia = function () {
      var s = 0;
      for (var e = 0; e < d.n; e++) { frente(d.e0[e], d.e1[e]); s -= Math.log(z[d.alvo[e]] + 1e-300); }
      return s / d.n;
    };
  }

  var _dados = null;
  function dados() { return _dados || (_dados = prepararDados(FRASES)); }

  // a checagem do plano: depois do treino, P(rápido | "vez mais") > 60% e P(ralo | "gira no") > 50%
  function verificar(m) {
    var r = {
      rapido: m.prob(['vez', 'mais'], 'rápido'),
      ralo: m.prob(['gira', 'no'], 'ralo'),
      parametros: m.N
    };
    r.ok = r.rapido > 0.6 && r.ralo > 0.5;
    return r;
  }

  function formatarMil(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function pct(p) { return Math.round(p * 100) + '%'; }
  function agora() { return (typeof performance !== 'undefined' ? performance : Date).now(); }

  /* ------------------------------------------------------------------ */
  /* Visual                                                              */
  /* ------------------------------------------------------------------ */
  var CSS = [
    '.demo-ia{position:relative;box-sizing:border-box;width:100%;height:100%;overflow:hidden;',
    ' padding:1.2vh 3.2vw 1vh;display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);',
    ' grid-template-rows:auto auto minmax(0,1fr) auto auto;',
    ' grid-template-areas:"frase frase" "palp nums" "barras nums" "botoes nums" "rodape rodape";',
    ' column-gap:2.4vw;row-gap:1.2vh;color:var(--text);font-family:var(--f-body);',
    ' -webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}',
    '.demo-ia *{box-sizing:border-box}',
    '.demo-ia button{font:inherit;color:inherit;margin:0;cursor:pointer;-webkit-appearance:none;appearance:none}',
    '.demo-ia button:focus{outline:none}',
    '.demo-ia button:focus-visible{outline:.35vh solid var(--cool);outline-offset:.3vh}',

    /* frase em construção */
    '.demo-ia .ia-frase{grid-area:frase;display:flex;align-items:center;justify-content:center;min-width:0;',
    ' height:8.6vh;padding:0 2vw;border-radius:1.6vh;background:var(--bg2);border:.2vh solid var(--line)}',
    '.demo-ia .ia-frase-txt{white-space:nowrap;font-family:var(--f-display);font-weight:600;font-size:5.3vh;',
    ' line-height:1.1;letter-spacing:-.01em}',
    '.demo-ia .ia-nova{color:var(--mint);display:inline-block;animation:ia-entra .5s cubic-bezier(.2,.9,.3,1.3)}',
    '.demo-ia .ia-lacuna{display:inline-block;width:2.7em;height:.95em;vertical-align:-.12em;margin-left:.08em;',
    ' border-bottom:.13em solid var(--mint);animation:ia-pisca 1.1s ease-in-out infinite}',
    '.demo-ia.ia-modo-pega .ia-lacuna{border-bottom-color:var(--gold)}',
    '.demo-ia .ia-ctx{white-space:nowrap;border-radius:.22em;padding:0 .14em;margin:0 -.06em;background:rgba(60,157,255,.17);',
    ' box-shadow:inset 0 -.07em 0 rgba(60,157,255,.6)}',
    '@keyframes ia-pisca{0%,100%{opacity:1}50%{opacity:.25}}',
    '@keyframes ia-entra{0%{transform:translateY(.4em) scale(.85);opacity:0}100%{transform:none;opacity:1}}',

    /* palpite / rótulo da pegadinha */
    '.demo-ia .ia-palp{grid-area:palp;display:flex;align-items:center;gap:1.1vw;min-width:0;height:6.6vh}',
    '.demo-ia .ia-palp-rot{font-size:3vh;color:var(--muted);white-space:nowrap;margin-right:.4vw}',
    '.demo-ia .ia-palp-b{flex:0 1 auto;min-width:0;height:6.2vh;padding:0 2.2vw;border-radius:1.3vh;font-size:3.1vh;',
    ' font-weight:600;background:var(--bg3);border:.25vh solid var(--line2);transition:transform .15s,background .2s}',
    '.demo-ia .ia-palp-b:hover{background:var(--line)}',
    '.demo-ia .ia-palp-b.ia-escolhido{border-color:var(--gold);box-shadow:0 0 0 .3vh var(--gold);color:var(--gold)}',
    '.demo-ia .ia-pega{display:none;align-items:center;gap:1vw;font-family:var(--f-display);font-weight:700;',
    ' font-size:4.4vh;color:var(--red);white-space:nowrap;animation:ia-entra .5s cubic-bezier(.2,.9,.3,1.3)}',
    '.demo-ia .ia-pega i{font-style:normal;color:var(--text)}',
    '.demo-ia.ia-sem-palp .ia-palp-rot,.demo-ia.ia-sem-palp .ia-palp-b{visibility:hidden}',
    '.demo-ia.ia-mostra-pega .ia-palp-rot,.demo-ia.ia-mostra-pega .ia-palp-b{display:none}',
    '.demo-ia.ia-mostra-pega .ia-pega{display:flex}',

    /* selo + barras */
    '.demo-ia .ia-barras{grid-area:barras;display:flex;flex-direction:column;gap:.9vh;min-height:0;min-width:0}',
    '.demo-ia .ia-selo{position:relative;align-self:flex-start;overflow:hidden;display:flex;align-items:center;gap:.8vw;',
    ' height:4vh;padding:0 1.3vw;border-radius:99vh;font-size:2.3vh;font-weight:800;letter-spacing:.08em;',
    ' color:var(--red);border:.25vh solid currentColor;background:rgba(255,90,110,.1)}',
    '.demo-ia .ia-selo-ponto{width:1.4vh;height:1.4vh;border-radius:50%;background:currentColor}',
    '.demo-ia .ia-selo-prog{position:absolute;left:0;top:0;bottom:0;width:0;background:currentColor;opacity:.2}',
    '.demo-ia .ia-selo-txt{position:relative}',
    '.demo-ia .ia-selo.ia-treinando{color:var(--gold);background:rgba(255,200,87,.08)}',
    '.demo-ia .ia-selo.ia-treinando .ia-selo-ponto{animation:ia-pulsa .7s ease-in-out infinite}',
    '.demo-ia .ia-selo.ia-pronta{color:var(--green);background:rgba(74,222,128,.1)}',
    '@keyframes ia-pulsa{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.45);opacity:.5}}',
    '.demo-ia .ia-lista{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}',
    '.demo-ia .ia-barra{position:absolute;left:0;right:0;top:0;height:calc(20% - .9vh);display:flex;align-items:center;',
    ' padding:0;border:0;border-radius:1.2vh;background:var(--bg3);overflow:hidden;text-align:left;',
    ' transition:top .45s cubic-bezier(.2,.8,.2,1),opacity .25s,box-shadow .2s}',
    '.demo-ia .ia-barra:hover{box-shadow:inset 0 0 0 .3vh var(--line2)}',
    '.demo-ia .ia-barra.ia-palpite{box-shadow:inset 0 0 0 .4vh var(--gold)}',
    '.demo-ia .ia-fill{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:inherit;',
    ' background:linear-gradient(90deg,rgba(60,157,255,.28),rgba(60,157,255,.55));transition:width .3s ease-out}',
    '.demo-ia .ia-barra.ia-topo .ia-fill{background:linear-gradient(90deg,rgba(111,242,214,.35),rgba(111,242,214,.75))}',
    '.demo-ia.ia-pega-ralo .ia-barra.ia-topo .ia-fill{background:linear-gradient(90deg,rgba(255,90,110,.35),rgba(255,90,110,.8))}',
    '.demo-ia .ia-w{position:relative;flex:1 1 auto;min-width:0;padding-left:1.4vw;font-size:3.1vh;font-weight:650;',
    ' white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.15}',
    '.demo-ia .ia-p{position:relative;flex:0 0 auto;padding:0 1.4vw;line-height:1;font-family:var(--f-mono);font-size:2.9vh;font-weight:700;',
    ' font-variant-numeric:tabular-nums}',
    '.demo-ia .ia-barra.ia-topo .ia-w,.demo-ia .ia-barra.ia-topo .ia-p{color:#fff}',
    '.demo-ia.ia-cheia .ia-lista{opacity:.4;pointer-events:none;transition:opacity .4s}',
    '.demo-ia.ia-cheia .ia-b-rec{color:var(--text);border-color:var(--mint);box-shadow:0 0 0 .3vh rgba(111,242,214,.35)}',

    /* botões */
    '.demo-ia .ia-botoes{grid-area:botoes;display:flex;gap:1.2vw;min-width:0}',
    '.demo-ia .ia-b{flex:1 1 0;min-width:0;height:7vh;border-radius:1.4vh;font-size:3.1vh;font-weight:700;',
    ' white-space:nowrap;background:var(--bg3);border:.25vh solid var(--line2);transition:transform .15s,opacity .2s}',
    '.demo-ia .ia-b:active,.demo-ia .ia-palp-b:active{transform:scale(.96)}',
    '.demo-ia .ia-b-treinar{flex-grow:1.5;background:var(--mint);border-color:var(--mint);color:#04211b;',
    ' font-family:var(--f-display);font-size:3.4vh;font-weight:800;letter-spacing:.06em}',
    '.demo-ia .ia-b-pega{color:var(--gold);border-color:rgba(255,200,87,.6)}',
    '.demo-ia .ia-b-rec{color:var(--muted)}',
    '.demo-ia .ia-b:disabled{opacity:.32;cursor:default;transform:none}',

    /* os números da IA */
    '.demo-ia .ia-nums{grid-area:nums;display:flex;flex-direction:column;min-height:0;min-width:0;padding:1.4vh 1.4vw 1.2vh;',
    ' border-radius:1.6vh;background:var(--bg2);border:.2vh solid var(--line)}',
    '.demo-ia .ia-rot{font-size:2.4vh;font-weight:600;color:var(--muted);letter-spacing:.02em}',
    '.demo-ia .ia-grade{display:block;flex:1.9 1 0;min-height:0;width:100%;margin:.8vh 0 1vh}',
    '.demo-ia .ia-erro{flex:1 1 0;min-height:0;display:flex;flex-direction:column}',
    '.demo-ia .ia-curva{display:block;flex:1 1 0;min-height:0;width:100%;margin-top:.4vh}',

    '.demo-ia .ia-rodape{grid-area:rodape;text-align:center;font-size:1.9vh;line-height:1.25;color:var(--muted);white-space:nowrap;',
    ' overflow:hidden;text-overflow:ellipsis}',
    '.demo-ia .ia-rodape b{color:var(--text);font-family:var(--f-mono);font-weight:700}',

    /* toque (clique de verdade ou do modo vitrine) */
    '.demo-ia .ia-toque{animation:ia-toque .65s ease-out}',
    '@keyframes ia-toque{0%{transform:scale(1)}30%{transform:scale(.95);filter:brightness(1.5)}100%{transform:scale(1)}}',

    /* calmo: só quando a página pedir (?calmo) */
    'html.calm .demo-ia,html.calm .demo-ia *{animation:none!important;transition:none!important}',

    /* celular: empilha e rola dentro do container */
    '@media (max-width:700px){',
    ' .demo-ia{overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;gap:12px;padding:12px 16px 16px}',
    ' .demo-ia>*{flex:none}',
    ' .demo-ia .ia-frase{height:auto;min-height:64px;padding:10px 12px}',
    ' .demo-ia .ia-frase-txt{white-space:normal;text-align:center;font-size:26px}',
    ' .demo-ia .ia-palp{height:auto;min-height:48px;flex-wrap:wrap;gap:8px}',
    ' .demo-ia .ia-palp-rot{font-size:16px;width:100%}',
    ' .demo-ia.ia-sem-palp:not(.ia-mostra-pega) .ia-palp{display:none}',
    ' .demo-ia .ia-palp-b{flex:1 1 0;height:48px;font-size:18px;padding:0 8px}',
    ' .demo-ia .ia-pega{font-size:24px;white-space:normal}',
    ' .demo-ia .ia-selo{height:34px;font-size:14px;padding:0 14px;gap:8px}',
    ' .demo-ia .ia-selo-ponto{width:10px;height:10px}',
    ' .demo-ia .ia-lista{flex:none;height:260px}',
    ' .demo-ia .ia-barra{height:calc(20% - 8px);border-radius:10px}',
    ' .demo-ia .ia-w{font-size:19px;padding-left:12px}',
    ' .demo-ia .ia-p{font-size:17px;padding:0 12px}',
    ' .demo-ia .ia-botoes{gap:8px}',
    ' .demo-ia .ia-b{height:54px;font-size:16px;border-radius:12px}',
    ' .demo-ia .ia-b-treinar{font-size:18px}',
    ' .demo-ia .ia-nums{height:300px;padding:12px}',
    ' .demo-ia .ia-rot{font-size:14px}',
    ' .demo-ia .ia-rodape{white-space:normal;font-size:13px}',
    '}'
  ].join('\n');

  /* ------------------------------------------------------------------ */
  /* Estado da demo                                                      */
  /* ------------------------------------------------------------------ */
  var raiz = null, el = {}, modelo = null, d = null;
  var st = null;
  var linhas = Object.create(null);         // barras visíveis, por palavra
  var amostra = null;                       // índices e escalas dos 240 quadradinhos
  var cores = null;
  var perdaInicial = null;
  var hist = [];                            // curva de erro (média móvel)
  var raf = 0, treinoT0 = 0, treinoDecorrido = 0;
  var visivel = false, ultimoToque = 0, timerOcioso = 0;
  var autoAtivo = false, autoTimers = [], autoGeracao = 0, aoTerminarTreino = null;
  var stats = { quadros: 0, maxMs: 0, somaMs: 0, passosPorQuadroMax: 0, duracaoMs: 0, lista: [] };
  var checagemFeita = false;
  var passoMs = 3;                          // estimativa do tempo de um passo de treino

  function estadoInicial() {
    return { treino: 'nao', modo: 'normal', base: FRASE_INICIAL.slice(), novas: [], palpite: null };
  }
  function calmo() { return document.documentElement.classList.contains('calm'); }

  function criar(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function montarDOM(container) {
    var estilo = criar('style'); estilo.textContent = CSS;
    raiz = criar('div', 'demo-ia');
    raiz.appendChild(estilo);

    el.frase = criar('div', 'ia-frase');
    el.fraseTxt = criar('span', 'ia-frase-txt');
    el.frase.appendChild(el.fraseTxt);

    el.palp = criar('div', 'ia-palp');
    el.palp.appendChild(criar('span', 'ia-palp-rot', 'Seu palpite:'));
    el.palpBotoes = {};
    PALPITES.forEach(function (w) {
      var b = criar('button', 'ia-palp-b', w);
      b.type = 'button';
      b.addEventListener('click', function () { palpite(w); });
      el.palpBotoes[w] = b;
      el.palp.appendChild(b);
    });
    el.pega = criar('div', 'ia-pega');
    el.pega.innerHTML = 'Soa certo. <i>Está errado.</i>';
    el.palp.appendChild(el.pega);

    el.barras = criar('div', 'ia-barras');
    el.selo = criar('div', 'ia-selo');
    el.seloProg = criar('span', 'ia-selo-prog');
    el.seloTxt = criar('span', 'ia-selo-txt', 'IA SEM TREINO');
    el.selo.appendChild(el.seloProg);
    el.selo.appendChild(criar('span', 'ia-selo-ponto'));
    el.selo.appendChild(el.seloTxt);
    el.lista = criar('div', 'ia-lista');
    el.lista.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('.ia-barra') : null;
      var r = b && linhas[b.dataset.w];
      if (r && r.el === b && !r.saindo) escolher(b.dataset.w, b);
    });
    el.barras.appendChild(el.selo);
    el.barras.appendChild(el.lista);

    el.botoes = criar('div', 'ia-botoes');
    el.bTreinar = criar('button', 'ia-b ia-b-treinar', 'TREINAR');
    el.bPega = criar('button', 'ia-b ia-b-pega', 'Pegadinha');
    el.bRec = criar('button', 'ia-b ia-b-rec', 'Recomeçar');
    [el.bTreinar, el.bPega, el.bRec].forEach(function (b) { b.type = 'button'; el.botoes.appendChild(b); });
    el.bTreinar.addEventListener('click', function () { treinar(); });
    el.bPega.addEventListener('click', function () { pegadinha(); });
    el.bRec.addEventListener('click', function () { recomecar(); });

    el.nums = criar('div', 'ia-nums');
    el.nums.appendChild(criar('div', 'ia-rot', 'os números da IA'));
    el.grade = criar('canvas', 'ia-grade');
    el.nums.appendChild(el.grade);
    el.erro = criar('div', 'ia-erro');
    el.erro.appendChild(criar('div', 'ia-rot', 'erro'));
    el.curva = criar('canvas', 'ia-curva');
    el.erro.appendChild(el.curva);
    el.nums.appendChild(el.erro);

    el.rodape = criar('div', 'ia-rodape');
    el.rodape.innerHTML = 'IA de verdade, em miniatura: <b>' + formatarMil(modelo.N) +
      '</b> números ajustáveis. As grandes são muito, muito maiores.';

    [el.frase, el.palp, el.barras, el.botoes, el.nums, el.rodape].forEach(function (e) { raiz.appendChild(e); });
    container.appendChild(raiz);

    raiz.addEventListener('pointerdown', tocou, true);
    // os botões nunca ficam com o foco: o Enter/espaço do apresentador vai só para a página
    // (senão um botão focado receberia o clique do teclado além do step())
    raiz.querySelectorAll('button').forEach(function (b) { b.tabIndex = -1; });
    raiz.addEventListener('mousedown', function (e) { e.preventDefault(); });
    raiz.addEventListener('click', function () {
      var a = document.activeElement;
      if (a && a !== document.body && raiz.contains(a) && a.blur) a.blur();
    }, true);
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(function () { desenharTudo(); }).observe(raiz);
    } else {
      window.addEventListener('resize', desenharTudo);
    }
  }

  /* 240 quadradinhos: amostra fixa de números reais da rede, em posições embaralhadas:
     150 pesos da camada de 48 neurônios, 40 ajustes (vieses) desses neurônios e 50 ajustes
     da saída das palavras mais comuns. São os números que mais mudam no treino, por isso
     as cores mudam bem à vista. */
  function prepararAmostra() {
    var r = mulberry32(SEMENTE + 1), idx = [], esc = [];
    var f = modelo.faixas;
    function pegar(lista, n, escala) {
      for (var k = 0; k < n; k++) {
        var j = (r() * lista.length) | 0;
        idx.push(lista[j]); esc.push(escala); lista.splice(j, 1);
      }
    }
    var i, w1 = [], b1 = [], b2 = [];
    for (i = f.W1[0]; i < f.W1[1]; i++) w1.push(i);
    for (i = f.b1[0]; i < f.b1[1]; i++) b1.push(i);
    d.palavras.map(function (w, k) { return k; })
      .sort(function (a, b) { return d.freq[b] - d.freq[a] || a - b; })
      .slice(0, 80).forEach(function (v) { b2.push(f.b2[0] + v); });
    pegar(w1, 150, 0.36); pegar(b1, 40, 0.45); pegar(b2, 50, 0.45);
    // embaralha as posições (Fisher–Yates, fixo)
    for (var k = idx.length - 1; k > 0; k--) {
      var j = (r() * (k + 1)) | 0, a = idx[k], b = esc[k];
      idx[k] = idx[j]; esc[k] = esc[j]; idx[j] = a; esc[j] = b;
    }
    amostra = { idx: idx, esc: esc };
  }

  function lerCores() {
    var cs = getComputedStyle(raiz);
    function cor(nome, padrao) {
      var v = (cs.getPropertyValue(nome) || '').trim() || padrao;
      var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
      if (!m) return hex(padrao);
      return hex(v);
    }
    function hex(v) {
      v = v.replace('#', '');
      if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    }
    cores = {
      fundo: cor('--bg3', '#101a2e'), neg: cor('--cool', '#3c9dff'), pos: cor('--warm', '#ff6b3d'),
      linha: cor('--line', '#1c2742'), mint: cor('--mint', '#6ff2d6'), gold: cor('--gold', '#ffc857'),
      green: cor('--green', '#4ade80'), muted: cor('--dim', '#5f6c88')
    };
  }
  function rgb(c, a) { return a == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')'; }

  /* ------------------------------------------------------------------ */
  /* Desenho                                                             */
  /* ------------------------------------------------------------------ */
  function fraseAtual() { return st.base.concat(st.novas); }

  // frase em construção: as 2 últimas palavras (o que a IA olha) ganham um fundo azul
  function renderFrase() {
    var t = el.fraseTxt, todas = fraseAtual(), nb = st.base.length, n = todas.length;
    t.textContent = '';
    var ctx = criar('span', 'ia-ctx');
    todas.forEach(function (w, k) {
      var alvo = k >= n - 2 ? ctx : t;
      if (k && k !== n - 2) alvo.appendChild(document.createTextNode(' '));
      if (k === n - 2 && k) t.appendChild(document.createTextNode(' '));
      if (k >= nb) {
        var s = criar('span', 'ia-nova', w);
        if (k < n - 1) s.style.animation = 'none';
        alvo.appendChild(s);
      } else {
        alvo.appendChild(document.createTextNode(w));
      }
    });
    t.appendChild(ctx);
    if (st.novas.length < MAX_NOVAS) {
      t.appendChild(document.createTextNode(' '));
      t.appendChild(criar('span', 'ia-lacuna'));
    }
    ajustarFrase();
  }

  // a frase fica numa linha só: diminui a letra se não couber
  function ajustarFrase() {
    var t = el.fraseTxt;
    t.style.fontSize = '';
    if (window.innerWidth <= 700) return;
    var cs = getComputedStyle(el.frase);
    var livre = el.frase.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var largura = t.scrollWidth;
    if (livre > 0 && largura > livre) {
      var base = parseFloat(getComputedStyle(t).fontSize);
      t.style.fontSize = Math.floor(base * livre / largura * 0.98) + 'px';
    }
  }

  function renderEstado() {
    var treinada = st.treino === 'pronto';
    raiz.classList.toggle('ia-treinada', treinada);
    raiz.classList.toggle('ia-modo-pega', st.modo === 'pegadinha');
    raiz.classList.toggle('ia-cheia', st.novas.length >= MAX_NOVAS);
    raiz.classList.toggle('ia-pega-ralo', st.modo === 'pegadinha' && treinada && !st.novas.length);
    var mostraPalp = st.modo === 'normal' && st.novas.length === 0;
    raiz.classList.toggle('ia-sem-palp', !mostraPalp);
    raiz.classList.toggle('ia-mostra-pega', st.modo === 'pegadinha' && treinada);
    PALPITES.forEach(function (w) {
      el.palpBotoes[w].classList.toggle('ia-escolhido', st.palpite === w);
    });

    el.selo.classList.toggle('ia-treinando', st.treino === 'treinando');
    el.selo.classList.toggle('ia-pronta', treinada);
    el.seloTxt.textContent = st.treino === 'nao' ? 'IA SEM TREINO' : st.treino === 'treinando' ? 'TREINANDO…' : 'IA TREINADA';
    el.seloProg.style.width = st.treino === 'treinando' ? (100 * modelo.t / PASSOS).toFixed(1) + '%' : '0';

    el.bTreinar.disabled = st.treino !== 'nao';
  }

  function renderBarras() {
    var top = modelo.top(fraseAtual(), 5);
    var vistos = Object.create(null), anim = !calmo();
    var mostraPalp = st.modo === 'normal' && st.novas.length === 0;
    top.forEach(function (it, k) {
      var r = linhas[it.w];
      if (!r) {
        r = { el: criar('button', 'ia-barra'), fill: criar('span', 'ia-fill'), w: criar('span', 'ia-w', it.w), p: criar('span', 'ia-p') };
        r.el.type = 'button';
        r.el.tabIndex = -1;
        r.el.dataset.w = it.w;
        r.el.appendChild(r.fill); r.el.appendChild(r.w); r.el.appendChild(r.p);
        if (anim) { r.el.style.top = '100%'; r.el.style.opacity = '0'; }
        el.lista.appendChild(r.el);
        if (anim) void r.el.offsetWidth;
        linhas[it.w] = r;
      }
      if (r.saindo) { clearTimeout(r.saindo); r.saindo = 0; r.el.style.pointerEvents = ''; r.el.classList.remove('ia-saindo'); }
      r.el.style.top = (k * 20) + '%';
      r.el.style.opacity = '1';
      r.el.classList.toggle('ia-topo', k === 0);
      r.el.classList.toggle('ia-palpite', mostraPalp && st.palpite === it.w);
      r.fill.style.width = Math.max(1, it.p * 100).toFixed(2) + '%';
      r.p.textContent = pct(it.p);
      vistos[it.w] = 1;
    });
    Object.keys(linhas).forEach(function (w) {
      var r = linhas[w];
      if (vistos[w] || r.saindo) return;
      r.el.style.pointerEvents = 'none';
      r.el.classList.add('ia-saindo');
      r.el.classList.remove('ia-topo', 'ia-palpite');
      r.el.style.opacity = '0';
      r.el.style.top = '100%';
      r.saindo = setTimeout(function () {
        if (linhas[w] === r) { delete linhas[w]; }
        if (r.el.parentNode) r.el.parentNode.removeChild(r.el);
      }, anim ? 450 : 0);
    });
  }

  function limparBarras() {
    Object.keys(linhas).forEach(function (w) {
      var r = linhas[w];
      if (r.saindo) clearTimeout(r.saindo);
      if (r.el.parentNode) r.el.parentNode.removeChild(r.el);
    });
    linhas = Object.create(null);
  }

  function prepararCanvas(c) {
    var w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return null;
    var dpr = window.devicePixelRatio || 1;
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    return { g: g, w: w, h: h };
  }

  function desenharGrade() {
    var c = prepararCanvas(el.grade);
    if (!c) return;
    var g = c.g, cols = 20, lins = 12;
    var cel = Math.min(c.w / cols, c.h / lins);
    var gap = Math.max(1, cel * 0.13), raio = Math.max(1, cel * 0.18);
    var ox = (c.w - cel * cols) / 2, oy = (c.h - cel * lins) / 2;
    var P = modelo.P, f = cores.fundo;
    for (var k = 0; k < cols * lins; k++) {
      var val = P[amostra.idx[k]];
      var a = Math.min(1, Math.abs(val) / amostra.esc[k]);
      a = Math.pow(a, 0.7);
      var alvo = val < 0 ? cores.neg : cores.pos;
      var cr = Math.round(f[0] + (alvo[0] - f[0]) * a), cg = Math.round(f[1] + (alvo[1] - f[1]) * a),
        cb = Math.round(f[2] + (alvo[2] - f[2]) * a);
      g.fillStyle = 'rgb(' + cr + ',' + cg + ',' + cb + ')';
      var x = ox + (k % cols) * cel + gap / 2, y = oy + Math.floor(k / cols) * cel + gap / 2, s = cel - gap;
      if (g.roundRect) { g.beginPath(); g.roundRect(x, y, s, s, raio); g.fill(); }
      else g.fillRect(x, y, s, s);
    }
  }

  function desenharCurva() {
    var c = prepararCanvas(el.curva);
    if (!c) return;
    var g = c.g, w = c.w, h = c.h;
    var px = 4, py = Math.max(4, h * 0.08);
    var x0 = px, x1 = w - px, y0 = py, y1 = h - py;
    var max = perdaInicial * 1.04;
    // eixo
    g.strokeStyle = rgb(cores.linha); g.lineWidth = Math.max(1, h * 0.012);
    g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.stroke();
    if (!hist.length) return;
    function X(i) { return x0 + (x1 - x0) * i / PASSOS; }
    function Y(v) { return y0 + (y1 - y0) * (1 - Math.max(0, v) / max); }
    var cor = st.treino === 'pronto' ? cores.green : cores.gold;
    if (hist.length > 1) {
      var grad = g.createLinearGradient(0, y0, 0, y1);
      grad.addColorStop(0, rgb(cor, 0.35)); grad.addColorStop(1, rgb(cor, 0));
      g.beginPath(); g.moveTo(X(0), y1);
      for (var i = 0; i < hist.length; i++) g.lineTo(X(i), Y(hist[i]));
      g.lineTo(X(hist.length - 1), y1); g.closePath();
      g.fillStyle = grad; g.fill();
      g.beginPath();
      for (i = 0; i < hist.length; i++) { if (i) g.lineTo(X(i), Y(hist[i])); else g.moveTo(X(i), Y(hist[i])); }
      g.strokeStyle = rgb(cor); g.lineWidth = Math.max(2, h * 0.035); g.lineJoin = 'round'; g.stroke();
    }
    var ult = hist.length - 1;
    g.fillStyle = rgb(cor);
    g.beginPath(); g.arc(X(ult), Y(hist[ult]), Math.max(3, h * 0.06), 0, Math.PI * 2); g.fill();
  }

  function desenharTudo() {
    if (!raiz) return;
    ajustarFrase();
    desenharGrade();
    desenharCurva();
  }

  function renderTudo() {
    renderEstado();
    renderFrase();
    renderBarras();
    desenharGrade();
    desenharCurva();
  }

  /* ------------------------------------------------------------------ */
  /* Ações                                                               */
  /* ------------------------------------------------------------------ */
  function toque(e) {
    if (!e || calmo()) return;
    e.classList.remove('ia-toque');
    void e.offsetWidth;
    e.classList.add('ia-toque');
    setTimeout(function () { e.classList.remove('ia-toque'); }, 700);
  }
  function tocou() { ultimoToque = agora(); }

  function palpite(w) {
    if (st.modo !== 'normal' || st.novas.length) return;
    st.palpite = w;
    toque(el.palpBotoes[w]);
    renderEstado();
    renderBarras();
  }

  function escolher(w, b) {
    if (st.novas.length >= MAX_NOVAS) return;
    toque(b);
    st.novas.push(w);
    renderEstado();
    renderFrase();
    renderBarras();
  }

  function pegadinha() {
    toque(el.bPega);
    st.modo = 'pegadinha';
    st.base = FRASE_PEGADINHA.slice();
    st.novas = [];
    renderEstado();
    renderFrase();
    renderBarras();
  }

  function treinar() {
    if (st.treino !== 'nao') return;
    toque(el.bTreinar);
    st.treino = 'treinando';
    treinoDecorrido = 0;
    stats = { quadros: 0, maxMs: 0, somaMs: 0, passosPorQuadroMax: 0, duracaoMs: 0, lista: [] };
    renderEstado();
    iniciarLaco();
  }

  function iniciarLaco() {
    if (raf || st.treino !== 'treinando') return;
    treinoT0 = agora() - treinoDecorrido;
    raf = requestAnimationFrame(quadro);
  }
  function pararLaco() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (st && st.treino === 'treinando') treinoDecorrido = agora() - treinoT0;
  }

  function quadro() {
    raf = 0;
    var ini = agora();
    var alvo = Math.min(PASSOS, Math.ceil(PASSOS * (ini - treinoT0) / DURACAO));
    var feitos = 0;
    while (modelo.t < alvo) {
      // não começa um passo que estouraria os ~12 ms do quadro (mas faz pelo menos 1)
      var t1 = agora();
      if (feitos && t1 - ini + passoMs > ORCAMENTO) break;
      var perda = modelo.passo();
      passoMs = passoMs * 0.8 + (agora() - t1) * 0.2;
      hist.push(hist[hist.length - 1] * 0.92 + perda * 0.08);
      feitos++;
    }
    var ms = agora() - ini;
    stats.quadros++; stats.somaMs += ms;
    if (stats.lista.length < 40) stats.lista.push(Math.round(ms * 10) / 10 + '/' + feitos);
    if (ms > stats.maxMs) stats.maxMs = ms;
    if (feitos > stats.passosPorQuadroMax) stats.passosPorQuadroMax = feitos;
    if (modelo.t >= PASSOS) {
      st.treino = 'pronto';
      stats.duracaoMs = agora() - treinoT0;
      stats.mediaMs = stats.somaMs / stats.quadros;
      var r = verificar(modelo);
      (r.ok ? console.info : console.warn).call(console, '[DemoIA] treino na tela: ' + PASSOS + ' passos em ' +
        Math.round(stats.duracaoMs) + ' ms; conta por quadro: média ' + stats.mediaMs.toFixed(1) + ' ms, máx ' +
        stats.maxMs.toFixed(1) + ' ms; P(rápido | "vez mais") = ' + pct(r.rapido) + (r.rapido > 0.6 ? ' ✓' : ' ✗') +
        ', P(ralo | "gira no") = ' + pct(r.ralo) + (r.ralo > 0.5 ? ' ✓' : ' ✗'));
      checagemFeita = true;
    }
    if (feitos || st.treino === 'pronto') {
      renderEstado();
      renderBarras();
      desenharGrade();
      desenharCurva();
    }
    if (st.treino === 'treinando') raf = requestAnimationFrame(quadro);
    else if (aoTerminarTreino) { var cb = aoTerminarTreino; aoTerminarTreino = null; cb(); }
  }

  function reiniciar() {
    pararLaco();
    aoTerminarTreino = null;
    st = estadoInicial();
    treinoDecorrido = 0;
    modelo.iniciar();
    if (perdaInicial == null) perdaInicial = modelo.perdaMedia();
    hist = [perdaInicial];
    if (raiz) { limparBarras(); renderTudo(); }
  }

  function recomecar() {
    toque(el.bRec);
    reiniciar();
  }

  function estaNoInicio() {
    return st.treino === 'nao' && st.modo === 'normal' && !st.novas.length && !st.palpite;
  }

  function cancelarAuto() {
    autoGeracao++;
    autoAtivo = false;
    autoTimers.forEach(clearTimeout);
    autoTimers = [];
    aoTerminarTreino = null;
  }
  function depois(ms, fn) {
    var ger = autoGeracao;
    autoTimers.push(setTimeout(function () { if (ger === autoGeracao && autoAtivo) fn(); }, ms));
  }

  function vigiarOcioso() {
    clearInterval(timerOcioso);
    timerOcioso = setInterval(function () {
      if (!visivel || autoAtivo || st.treino === 'treinando') return;
      if (agora() - ultimoToque > 45000 && !estaNoInicio()) reiniciar();
    }, 1000);
  }

  // checagem do plano, só no console, sem travar a página: um segundo modelo treina
  // os mesmos PASSOS em pedacinhos, em segundo plano
  function checagemNoConsole() {
    var m = new Modelo(d);
    m.iniciar();
    function pedaco() {
      if (checagemFeita) return;
      if (st && st.treino === 'treinando') { setTimeout(pedaco, 400); return; }
      var t0 = agora();
      while (m.t < PASSOS && agora() - t0 < 6) m.passo();
      if (m.t < PASSOS) { setTimeout(pedaco, 25); return; }
      checagemFeita = true;
      var r = verificar(m);
      var msg = '[DemoIA] teste: P(rápido | "vez mais") = ' + pct(r.rapido) + (r.rapido > 0.6 ? ' ✓' : ' ✗ (precisa > 60%)') +
        ' · P(ralo | "gira no") = ' + pct(r.ralo) + (r.ralo > 0.5 ? ' ✓' : ' ✗ (precisa > 50%)') +
        ' · ' + formatarMil(r.parametros) + ' números · ' + d.palavras.length + ' palavras · ' + FRASES.length + ' frases';
      (r.ok ? console.info : console.warn).call(console, msg);
    }
    setTimeout(pedaco, 2500);
  }

  /* ------------------------------------------------------------------ */
  /* Interface pública                                                   */
  /* ------------------------------------------------------------------ */
  window.DemoIA = {
    mount: function (container) {
      if (raiz) return;
      d = dados();
      modelo = new Modelo(d);
      st = estadoInicial();
      montarDOM(container);
      lerCores();
      prepararAmostra();
      ultimoToque = agora();
      reiniciar();
      checagemNoConsole();
    },
    enter: function () {
      if (!raiz) return;
      visivel = true;
      ultimoToque = agora();
      vigiarOcioso();
      lerCores();
      desenharTudo();
      iniciarLaco();
    },
    leave: function () {
      visivel = false;
      cancelarAuto();
      clearInterval(timerOcioso);
      pararLaco();
    },
    step: function () {
      if (!raiz) return;
      ultimoToque = agora();
      if (st.treino === 'treinando') return;
      if (st.treino === 'nao') { treinar(); return; }
      if (st.modo === 'normal') { pegadinha(); return; }
      recomecar();
    },
    auto: function (done) {
      if (!raiz) return;
      cancelarAuto();
      reiniciar();
      autoAtivo = true;
      ultimoToque = agora();
      var ger = autoGeracao;
      depois(900, function () { palpite('rápido'); });
      depois(2000, function () {
        aoTerminarTreino = function () {
          if (ger !== autoGeracao || !autoAtivo) return;
          depois(1300, function () {
            var top = modelo.top(fraseAtual(), 1)[0];
            var r = top && linhas[top.w];
            escolher(top.w, r && r.el);
          });
          depois(3500, function () { pegadinha(); });
          depois(6800, function () {
            autoAtivo = false;
            if (typeof done === 'function') done();
          });
        };
        treinar();
        iniciarLaco();
      });
    },
    reset: function () {
      if (!raiz) return;
      cancelarAuto();
      ultimoToque = agora();
      reiniciar();
    },

    // para testes (Node e harness); não faz parte do contrato
    _interno: {
      FRASES: FRASES, PASSOS: PASSOS, DURACAO: DURACAO, SEMENTE: SEMENTE,
      prepararDados: prepararDados, Modelo: Modelo, dados: dados, verificar: verificar,
      estado: function () {
        return st && {
          treino: st.treino, modo: st.modo, frase: fraseAtual().join(' '), palpite: st.palpite,
          passos: modelo.t, auto: autoAtivo, barras: modelo.top(fraseAtual(), 5).map(function (b) { return b.w + ' ' + pct(b.p); })
        };
      },
      stats: function () { return stats; }
    }
  };
})();
