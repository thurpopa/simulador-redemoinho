// Testes do leitor de boleto: node gasto-em-dia/boleto.test.js
var assert = require('assert');
var GastoBoleto = require('./boleto.js');
var HOJE = '2026-10-30';
var ERRO_DV = 'Código inválido. Confira se digitou todos os números.';
var ERRO_TAMANHO = 'Cole os números do boleto (47 ou 48 dígitos).';

// ---- geradores independentes de códigos válidos ----
function mod10(num) {
  var soma = 0;
  num.split('').reverse().forEach(function (c, i) {
    var p = Number(c) * (i % 2 === 0 ? 2 : 1);
    soma += Math.floor(p / 10) + (p % 10);
  });
  return (10 - soma % 10) % 10;
}
function resto11(num) {
  var soma = 0;
  num.split('').reverse().forEach(function (c, i) { soma += Number(c) * (2 + i % 8); });
  return soma % 11;
}
function dvBanco(num) { var d = 11 - resto11(num); return d > 9 ? 1 : d === 0 ? 1 : d; }
function dvArr11(num) { var r = resto11(num); return r < 2 ? 0 : r === 10 ? 1 : 11 - r; }
function zeros(n, t) { n = String(n); while (n.length < t) n = '0' + n; return n; }
function fatorNovo(iso) { return 1000 + Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(2025, 1, 22)) / 86400000); }
function fatorAntigo(iso) { return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(1997, 9, 7)) / 86400000); }

function barrasBanco(banco, fator, centavos, livre) {
  livre = livre || '1234567890123456789012345';
  var semDv = banco + '9' + zeros(fator, 4) + zeros(centavos, 10) + livre;
  return semDv.slice(0, 4) + dvBanco(semDv) + semDv.slice(4);
}
function linhaBanco(barras) {
  var c1 = barras.slice(0, 4) + barras.slice(19, 24);
  var c2 = barras.slice(24, 34);
  var c3 = barras.slice(34, 44);
  return c1 + mod10(c1) + c2 + mod10(c2) + c3 + mod10(c3) + barras.charAt(4) + barras.slice(5, 19);
}
function formatarLinha(l) {
  return l.slice(0, 5) + '.' + l.slice(5, 10) + ' ' + l.slice(10, 15) + '.' + l.slice(15, 21) + ' ' +
    l.slice(21, 26) + '.' + l.slice(26, 32) + ' ' + l.charAt(32) + ' ' + l.slice(33);
}
function barrasArr(id, centavos, resto) {
  resto = resto || '00001234567890123456789012345678'.slice(0, 29);
  var semDv = '8' + '3' + id + zeros(centavos, 11) + resto; // 43 dígitos
  var dv = (id === '6' || id === '7') ? mod10(semDv) : dvArr11(semDv);
  return semDv.slice(0, 3) + dv + semDv.slice(3);
}
function linhaArr(barras) {
  var id = barras.charAt(2), l = '';
  for (var i = 0; i < 4; i++) {
    var b = barras.slice(i * 11, i * 11 + 11);
    l += b + ((id === '6' || id === '7') ? mod10(b) : dvArr11(b));
  }
  return l;
}
function trocar(s, pos) { return s.slice(0, pos) + ((Number(s.charAt(pos)) + 1) % 10) + s.slice(pos + 1); }

var passou = 0, falhou = 0;
function teste(nome, fn) {
  try { fn(); passou++; } catch (e) { falhou++; console.log('FALHOU: ' + nome + '\n  ' + e.message); }
}
function ler(t) { return GastoBoleto.ler(t, HOJE); }

// ---- bancário ----
var fNov = fatorNovo('2026-11-12');
var b1 = barrasBanco('341', fNov, 123456);
var l1 = linhaBanco(b1);

teste('fator de 12/11/2026 é 1628', function () { assert.strictEqual(fNov, 1628); });
teste('linha digitável 47 sem formatação', function () {
  assert.strictEqual(l1.length, 47);
  assert.deepStrictEqual(ler(l1), { ok: true, tipo: 'bancario', valor: 123456, venc: '2026-11-12', banco: 'Itaú' });
});
teste('linha digitável com pontos e espaços', function () {
  assert.deepStrictEqual(ler(formatarLinha(l1)), ler(l1));
});
teste('linha digitável com hífens e quebras', function () {
  assert.strictEqual(ler(l1.replace(/(\d{5})/g, '$1-') + '\n').venc, '2026-11-12');
});
teste('código de barras 44', function () {
  assert.deepStrictEqual(ler(b1), { ok: true, tipo: 'bancario', valor: 123456, venc: '2026-11-12', banco: 'Itaú' });
});
teste('código de barras 44 com espaços', function () {
  assert.strictEqual(ler(b1.replace(/(\d{4})/g, '$1 ')).valor, 123456);
});
teste('vencimento antes do reinício (20/12/2024)', function () {
  var r = ler(linhaBanco(barrasBanco('001', fatorAntigo('2024-12-20'), 5000)));
  assert.strictEqual(r.venc, '2024-12-20');
  assert.strictEqual(r.banco, 'Banco do Brasil');
});
teste('fator 9999 = 21/02/2025', function () {
  assert.strictEqual(ler(linhaBanco(barrasBanco('237', 9999, 100))).venc, '2025-02-21');
});
teste('fator 1000 = 22/02/2025', function () {
  assert.strictEqual(ler(linhaBanco(barrasBanco('237', 1000, 100))).venc, '2025-02-22');
});
teste('fator 1000 com hoje em 2000 cai no ciclo antigo (03/07/2000)', function () {
  assert.strictEqual(GastoBoleto.ler(linhaBanco(barrasBanco('237', 1000, 100)), '2000-06-01').venc, '2000-07-03');
});
teste('fator 0 = sem vencimento', function () {
  assert.strictEqual(ler(linhaBanco(barrasBanco('104', 0, 100))).venc, null);
});
teste('valor 0 = em aberto', function () {
  var r = ler(linhaBanco(barrasBanco('104', fNov, 0)));
  assert.strictEqual(r.valor, null);
  assert.strictEqual(r.ok, true);
});
teste('banco desconhecido = null', function () {
  assert.strictEqual(ler(linhaBanco(barrasBanco('999', fNov, 100))).banco, null);
});
teste('bancos mapeados', function () {
  var esperado = { '033': 'Santander', '260': 'Nubank', '077': 'Inter', '336': 'C6', '756': 'Sicoob', '748': 'Sicredi', '422': 'Safra', '212': 'Original', '290': 'PagBank', '323': 'Mercado Pago' };
  Object.keys(esperado).forEach(function (c) {
    assert.strictEqual(ler(linhaBanco(barrasBanco(c, fNov, 100))).banco, esperado[c]);
  });
});
[[9, 'DV do campo 1'], [20, 'DV do campo 2'], [31, 'DV do campo 3'], [32, 'DV geral'],
 [2, 'dígito do campo 1'], [15, 'dígito do campo 2'], [25, 'dígito do campo 3'], [42, 'dígito do valor'], [34, 'dígito do fator']]
  .forEach(function (c) {
    teste('linha com ' + c[1] + ' errado', function () {
      assert.deepStrictEqual(ler(trocar(l1, c[0])), { ok: false, erro: ERRO_DV });
    });
  });
teste('código de barras com DV geral errado', function () {
  assert.deepStrictEqual(ler(trocar(b1, 4)), { ok: false, erro: ERRO_DV });
});
teste('código de barras com dígito trocado', function () {
  assert.deepStrictEqual(ler(trocar(b1, 30)), { ok: false, erro: ERRO_DV });
});

// ---- arrecadação ----
teste('arrecadação 48, id 6 (módulo 10) com valor', function () {
  var b = barrasArr('6', 61240);
  assert.deepStrictEqual(ler(linhaArr(b)), { ok: true, tipo: 'arrecadacao', valor: 61240, venc: null, banco: null });
});
teste('arrecadação 48, id 8 (módulo 11) com valor', function () {
  var b = barrasArr('8', 89035);
  assert.deepStrictEqual(ler(linhaArr(b)), { ok: true, tipo: 'arrecadacao', valor: 89035, venc: null, banco: null });
});
teste('arrecadação 48, id 7 sem valor', function () {
  var r = ler(linhaArr(barrasArr('7', 4500)));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.valor, null);
});
teste('arrecadação 48, id 9 sem valor', function () {
  var r = ler(linhaArr(barrasArr('9', 4500)));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.valor, null);
});
teste('arrecadação 48 com formatação', function () {
  var l = linhaArr(barrasArr('8', 12990));
  var f = [0, 1, 2, 3].map(function (i) { return l.slice(i * 12, i * 12 + 11) + '-' + l.charAt(i * 12 + 11); }).join(' ');
  assert.strictEqual(ler(f).valor, 12990);
});
teste('arrecadação 44 (código de barras)', function () {
  assert.strictEqual(ler(barrasArr('6', 7777)).valor, 7777);
});
teste('arrecadação: muitas variações geradas passam', function () {
  for (var v = 1; v < 3000; v += 37) {
    ['6', '7', '8', '9'].forEach(function (id) {
      var resto = zeros(v * 7919, 29);
      var b = barrasArr(id, v, resto);
      assert.strictEqual(ler(linhaArr(b)).ok, true, id + ' ' + v);
      assert.strictEqual(ler(b).ok, true, id + ' ' + v);
    });
  }
});
[11, 23, 35, 47].forEach(function (p, i) {
  teste('arrecadação com DV do bloco ' + (i + 1) + ' errado', function () {
    assert.deepStrictEqual(ler(trocar(linhaArr(barrasArr('6', 100)), p)), { ok: false, erro: ERRO_DV });
  });
});
teste('arrecadação com DV geral errado (bloco ok)', function () {
  var b = trocar(barrasArr('8', 100), 3);
  assert.deepStrictEqual(ler(linhaArr(b)), { ok: false, erro: ERRO_DV });
});
teste('arrecadação 44 com dígito trocado', function () {
  assert.deepStrictEqual(ler(trocar(barrasArr('8', 100), 20)), { ok: false, erro: ERRO_DV });
});

// ---- bancário: muitas variações geradas ----
teste('bancário: muitas variações geradas passam', function () {
  for (var f = 1000; f < 10000; f += 997) {
    for (var v = 0; v < 100000; v += 12345) {
      var b = barrasBanco('033', f, v, zeros(f * v + 17, 25));
      assert.strictEqual(ler(linhaBanco(b)).ok, true);
      assert.strictEqual(ler(b).ok, true);
    }
  }
});

// ---- tamanho ----
['', '   ', null, undefined, '123', l1.slice(0, 46), l1 + '1', '8' + l1.slice(1, 47), 'abc'].forEach(function (t, i) {
  teste('tamanho errado #' + i, function () {
    assert.deepStrictEqual(ler(t), { ok: false, erro: ERRO_TAMANHO });
  });
});

console.log(passou + ' passaram, ' + falhou + ' falharam');
if (falhou) process.exit(1);
