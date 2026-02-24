// ============================================================
//  SIM — Dashboard de Mortalidade | app.js
// ============================================================

// ---- ESTADO GLOBAL ----
let dadosOriginais = [];
let dadosFiltrados = [];
let charts = {};

// ---- MAPEAMENTOS ----
const UF_MAP = {
  '11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO',
  '21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL',
  '28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP',
  '41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'
};

const LOCAL_MAP = {
  '1':'Hospital','2':'Outro estab. saúde','3':'Domicílio',
  '4':'Via pública','5':'Outros','6':'Aldeia indígena','9':'Ignorado'
};

const ESC_MAP = {
  '0':'Sem escolaridade','1':'1-3 anos','2':'4-7 anos',
  '3':'8-11 anos','4':'12+','5':'Não se aplica','9':'Ignorado'
};

const CID_NAMES = {
  'I219':'Infarto agudo do miocárdio','I10':'Hipertensão essencial','I64':'AVC NE',
  'C349':'Neoplasia maligna pulmão','J449':'DPOC','J189':'Pneumonia NE',
  'A419':'Sepse NE','J960':'Insuficiência respiratória','I500':'Insuficiência cardíaca',
  'K701':'Doença alcoólica do fígado','R99':'Causa mal definida','E106':'Diabetes tipo 1',
  'E149':'Diabetes mellitus NE','C509':'Neoplasia maligna mama','I678':'Doenças cerebrovasculares',
  'N189':'Insuficiência renal crônica','C20':'Neoplasia reto','J181':'Pneumonia lobar',
  'B200':'HIV/AIDS','V234':'Acidente motocicleta','I694':'Sequela AVC',
  'I714':'Aneurisma aorta abdominal','W060':'Queda de cama','P219':'Asfixia ao nascer',
  'Q913':'Síndrome Down','P015':'Outras complicações parto',
  'C80':'Neoplasia maligna sem especificação','D500':'Anemia por deficiência de ferro',
  'I110':'Doença cardíaca hipertensiva','X959':'Agressão por arma de fogo'
};

const CORES = [
  '#00e5ff','#ff4d6d','#7cfc6e','#ffb830','#a78bfa',
  '#fb923c','#38bdf8','#f472b6','#34d399','#fbbf24'
];

// ============================================================
//  HELPERS — declarados primeiro para evitar ReferenceError
// ============================================================
function topN(obj, n) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function mostrarStatus(msg) {
  const bar = document.getElementById('statusBar');
  bar.textContent = msg;
  bar.style.display = 'block';
}

function extrairAno(dt) {
  if (!dt || dt.length < 4) return null;
  if (dt.length === 8)  return dt.slice(4);
  if (dt.length === 10) return dt.slice(6);
  return null;
}

function extrairMes(dt) {
  if (!dt || dt.length < 4) return null;
  if (dt.length === 8) return dt.slice(2, 4);
  return null;
}

function extrairUF(codmun) {
  if (!codmun || codmun.length < 2) return null;
  return UF_MAP[codmun.slice(0, 2)] || codmun.slice(0, 2);
}

function contarPor(campo, dados) {
  const cnt = {};
  dados.forEach(d => {
    const v = d[campo] || 'Ignorado';
    cnt[v] = (cnt[v] || 0) + 1;
  });
  return cnt;
}

function destroyChart(id) {
  if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

// ============================================================
//  DRAG & DROP
// ============================================================
const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('drag');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('drag');
  const file = e.dataTransfer.files[0];
  if (file) processarArquivo(file);
});

function carregarCSV(input) {
  if (input.files[0]) processarArquivo(input.files[0]);
}

function processarArquivo(file) {
  mostrarStatus(`⚙️ Carregando ${file.name}...`);
  const reader = new FileReader();
  reader.onload = e => {
    const texto  = e.target.result;
    const linhas = texto.split('\n');
    const headers = linhas[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());

    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
      if (!linhas[i].trim()) continue;
      const vals = linhas[i].split(',');
      const obj  = {};
      headers.forEach((h, idx) => {
        obj[h] = (vals[idx] || '').trim().replace(/"/g, '');
      });
      dados.push(obj);
    }

    dadosOriginais = dados;
    dadosFiltrados = dados;
    mostrarStatus(`✅ ${dados.length.toLocaleString('pt-BR')} registros carregados com sucesso!`);
    inicializar();
  };
  reader.readAsText(file, 'utf-8');
}

// ============================================================
//  DADOS DE DEMONSTRAÇÃO
// ============================================================
function carregarDemoData() {
  mostrarStatus('📊 Carregando dados de demonstração...');

  const ufs    = ['35','33','31','29','41','43','23','26','52','50','21','15','53','42','32'];
  const cids   = ['I219','I10','J449','J189','A419','I500','J960','R99','C349','E149','K701','I64','N189','B200','V234','I678','E106','C509','I219','I110'];
  const anos   = ['2018','2019','2020','2021','2022','2023'];
  const sexos  = ['1','1','1','2','2'];
  const locais = ['1','1','1','3','3','4','2','5'];
  const escs   = ['1','2','3','4','0','9'];
  const idades = Array.from({ length: 100 }, (_, i) => String(i + 1));

  const dados = [];
  const total = 5010;

  for (let i = 0; i < total; i++) {
    const ano = anos[Math.floor(Math.random() * anos.length)];
    const mes = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    dados.push({
      dtobito:   `${String(Math.floor(Math.random() * 28) + 1).padStart(2,'0')}${mes}${ano}`,
      sexo:      sexos[Math.floor(Math.random() * sexos.length)],
      codmunocor: ufs[Math.floor(Math.random() * ufs.length)] + '0000',
      codmunres:  ufs[Math.floor(Math.random() * ufs.length)] + '0000',
      causabas:  cids[Math.floor(Math.random() * cids.length)],
      idade:     idades[Math.floor(Math.random() * idades.length)],
      lococor:   locais[Math.floor(Math.random() * locais.length)],
      esc2010:   escs[Math.floor(Math.random() * escs.length)],
      tipobito:  Math.random() > 0.05 ? '2' : '1',
      contador:  String(i + 1)
    });
  }

  dadosOriginais = dados;
  dadosFiltrados = dados;
  mostrarStatus(`✅ ${total.toLocaleString('pt-BR')} registros de demonstração carregados. Carregue o CSV real para ver seus 501.000 registros.`);
  inicializar();
}

// ============================================================
//  INICIALIZAR
// ============================================================
function inicializar() {
  uploadArea.style.display = 'none';
  document.querySelector('.separator').style.display = 'none';
  document.querySelector('.btn-demo').style.display  = 'none';
  document.getElementById('demo-content').style.display = 'block';

  popularFiltros();
  renderizarTudo();
}

function popularFiltros() {
  const anos = [...new Set(dadosOriginais.map(d => extrairAno(d.dtobito)).filter(Boolean))].sort();
  const selAno = document.getElementById('filtroAno');
  selAno.innerHTML = '<option value="">Todos</option>';
  anos.forEach(a => selAno.innerHTML += `<option value="${a}">${a}</option>`);

  const ufs = [...new Set(dadosOriginais.map(d => extrairUF(d.codmunocor)).filter(Boolean))].sort();
  const selUF = document.getElementById('filtroUF');
  selUF.innerHTML = '<option value="">Todos</option>';
  ufs.forEach(u => selUF.innerHTML += `<option value="${u}">${u}</option>`);
}

function aplicarFiltros() {
  const ano  = document.getElementById('filtroAno').value;
  const sexo = document.getElementById('filtroSexo').value;
  const uf   = document.getElementById('filtroUF').value;
  const tipo = document.getElementById('filtroTipo').value;

  dadosFiltrados = dadosOriginais.filter(d => {
    if (ano  && extrairAno(d.dtobito) !== ano)   return false;
    if (sexo && d.sexo !== sexo)                  return false;
    if (uf   && extrairUF(d.codmunocor) !== uf)  return false;
    if (tipo && d.tipobito !== tipo)              return false;
    return true;
  });

  renderizarTudo();
}

// ============================================================
//  RENDERIZAR TUDO
// ============================================================
function renderizarTudo() {
  renderKPIs();
  renderTemporal();
  renderEstados();
  renderCID();
  renderPiramide();
  renderSexo();
  renderLocal();
  renderEsc();
  renderMapa();
  renderTabelaCID();
  document.getElementById('footerInfo').textContent =
    `${dadosFiltrados.length.toLocaleString('pt-BR')} registros analisados`;
}

// ============================================================
//  KPIs
// ============================================================
function renderKPIs() {
  const total = dadosFiltrados.length;
  const masc  = dadosFiltrados.filter(d => d.sexo === '1').length;
  const fem   = dadosFiltrados.filter(d => d.sexo === '2').length;

  const idades = dadosFiltrados
    .map(d => { const v = parseInt(d.idade); return v > 0 && v < 150 ? v : null; })
    .filter(Boolean);
  const mediaIdade = idades.length
    ? (idades.reduce((a, b) => a + b, 0) / idades.length).toFixed(1)
    : '—';

  const cidCount  = contarPor('causabas', dadosFiltrados);
  const topCID    = topN(cidCount, 1)[0];
  const cidLabel  = topCID ? (CID_NAMES[topCID[0]] || topCID[0]) : '—';

  const ufCount   = contarPor('codmunocor', dadosFiltrados);
  const topUFRaw  = topN(ufCount, 1)[0];
  const topUF     = topUFRaw ? (extrairUF(topUFRaw[0]) || topUFRaw[0]) : '—';

  const anos      = dadosFiltrados.map(d => extrairAno(d.dtobito)).filter(Boolean);
  const anosUniq  = [...new Set(anos)];
  const mediaAnual = anosUniq.length
    ? Math.round(total / anosUniq.length).toLocaleString('pt-BR')
    : '—';

  document.getElementById('kpisArea').innerHTML = `
    <div class="kpi c1">
      <div class="kpi-icon">💀</div>
      <div class="kpi-label">Total de Óbitos</div>
      <div class="kpi-value">${total.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">registros no período</div>
    </div>
    <div class="kpi c2">
      <div class="kpi-icon">♂</div>
      <div class="kpi-label">Óbitos Masculinos</div>
      <div class="kpi-value">${masc.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">${total ? ((masc / total) * 100).toFixed(1) : 0}% do total</div>
    </div>
    <div class="kpi c3">
      <div class="kpi-icon">♀</div>
      <div class="kpi-label">Óbitos Femininos</div>
      <div class="kpi-value">${fem.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">${total ? ((fem / total) * 100).toFixed(1) : 0}% do total</div>
    </div>
    <div class="kpi c4">
      <div class="kpi-icon">🎂</div>
      <div class="kpi-label">Idade Média</div>
      <div class="kpi-value">${mediaIdade}</div>
      <div class="kpi-sub">anos ao óbito</div>
    </div>
    <div class="kpi c5">
      <div class="kpi-icon">🏥</div>
      <div class="kpi-label">Causa Mais Frequente</div>
      <div class="kpi-value" style="font-size:14px; line-height:1.3">${cidLabel}</div>
      <div class="kpi-sub">${topCID ? topCID[1].toLocaleString('pt-BR') : 0} casos</div>
    </div>
    <div class="kpi c6">
      <div class="kpi-icon">📍</div>
      <div class="kpi-label">Estado Líder</div>
      <div class="kpi-value">${topUF}</div>
      <div class="kpi-sub">média ${mediaAnual}/ano</div>
    </div>
  `;
}

// ============================================================
//  TEMPORAL
// ============================================================
function renderTemporal() {
  destroyChart('temporal');
  const por = {};
  dadosFiltrados.forEach(d => {
    const ano = extrairAno(d.dtobito);
    const mes = extrairMes(d.dtobito);
    if (ano && mes) {
      const k = `${ano}-${mes}`;
      por[k] = (por[k] || 0) + 1;
    }
  });

  const labels = Object.keys(por).sort();
  const values = labels.map(k => por[k]);

  charts['temporal'] = new Chart(document.getElementById('chartTemporal'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Óbitos',
        data: values,
        borderColor: '#00e5ff',
        backgroundColor: 'rgba(0,229,255,0.08)',
        borderWidth: 2,
        pointRadius: labels.length > 50 ? 0 : 3,
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b', maxTicksLimit: 12, font: { family: 'DM Mono', size: 10 } }, grid: { color: '#1f2d45' } },
        y: { ticks: { color: '#64748b', font: { family: 'DM Mono', size: 10 } }, grid: { color: '#1f2d45' } }
      }
    }
  });
}

// ============================================================
//  ESTADOS
// ============================================================
function renderEstados() {
  destroyChart('estados');
  const cnt = {};
  dadosFiltrados.forEach(d => {
    const uf = extrairUF(d.codmunocor);
    if (uf) cnt[uf] = (cnt[uf] || 0) + 1;
  });

  const sorted = topN(cnt, 15);
  const labels = sorted.map(x => x[0]);
  const values = sorted.map(x => x[1]);

  charts['estados'] = new Chart(document.getElementById('chartEstados'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: labels.map((_, i) => CORES[i % CORES.length] + 'cc'), borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b', font: { family: 'DM Mono', size: 10 } }, grid: { color: '#1f2d45' } },
        y: { ticks: { color: '#e2e8f0', font: { family: 'DM Mono', size: 11 } }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
//  CID
// ============================================================
function renderCID() {
  destroyChart('cid');
  const cnt    = contarPor('causabas', dadosFiltrados);
  const sorted = topN(cnt, 20);
  const labels = sorted.map(x => CID_NAMES[x[0]] ? `${x[0]} — ${CID_NAMES[x[0]].slice(0, 30)}` : x[0]);
  const values = sorted.map(x => x[1]);

  charts['cid'] = new Chart(document.getElementById('chartCID'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: '#7cfc6ecc', borderRadius: 3 }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b', font: { family: 'DM Mono', size: 9 } }, grid: { color: '#1f2d45' } },
        y: { ticks: { color: '#e2e8f0', font: { family: 'DM Mono', size: 9 } }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
//  PIRÂMIDE ETÁRIA
// ============================================================
function renderPiramide() {
  destroyChart('piramide');

  const faixas = ['0-4','5-9','10-14','15-19','20-29','30-39','40-49','50-59','60-69','70-79','80+'];
  const masc   = new Array(faixas.length).fill(0);
  const fem    = new Array(faixas.length).fill(0);

  function faixaIdx(idade) {
    if (idade <= 4)  return 0;
    if (idade <= 9)  return 1;
    if (idade <= 14) return 2;
    if (idade <= 19) return 3;
    if (idade <= 29) return 4;
    if (idade <= 39) return 5;
    if (idade <= 49) return 6;
    if (idade <= 59) return 7;
    if (idade <= 69) return 8;
    if (idade <= 79) return 9;
    return 10;
  }

  dadosFiltrados.forEach(d => {
    const v = parseInt(d.idade);
    if (!v || v < 0 || v > 150) return;
    const idx = faixaIdx(v);
    if (d.sexo === '1')      masc[idx]++;
    else if (d.sexo === '2') fem[idx]++;
  });

  charts['piramide'] = new Chart(document.getElementById('chartPiramide'), {
    type: 'bar',
    data: {
      labels: faixas,
      datasets: [
        { label: 'Masculino', data: masc.map(v => -v), backgroundColor: '#00e5ffbb', borderRadius: 2 },
        { label: 'Feminino',  data: fem,                backgroundColor: '#ff4d6dbb', borderRadius: 2 }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#e2e8f0', font: { family: 'DM Mono', size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${Math.abs(ctx.parsed.x).toLocaleString('pt-BR')}`
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#64748b', font: { family: 'DM Mono', size: 10 },
            callback: v => Math.abs(v).toLocaleString('pt-BR')
          },
          grid: { color: '#1f2d45' }
        },
        y: { ticks: { color: '#e2e8f0', font: { family: 'DM Mono', size: 10 } }, grid: { display: false } }
      }
    }
  });
}

// ============================================================
//  SEXO
// ============================================================
function renderSexo() {
  destroyChart('sexo');
  const masc = dadosFiltrados.filter(d => d.sexo === '1').length;
  const fem  = dadosFiltrados.filter(d => d.sexo === '2').length;
  const ind  = dadosFiltrados.filter(d => !['1','2'].includes(d.sexo)).length;

  charts['sexo'] = new Chart(document.getElementById('chartSexo'), {
    type: 'doughnut',
    data: {
      labels: ['Masculino','Feminino','Ignorado'],
      datasets: [{ data: [masc, fem, ind], backgroundColor: ['#00e5ffcc','#ff4d6dcc','#64748bcc'], borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e2e8f0', font: { family: 'DM Mono', size: 11 }, padding: 16 } }
      },
      cutout: '60%'
    }
  });
}

// ============================================================
//  LOCAL OCORRÊNCIA
// ============================================================
function renderLocal() {
  destroyChart('local');
  const cnt     = contarPor('lococor', dadosFiltrados);
  const entries = topN(cnt, 6);
  const labels  = entries.map(x => LOCAL_MAP[x[0]] || x[0]);
  const values  = entries.map(x => x[1]);

  charts['local'] = new Chart(document.getElementById('chartLocal'), {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: CORES.map(c => c + 'cc'), borderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#e2e8f0', font: { family: 'DM Mono', size: 10 }, padding: 10 } }
      }
    }
  });
}

// ============================================================
//  ESCOLARIDADE
// ============================================================
function renderEsc() {
  destroyChart('esc');
  const campo   = dadosFiltrados[0]?.esc2010 !== undefined ? 'esc2010' : 'esc';
  const cnt     = contarPor(campo, dadosFiltrados);
  const entries = Object.entries(ESC_MAP).map(([k, v]) => [v, cnt[k] || 0]).filter(x => x[1] > 0);

  charts['esc'] = new Chart(document.getElementById('chartEsc'), {
    type: 'bar',
    data: {
      labels: entries.map(x => x[0]),
      datasets: [{ data: entries.map(x => x[1]), backgroundColor: '#a78bfacc', borderRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#64748b', font: { family: 'DM Mono', size: 9 }, maxRotation: 30 }, grid: { display: false } },
        y: { ticks: { color: '#64748b', font: { family: 'DM Mono', size: 9 } }, grid: { color: '#1f2d45' } }
      }
    }
  });
}

// ============================================================
//  MAPA ESTADOS
// ============================================================
function renderMapa() {
  const cnt = {};
  dadosFiltrados.forEach(d => {
    const uf = extrairUF(d.codmunres || d.codmunocor);
    if (uf) cnt[uf] = (cnt[uf] || 0) + 1;
  });

  const maxVal       = Math.max(...Object.values(cnt), 1);
  const container    = document.getElementById('mapaEstados');
  container.innerHTML = '';

  Object.entries(cnt).sort((a, b) => b[1] - a[1]).forEach(([uf, qtd]) => {
    const pct = (qtd / maxVal) * 100;
    const div = document.createElement('div');
    div.className = 'estado-box';
    div.innerHTML = `
      <div class="estado-uf">${uf}</div>
      <div class="estado-count">${qtd.toLocaleString('pt-BR')}</div>
    `;
    div.style.borderColor = `rgba(0,229,255,${(pct / 100) * 0.7 + 0.1})`;
    div.style.background  = `linear-gradient(to top, rgba(0,229,255,${(pct / 100) * 0.2}) ${pct}%, #1a2235 ${pct}%)`;
    container.appendChild(div);
  });
}

// ============================================================
//  TABELA CID
// ============================================================
function renderTabelaCID() {
  const cnt    = contarPor('causabas', dadosFiltrados);
  const sorted = topN(cnt, 30);
  const total  = dadosFiltrados.length;
  const maxVal = sorted[0]?.[1] || 1;
  const tbody  = document.querySelector('#tabelaCID tbody');
  tbody.innerHTML = '';

  sorted.forEach(([cid, qtd], i) => {
    const pct    = ((qtd / total) * 100).toFixed(2);
    const barPct = ((qtd / maxVal) * 100).toFixed(1);
    const desc   = CID_NAMES[cid] || '—';
    const tr     = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank">${i + 1}</td>
      <td style="color:var(--accent); font-weight:500">${cid}</td>
      <td style="color:var(--text)">${desc}</td>
      <td style="font-weight:600">${qtd.toLocaleString('pt-BR')}</td>
      <td style="color:var(--muted)">${pct}%</td>
      <td>
        <div class="bar-inline">
          <div class="bar-bg"><div class="bar-fill" style="width:${barPct}%"></div></div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}
