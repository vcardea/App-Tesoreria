from fastapi import FastAPI, UploadFile, File, Form
import pdfplumber
import json
import re
import io
import uvicorn

app = FastAPI()

def super_clean(text):
    if not text: return ""
    # Rimuove sporcizia e normalizza spazi
    return re.sub(r'\s+', ' ', text.upper()).strip()

@app.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...), members: str = Form(...)):
    lista_membri = json.loads(members)
    matches = []
    content = await file.read()
    
    # Regex italiana per importi (es. 25,00 o 1.250,50)
    money_regex = re.compile(r'(\d{1,3}(?:\.\d{3})*,\d{2})')

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        for page in pdf.pages:
            # extract_text(layout=True) mantiene le colonne allineate come stringa
            text = page.extract_text(layout=True)
            if not text: continue
            
            lines = text.split('\n')
            for i, line in enumerate(lines):
                clean_line = super_clean(line)
                
                # 1. Cerca importo
                m_match = money_regex.search(clean_line)
                if not m_match: continue
                
                val_str = m_match.group(1).replace('.', '').replace(',', '.')
                val_float = float(val_str)

                # 2. Contesto (Riga corrente + 2 sopra)
                prev1 = super_clean(lines[i-1]) if i > 0 else ""
                prev2 = super_clean(lines[i-2]) if i > 1 else ""
                context = f"{prev2} {prev1} {clean_line}"

                # 3. Match membri
                for m in lista_membri:
                    nome = super_clean(m['nome'])
                    cognome = super_clean(m['cognome'])
                    matr = super_clean(m['matricola']) if m.get('matricola') else "###NOMATCH###"

                    if (matr != "###NOMATCH###" and matr in context) or (nome in context and cognome in context):
                        matches.append({
                            "linea_originale": line.strip(),
                            "membro_id": m['id'],
                            "nome_trovato": f"{m['cognome']} {m['nome']}",
                            "importo_trovato": val_float,
                            "confidenza": "Python-Plumber"
                        })
                        break
                        
    return {"status": "ok", "matches": matches}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)