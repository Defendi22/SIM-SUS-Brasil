# 📊 SIM — Dashboard de Mortalidade

Dashboard interativo para análise dos dados do **Sistema de Informação sobre Mortalidade (SIM)** do Ministério da Saúde do Brasil.

## 📁 Estrutura

```
dashboard_SIM/
├── index.html   ← estrutura da página
├── style.css    ← todos os estilos
├── app.js       ← toda a lógica e gráficos
└── README.md
```

## 🚀 Como usar

### Opção 1 — Abrir direto no navegador
Basta abrir o arquivo `index.html` em qualquer navegador moderno. Nenhum servidor necessário.

### Opção 2 — Servir localmente (recomendado para CSV grande)
```bash
# Python
python -m http.server 8080

# Node
npx serve .
```
Acesse: `http://localhost:8080`

### Opção 3 — GitHub Pages
1. Suba os arquivos para um repositório público
2. Vá em **Settings → Pages → Source: main / root**
3. Acesse via `https://seu-usuario.github.io/nome-do-repo`

## 📦 Como carregar seus dados

1. Gere o CSV com o extrator (`SIM_para_excel.py`)
2. Abra o dashboard no navegador
3. Clique em **"📂 Carregar seu CSV"** ou arraste o arquivo
4. Todos os gráficos atualizam automaticamente

> ⚠️ O processamento é 100% local — nenhum dado é enviado para servidores.

## 📈 Análises incluídas

| Visualização | Descrição |
|---|---|
| **6 KPIs** | Total, masculino, feminino, idade média, causa top, estado líder |
| **Linha do tempo** | Evolução mensal de óbitos |
| **Top 15 estados** | Ranking por UF de ocorrência |
| **Top 20 CID-10** | Causas de morte mais frequentes |
| **Pirâmide etária** | Distribuição por faixa etária e sexo |
| **Distribuição sexo** | Gráfico de rosca |
| **Local ocorrência** | Hospital, domicílio, via pública etc. |
| **Escolaridade** | Perfil educacional dos óbitos |
| **Mapa estados** | Heat visual por volume de óbitos |
| **Tabela ranking** | Top 30 CID com barra de proporção |

## 🔧 Filtros interativos

- Ano
- Sexo (masculino / feminino)
- Estado (UF de ocorrência)
- Tipo de óbito (fetal / não-fetal)

## 🛠️ Tecnologias

- HTML5 / CSS3 / JavaScript puro (sem frameworks)
- [Chart.js 4.4](https://www.chartjs.org/) para os gráficos
- Google Fonts: Syne + DM Mono

## 📡 Fonte dos dados

API pública do Ministério da Saúde:
```
https://apidadosabertos.saude.gov.br/vigilancia-e-meio-ambiente/sistema-de-informacao-sobre-mortalidade
```
