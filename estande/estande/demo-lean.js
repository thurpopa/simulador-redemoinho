/* Estande · Demo 3 · "Ache o erro" (tela 5)
   propõe → critica (o visitante) → corrige → o Lean confere.

   Define só window.DemoLean = { mount, enter, leave, step, auto, reset }.
   Os agentes são encenados (correntes fixas, do Plano do estande).
   O conferente é de verdade: conferir() refaz cada conta (+1 ou ×2) e testa o alvo.
   Nada de resultado escrito à mão: motivos, contas, ACEITO e RECUSADO saem de conferir(). */
(function () {
  'use strict';

  // ------------------------------------------------------------------
  // Dados: os 3 desafios do plano (cada proposta tem 1 erro e chega ao alvo)
  // ------------------------------------------------------------------
  const DESAFIOS = [
    { alvo: 20,
      proposta:  { nums: [1, 2, 4, 9, 10, 20], ops: ['+1', 'x2', 'x2', '+1', 'x2'] },
      corrigida: { nums: [1, 2, 4, 5, 10, 20], ops: ['+1', 'x2', '+1', 'x2', 'x2'] } },
    { alvo: 12,
      proposta:  { nums: [1, 2, 3, 5, 6, 12], ops: ['+1', '+1', 'x2', '+1', 'x2'] },
      corrigida: { nums: [1, 2, 3, 6, 12],    ops: ['+1', '+1', 'x2', 'x2'] } },
    { alvo: 18,
      proposta:  { nums: [1, 2, 4, 5, 9, 18], ops: ['+1', 'x2', '+1', 'x2', 'x2'] },
      corrigida: { nums: [1, 2, 4, 8, 9, 18], ops: ['+1', 'x2', 'x2', '+1', 'x2'] } }
  ];
  const INICIO = 1;
  const REGRAS = { '+1': function (a) { return a + 1; }, 'x2': function (a) { return a * 2; } };
  const SIMB = { '+1': '+ 1', 'x2': '× 2' };   // dentro das contas: "4 + 1 = 5"
  const CHIP = { '+1': '+1', 'x2': '×2' };     // na seta

  // Tempos (ms)
  const T_CARTA = 500;        // PROPÕE: uma carta a cada 0,5 s
  const T_CRITICO = 800;      // crítico automático (Enter / vitrine)
  const T_SEGURA_AUTO = 1400; // erro marcado pelo crítico automático, antes de corrigir
  const T_SEGURA_VISITANTE = 2200; // erro achado pelo visitante (dá tempo de ler o motivo)
  const T_LEAN = 400;         // Lean: um passo a cada 0,4 s
  const T_VITRINE_FIM = 5000; // auto(): ACEITO fica na tela antes de done()
  const T_OCIOSO = 45000;     // volta ao início sem toque

  // ------------------------------------------------------------------
  // O conferente (puro, sem DOM)
  // ------------------------------------------------------------------
  function checaPasso(cad, i) {
    const nums = cad.nums;
    if (i === 0) return { i: 0, tipo: 'inicio', b: nums[0], certo: INICIO, ok: nums[0] === INICIO };
    const a = nums[i - 1], op = cad.ops[i - 1], b = nums[i];
    const regra = REGRAS[op];
    const certo = regra ? regra(a) : NaN;
    return { i: i, tipo: 'passo', a: a, op: op, b: b, certo: certo, ok: b === certo };
  }

  // Confere da esquerda para a direita e para no primeiro passo inválido.
  function conferir(cad, alvo) {
    const passos = [];
    if (!cad || !cad.nums || !cad.nums.length) return { aceito: false, passos: passos, falha: { i: 0, tipo: 'vazia', ok: false } };
    for (let i = 0; i < cad.nums.length; i++) {
      const p = checaPasso(cad, i);
      passos.push(p);
      if (!p.ok) return { aceito: false, passos: passos, falha: p };
    }
    const n = cad.nums.length - 1, fim = cad.nums[n];
    if (fim !== alvo) return { aceito: false, passos: passos, falha: { i: n, tipo: 'alvo', b: fim, certo: alvo, ok: false } };
    return { aceito: true, passos: passos, falha: null };
  }

  function primeiroErro(cad) {
    for (let i = 0; i < cad.nums.length; i++) if (!checaPasso(cad, i).ok) return i;
    return -1;
  }

  // Textos (todos gerados a partir das contas)
  function conta(a, op, r) { return a + ' ' + SIMB[op] + ' = ' + r; }
  function textoOk(p) { return p.tipo === 'inicio' ? 'começa em ' + p.b + ' ✓' : conta(p.a, p.op, p.b) + ' ✓'; }
  function textoFalhaCurta(p) { return p.tipo === 'inicio' ? 'começa em ' + p.b + ' ✗' : conta(p.a, p.op, p.b) + ' ✗'; }
  function textoMotivo(p) {
    if (p.tipo === 'inicio') return '✗ Tem que começar em ' + p.certo + ', não em ' + p.b;
    if (p.tipo === 'alvo') return '✗ Terminou em ' + p.b + ', não em ' + p.certo;
    if (p.tipo === 'vazia') return '✗ Corrente vazia';
    return '✗ ' + conta(p.a, p.op, p.certo) + ', não ' + p.b;
  }
  function textoRecusado(p) { return textoMotivo(p) + '. Recusado.'; }
  function textoCerto(p) { return 'Esse está certo: ' + (p.tipo === 'inicio' ? 'começa em ' + p.b : conta(p.a, p.op, p.b)); }
  function textoAceito(alvo) { return 'Chegou ao alvo: ' + alvo + ' ✓'; }

  // Alinha duas correntes (maior subsequência comum dos números) para animar a correção.
  function planoCorrecao(a, b) {
    const n = a.length, m = b.length, dp = [];
    for (let i = 0; i <= n; i++) dp.push(new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const pares = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { pares.push([i, j]); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else j++;
    }
    const fonte = new Array(m), apagar = [];
    let pi = -1, pj = -1;
    pares.concat([[n, m]]).forEach(function (p) {
      const gi = [], gj = [];
      for (let x = pi + 1; x < p[0]; x++) gi.push(x);
      for (let y = pj + 1; y < p[1]; y++) gj.push(y);
      const k = Math.min(gi.length, gj.length);
      for (let t = 0; t < k; t++) fonte[gj[t]] = { i: gi[t], tipo: 'troca' };
      for (let t = k; t < gi.length; t++) apagar.push(gi[t]);
      for (let t = k; t < gj.length; t++) fonte[gj[t]] = { i: -1, tipo: 'novo' };
      if (p[0] < n) fonte[p[1]] = { i: p[0], tipo: 'igual' };
      pi = p[0]; pj = p[1];
    });
    return { fonte: fonte, apagar: apagar };
  }

  function copia(c) { return { nums: c.nums.slice(), ops: c.ops.slice() }; }

  // ------------------------------------------------------------------
  // Estilos (todos prefixados por .demo-lean)
  // ------------------------------------------------------------------
  const CSS = `
.demo-lean{--u:min(1vh,.72vw);position:relative;width:100%;height:100%;box-sizing:border-box;display:flex;flex-direction:column;align-items:stretch;gap:calc(var(--u)*1.1);padding:calc(var(--u)*1.4) calc(var(--u)*3) calc(var(--u)*.9);color:var(--text);font-family:var(--f-body);overflow:hidden;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;text-align:center}
.demo-lean *,.demo-lean *::before,.demo-lean *::after{box-sizing:border-box}
.demo-lean button{font-family:inherit;-webkit-tap-highlight-color:transparent}

.demo-lean .dl-selos{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*1.1);flex-wrap:wrap}
.demo-lean .dl-selo{--c:var(--muted);display:inline-flex;align-items:center;gap:calc(var(--u)*.9);font:800 calc(var(--u)*2.3)/1 var(--f-display);letter-spacing:.07em;padding:calc(var(--u)*1.15) calc(var(--u)*2.2);border-radius:999px;border:calc(var(--u)*.3) solid var(--line2);color:var(--dim);background:transparent;white-space:nowrap;transition:color .35s,border-color .35s,background-color .35s,box-shadow .35s,transform .35s}
.demo-lean .dl-selo::before{content:"";width:calc(var(--u)*1.1);height:calc(var(--u)*1.1);border-radius:50%;background:currentColor;opacity:.35}
.demo-lean .dl-selo small{font-size:.82em;font-weight:700;letter-spacing:.02em}
.demo-lean .dl-selo.dl-feito{color:var(--muted);border-color:var(--line2)}
.demo-lean .dl-selo.dl-on{color:var(--c);border-color:var(--c);background:color-mix(in srgb,var(--c) 15%,transparent);box-shadow:0 0 calc(var(--u)*2.6) color-mix(in srgb,var(--c) 40%,transparent);transform:scale(1.07)}
.demo-lean .dl-selo.dl-on::before{opacity:1;animation:demoLean-pisca 1s ease-in-out infinite}
.demo-lean .dl-sep{color:var(--dim);font:700 calc(var(--u)*2.6)/1 var(--f-display)}

.demo-lean .dl-desafio{flex:0 0 auto;font:600 calc(var(--u)*3.7)/1.15 var(--f-display);color:var(--text);margin-top:calc(var(--u)*.6)}
.demo-lean .dl-desafio b{font-weight:800;color:var(--gold)}
.demo-lean .dl-desafio .dl-alvo{display:inline-block;margin:0 .1em;transition:color .3s,text-shadow .3s,transform .3s}
.demo-lean .dl-desafio .dl-alvo.dl-alvo-ok{color:var(--green);text-shadow:0 0 calc(var(--u)*2.2) color-mix(in srgb,var(--green) 70%,transparent);transform:scale(1.15)}
.demo-lean .dl-desafio .dl-alvo.dl-alvo-err{color:var(--red)}
.demo-lean .dl-op{display:inline-block;font:700 .82em/1 var(--f-mono);padding:.12em .32em;border-radius:.25em;background:var(--bg3);border:calc(var(--u)*.25) solid var(--line2);vertical-align:.08em}

.demo-lean .dl-palco{flex:1 1 auto;min-height:0;display:flex;align-items:center;justify-content:center}
.demo-lean .dl-corrente{display:flex;align-items:flex-start;justify-content:center;padding-bottom:calc(var(--u)*5.4)}
.demo-lean .dl-unid{flex:0 0 auto;display:flex;align-items:flex-start;transition:opacity .35s ease,transform .35s ease,filter .35s}
.demo-lean .dl-unid.dl-oculta{opacity:0;transform:translateY(calc(var(--u)*3)) scale(.9)}
.demo-lean .dl-unid.dl-cinza{opacity:.28;filter:grayscale(1)}

.demo-lean .dl-seta{--ac:var(--muted);width:calc(var(--u)*8.8);height:calc(var(--u)*20);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u)*.9);perspective:calc(var(--u)*40)}
.demo-lean .dl-opchip{display:inline-block;font:700 calc(var(--u)*3.1)/1 var(--f-mono);padding:calc(var(--u)*.55) calc(var(--u)*1);border-radius:calc(var(--u)*.9);color:var(--text);background:var(--bg3);border:calc(var(--u)*.28) solid var(--line2);transition:color .3s,border-color .3s,background-color .3s}
.demo-lean .dl-linha{position:relative;width:72%;height:calc(var(--u)*.5);background:var(--ac);border-radius:9px;margin-right:calc(var(--u)*1);transition:background-color .3s}
.demo-lean .dl-linha::after{content:"";position:absolute;right:calc(var(--u)*-1.3);top:50%;transform:translateY(-50%);border-left:calc(var(--u)*1.6) solid var(--ac);border-top:calc(var(--u)*1.1) solid transparent;border-bottom:calc(var(--u)*1.1) solid transparent;transition:border-color .3s}

.demo-lean .dl-cwrap{position:relative;perspective:calc(var(--u)*70);transform-origin:50% 85%}
.demo-lean .dl-carta{position:relative;width:calc(var(--u)*15);height:calc(var(--u)*20);border-radius:calc(var(--u)*1.9);background:linear-gradient(180deg,var(--bg3),var(--bg2));border:calc(var(--u)*.4) solid var(--line2);display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 calc(var(--u)*.8) calc(var(--u)*2.4) rgba(0,0,0,.45);transition:border-color .3s,box-shadow .3s,background .3s,transform .2s}
.demo-lean .dl-num{font:800 calc(var(--u)*11)/1 var(--f-display);font-variant-numeric:tabular-nums;letter-spacing:-.02em;color:var(--text);transition:color .3s}
.demo-lean .dl-badge{position:absolute;top:calc(var(--u)*-1.7);right:calc(var(--u)*-1.7);width:calc(var(--u)*4.4);height:calc(var(--u)*4.4);border-radius:50%;background:var(--red);color:#fff;font:800 calc(var(--u)*2.7)/calc(var(--u)*4.4) var(--f-display);text-align:center;transform:scale(0);transition:transform .25s cubic-bezier(.3,1.7,.5,1);box-shadow:0 0 calc(var(--u)*1.6) color-mix(in srgb,var(--red) 70%,transparent)}
.demo-lean .dl-ajuste{display:none;flex:0 0 calc(var(--u)*5);width:100%;align-items:center;justify-content:center;border:0;margin:0;padding:0;background:color-mix(in srgb,var(--gold) 15%,var(--bg2));color:var(--gold);font:800 calc(var(--u)*2.8)/1 var(--f-display);cursor:pointer;touch-action:manipulation}
.demo-lean .dl-ajuste:hover{background:color-mix(in srgb,var(--gold) 26%,transparent)}
.demo-lean .dl-ajuste:active{background:color-mix(in srgb,var(--gold) 40%,transparent)}
.demo-lean .dl-cima{border-radius:calc(var(--u)*1.4) calc(var(--u)*1.4) 0 0}
.demo-lean .dl-baixo{border-radius:0 0 calc(var(--u)*1.4) calc(var(--u)*1.4)}

.demo-lean .dl-rot{position:absolute;top:calc(100% + var(--u)*1.3);left:50%;transform:translateX(-50%);white-space:nowrap;font:700 calc(var(--u)*2.9)/1.1 var(--f-display);font-variant-numeric:tabular-nums;opacity:0;transition:opacity .25s;pointer-events:none}
.demo-lean .dl-rot.dl-on{opacity:1}
.demo-lean .dl-rot.dl-ok{color:var(--green)}
.demo-lean .dl-rot.dl-err{color:var(--red)}
.demo-lean .dl-rot.dl-info{color:var(--text);background:var(--bg3);border:calc(var(--u)*.25) solid var(--line2);padding:calc(var(--u)*.7) calc(var(--u)*1.4);border-radius:calc(var(--u)*1);top:calc(100% + var(--u)*.8)}

/* estados */
.demo-lean.dl-tocavel .dl-carta{cursor:pointer}
.demo-lean.dl-tocavel .dl-carta:hover{border-color:var(--muted);transform:translateY(calc(var(--u)*-.6))}
.demo-lean .dl-carta.dl-erro{border-color:var(--red);background:linear-gradient(180deg,color-mix(in srgb,var(--red) 22%,var(--bg3)),var(--bg2));box-shadow:0 0 calc(var(--u)*3) color-mix(in srgb,var(--red) 55%,transparent)}
.demo-lean .dl-carta.dl-erro .dl-badge{transform:scale(1)}
.demo-lean .dl-unid.dl-ok .dl-carta{border-color:var(--green);box-shadow:0 0 calc(var(--u)*2.2) color-mix(in srgb,var(--green) 35%,transparent)}
.demo-lean .dl-unid.dl-ok .dl-seta{--ac:var(--green)}
.demo-lean .dl-unid.dl-ok .dl-opchip{border-color:var(--green);color:var(--green)}
.demo-lean .dl-unid.dl-falha .dl-carta{border-color:var(--red);background:linear-gradient(180deg,color-mix(in srgb,var(--red) 22%,var(--bg3)),var(--bg2));box-shadow:0 0 calc(var(--u)*3) color-mix(in srgb,var(--red) 55%,transparent)}
.demo-lean .dl-unid.dl-falha .dl-badge{transform:scale(1)}
.demo-lean .dl-unid.dl-falha .dl-seta{--ac:var(--red)}
.demo-lean .dl-unid.dl-falha .dl-opchip{border-color:var(--red);color:var(--red)}
.demo-lean .dl-carta.dl-nova{border-color:var(--gold);box-shadow:0 0 calc(var(--u)*2.6) color-mix(in srgb,var(--gold) 45%,transparent)}
.demo-lean .dl-opchip.dl-nova{border-color:var(--gold);color:var(--gold)}
.demo-lean .dl-carta.dl-mudada{border-color:var(--gold);border-style:dashed}
.demo-lean .dl-carta.dl-mudada .dl-num{color:var(--gold)}
.demo-lean .dl-unid.dl-falha .dl-carta.dl-mudada .dl-num{color:var(--red)}

/* modo "Tente enganar o Lean" */
.demo-lean.dl-engana .dl-unid:not(.dl-prim) .dl-ajuste{display:flex}
.demo-lean.dl-engana .dl-unid:not(.dl-prim) .dl-carta{justify-content:space-between}
.demo-lean.dl-engana .dl-unid:not(.dl-prim) .dl-num{font-size:calc(var(--u)*8.4)}
.demo-lean.dl-ocupado .dl-ajuste{pointer-events:none;opacity:.35}

/* veredito: mensagem + carimbo */
.demo-lean .dl-veredito{flex:0 0 auto;min-height:calc(var(--u)*11.8);display:flex;align-items:center;justify-content:center;gap:calc(var(--u)*3.5);flex-wrap:wrap}
.demo-lean .dl-msg{font:700 calc(var(--u)*3.2)/1.2 var(--f-display);color:var(--text)}
.demo-lean .dl-msg:empty{display:none}
.demo-lean .dl-msg.dl-dica{color:var(--gold);animation:demoLean-respira 1.8s ease-in-out infinite}
.demo-lean .dl-msg.dl-ok{color:var(--green)}
.demo-lean .dl-msg.dl-err{color:var(--red)}
.demo-lean .dl-carimbo{display:none;font:900 calc(var(--u)*5.3)/1 var(--f-display);letter-spacing:.13em;padding:calc(var(--u)*1) calc(var(--u)*2.2) calc(var(--u)*.9) calc(var(--u)*2.6);border:calc(var(--u)*.6) solid currentColor;border-radius:calc(var(--u)*1.3);transform:rotate(-5deg)}
.demo-lean .dl-carimbo.dl-aceito{display:block;color:var(--green);background:color-mix(in srgb,var(--green) 12%,transparent);box-shadow:0 0 calc(var(--u)*3) color-mix(in srgb,var(--green) 35%,transparent),inset 0 0 calc(var(--u)*1.5) color-mix(in srgb,var(--green) 25%,transparent)}
.demo-lean .dl-carimbo.dl-recusado{display:block;color:var(--red);background:color-mix(in srgb,var(--red) 12%,transparent);box-shadow:0 0 calc(var(--u)*3) color-mix(in srgb,var(--red) 35%,transparent),inset 0 0 calc(var(--u)*1.5) color-mix(in srgb,var(--red) 25%,transparent)}

/* botões */
.demo-lean .dl-botoes{flex:0 0 auto;display:flex;justify-content:center;gap:calc(var(--u)*2);flex-wrap:wrap}
.demo-lean .dl-btn{min-height:calc(var(--u)*7.4);padding:0 calc(var(--u)*3.4);font:700 calc(var(--u)*2.8)/1 var(--f-display);border-radius:calc(var(--u)*1.5);border:calc(var(--u)*.3) solid var(--line2);background:var(--bg3);color:var(--text);cursor:pointer;touch-action:manipulation;transition:background-color .2s,border-color .2s,transform .1s,box-shadow .2s}
.demo-lean .dl-btn:hover{border-color:var(--muted);background:color-mix(in srgb,var(--bg3) 70%,var(--line2))}
.demo-lean .dl-btn:active{transform:scale(.97)}
.demo-lean .dl-btn.dl-prim{background:var(--mint);border-color:var(--mint);color:#03231c;letter-spacing:.08em;font-weight:900;padding:0 calc(var(--u)*4.2)}
.demo-lean .dl-btn.dl-prim:hover{background:color-mix(in srgb,var(--mint) 85%,#fff)}
.demo-lean .dl-btn.dl-chama{animation:demoLean-chama 1.1s ease-in-out infinite}

.demo-lean .dl-rodape{flex:0 0 auto;font:500 calc(var(--u)*1.85)/1.2 var(--f-body);color:var(--muted)}

@keyframes demoLean-pisca{50%{opacity:.35}}
@keyframes demoLean-respira{50%{opacity:.62}}
@keyframes demoLean-chama{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--mint) 0%,transparent)}50%{box-shadow:0 0 0 calc(var(--u)*1) color-mix(in srgb,var(--mint) 45%,transparent)}}

.demo-lean.dl-calmo *,.demo-lean.dl-calmo *::before,.demo-lean.dl-calmo *::after{animation:none!important;transition:none!important}

/* celular (container estreito): empilha e rola dentro do container */
.demo-lean.dl-fone{overflow-x:hidden;overflow-y:auto;padding:12px 16px 10px;gap:10px}
.demo-lean.dl-fone .dl-selo{font-size:calc(var(--u)*2.5);padding:calc(var(--u)*1.1) calc(var(--u)*1.8)}
.demo-lean.dl-fone .dl-sep{display:none}
.demo-lean.dl-fone .dl-seta{width:calc(var(--u)*7.6)}
.demo-lean.dl-fone .dl-desafio{font-size:calc(var(--u)*4.2)}
.demo-lean.dl-fone .dl-palco{flex:0 0 auto}
.demo-lean.dl-fone .dl-corrente{flex-wrap:wrap;row-gap:calc(var(--u)*7.5);padding-top:calc(var(--u)*1.5);padding-bottom:calc(var(--u)*6.5)}
.demo-lean.dl-fone .dl-rot{font-size:calc(var(--u)*3)}
.demo-lean.dl-fone .dl-msg{font-size:calc(var(--u)*3.6)}
.demo-lean.dl-fone .dl-btn{font-size:calc(var(--u)*3.1);min-height:calc(var(--u)*8.5)}
.demo-lean.dl-fone .dl-rodape{font-size:calc(var(--u)*2.5)}
`;

  // ------------------------------------------------------------------
  // Estado
  // ------------------------------------------------------------------
  let raiz = null;
  const el = {};
  let units = [];          // [{el, wrap, carta, num, rot, seta, chip, val, orig, op, prim, erro}]
  let cad = null;          // corrente mostrada {nums, ops}
  let idx = 0;             // desafio atual (0, 1, 2)
  let estado = 'vazio';    // vazio | propoe | critica | marcado | corrige | lean | aceito | recusado | engana | engana-fim
  let modoEngana = false;
  let visivel = false;
  let autoRun = false;     // Enter / vitrine: o crítico automático age sozinho
  let criticoMarcado = false;
  let doneCb = null;
  let sujo = false;
  let timers = [];
  let anims = [];
  let gen = 0;
  let idleT = null;

  function calmo() { return document.documentElement.classList.contains('calm'); }

  function later(ms, fn) {
    const g = gen;
    const id = setTimeout(function () {
      timers = timers.filter(function (t) { return t !== id; });
      if (g === gen) fn();
    }, Math.max(0, ms));
    timers.push(id);
  }
  function stopAll() {
    gen++;
    timers.forEach(clearTimeout); timers = [];
    anims.forEach(function (a) { try { a.cancel(); } catch (e) { /* nada */ } }); anims = [];
  }
  function anima(elm, kf, op) {
    if (!elm || calmo() || !elm.animate) return null;
    try { const a = elm.animate(kf, op); anims.push(a); a.onfinish = function () { if (!(op && op.fill === 'forwards')) anims = anims.filter(function (x) { return x !== a; }); }; return a; }
    catch (e) { return null; }
  }

  function h(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function botao(cls, txt, fn) {
    const b = h('button', cls, txt);
    b.type = 'button'; b.tabIndex = -1;
    // sem foco: o Enter/espaço do apresentador não pode "clicar" num botão esquecido em foco
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function (e) { e.stopPropagation(); b.blur(); fn(e); });
    return b;
  }

  // ------------------------------------------------------------------
  // Montagem
  // ------------------------------------------------------------------
  function mount(container) {
    if (raiz) return;
    if (!document.getElementById('demo-lean-estilo')) {
      const s = document.createElement('style');
      s.id = 'demo-lean-estilo';
      s.textContent = CSS;
      document.head.appendChild(s);
    }
    raiz = h('div', 'demo-lean');

    const selos = h('div', 'dl-selos');
    el.selos = [];
    [['PROPÕE', null, 'var(--cool)'], ['CRITICA', '(você)', 'var(--warm)'], ['CORRIGE', null, 'var(--gold)'], ['LEAN CONFERE', null, 'var(--mint)']]
      .forEach(function (s, k) {
        if (k) selos.appendChild(h('span', 'dl-sep', '›'));
        const d = h('div', 'dl-selo', s[0]);
        if (s[1]) { d.appendChild(document.createTextNode(' ')); d.appendChild(h('small', null, s[1])); }
        d.style.setProperty('--c', s[2]);
        el.selos.push(d); selos.appendChild(d);
      });

    const desafio = h('div', 'dl-desafio');
    el.alvo = h('b', 'dl-alvo', '20');
    const fim = h('span');
    fim.style.whiteSpace = 'nowrap';
    fim.append(h('span', 'dl-op', '×2'), '.');
    desafio.append('Chegar de ', h('b', null, String(INICIO)), ' a ', el.alvo, ' usando só ', h('span', 'dl-op', '+1'), ' e ', fim);

    const palco = h('div', 'dl-palco');
    el.corrente = h('div', 'dl-corrente');
    palco.appendChild(el.corrente);

    const veredito = h('div', 'dl-veredito');
    el.msg = h('div', 'dl-msg');
    el.msg.setAttribute('aria-live', 'polite');
    el.carimbo = h('div', 'dl-carimbo');
    veredito.append(el.msg, el.carimbo);

    const botoes = h('div', 'dl-botoes');
    el.btnConferir = botao('dl-btn dl-prim', 'CONFERIR', function () { tocar(); conferirBotao(); });
    el.btnEnganar = botao('dl-btn', 'Tente enganar o Lean', function () { tocar(); enganar(); });
    el.btnOutro = botao('dl-btn', 'Outro desafio', function () { tocar(); outroDesafio(); });
    botoes.append(el.btnConferir, el.btnEnganar, el.btnOutro);

    const rodape = h('div', 'dl-rodape', 'Agentes encenados por nós. O conferente faz as contas de verdade.');

    raiz.append(selos, desafio, palco, veredito, botoes, rodape);
    raiz.addEventListener('pointerdown', function () { tocar(); });
    container.appendChild(raiz);

    medir();
    if (window.ResizeObserver) new ResizeObserver(medir).observe(container);
    else window.addEventListener('resize', medir);

    prepara(true);
  }

  // A unidade --u sai do tamanho real do container: a demo cabe sem rolagem
  // em qualquer altura que o integrador der (o desenho usa ~64u de altura e ~135u de largura).
  let uAtual = 0;
  function medir() {
    if (!raiz) return;
    const W = raiz.clientWidth, H = raiz.clientHeight;
    if (!W || !H) return;
    const fone = W < 700;
    raiz.classList.toggle('dl-fone', fone);
    const u = fone ? Math.min(H / 66, W / 78) : Math.min(H / 66, W / 150);
    if (Math.abs(u - uAtual) < 0.01) return;
    uAtual = u;
    raiz.style.setProperty('--u', u.toFixed(2) + 'px');
  }

  // ------------------------------------------------------------------
  // Corrente de cartas
  // ------------------------------------------------------------------
  function criaUnid(val, op, prim) {
    const u = { val: val, orig: val, op: op, prim: prim, erro: false };
    u.el = h('div', 'dl-unid' + (prim ? ' dl-prim' : ''));
    if (!prim) {
      u.seta = h('div', 'dl-seta');
      u.chip = h('span', 'dl-opchip', CHIP[op]);
      u.seta.append(u.chip, h('span', 'dl-linha'));
      u.el.appendChild(u.seta);
    }
    u.wrap = h('div', 'dl-cwrap');
    u.carta = h('div', 'dl-carta');
    u.num = h('span', 'dl-num', String(val));
    const cima = botao('dl-ajuste dl-cima', '▲', function () { tocar(); mudar(u, +1); });
    const baixo = botao('dl-ajuste dl-baixo', '▼', function () { tocar(); mudar(u, -1); });
    cima.setAttribute('aria-label', 'aumentar'); baixo.setAttribute('aria-label', 'diminuir');
    u.carta.append(cima, u.num, baixo, h('span', 'dl-badge', '✗'));
    u.carta.addEventListener('click', function () { tocaCarta(u); });
    u.rot = h('div', 'dl-rot');
    u.wrap.append(u.carta, u.rot);
    u.el.appendChild(u.wrap);
    return u;
  }

  function renderCadeia(c, ocultas) {
    el.corrente.textContent = '';
    units = c.nums.map(function (v, i) { return criaUnid(v, i ? c.ops[i - 1] : null, i === 0); });
    units.forEach(function (u) { if (ocultas) u.el.classList.add('dl-oculta'); el.corrente.appendChild(u.el); });
  }

  function cadeiaDasCartas() {
    return { nums: units.map(function (u) { return u.val; }), ops: units.slice(1).map(function (u) { return u.op; }) };
  }

  function rotulo(u, txt, tipo) {
    if (!txt) { u.rot.className = 'dl-rot'; u.rot.textContent = ''; u.rot.style.marginLeft = ''; return; }
    u.rot.textContent = txt;
    u.rot.className = 'dl-rot dl-on dl-' + tipo;
    ajustaRotulo(u.rot);
  }
  // não deixa o rótulo sair pela lateral da demo
  function ajustaRotulo(r) {
    r.style.marginLeft = '';
    const rr = r.getBoundingClientRect(), br = raiz.getBoundingClientRect();
    if (!rr.width || !br.width) return;
    const folga = 8;
    if (rr.left < br.left + folga) r.style.marginLeft = (br.left + folga - rr.left) + 'px';
    else if (rr.right > br.right - folga) r.style.marginLeft = (br.right - folga - rr.right) + 'px';
  }
  function setErro(u, on) { u.erro = on; u.carta.classList.toggle('dl-erro', on); }

  // ------------------------------------------------------------------
  // Selos, mensagem, carimbo
  // ------------------------------------------------------------------
  const FASES = ['propoe', 'critica', 'corrige', 'lean'];
  function setSelo(f) {
    const k = FASES.indexOf(f);
    el.selos.forEach(function (s, i) {
      s.classList.toggle('dl-on', i === k);
      s.classList.toggle('dl-feito', k >= 0 && i < k);
    });
  }
  function setMsg(t, tipo) {
    el.msg.textContent = t || '';
    el.msg.className = 'dl-msg' + (tipo ? ' dl-' + tipo : '');
    if (t && tipo !== 'dica') anima(el.msg, [{ opacity: 0, transform: 'translateY(0.8vh)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  }
  function carimbo(tipo) {
    if (!tipo) { el.carimbo.className = 'dl-carimbo'; el.carimbo.textContent = ''; return; }
    el.carimbo.textContent = tipo === 'aceito' ? 'ACEITO' : 'RECUSADO';
    el.carimbo.className = 'dl-carimbo dl-' + tipo;
    anima(el.carimbo, [
      { transform: 'rotate(-5deg) scale(2.3)', opacity: 0 },
      { transform: 'rotate(-5deg) scale(.94)', opacity: 1, offset: 0.7 },
      { transform: 'rotate(-5deg) scale(1)', opacity: 1 }
    ], { duration: 380, easing: 'ease-out' });
  }
  function limpaVeredito() {
    units.forEach(function (u) {
      u.el.classList.remove('dl-ok', 'dl-falha', 'dl-cinza');
      u.carta.classList.remove('dl-nova');
      if (u.chip) u.chip.classList.remove('dl-nova');
      rotulo(u, null);
    });
    carimbo(null);
    el.alvo.classList.remove('dl-alvo-ok', 'dl-alvo-err');
    setMsg('');
  }

  // ------------------------------------------------------------------
  // Fluxo: PROPÕE → CRITICA → CORRIGE → LEAN CONFERE
  // ------------------------------------------------------------------
  function prepara(ocultas) {
    stopAll();
    modoEngana = false; criticoMarcado = false;
    raiz.classList.remove('dl-engana', 'dl-tocavel', 'dl-ocupado');
    raiz.classList.toggle('dl-calmo', calmo());
    el.btnConferir.classList.remove('dl-chama');
    const d = DESAFIOS[idx];
    el.alvo.textContent = String(d.alvo);
    cad = copia(d.proposta);
    renderCadeia(cad, ocultas !== false);
    limpaVeredito();
    setSelo(null);
    estado = 'vazio';
  }

  function iniciar(auto) {
    prepara(true);
    autoRun = !!auto;
    estado = 'propoe';
    setSelo('propoe');
    units.forEach(function (u, k) { later(120 + k * T_CARTA, function () { u.el.classList.remove('dl-oculta'); }); });
    later(120 + (units.length - 1) * T_CARTA + 450, entraCritica);
  }

  function mostraTodas() { units.forEach(function (u) { u.el.classList.remove('dl-oculta'); }); }

  function entraCritica() {
    estado = 'critica';
    setSelo('critica');
    setMsg('Ache o passo errado: toque nele.', 'dica');
    raiz.classList.add('dl-tocavel');
    if (autoRun) agendaCritico();
  }

  function agendaCritico() {
    if (criticoMarcado) return;
    criticoMarcado = true;
    later(T_CRITICO, function () {
      if (estado !== 'critica') return;
      const i = primeiroErro(cad);
      if (i >= 0) marca(units[i], false);
    });
  }

  function tocaCarta(u) {
    tocar();
    if (estado !== 'critica') return;
    doneCb = null;
    const i = units.indexOf(u);
    if (i < 0) return;
    const p = checaPasso(cad, i);
    if (!p.ok) { marca(u, true); return; }
    // carta certa: balança e diz por quê
    units.forEach(function (x) { if (x !== u && x.rot.classList.contains('dl-info')) rotulo(x, null); });
    anima(u.wrap, [
      { transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' },
      { transform: 'rotate(-3.5deg)' }, { transform: 'rotate(2deg)' }, { transform: 'rotate(0deg)' }
    ], { duration: 560, easing: 'ease-in-out' });
    rotulo(u, textoCerto(p), 'info');
    const g = (u.certoGen = (u.certoGen || 0) + 1);
    later(2800, function () { if (u.certoGen === g && estado === 'critica') rotulo(u, null); });
  }

  function marca(u, porVisitante) {
    estado = 'marcado';
    raiz.classList.remove('dl-tocavel');
    units.forEach(function (x) { rotulo(x, null); });
    setMsg('');
    setErro(u, true);
    const p = checaPasso(cad, units.indexOf(u));
    rotulo(u, textoMotivo(p), 'err');
    anima(u.wrap, [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    later(porVisitante ? T_SEGURA_VISITANTE : T_SEGURA_AUTO, corrige);
  }

  // vira um elemento (meia volta, troca o conteúdo, termina a volta)
  function vira(elm, meio, atraso) {
    later(atraso || 0, function () {
      const a1 = anima(elm, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 240, easing: 'ease-in', fill: 'forwards' });
      later(a1 ? 240 : 0, function () {
        meio();
        if (a1) { anima(elm, [{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0deg)' }], { duration: 300, easing: 'ease-out' }); a1.cancel(); }
      });
    });
  }
  function some(u, atraso) {
    later(atraso || 0, function () {
      const a1 = anima(u.carta, [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(90deg)' }], { duration: 240, easing: 'ease-in', fill: 'forwards' });
      later(a1 ? 240 : 0, function () {
        u.carta.style.visibility = 'hidden';
        rotulo(u, null);
        u.el.style.overflow = 'hidden';
        const w = u.el.getBoundingClientRect().width;
        const a2 = anima(u.el, [{ width: w + 'px', opacity: 1 }, { width: '0px', opacity: 0 }], { duration: 380, easing: 'ease-in-out', fill: 'forwards' });
        later(a2 ? 390 : 0, function () { u.el.remove(); });
      });
    });
  }

  function corrige() {
    estado = 'corrige';
    setSelo('corrige');
    raiz.classList.remove('dl-tocavel');
    // o motivo do erro fica embaixo da carta até ela virar
    carimbo(null);
    setMsg('');
    el.alvo.classList.remove('dl-alvo-ok', 'dl-alvo-err');
    units.forEach(function (u) { u.el.classList.remove('dl-ok', 'dl-falha', 'dl-cinza'); if (!u.erro) rotulo(u, null); });
    const nova = copia(DESAFIOS[idx].corrigida);
    const plano = planoCorrecao(cad.nums, nova.nums);
    const velhos = units;
    const PASSO = 150;
    let ultimo = 0;

    const precisaRefazer = plano.fonte.some(function (f) { return f.tipo === 'novo'; }) || plano.fonte[0].i !== 0;
    if (precisaRefazer) {
      // caso geral (não acontece nos 3 desafios): vira tudo
      velhos.forEach(function (u, k) { vira(u.carta, function () {}, k * 80); });
      later(240 + velhos.length * 80, function () { renderCadeia(nova, false); });
      ultimo = 240 + velhos.length * 80;
    } else {
      // posições que mudam, em ordem da esquerda para a direita
      const mudancas = [];
      plano.apagar.forEach(function (i) { mudancas.push({ i: i, tipo: 'apaga' }); });
      nova.nums.forEach(function (val, j) {
        const f = plano.fonte[j], u = velhos[f.i];
        const opNovo = j > 0 ? nova.ops[j - 1] : null;
        const mudaNum = u.val !== val || u.erro;
        const mudaOp = j > 0 && u.op !== opNovo;
        if (mudaNum || mudaOp) mudancas.push({ i: f.i, tipo: 'muda', u: u, val: val, op: opNovo, mudaNum: mudaNum, mudaOp: mudaOp });
      });
      mudancas.sort(function (a, b) { return a.i - b.i; });
      const i0 = mudancas.length ? mudancas[0].i : 0;
      mudancas.forEach(function (m) {
        const at = (m.i - i0) * PASSO;
        ultimo = Math.max(ultimo, at + (m.tipo === 'apaga' ? 630 : 540));
        if (m.tipo === 'apaga') { some(velhos[m.i], at); return; }
        const u = m.u;
        if (m.mudaNum) {
          vira(u.carta, function () { u.num.textContent = String(m.val); setErro(u, false); rotulo(u, null); u.carta.classList.add('dl-nova'); }, at);
        }
        if (m.mudaOp) {
          vira(u.chip, function () { u.chip.textContent = CHIP[m.op]; u.chip.classList.add('dl-nova'); }, at);
        }
        u.val = m.val; u.orig = m.val; u.op = m.op;
      });
      units = nova.nums.map(function (val, j) { return velhos[plano.fonte[j].i]; });
    }
    cad = nova;
    later(ultimo + 650, function () { rodaLean({}); });
  }

  function rodaLean(op) {
    estado = 'lean';
    setSelo('lean');
    raiz.classList.remove('dl-tocavel');
    raiz.classList.add('dl-ocupado');
    el.btnConferir.classList.remove('dl-chama');
    limpaVeredito();
    if (modoEngana) cad = cadeiaDasCartas();
    const alvo = DESAFIOS[idx].alvo;
    const r = conferir(cad, alvo);
    r.passos.forEach(function (p, k) { later(k * T_LEAN, function () { acende(p); }); });
    const tFim = r.aceito || (r.falha && r.falha.tipo === 'alvo')
      ? r.passos.length * T_LEAN
      : (r.passos.length - 1) * T_LEAN + 250;
    later(tFim, function () {
      raiz.classList.remove('dl-ocupado');
      if (r.aceito) {
        setMsg(textoAceito(alvo), 'ok');
        el.alvo.classList.add('dl-alvo-ok');
        later(250, function () {
          carimbo('aceito');
          estado = modoEngana ? 'engana-fim' : 'aceito';
          if (doneCb) later(T_VITRINE_FIM, fimAuto);
        });
      } else {
        const f = r.falha;
        if (f.tipo === 'alvo') {
          const u = units[f.i];
          u.el.classList.remove('dl-ok'); u.el.classList.add('dl-falha');
          el.alvo.classList.add('dl-alvo-err');
        }
        setMsg(textoRecusado(f), 'err');
        later(250, function () {
          carimbo('recusado');
          estado = modoEngana ? 'engana-fim' : 'recusado';
          if (op.depois) later(2600, op.depois);
        });
      }
    });
  }

  function acende(p) {
    const u = units[p.i];
    if (!u) return;
    anima(u.wrap, [{ transform: 'scale(1)' }, { transform: 'scale(1.09)' }, { transform: 'scale(1)' }], { duration: 340, easing: 'ease-out' });
    if (p.ok) {
      u.el.classList.add('dl-ok');
      rotulo(u, textoOk(p), 'ok');
    } else {
      u.el.classList.add('dl-falha');
      rotulo(u, textoFalhaCurta(p), 'err');
      units.slice(p.i + 1).forEach(function (x) { x.el.classList.add('dl-cinza'); });
    }
  }

  // o Lean recusou a proposta (CONFERIR antes de corrigir): marca o erro e segue para a correção
  function depoisDaRecusa() {
    const i = primeiroErro(cad);
    limpaVeredito();
    if (i < 0) { estado = 'aceito'; return; }
    estado = 'marcado';
    setSelo('critica');
    setErro(units[i], true);
    rotulo(units[i], textoMotivo(checaPasso(cad, i)), 'err');
    later(1000, corrige);
  }

  function fimAuto() {
    const cb = doneCb;
    doneCb = null;
    autoRun = false;
    if (typeof cb === 'function') { try { cb(); } catch (e) { /* nada */ } }
  }

  // ------------------------------------------------------------------
  // Botões
  // ------------------------------------------------------------------
  function conferirBotao() {
    doneCb = null;
    switch (estado) {
      case 'vazio':
      case 'propoe':
      case 'critica':
      case 'marcado':
        stopAll();
        mostraTodas();
        units.forEach(function (u) { setErro(u, false); });
        rodaLean({ depois: depoisDaRecusa });
        break;
      case 'recusado':
        stopAll();
        depoisDaRecusa();
        break;
      case 'aceito':
      case 'engana':
      case 'engana-fim':
        rodaLean({});
        break;
      default: // corrige, lean: já está indo
        break;
    }
  }

  function enganar() {
    doneCb = null;
    stopAll();
    autoRun = false;
    modoEngana = true;
    raiz.classList.remove('dl-tocavel', 'dl-ocupado');
    raiz.classList.add('dl-engana');
    cad = copia(DESAFIOS[idx].corrigida);
    renderCadeia(cad, false);
    limpaVeredito();
    setSelo(null);
    estado = 'engana';
    setMsg('Mude um número com ▲▼ e aperte CONFERIR.', 'dica');
    if (!calmo()) units.forEach(function (u, k) {
      anima(u.wrap, [{ transform: 'translateY(0)' }, { transform: 'translateY(-1.2vh)' }, { transform: 'translateY(0)' }], { duration: 420, delay: k * 70, easing: 'ease-out' });
    });
  }

  function mudar(u, d) {
    if (!modoEngana || u.prim || estado === 'lean') return;
    if (estado === 'engana-fim') {
      limpaVeredito();
      estado = 'engana';
      setSelo(null);
      setMsg('Mude um número com ▲▼ e aperte CONFERIR.', 'dica');
    }
    u.val = Math.max(0, Math.min(99, u.val + d));
    u.num.textContent = String(u.val);
    u.carta.classList.toggle('dl-mudada', u.val !== u.orig);
    anima(u.num, [{ transform: 'translateY(' + (d > 0 ? '-' : '') + '0.9vh)', opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 180, easing: 'ease-out' });
    el.btnConferir.classList.toggle('dl-chama', units.some(function (x) { return x.val !== x.orig; }));
  }

  function outroDesafio() {
    doneCb = null;
    idx = (idx + 1) % DESAFIOS.length;
    iniciar(false);
  }

  // ------------------------------------------------------------------
  // Volta ao início (45 s sem toque, só visível)
  // ------------------------------------------------------------------
  function tocar() { sujo = true; armaOcioso(); }
  function armaOcioso() {
    clearTimeout(idleT);
    idleT = null;
    if (!visivel) return;
    idleT = setTimeout(voltaAoInicio, T_OCIOSO);
  }
  function voltaAoInicio() {
    idleT = null;
    if (!visivel) return;
    if (!sujo || doneCb) { armaOcioso(); return; }
    sujo = false;
    idx = (idx + 1) % DESAFIOS.length;   // a variante muda na volta ao início
    iniciar(false);
    armaOcioso();
  }

  // ------------------------------------------------------------------
  // Interface pública
  // ------------------------------------------------------------------
  window.DemoLean = {
    mount: mount,

    enter: function () {
      if (!raiz) return;
      visivel = true;
      medir();
      raiz.classList.toggle('dl-calmo', calmo());
      armaOcioso();
      if (doneCb && estado !== 'vazio') return;   // auto() já está rodando
      iniciar(false);
    },

    leave: function () {
      visivel = false;
      stopAll();
      doneCb = null;
      autoRun = false;
      clearTimeout(idleT); idleT = null;
    },

    // Enter do apresentador: roda sozinho o que falta
    step: function () {
      if (!raiz) return;
      sujo = true; armaOcioso();
      autoRun = true;
      switch (estado) {
        case 'vazio': iniciar(true); break;
        case 'propoe': break;                       // ao terminar, o crítico automático entra
        case 'critica': agendaCritico(); break;
        case 'marcado': stopAll(); corrige(); break;
        case 'recusado': stopAll(); depoisDaRecusa(); break;
        case 'corrige': case 'lean': break;         // já está andando
        case 'engana': rodaLean({}); break;
        default:                                    // aceito, engana-fim: próximo desafio, tudo sozinho
          idx = (idx + 1) % DESAFIOS.length;
          iniciar(true);
      }
    },

    // modo vitrine: mesma sequência do Enter, do começo; done() ~5 s depois do ACEITO (~14 s no total)
    auto: function (done) {
      if (!raiz) return;
      sujo = true; armaOcioso();
      iniciar(true);
      doneCb = typeof done === 'function' ? done : null;
    },

    reset: function () {
      if (!raiz) return;
      doneCb = null;
      autoRun = false;
      idx = 0;
      sujo = false;
      if (visivel) { iniciar(false); armaOcioso(); }
      else prepara(true);
    },

    // para testes e para o integrador (não mexem na tela)
    conferir: conferir,
    estado: function () { return estado; },
    _teste: {
      DESAFIOS: DESAFIOS, checaPasso: checaPasso, primeiroErro: primeiroErro, planoCorrecao: planoCorrecao,
      textoMotivo: textoMotivo, textoRecusado: textoRecusado, textoCerto: textoCerto, textoOk: textoOk, textoAceito: textoAceito
    }
  };
})();
