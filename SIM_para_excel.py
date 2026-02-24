"""
=============================================================
EXTRATOR COMPLETO - SIM (Sistema de Informação sobre Mortalidade)
Faz múltiplas requisições e consolida TUDO em um único Excel
=============================================================
pip install requests pandas openpyxl tqdm
=============================================================
"""

import requests
import pandas as pd
import time
import os
from datetime import datetime
from tqdm import tqdm

# ============================================================
# CONFIGURAÇÕES
# ============================================================
BASE_URL = "https://apidadosabertos.saude.gov.br/vigilancia-e-meio-ambiente/sistema-de-informacao-sobre-mortalidade"

LIMIT      = 1000       # máximo por requisição
MAX_OFFSET = 500000     # teto de segurança (ajuste se precisar)
PAUSA      = 0.5    # segundos entre requisições
TIMEOUT    = 30

HEADERS = {
    "Accept": "application/json",
    "User-Agent": "Mozilla/5.0"
}

ARQUIVO_CSV = f"SIM_COMPLETO_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

# ============================================================
# BUSCAR UMA PÁGINA
# ============================================================
def buscar(offset: int) -> list:
    params = {"limit": LIMIT, "offset": offset}
    for tentativa in range(1, 6):
        try:
            r = requests.get(BASE_URL, headers=HEADERS, params=params, timeout=TIMEOUT)

            if r.status_code in (204, 400, 404, 422):
                return []   # sem mais dados

            r.raise_for_status()
            data = r.json()

            # Extrai a lista de registros
            if isinstance(data, list):
                return data

            for chave in ["data", "dados", "registros", "items", "results", "content", "records"]:
                if chave in data and isinstance(data[chave], list):
                    return data[chave]

            # qualquer chave que seja lista
            for v in data.values():
                if isinstance(v, list):
                    return v

            return []

        except requests.exceptions.Timeout:
            print(f"\n  [TIMEOUT] offset={offset} | tentativa {tentativa}/5")
        except Exception as e:
            print(f"\n  [ERRO] offset={offset} | {e} | tentativa {tentativa}/5")

        time.sleep(3 * tentativa)

    return []


# ============================================================
# SALVAR CSV
# ============================================================
def salvar_csv(df: pd.DataFrame):
    print(f"\n⚙️  Salvando CSV com {len(df):,} registros e {len(df.columns)} colunas...")

    df.to_csv(ARQUIVO_CSV, index=False, encoding="utf-8-sig")
    # utf-8-sig garante que o Excel abre corretamente com acentos

    mb = os.path.getsize(ARQUIVO_CSV) / 1024 / 1024
    print(f"✅ CSV salvo: {ARQUIVO_CSV}  ({mb:.1f} MB)")


# ============================================================
# MAIN
# ============================================================
def main():
    print("=" * 60)
    print("  EXTRATOR SIM - Múltiplas Requisições → 1 arquivo Excel")
    print(f"  Início: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print("=" * 60)

    todos_registros = []
    offset = 0
    pagina = 1

    pbar = tqdm(desc="📥 Registros coletados", unit=" reg", dynamic_ncols=True)

    while offset <= MAX_OFFSET:
        registros = buscar(offset)

        if not registros:
            print(f"\n  Sem dados no offset {offset}. Coleta encerrada.")
            break

        todos_registros.extend(registros)
        pbar.update(len(registros))
        offset += len(registros)
        pagina += 1

        # Se veio menos que o limite → última página
        if len(registros) < LIMIT:
            print(f"\n  Última página recebida ({len(registros)} registros). Fim.")
            break

        time.sleep(PAUSA)

    pbar.close()

    if not todos_registros:
        print("\n❌ Nenhum dado foi coletado. Verifique se a API está disponível.")
        return

    print(f"\n📦 Total coletado: {len(todos_registros):,} registros")

    # Monta o DataFrame normalizando JSON aninhado
    df = pd.json_normalize(todos_registros)

    print(f"📋 Colunas encontradas: {list(df.columns)}")

    salvar_csv(df)

    print(f"\n🏁 Concluído: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    print(f"   Arquivo: {ARQUIVO_CSV}")
    print(f"   Linhas:  {len(df):,}")
    print(f"   Colunas: {len(df.columns)}")


if __name__ == "__main__":
    main()
