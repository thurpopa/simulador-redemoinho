// Leitura de boleto (padrão FEBRABAN): linha digitável ou código de barras.
// GastoBoleto.ler(texto[, hoje]) devolve { ok, tipo, valor (centavos), venc, banco } ou { ok: false, erro }.
(function () {
  var BANCOS = {
    '001': 'Banco do Brasil', '033': 'Santander', '104': 'Caixa', '237': 'Bradesco', '341': 'Itaú',
    '260': 'Nubank', '077': 'Inter', '336': 'C6', '756': 'Sicoob', '748': 'Sicredi', '422': 'Safra',
    '212': 'Original', '290': 'PagBank', '323': 'Mercado Pago'
  };
  var ERRO_TAMANHO = 'Cole os números do boleto (47 ou 48 dígitos).';
  var ERRO_DV = 'Código inválido. Confira se digitou todos os números.';
  var DIA = 86400000;
  var BASE_ANTIGA = Date.UTC(1997, 9, 7);   // fator 0 do primeiro ciclo
  var BASE_NOVA = Date.UTC(2025, 1, 22);    // fator 1000 do ciclo que começou em 22/02/2025

  function mod10(num) {
    var soma = 0, peso = 2;
    for (var i = num.length - 1; i >= 0; i--) {
      var p = Number(num.charAt(i)) * peso;
      soma += p > 9 ? p - 9 : p;
      peso = peso === 2 ? 1 : 2;
    }
    return (10 - soma % 10) % 10;
  }

  function somaMod11(num) {
    var soma = 0, peso = 2;
    for (var i = num.length - 1; i >= 0; i--) {
      soma += Number(num.charAt(i)) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    return soma % 11;
  }

  // DV geral do boleto bancário: resto 0, 1 ou 10 vira 1
  function mod11Banco(num) {
    var dv = 11 - somaMod11(num);
    return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
  }

  // DV de arrecadação em módulo 11: resto 0 ou 1 vira 0, resto 10 vira 1
  function mod11Arrecadacao(num) {
    var r = somaMod11(num);
    if (r === 0 || r === 1) return 0;
    if (r === 10) return 1;
    return 11 - r;
  }

  function dois(n) { return (n < 10 ? '0' : '') + n; }

  function iso(ms) {
    var d = new Date(ms);
    return d.getUTCFullYear() + '-' + dois(d.getUTCMonth() + 1) + '-' + dois(d.getUTCDate());
  }

  function referencia(hoje) {
    var d = hoje ? (hoje instanceof Date ? hoje : new Date(hoje + 'T00:00:00')) : new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Escolhe o ciclo do fator que deixa a data mais perto de hoje
  function vencimento(fator, hoje) {
    if (fator === 0) return null;
    var ref = referencia(hoje);
    var antiga = BASE_ANTIGA + fator * DIA;
    var nova = fator >= 1000 ? BASE_NOVA + (fator - 1000) * DIA : null;
    if (nova === null) return iso(antiga);
    return iso(Math.abs(nova - ref) < Math.abs(antiga - ref) ? nova : antiga);
  }

  function valorOuNulo(txt) {
    var c = Number(txt);
    return c > 0 ? c : null;
  }

  function linhaParaBarrasBancario(l) {
    var c1 = l.slice(0, 9), c2 = l.slice(10, 20), c3 = l.slice(21, 31);
    if (mod10(c1) !== Number(l.charAt(9)) || mod10(c2) !== Number(l.charAt(20)) || mod10(c3) !== Number(l.charAt(31))) return null;
    return l.slice(0, 4) + l.charAt(32) + l.slice(33, 47) + l.slice(4, 9) + l.slice(10, 20) + l.slice(21, 31);
  }

  function lerBancario(barras, hoje) {
    if (mod11Banco(barras.slice(0, 4) + barras.slice(5)) !== Number(barras.charAt(4))) return { ok: false, erro: ERRO_DV };
    return {
      ok: true, tipo: 'bancario',
      valor: valorOuNulo(barras.slice(9, 19)),
      venc: vencimento(Number(barras.slice(5, 9)), hoje),
      banco: BANCOS[barras.slice(0, 3)] || null
    };
  }

  function dvArrecadacao(barras) {
    var id = barras.charAt(2);
    if (id === '6' || id === '7') return mod10;
    if (id === '8' || id === '9') return mod11Arrecadacao;
    return null;
  }

  function lerArrecadacao(barras) {
    var dv = dvArrecadacao(barras);
    if (!dv || dv(barras.slice(0, 3) + barras.slice(4)) !== Number(barras.charAt(3))) return { ok: false, erro: ERRO_DV };
    var id = barras.charAt(2);
    return {
      ok: true, tipo: 'arrecadacao',
      valor: id === '6' || id === '8' ? valorOuNulo(barras.slice(4, 15)) : null,
      venc: null, banco: null
    };
  }

  function ler(texto, hoje) {
    var n = String(texto == null ? '' : texto).replace(/\D/g, '');
    if (n.length === 47 && n.charAt(0) !== '8') {
      var barras = linhaParaBarrasBancario(n);
      return barras ? lerBancario(barras, hoje) : { ok: false, erro: ERRO_DV };
    }
    if (n.length === 48 && n.charAt(0) === '8') {
      var b = '';
      for (var i = 0; i < 4; i++) {
        var bloco = n.slice(i * 12, i * 12 + 11);
        var dv = dvArrecadacao(n);
        if (!dv || dv(bloco) !== Number(n.charAt(i * 12 + 11))) return { ok: false, erro: ERRO_DV };
        b += bloco;
      }
      return lerArrecadacao(b);
    }
    if (n.length === 44) return n.charAt(0) === '8' ? lerArrecadacao(n) : lerBancario(n, hoje);
    return { ok: false, erro: ERRO_TAMANHO };
  }

  var GastoBoleto = { ler: ler };
  if (typeof window !== 'undefined') window.GastoBoleto = GastoBoleto;
  if (typeof module !== 'undefined' && module.exports) module.exports = GastoBoleto;
})();
