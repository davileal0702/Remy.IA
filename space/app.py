"""Modelo de Space do Hugging Face compatível com o front-end do Remy.IA.

Troque o corpo de `responder` pelo pipeline real:
normalização (PT -> EN) -> busca RAG (FAISS) -> LLM com LoRA -> resposta em PT.
O front-end chama o endpoint "/responder" com um texto JSON e espera um texto JSON de volta.
"""
import json

import gradio as gr


def responder(pedido_json: str) -> str:
    pedido = json.loads(pedido_json)
    ingredientes = pedido.get("ingredientes", [])
    # TODO: buscar receitas no índice FAISS e gerar o texto com o modelo ajustado.
    resposta = {
        "texto": "Recebi: " + (", ".join(ingredientes) or pedido.get("mensagem", "")),
        "receitas": [],
    }
    if pedido.get("modo") == "cardapio":
        resposta["cardapio"] = {"meta_calorias": pedido.get("meta_calorias"), "total_calorias": 0, "itens": []}
    return json.dumps(resposta, ensure_ascii=False)


demo = gr.Interface(
    fn=responder,
    inputs=gr.Textbox(label="pedido_json"),
    outputs=gr.Textbox(label="resposta_json"),
    api_name="responder",
)

if __name__ == "__main__":
    demo.launch()
