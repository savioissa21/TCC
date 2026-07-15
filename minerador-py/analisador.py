import json
import uuid
from transformers import pipeline
from datetime import datetime
import re
import os

# --- CONFIGURAÇÃO ---
INPUT_FILE = 'reviews.json'
OUTPUT_FILE = 'reviews_processados.json'

def analyze_aspects(text, sentiment_pipeline):
    """
    Analisa frases individuais procurando por aspectos específicos.
    """
    ASPECT_KEYWORDS = {
        "Atendimento": ["garçom", "atendimento", "serviço", "demora", "rápido", "lento", "educado", "grosseiro", "funcionário", "equipe", "recepção"],
        "Comida": ["pizza", "sabor", "gostosa", "fria", "quente", "massa", "recheio", "borda", "cardápio", "bebida", "suco", "carne", "sobremesa"],
        "Ambiente": ["lugar", "local", "ambiente", "banheiro", "limpeza", "sujo", "barulho", "música", "confortável", "mesa", "cadeira", "espaço", "iluminação"],
        "Preço": ["preço", "valor", "caro", "barato", "conta", "pagar", "custo", "promoção"]
    }

    detected_aspects = []
    
    # Divide por pontuação mantendo a frase limpa
    sentences = re.split(r'[.!?;]\s*', text)

    for sentence in sentences:
        if not sentence.strip():
            continue

        sentence_lower = sentence.lower()

        for aspect_name, keywords in ASPECT_KEYWORDS.items():
            if any(word in sentence_lower for word in keywords):
                # Analisa o sentimento só desta frase
                try:
                    result = sentiment_pipeline(sentence)[0]
                    
                    sentiment_map = {'POS': 'Positivo', 'NEG': 'Negativo', 'NEU': 'Neutro'}
                    sentiment_pt = sentiment_map.get(result['label'], 'Neutro')

                    detected_aspects.append({
                        "name": aspect_name,      # CORRIGIDO: Java espera 'name', não 'aspect'
                        "sentiment": sentiment_pt,
                        "excerpt": sentence.strip()
                    })
                except Exception as e:
                    print(f"⚠️ Erro ao analisar frase: {e}")
                    continue

    return detected_aspects

def process_reviews():
    print("🔄 Carregando o modelo BERT para Português (pode demorar na 1ª vez)...")
    try:
        # Carrega a IA uma única vez
        sentiment_pipeline = pipeline("sentiment-analysis", model="pysentimiento/bertweet-pt-sentiment")
    except Exception as e:
        print(f"❌ Erro ao baixar o modelo: {e}")
        return

    print(f"📂 Lendo {INPUT_FILE}...")
    try:
        if not os.path.exists(INPUT_FILE):
             print(f"❌ Arquivo {INPUT_FILE} não encontrado. Rode o minerador primeiro.")
             return
             
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            reviews = json.load(f)
    except Exception as e:
        print(f"❌ Erro ao abrir arquivo: {e}")
        return
    
    processed_data = []
    total = len(reviews)

    print(f"🚀 Iniciando análise de {total} avaliações...")

    for i, review in enumerate(reviews):
        text = review.get('text', '')

        if not text:
            continue

        # 1. Sentimento Geral
        # Cortamos em 512 chars pois é o limite do BERT
        try:
            overall_result = sentiment_pipeline(text[:512])[0]
            sentiment_map = {'POS': 'Positivo', 'NEG': 'Negativo', 'NEU': 'Neutro'}
            overall_sentiment = sentiment_map.get(overall_result['label'], 'Neutro')
            sentiment_score = overall_result['score']
        except:
            overall_sentiment = "Neutro"
            sentiment_score = 0.5

        # 2. Aspectos
        aspects = analyze_aspects(text, sentiment_pipeline)

        processed_review = {
            "id": str(uuid.uuid4()),
            "sentimentScore": sentiment_score,
            "overallSentiment": overall_sentiment,
            "originalReview": review,
            "aspects": aspects,
            "analysisDate": datetime.now().isoformat()
        }

        processed_data.append(processed_review)

        if (i + 1) % 10 == 0:
            print(f"   Processado {i + 1}/{total}...")

    # Salva o resultado final
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(processed_data, f, ensure_ascii=False, indent=4)
        print(f"✅ SUCESSO! Arquivo '{OUTPUT_FILE}' gerado.")
        print("👉 Agora atualize seu ReviewService.java para ler este arquivo novo!")
    except Exception as e:
        print(f"❌ Erro ao salvar arquivo: {e}")

if __name__ == "__main__":
    process_reviews()