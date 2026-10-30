// Leitura de extrato bancário (OFX 1.x/2.x e CSV) e conciliação com os lançamentos do app.
// GastoExtrato.lerOFX(texto) / lerCSV(texto) devolvem { ok, banco, conta, linhas } ou { ok: false, erro }.
// Cada linha: { data: 'AAAA-MM-DD', valor: centavos com sinal (negativo = saída), desc, fitid }.
// GastoExtrato.conciliar(linhas, itens, contaId[, opcoes]) separa encontrados, jaImportados e novos;
// GastoExtrato.aplicar(resultado, itens, contaId[, gerarId]) devolve uma lista nova de itens.
(function () {
  var DIA = 86400000;
  var BANCOS = {
    '001': 'Banco do Brasil', '033': 'Santander', '104': 'Caixa', '237': 'Bradesco', '341': 'Itaú',
    '260': 'Nubank', '077': 'Inter', '336': 'C6', '756': 'Sicoob', '748': 'Sicredi', '422': 'Safra',
    '212': 'Original', '290': 'PagBank', '323': 'Mercado Pago'
  };
  var TIPOS_DEBITO = { DEBIT: 1, PAYMENT: 1, FEE: 1, SRVCHG: 1, ATM: 1, POS: 1, CHECK: 1, DIRECTDEBIT: 1 };
  var PALAVRAS_VAZIAS = {
    pix: 1, ted: 1, doc: 1, pagamento: 1, pagto: 1, pgto: 1, compra: 1, transferencia: 1, transf: 1,
    enviado: 1, enviada: 1, recebido: 1, recebida: 1, cartao: 1, debito: 1, credito: 1, para: 1,
    com: 1, dos: 1, das: 1, ltda: 1, eireli: 1, boleto: 1, conta: 1, agencia: 1
  };
  var ERRO_COLUNAS = 'Não reconheci as colunas. O arquivo precisa ter data, descrição e valor.';

  // ---- texto ----
  var MOJIBAKE = {
    'Ã§': 'ç', 'Ã£': 'ã', 'Ã¡': 'á', 'Ã¢': 'â', 'Ã ': 'à', 'Ã©': 'é', 'Ãª': 'ê', 'Ã­': 'í',
    'Ã³': 'ó', 'Ã´': 'ô', 'Ãµ': 'õ', 'Ãº': 'ú', 'Ã¼': 'ü', 'Ã‡': 'Ç', 'Ãƒ': 'Ã', 'Ã‰': 'É', 'Ã“': 'Ó', 'Ãš': 'Ú'
  };
  function consertarAcentos(s) {
    if (s.indexOf('Ã') < 0) return s;
    return s.replace(/Ã[§£¡¢ ©ª­³´µº¼‡ƒ‰“š]/g, function (m) { return MOJIBAKE[m] || m; });
  }

  var SEM_ACENTO = { 'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'é': 'e', 'ê': 'e', 'è': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i', 'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u', 'ç': 'c', 'ñ': 'n' };
  function normalizar(s) {
    return String(s || '').toLowerCase().replace(/[áàâãäéêèëíìîïóòôõöúùûüçñ]/g, function (c) { return SEM_ACENTO[c]; });
  }
  function descNormal(s) { return normalizar(s).replace(/[^a-z0-9]+/g, ' ').replace(/^ | $/g, ''); }

  function tokens(s) {
    var lista = descNormal(s).split(' '), res = {}, n = 0;
    for (var i = 0; i < lista.length; i++) {
      var t = lista[i];
      if (t.length < 3 || /^\d+$/.test(t) || PALAVRAS_VAZIAS[t]) continue;
      if (!res[t]) { res[t] = 1; n++; }
    }
    return { mapa: res, n: n };
  }
  function semelhanca(a, b) {
    var ta = tokens(a), tb = tokens(b);
    if (!ta.n || !tb.n) return 0;
    var comuns = 0;
    for (var t in ta.mapa) if (tb.mapa[t]) comuns++;
    return comuns / (ta.n + tb.n - comuns);
  }

  // ---- números e datas ----
  // "1.234,56", "-1.234,56", "1234.56", "R$ 1.234,56", "(150,00)", "150,00-" → centavos com sinal
  function lerValor(txt) {
    var s = String(txt == null ? '' : txt).replace(/R\$|\s| /g, '');
    if (!s) return null;
    var negativo = false;
    if (/^\(.*\)$/.test(s)) { negativo = true; s = s.slice(1, -1); }
    if (s.charAt(0) === '-') { negativo = !negativo; s = s.slice(1); }
    else if (s.charAt(0) === '+') s = s.slice(1);
    if (s.charAt(s.length - 1) === '-') { negativo = !negativo; s = s.slice(0, -1); }
    if (!/^[\d.,]+$/.test(s)) return null;
    var virgula = s.lastIndexOf(','), ponto = s.lastIndexOf('.');
    if (virgula >= 0 && ponto >= 0) {
      if (virgula > ponto) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (virgula >= 0) {
      var partes = s.split(',');
      s = partes.length > 2 ? partes.join('') : partes[0] + '.' + partes[1];
    } else if (ponto >= 0) {
      var pp = s.split('.');
      if (pp.length > 2 || (pp[1].length === 3 && pp[0].length <= 3 && pp[0] !== '0')) s = pp.join('');
    }
    var n = parseFloat(s);
    if (!isFinite(n)) return null;
    var c = Math.round(n * 100);
    return negativo ? -c : c;
  }

  function dois(n) { return (n < 10 ? '0' : '') + n; }
  function montarData(a, m, d) {
    if (a < 100) a += 2000;
    var dt = new Date(Date.UTC(a, m - 1, d));
    if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
    return a + '-' + dois(m) + '-' + dois(d);
  }
  function lerData(txt) {
    var s = String(txt || '').replace(/^\s+|\s+$/g, ''), m;
    if ((m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s))) return montarData(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})(\s|$)/.exec(s))) return montarData(+m[3], +m[2], +m[1]);
    if ((m = /^(\d{4})(\d{2})(\d{2})/.exec(s))) return montarData(+m[1], +m[2], +m[3]);
    return null;
  }
  function diasEntre(a, b) {
    var pa = a.split('-'), pb = b.split('-');
    return Math.round((Date.UTC(+pa[0], pa[1] - 1, +pa[2]) - Date.UTC(+pb[0], pb[1] - 1, +pb[2])) / DIA);
  }

  // ---- OFX ----
  function campo(bloco, tag) {
    var m = new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i').exec(bloco);
    if (!m) return null;
    var v = m[1].replace(/^\s+|\s+$/g, '');
    return v ? v.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') : null;
  }

  function lerOFX(texto) {
    var t = consertarAcentos(String(texto || '').replace(/^﻿/, ''));
    if (!/<OFX>/i.test(t) && !/OFXHEADER/i.test(t)) return { ok: false, erro: 'Esse arquivo não parece um extrato OFX. Exporte o extrato do banco no formato OFX ou CSV.' };
    var linhas = [];
    var re = /<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|<\/OFX>|$)/gi, m;
    while ((m = re.exec(t))) {
      var b = m[1];
      var valor = lerValor(campo(b, 'TRNAMT'));
      var data = lerData(campo(b, 'DTPOSTED') || '');
      if (valor == null || !valor || !data) continue;
      var tipo = (campo(b, 'TRNTYPE') || '').toUpperCase();
      if (valor > 0 && TIPOS_DEBITO[tipo]) valor = -valor;
      var memo = campo(b, 'MEMO'), nome = campo(b, 'NAME');
      var desc = memo && nome && descNormal(memo) !== descNormal(nome)
        ? (descNormal(memo).indexOf(descNormal(nome)) >= 0 ? memo : nome + ' ' + memo)
        : (memo || nome || 'Sem descrição');
      linhas.push({ data: data, valor: valor, desc: desc.replace(/\s+/g, ' '), fitid: campo(b, 'FITID') });
    }
    if (!linhas.length) return { ok: false, erro: 'Não achei movimentações nesse extrato. Confira o período exportado.' };
    var bankid = campo(t, 'BANKID'), org = campo(t, 'ORG');
    var codigo = bankid ? ('000' + bankid.replace(/\D/g, '')).slice(-3) : null;
    return {
      ok: true,
      banco: (codigo && BANCOS[codigo]) || org || bankid || null,
      conta: campo(t, 'ACCTID'),
      linhas: linhas
    };
  }

  // ---- CSV ----
  function separarCampos(linha, sep) {
    var res = [], atual = '', aspas = false;
    for (var i = 0; i < linha.length; i++) {
      var c = linha.charAt(i);
      if (aspas) {
        if (c === '"') {
          if (linha.charAt(i + 1) === '"') { atual += '"'; i++; } else aspas = false;
        } else atual += c;
      } else if (c === '"') aspas = true;
      else if (c === sep) { res.push(atual); atual = ''; }
      else atual += c;
    }
    res.push(atual);
    return res.map(function (x) { return x.replace(/^\s+|\s+$/g, ''); });
  }

  function acharColunas(campos) {
    var col = { data: -1, desc: -1, valor: -1, credito: -1, debito: -1, id: -1 };
    var prioridadeDesc = 99;
    for (var i = 0; i < campos.length; i++) {
      var n = descNormal(campos[i]);
      if (!n) continue;
      if (col.data < 0 && /(^| )(data|date|dt)( |$)/.test(n)) { col.data = i; continue; }
      if (/saldo/.test(n)) continue;
      if (col.id < 0 && /^(identificador|fitid|id|id transacao)$/.test(n)) { col.id = i; continue; }
      var p = /descri|histor/.test(n) ? 1 : /lancamento|title|titulo|memo|detalhe|estabelecimento/.test(n) ? 2 : 99;
      if (p < prioridadeDesc) { col.desc = i; prioridadeDesc = p; continue; }
      if (col.credito < 0 && /credito|entrada/.test(n)) { col.credito = i; continue; }
      if (col.debito < 0 && /debito|saida/.test(n)) { col.debito = i; continue; }
      if (col.valor < 0 && /(^| )(valor|amount|value|quantia)( |$)/.test(n)) { col.valor = i; continue; }
    }
    var ok = col.data >= 0 && col.desc >= 0 && (col.valor >= 0 || col.credito >= 0 || col.debito >= 0);
    return ok ? col : null;
  }

  function lerCSV(texto) {
    var t = consertarAcentos(String(texto || '').replace(/^﻿/, ''));
    var brutas = t.split(/\r\n|\n|\r/), linhasTxt = [];
    for (var i = 0; i < brutas.length; i++) if (/\S/.test(brutas[i])) linhasTxt.push(brutas[i]);
    if (!linhasTxt.length) return { ok: false, erro: 'O arquivo está vazio.' };

    var seps = [';', '\t', ','], sep = null, col = null, inicio = -1;
    for (var l = 0; l < Math.min(linhasTxt.length, 20) && !col; l++) {
      for (var s = 0; s < seps.length; s++) {
        if (linhasTxt[l].indexOf(seps[s]) < 0) continue;
        var c = acharColunas(separarCampos(linhasTxt[l], seps[s]));
        if (c) { sep = seps[s]; col = c; inicio = l + 1; break; }
      }
    }
    if (!col) return { ok: false, erro: ERRO_COLUNAS };

    var linhas = [];
    for (var k = inicio; k < linhasTxt.length; k++) {
      var cs = separarCampos(linhasTxt[k], sep);
      var desc = cs[col.desc] || '';
      if (/^saldo/.test(descNormal(desc).replace(/ /g, ''))) continue;
      var data = lerData(cs[col.data]);
      if (!data) continue;
      var valor;
      if (col.valor >= 0) valor = lerValor(cs[col.valor]);
      else {
        var cr = col.credito >= 0 ? lerValor(cs[col.credito]) : null;
        var db = col.debito >= 0 ? lerValor(cs[col.debito]) : null;
        valor = cr == null && db == null ? null : Math.abs(cr || 0) - Math.abs(db || 0);
      }
      if (valor == null || !valor) continue;
      linhas.push({
        data: data, valor: valor, desc: desc.replace(/\s+/g, ' ') || 'Sem descrição',
        fitid: col.id >= 0 && cs[col.id] ? cs[col.id] : null
      });
    }
    if (!linhas.length) return { ok: false, erro: 'Não achei movimentações nesse arquivo. Confira o período exportado.' };
    return { ok: true, banco: null, conta: null, linhas: linhas };
  }

  // ---- conciliação ----
  function valorEfetivo(item) { return item.valorPago != null ? item.valorPago : item.valor; }
  function tipoDe(item) { return item.tipo === 'entrada' ? 'entrada' : 'saida'; }

  function sugerir(linha, itens) {
    var tipo = linha.valor < 0 ? 'saida' : 'entrada';
    var melhor = null, melhorData = '';
    for (var i = 0; i < itens.length; i++) {
      var it = itens[i];
      if (tipoDe(it) !== tipo || it.transf) continue;
      if (semelhanca(it.desc, linha.desc) < 0.5) continue;
      var d = it.pagoEm || it.venc || '';
      if (!melhor || d > melhorData) { melhor = it; melhorData = d; }
    }
    var n = ' ' + descNormal(linha.desc) + ' ';
    var sug = {
      tipo: tipo, desc: linha.desc,
      cat: tipo === 'saida' ? 'Outros' : 'Outras entradas',
      forma: / pix /.test(n) ? 'Pix' : 'Transferência'
    };
    if (melhor) {
      sug.cat = melhor.cat; sug.forma = melhor.forma;
      if (melhor.contato) sug.contato = melhor.contato;
    }
    return sug;
  }

  function conciliar(linhas, itens, contaId, opcoes) {
    opcoes = opcoes || {};
    var dias = opcoes.dias != null ? opcoes.dias : 5;
    var tolerancia = opcoes.tolerancia != null ? opcoes.tolerancia : 0.10;
    var usado = {}, linhaFeita = [], jaImportados = [], encontrados = [], novos = [];

    // (a) já importados: mesmo FITID em qualquer conta, ou (sem FITID) mesmo pagamento na mesma conta
    for (var i = 0; i < linhas.length; i++) {
      var ln = linhas[i], abs = Math.abs(ln.valor), tipo = ln.valor < 0 ? 'saida' : 'entrada', achou = null;
      for (var j = 0; j < itens.length && !achou; j++) {
        var it = itens[j];
        if (usado[it.id]) continue;
        if (ln.fitid) { if (it.fitid === ln.fitid) achou = it; }
        else if (it.pago && it.conta === contaId && tipoDe(it) === tipo && valorEfetivo(it) === abs &&
          it.pagoEm === ln.data && descNormal(it.desc) === descNormal(ln.desc)) achou = it;
      }
      if (achou) { usado[achou.id] = true; linhaFeita[i] = true; jaImportados.push({ linha: ln, item: achou, _i: i }); }
    }

    // (b) contas em aberto: primeiro valor exato, depois valor parecido; os melhores pares escolhem primeiro
    function passada(exato) {
      var pares = [];
      for (var i = 0; i < linhas.length; i++) {
        if (linhaFeita[i]) continue;
        var ln = linhas[i], abs = Math.abs(ln.valor), tipo = ln.valor < 0 ? 'saida' : 'entrada';
        for (var j = 0; j < itens.length; j++) {
          var it = itens[j];
          if (usado[it.id] || it.pago || it.transf || tipoDe(it) !== tipo) continue;
          if (it.conta != null && it.conta !== '' && it.conta !== contaId) continue;
          var dd = Math.abs(diasEntre(it.venc, ln.data));
          if (dd > dias) continue;
          var dif = Math.abs(it.valor - abs) / it.valor;
          if (exato ? it.valor !== abs : (it.valor === abs || dif > tolerancia)) continue;
          pares.push({ i: i, item: it, dif: exato ? 0 : dif, dd: dd, sim: semelhanca(it.desc, ln.desc) });
        }
      }
      pares.sort(function (a, b) { return a.dif - b.dif || a.dd - b.dd || b.sim - a.sim || a.i - b.i; });
      for (var p = 0; p < pares.length; p++) {
        var par = pares[p];
        if (linhaFeita[par.i] || usado[par.item.id]) continue;
        linhaFeita[par.i] = true; usado[par.item.id] = true;
        encontrados.push({ linha: linhas[par.i], item: par.item, motivo: exato ? 'mesmo valor' : 'valor diferente', _i: par.i });
      }
    }
    passada(true);
    passada(false);

    // (c) o que sobrou vira lançamento novo, com sugestão pelo histórico
    for (var k = 0; k < linhas.length; k++) {
      if (!linhaFeita[k]) novos.push({ linha: linhas[k], sugestao: sugerir(linhas[k], itens), _i: k });
    }

    function limpar(lista) {
      lista.sort(function (a, b) { return a._i - b._i; });
      for (var x = 0; x < lista.length; x++) delete lista[x]._i;
      return lista;
    }
    return { encontrados: limpar(encontrados), jaImportados: limpar(jaImportados), novos: limpar(novos) };
  }

  function aplicar(resultado, itens, contaId, gerarId) {
    var cont = 0;
    gerarId = gerarId || function () { return 'ext' + Date.now().toString(36) + (cont++).toString(36); };
    var copia = [], porId = {};
    for (var i = 0; i < itens.length; i++) {
      var c = {};
      for (var k in itens[i]) if (Object.prototype.hasOwnProperty.call(itens[i], k)) c[k] = itens[i][k];
      copia.push(c); porId[c.id] = c;
    }
    var enc = resultado.encontrados || [];
    for (var e = 0; e < enc.length; e++) {
      var it = porId[enc[e].item.id], ln = enc[e].linha;
      if (!it) continue;
      it.pago = true;
      it.pagoEm = ln.data;
      it.valorPago = Math.abs(ln.valor);
      if (ln.fitid) it.fitid = ln.fitid;
      if (it.conta == null || it.conta === '') it.conta = contaId;
    }
    var nov = resultado.novos || [];
    for (var n = 0; n < nov.length; n++) {
      var l = nov[n].linha, s = nov[n].sugestao || sugerir(l, itens), abs = Math.abs(l.valor);
      var novo = {
        id: gerarId(), tipo: s.tipo || (l.valor < 0 ? 'saida' : 'entrada'), desc: s.desc || l.desc,
        valor: abs, venc: l.data, cat: s.cat, forma: s.forma,
        pago: true, pagoEm: l.data, valorPago: abs, conta: contaId
      };
      if (s.contato) novo.contato = s.contato;
      if (l.fitid) novo.fitid = l.fitid;
      copia.push(novo);
    }
    return copia;
  }

  var api = {
    lerOFX: lerOFX, lerCSV: lerCSV, conciliar: conciliar, aplicar: aplicar,
    _lerValor: lerValor, _lerData: lerData, _semelhanca: semelhanca
  };
  if (typeof window !== 'undefined') window.GastoExtrato = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
