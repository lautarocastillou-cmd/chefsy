#!/bin/bash
set -e

echo "=================================================================="
echo "🚀 INICIANDO SERVIDOR OPENCODE EN GOOGLE COLAB (CCUs)"
echo "=================================================================="

# 1. Verificar GPU
if command -v nvidia-smi &> /dev/null; then
    echo "🟢 GPU detectada:"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
    echo "⚠️ ADVERTENCIA: No se detectó GPU. Asegurate de activar GPU en Entorno de ejecución."
fi

# 2. Instalar Ollama si no está instalado
if ! command -v ollama &> /dev/null; then
    echo "📦 Instalando Ollama..."
    curl -fsSL https://ollama.ai/install.sh | sh
else
    echo "✅ Ollama ya está instalado."
fi

# 3. Descargar Cloudflare Tunnel
if [ ! -f "cloudflared" ]; then
    echo "🌐 Descargando Cloudflare Tunnel..."
    wget -q -nc https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O cloudflared
    chmod +x cloudflared
fi

# 4. Detener procesos previos
pkill -f "ollama serve" || true
pkill -f "cloudflared" || true
sleep 2

# 5. Iniciar Ollama en segundo plano
export OLLAMA_HOST="0.0.0.0:11434"
export OLLAMA_ORIGINS="*"
echo "⚡ Iniciando Ollama daemon..."
ollama serve > /dev/null 2>&1 &
sleep 4

# 6. Descargar modelo (Qwen 2.5 Coder 7B por defecto)
MODELO="${1:-qwen2.5-coder:7b}"
echo "📥 Descargando e inicializando modelo '${MODELO}' en la GPU..."
ollama pull "$MODELO"

# 7. Iniciar Túnel Cloudflare
echo "🚀 Levantando túnel público seguro con Cloudflare..."
./cloudflared tunnel --url http://localhost:11434 > tunnel.log 2>&1 &

PUBLIC_URL=""
for i in {1..30}; do
    PUBLIC_URL=$(grep -oE "https://[a-zA-Z0-9-]+\.trycloudflare\.com" tunnel.log | head -n 1 || true)
    if [ -n "$PUBLIC_URL" ]; then
        break
    fi
    sleep 1
done

if [ -n "$PUBLIC_URL" ]; then
    echo ""
    echo "=================================================================="
    echo "🟢 ¡TU SERVIDOR OPENCODE ESTÁ EN VIVO EN LA NUBE DE GOOGLE!"
    echo "=================================================================="
    echo ""
    echo "👉 URL PÚBLICA DEL TÚNEL:"
    echo "   $PUBLIC_URL"
    echo ""
    echo "👉 MODELO CARGADO: $MODELO"
    echo "=================================================================="
    echo "Copiá esa URL y decile a Antigravity en el chat:"
    echo "   Conectate al endpoint $PUBLIC_URL"
    echo "=================================================================="
    echo ""
    
    # Mantener el proceso vivo
    tail -f /dev/null
else
    echo "❌ Error al generar la URL del túnel. Registros:"
    cat tunnel.log
fi
